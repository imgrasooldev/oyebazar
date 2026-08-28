/**
 * 🔴 OrderService — is file ke PR sirf founder ke hain (docs/CONVENTIONS.md).
 *
 * Yahan teen cheezein ek saath hoti hain, aur teeno ghalat hon to paisa jata hai:
 *   1. PRICE SNAPSHOTS — order ke waqt ke prices, hamesha ke liye mehfooz
 *   2. FEE — snapshots par, supplier ke apne rate se, order banne ke waqt
 *   3. STATE MACHINE — confirmation ke baghair order wholesaler ko ja hi nahi sakta
 *
 * Phase 1 mein confirmation RESELLER karti hai (wo customer se khud baat karti hai).
 * `confirmedBy` record hota hai taake baad mein RTO ka moqabla ho sake:
 * reseller-confirmed vs customer-confirmed. Faisla data karega, raye nahi.
 */
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  OutOfStockError,
  ValidationError,
  addPkr,
  calculateBajiFee,
  multiplyPkr,
  pkr,
  subtractPkr,
  formatPkr,
  courierName,
  type Page,
  type Pkr,
} from '@oyebazar/shared'

import { assertTransition, type OrderStatus } from '../domain/order-status'
import { phoneKey, phoneRecord, type PhoneRecord } from '../domain/phone-record'
import { readShipment } from '../domain/shipment'
import type {
  ConfirmedBy,
  CreateOrderCommand,
  InternalOrderView,
  OrderLineView,
  ResellerOrderView,
} from '../domain/order'
import type {
  FeeLedgerRepository,
  OrderRepository,
  SupplierInternalRepository,
  SupplierOrderView,
} from '../ports/order-repositories'
import { assessRtoRisk, type RtoRisk } from '../domain/rto-risk'
import type { InventoryRepository } from '../ports/inventory-repositories'
import type { PayoutService } from './payout.service'
import type { CursorQuery, ProductRepository, ResellerRepository } from '../ports/repositories'
import type {
  Analytics,
  Clock,
  Logger,
  MessagingProvider,
  OrderNumberGenerator,
  TokenGenerator,
} from '../ports/infrastructure'

export class OrderService {
  constructor(
    private readonly orders: OrderRepository,
    private readonly products: ProductRepository,
    private readonly suppliers: SupplierInternalRepository,
    private readonly resellers: ResellerRepository,
    private readonly feeLedger: FeeLedgerRepository,
    /**
     * Sirf ek method — poori PayoutService nahi.
     *
     * Delivery par do cheezein ek saath hoti hain: hamari fee EARNED banti hai aur
     * reseller ka haq likha jata hai. Dono ek hi jagah se chalni chahiyen, warna ek din
     * aisa order banta hai jis par hamari fee to ginti mein hai magar reseller ka
     * hissa kahin darj hi nahi.
     */
    private readonly payouts: Pick<PayoutService, 'openForDeliveredOrder'>,
    private readonly inventory: InventoryRepository,
    private readonly orderNumbers: OrderNumberGenerator,
    private readonly messaging: MessagingProvider,
    private readonly tokens: TokenGenerator,
    private readonly clock: Clock,
    private readonly analytics: Analytics,
    private readonly logger: Logger,
    /** Magic link isi par banta hai: `${appUrl}/supplier/o/<token>` */
    private readonly appUrl: string,
  ) {}

  // ------------------------------------------------------------------ create

  async create(command: CreateOrderCommand): Promise<InternalOrderView> {
    if (command.lines.length === 0) {
      throw new ValidationError('Order mein kam se kam ek item hona chahiye')
    }

    // Dohra order — reseller ne do baar button dabaya ya network retry hua
    if (command.idempotencyKey) {
      const existing = await this.orders.findByIdempotencyKey(
        command.resellerId,
        command.idempotencyKey,
      )
      if (existing) {
        this.logger.info('order_idempotent_hit', { orderNo: existing.orderNo })
        return existing
      }
    }

    // 🔴 Yahan supplierPrice pehli baar aata hai — sirf fee aur snapshot ke liye.
    const pricing = await this.products.findForPricing(command.lines.map((l) => l.productId))
    const byId = new Map(pricing.map((p) => [p.id, p]))

    const supplierIds = new Set(pricing.map((p) => p.supplierId))
    if (supplierIds.size > 1) {
      // Ek order = ek wholesaler. Warna neutral packing, delivery aur fee invoice — sab uljh jate hain.
      throw new ValidationError(
        'Ek order mein sirf ek hi wholesaler ka maal ho sakta hai. Alag alag order banayen',
      )
    }

    const supplierId = [...supplierIds][0]
    if (!supplierId) throw new NotFoundError('Product', command.lines[0]?.productId)

    const supplier = await this.suppliers.findInternal(supplierId)
    if (!supplier) throw new NotFoundError('Wholesaler', supplierId)
    if (supplier.status !== 'VERIFIED') {
      throw new ConflictError('Ye wholesaler abhi orders nahi le raha')
    }

    const lines: OrderLineView[] = command.lines.map((line) => {
      const product = byId.get(line.productId)
      if (!product) throw new NotFoundError('Product', line.productId)

      // 🔴 Stock check confirmation se PEHLE. Customer ko confirm kar ke baad mein
      // "maal khatam hai" kehna is model ki #1 operational failure hai.
      if (!product.inStock) throw new OutOfStockError({ productId: line.productId })

      if (line.qty < 1) throw new ValidationError('Quantity kam se kam 1 honi chahiye')
      if (line.retailPrice < product.bajiPrice) {
        throw new ValidationError(
          `Aap ka price Baji price (Rs ${product.bajiPrice}) se kam nahi ho sakta`,
          { productId: line.productId },
        )
      }

      return {
        productId: line.productId,
        variantId: line.variantId ?? null,
        qty: line.qty,
        supplierPriceSnapshot: product.supplierPrice,
        bajiPriceSnapshot: product.bajiPrice,
        retailPriceSnapshot: line.retailPrice,
      }
    })

    /*
     * 🔴 Delivery ka rate wo do qadar hi ho sakti hain jo DUKAN ne likhi hain.
     *
     * Pehle ye khaana khula tha aur reseller kuch bhi bhej sakti thi (0 bhi). Courier
     * ka bill dukan bharti hai — us ka rate kisi aur ke likhne par nuqsan chup chaap us
     * ke zimme aa jata tha, aur usay pata bhi delivery ke baad chalta.
     *
     * Jo qadar in dono mein se na ho, us par isi sheher wala rate lagta hai — order
     * rukta nahi (bandi customer se baat kar chuki hoti hai), magar rate dukan ka hi
     * chalta hai.
     */
    const allowedDelivery = [supplier.deliveryFeeCity, supplier.deliveryFeeOther]
    const deliveryFee = allowedDelivery.includes(command.deliveryFee)
      ? command.deliveryFee
      : pkr(supplier.deliveryFeeCity)

    const subtotal = addPkr(...lines.map((l) => multiplyPkr(l.retailPriceSnapshot, l.qty)))
    const total = addPkr(subtotal, deliveryFee)
    const bajiFee = calculateBajiFee(lines, supplier.feeRateBps)

    /*
     * 🔴 Maal ABHI rok lete hain, dispatch par nahi.
     *
     * Warna do resellers ek hi aakhri piece apne apne customer ko bech deti hain, dono
     * paisa wasool kar leti hain, aur akhir mein ek ko mana karna parta hai — wo apne
     * customer ke saamne jhooti banti hai, hamari wajah se.
     *
     * Koi ek line na mile to pehle wali wapas chhor dete hain: adhoora reserve stock
     * hamesha ke liye kha jata aur kisi ko pata bhi na chalta.
     */
    /*
     * Order ka number maal rokne se PEHLE le lete hain.
     *
     * Wajah register hai: ginti order banne se pehle rok li jati hai (warna do
     * resellers ek hi aakhri piece bech deti hain), aur us lamhe order ki id mojood hi
     * nahi hoti. Number pehle le lene se har qatar us number ke saath likhi jati hai —
     * aur jhagre ke din dukan wala wohi number dhoondta hai jo us ke saamne har jagah
     * likha hota hai.
     *
     * Number "zaya" hone ka koi masla nahi: `Counter` sirf barhta hai, aur maal na
     * milne par ek number chhoot jana kisi cheez ko nahi torta.
     */
    const orderNo = await this.orderNumbers.next()

    const reserved: OrderLineView[] = []
    for (const line of lines) {
      const ok = await this.inventory.reserve({
        productId: line.productId,
        qty: line.qty,
        // Jo variant customer ne chuna, ginti usi se — dekhen StockLine
        ...(line.variantId ? { variantId: line.variantId } : {}),
        orderNo,
      })
      if (ok) {
        reserved.push(line)
        continue
      }

      for (const done of reserved) {
        await this.inventory.release({
          productId: done.productId,
          qty: done.qty,
          // Wapas usi variant mein — aur register mein usi number ke saath
          ...(done.variantId ? { variantId: done.variantId } : {}),
          orderNo,
        })
      }
      throw new OutOfStockError({ productId: line.productId })
    }

    const order = await this.orders.create({
      orderNo,
      resellerId: command.resellerId,
      supplierId,
      customer: command.customer,
      lines,
      subtotal,
      deliveryFee,
      total,
      bajiFee,
      feeRateBps: supplier.feeRateBps,
      paymentMethod: command.paymentMethod,
      idempotencyKey: command.idempotencyKey,
    })

    await this.analytics.track({
      name: 'order_created',
      actorType: 'reseller',
      actorId: command.resellerId,
      properties: {
        orderNo: order.orderNo,
        total,
        bajiFee,
        items: lines.length,
        hasLocationPin: command.customer.locationLat !== undefined,
      },
    })

    return order
  }

  // ------------------------------------------------------------------ confirm

  /**
   * Reseller confirm karti hai (Phase 1). Wo customer se khud baat kar chuki hoti hai.
   *
   * Isi lamhe fee ledger row banti hai — hamara revenue yahin record hota hai.
   */
  async confirmByReseller(orderNo: string, resellerId: string): Promise<InternalOrderView> {
    const order = await this.requireResellerOrder(orderNo, resellerId)
    return this.confirm(order, 'RESELLER', { actorType: 'reseller', actorId: resellerId })
  }

  /** Ops ne phone par confirm kiya (reseller se rabta na ho paya). */
  async confirmByOps(orderNo: string, opsUserId: string, note?: string): Promise<InternalOrderView> {
    const order = await this.orders.findById(orderNo)
    if (!order) throw new NotFoundError('Order', orderNo)
    return this.confirm(order, 'OPS', { actorType: 'ops', actorId: opsUserId, note })
  }

  private async confirm(
    order: InternalOrderView,
    confirmedBy: ConfirmedBy,
    actor: { actorType: 'reseller' | 'ops' | 'customer'; actorId?: string; note?: string },
  ): Promise<InternalOrderView> {
    if (order.confirmedAt) {
      // Dobara confirm karna ghalti nahi — sirf koi kaam nahi hota
      return order
    }

    assertTransition(order.status, 'CONFIRMED', { confirmedAt: order.confirmedAt })
    const now = this.clock.now()

    const updated = await this.orders.applyStatusChange({
      orderId: order.id,
      from: order.status,
      to: 'CONFIRMED',
      at: now,
      actorType: actor.actorType,
      actorId: actor.actorId,
      note: actor.note,
      confirmedBy,
    })

    // 🔴 Fee row confirmation par banti hai — order create par nahi.
    // Pending orders par bill karna supplier ka bharosa khatam kar deta hai.
    await this.feeLedger.create({
      orderId: order.id,
      supplierId: order.supplierId,
      amount: order.bajiFee,
    })

    await this.analytics.track({
      name: 'order_confirmed',
      actorType: actor.actorType,
      actorId: actor.actorId,
      properties: { orderNo: order.orderNo, confirmedBy, feeAmount: order.bajiFee },
    })

    this.logger.info('order_confirmed', { orderNo: order.orderNo, confirmedBy })

    /*
     * 🔴 Tasdeeq ke foran baad order KHUD dukan tak jata hai.
     *
     * Pehle beech mein ops ka ek qadam tha. Amal mein wo qadam intezar ban jata tha:
     * customer WhatsApp par haan keh chuka hota, reseller ka kaam khatam ho chuka hota,
     * aur order hamari apni qatar mein us waqt tak khara rehta jab tak koi daftar mein
     * baith kar "bhejo" na dabaye. Raat ke order subah tak, aur chhutti wale din poora
     * din. Us intezar ka koi karobari faida nahi tha — hum us waqt kuch check nahi kar
     * rahe hote the, sirf der ho rahi hoti thi.
     *
     * Ops ka rasta khatam nahi hua: /ops par wohi button ab dobara bhejne ke kaam aata
     * hai (dukan ka WhatsApp na chala ho to).
     */
    return this.handToSupplier(updated, { actorType: 'system' })
  }

  // ------------------------------------------------------------------ fulfilment

  /**
   * 🔴 Wholesaler ko bhejna. `confirmedAt` null ho to state machine yahin rok deti hai —
   * ye check service layer mein hai, UI mein nahi.
   */
  async sendToSupplier(orderId: string, opsUserId: string): Promise<InternalOrderView> {
    const order = await this.orders.findById(orderId)
    if (!order) throw new NotFoundError('Order', orderId)

    /*
     * Order ab tasdeeq ke saath hi chala jata hai, is liye ops ka ye button aksar
     * DOBARA bhejne ke liye dabta hai — dukan ka WhatsApp na chala ho, ya number badal
     * gaya ho. Us soorat mein status pehle hi SENT_TO_SUPPLIER hota hai; ghalti dena
     * yahan ghalat jawab hoga, kyunke kaam (paighaam bhejna) ho sakta hai aur hona bhi
     * chahiye.
     */
    if (order.status === 'SENT_TO_SUPPLIER') return this.notifySupplier(order)

    return this.handToSupplier(order, { actorType: 'ops', actorId: opsUserId })
  }

  /** Order dukan ke naam lagana — tasdeeq ke baad khud, ya ops ke haath se. */
  private async handToSupplier(
    order: InternalOrderView,
    actor: { actorType: 'ops' | 'system'; actorId?: string },
  ): Promise<InternalOrderView> {
    assertTransition(order.status, 'SENT_TO_SUPPLIER', { confirmedAt: order.confirmedAt })

    const updated = await this.orders.applyStatusChange({
      orderId: order.id,
      from: order.status,
      to: 'SENT_TO_SUPPLIER',
      at: this.clock.now(),
      actorType: actor.actorType,
      actorId: actor.actorId,
    })

    return this.notifySupplier(updated)
  }

  /**
   * Dukan ko khabar — magic link ke saath.
   *
   * Token har dafa naya banta hai: dobara bhejne par purana link mar jata hai, warna
   * kisi purane WhatsApp forward se bhi order chhua ja sakta.
   */
  private async notifySupplier(order: InternalOrderView): Promise<InternalOrderView> {
    // 🔴 Magic link — wholesaler isi se order dekh kar accept/reject karta hai.
    // Token har order ka apna hai; ek order ka link doosre order par nahi chalta.
    const token = this.tokens.randomToken(32)
    await this.orders.setSupplierToken(order.id, token)

    const supplier = await this.suppliers.findInternal(order.supplierId)
    if (supplier) {
      await this.messaging
        .sendTemplate({
          to: supplier.phone,
          template: 'baji_new_order',
          params: {
            orderNo: order.orderNo,
            items: String(order.items.length),
            link: `${this.appUrl}/supplier/o/${token}`,
          },
        })
        .catch((error: unknown) => {
          // Message fail hone se order na ruke — dukan ko portal par order phir bhi dikhega
          this.logger.error('supplier_notify_failed', {
            orderNo: order.orderNo,
            error: error instanceof Error ? error.message : String(error),
          })
        })
    }

    return order
  }

  // ------------------------------------------------------- wholesaler ka jawab

  /** Magic link se order dikhana — token hi chabi hai, koi login nahi. */
  /**
   * Wholesaler khud apna kaam aage barhata hai: maal bandh diya → courier ko de diya.
   *
   * Pehle ye dono ops karti thi. Natija: dukan par maal tayyar hota tha aur system
   * mein order teen din "qubool kiya" par khara rehta — reseller phone kar ke poochti
   * ke kya hua, aur ops ke paas jawab nahi hota. Jo shakhs kaam kar raha hai, wohi
   * batata hai ke kahan tak pohancha.
   *
   * 🔴 supplierId ke saath dhoonda jata hai — doosri dukan ka order chhua nahi ja sakta.
   */
  async markPackedBySupplier(supplierId: string, orderNo: string): Promise<InternalOrderView> {
    const view = await this.orders.findForSupplier(supplierId, orderNo)
    if (!view) throw new NotFoundError('Order', orderNo)

    return this.transition(view.id, 'PACKED', {
      actorType: 'supplier',
      actorId: supplierId,
      note: 'Wholesaler ne maal bandh diya',
    })
  }

  /**
   * Courier ko de diya — aur ab ye batana bhi parta hai ke KIS ko.
   *
   * 🔴 Courier lazmi hai, CN sirf tab jab courier koi kampani ho.
   *
   * Mandi ki bohat si dukanein apne bandey ke haath maal bhejti hain; un ke paas CN
   * hota hi nahi. Agar hum har soorat CN maangte to wo `1111` likh kar aage barh jate
   * aur phir har number par shak karna parta. `self` ka saaf jawab — "apna rider,
   * number hai hi nahi" — us se kahin behtar hai, kyunke wo SACH hota hai.
   */
  async markDispatchedBySupplier(
    supplierId: string,
    orderNo: string,
    shipment: { courier: string; trackingNo?: string | undefined },
  ): Promise<InternalOrderView> {
    const view = await this.orders.findForSupplier(supplierId, orderNo)
    if (!view) throw new NotFoundError('Order', orderNo)

    const parcel = readShipment(shipment)

    const order = await this.transition(view.id, 'DISPATCHED', {
      actorType: 'supplier',
      actorId: supplierId,
      note:
        parcel.trackingNo === null
          ? `Dukan ke apne rider ke haath`
          : `${courierName(parcel.courier)} — ${parcel.trackingNo}`,
      shipment: parcel,
    })

    /*
     * Reseller ko foran khabar — us ka customer isi ka intezar kar raha hota hai.
     *
     * 🔴 CN yahan JAAN BOOJH KAR nahi bheja ja raha, halanke wo ab mojood hai.
     *
     * Provider ke template ke parameters NAAM se jate hain, aur wo naam template mein
     * pehle se declared hona parta hai. Ek ghair-elaan shuda parameter bhejne ka natija
     * ye hota hai ke poora paighaam rad ho jata — yani reseller ko "maal nikal gaya"
     * wali khabar bhi na milti, jo abhi milti hai. Ek nayi cheez jorhne ke chakkar mein
     * jo pehle se chal raha hai usay torhna ghalat sauda hai.
     *
     * CN portal par mojood hai (order ke saath, copy hone wala). Jis din provider par
     * `baji_order_dispatched` mein `trackingNo` ka khaana bana diya jaye, us din wo
     * yahan ek line se jur jayega.
     */
    await this.notifyReseller(order, 'baji_order_dispatched', { orderNo: order.orderNo })
    return order
  }

  /**
   * "Pohanch gaya, paise mil gaye" — wholesaler ke apne haath se.
   *
   * 🔴 Ye qadam pehle sirf ops ke paas tha, halanke haqeeqat mein pata SAB SE PEHLE
   * wholesaler ko chalta hai: COD ka cash usi ke haath aata hai. Beech mein ops ka
   * intezar rakhne ka matlab ye tha ke reseller ka hisab (aur us ka paisa) us waqt tak
   * khulta hi nahi jab tak koi teesra banda aa kar button na dabaye.
   *
   * Yahi wo jagah hai jahan paisa banta hai: fee EARNED hoti hai aur reseller ka hissa
   * dukan ke zimme likha jata hai — dekhen afterDelivered().
   */
  async markDeliveredBySupplier(supplierId: string, orderNo: string): Promise<InternalOrderView> {
    const view = await this.orders.findForSupplier(supplierId, orderNo)
    if (!view) throw new NotFoundError('Order', orderNo)

    const updated = await this.transition(view.id, 'DELIVERED', {
      actorType: 'supplier',
      actorId: supplierId,
      note: 'Wholesaler: maal pohanch gaya, cash mil gaya',
    })

    return this.afterDelivered(updated, { actorType: 'supplier', actorId: supplierId })
  }

  /**
   * "Maal wapas aa gaya" — RTO, wholesaler ke apne haath se.
   *
   * Nuqsan uthane wala wohi hai (dono taraf ka courier kiraya aur maal wapas), is liye
   * likhne ka haq bhi usi ka hai. Fee WRITTEN_OFF hoti hai — hum us order par bill nahi
   * karte jo bika hi nahi — aur maal wapas ginti mein chala jata hai.
   *
   * Row mit-ti nahi: RTO ka record hi wo cheez hai jis se reseller ka chalan banta hai
   * (dekhen ResellerRtoRecord).
   */
  async markRtoBySupplier(
    supplierId: string,
    orderNo: string,
    reason: string,
  ): Promise<InternalOrderView> {
    const view = await this.orders.findForSupplier(supplierId, orderNo)
    if (!view) throw new NotFoundError('Order', orderNo)

    const updated = await this.transition(view.id, 'RTO', {
      actorType: 'supplier',
      actorId: supplierId,
      note: reason,
    })

    await this.feeLedger.markWrittenOff(updated.id, `RTO: ${reason}`)
    /*
     * 🔴 `RETURN_TO_SHELF` — `ORDER_RELEASED` nahi. Ginti dono soorton mein barhti hai,
     * magar register mein ye do BILKUL alag waqiat hain: mansookh order ka maal dukan
     * se nikla hi nahi tha; ye maal poora chakkar laga kar wapas aaya hai, us par
     * kirchaya lag chuka hai aur aksar wo kharab bhi hota hai. Dono ek jaise likhe jaen
     * to wapsi ka nuqsan is poori tareekh mein kahin nazar hi nahi aata.
     */
    await this.releaseStock(updated, 'RETURN_TO_SHELF')
    await this.notifyReseller(updated, 'baji_order_rto', {
      orderNo: updated.orderNo,
      reason,
    })
    await this.analytics.track({
      name: 'order_rto',
      actorType: 'supplier',
      actorId: supplierId,
      properties: { orderNo: updated.orderNo, reason },
    })

    return updated
  }

  /**
   * Haan karne ke BAAD maal na nikle — mansookh.
   *
   * Wajah lazmi hai aur reseller ko foran jati hai: us ka customer intezar mein khara
   * hai, aur khamoshi se mara hua order us ki izzat kharab karta hai. Maal wapas ginti
   * mein, aur hamari fee bhi khatam — jo bika nahi us par bill nahi banta.
   *
   * Ye alag hai `rejectForSupplier` se: wo order lene se PEHLE ka inkar hai, ye qubool
   * karne ke baad ka.
   */
  async cancelBySupplier(
    supplierId: string,
    orderNo: string,
    reason: string,
  ): Promise<InternalOrderView> {
    const view = await this.orders.findForSupplier(supplierId, orderNo)
    if (!view) throw new NotFoundError('Order', orderNo)

    const updated = await this.transition(view.id, 'CANCELLED', {
      actorType: 'supplier',
      actorId: supplierId,
      note: `Wholesaler ne mansookh kiya: ${reason}`,
    })

    await this.feeLedger.markWrittenOff(updated.id, `Supplier cancelled: ${reason}`)
    await this.releaseStock(updated)
    await this.notifyReseller(updated, 'baji_order_rejected', {
      orderNo: updated.orderNo,
      reason,
    })
    await this.analytics.track({
      name: 'order_cancelled_by_supplier',
      actorType: 'supplier',
      actorId: supplierId,
      properties: { orderNo: updated.orderNo, reason },
    })

    return updated
  }

  /** Portal ki list — wholesaler ke apne order, naye pehle. */
  async listForSupplier(
    supplierId: string,
    query: { limit: number; cursor?: string; status?: OrderStatus },
  ): Promise<Page<SupplierOrderView>> {
    return this.orders.listForSupplier(supplierId, {
      limit: query.limit,
      ...(query.cursor ? { cursor: query.cursor } : {}),
      ...(query.status ? { status: query.status } : {}),
    })
  }

  /**
   * Wapsi ka andaza — un orders par jin par dukan ka faisla abhi baqi hai.
   *
   * 🔴 Yahan ginti aur faisla alag rakhe gaye hain: repository sirf ginti deti hai,
   * `assessRtoRisk` us par wazan lagata hai. Isi liye hadd badalne ke liye SQL kholne
   * ki zaroorat nahi parti aur poore hisab ka test likha ja sakta hai.
   *
   * `resellerRecord` bahar se aata hai kyunke safha wo pehle hi mangwa chuka hota hai
   * (`ResellerRtoRecord` ke liye) — dobara wohi query chalana faltu chakkar hai.
   */
  async riskFor(
    supplierId: string,
    orders: readonly { id: string; deliveryFee: number; total: number; hasLocationPin: boolean }[],
    resellerRecord: (orderId: string) => { delivered: number; rto: number },
  ): Promise<Map<string, RtoRisk>> {
    if (orders.length === 0) return new Map()

    const facts = await this.orders.riskFacts({
      supplierId,
      orderIds: orders.map((order) => order.id),
    })

    const none = { delivered: 0, rto: 0 }
    return new Map(
      orders.map((order) => {
        const row = facts.byOrder.get(order.id)
        return [
          order.id,
          assessRtoRisk({
            deliveryFee: order.deliveryFee,
            total: order.total,
            hasLocationPin: order.hasLocationPin,
            customer: row?.customer ?? none,
            area: row?.area ?? none,
            reseller: resellerRecord(order.id),
            supplierMedianOrder: facts.medianOrder,
          }),
        ]
      }),
    )
  }

  async getForSupplierToken(token: string): Promise<SupplierOrderView> {
    const order = await this.orders.findBySupplierToken(token)
    if (!order) throw new NotFoundError('Order')
    return order
  }

  /**
   * 🔴 Wholesaler ne QUBOOL kiya — "maal mojood hai, main bhej raha hoon".
   *
   * Yahi wo lamha hai jo reseller ko sukoon deta hai. Is se pehle wo customer ko
   * kuch pakka nahi keh sakti; is ke baad wo keh sakti hai "bhej diya gaya hai".
   */
  /** Magic link se — wholesaler ne login nahi kiya, sirf WhatsApp ka link khola. */
  async acceptBySupplier(token: string): Promise<InternalOrderView> {
    const view = await this.orders.findBySupplierToken(token)
    if (!view) throw new NotFoundError('Order')
    return this.applyAccept(view.id, 'link')
  }

  /**
   * Link se hi poora safar — qubool karne ke BAAD wale qadam bhi.
   *
   * 🔴 Ye sab se bari asani hai, aur us ki wajah karobari hai, taknoloji ki nahi:
   * dukan wala WhatsApp par link kholta hai aur ek tap mein order qubool kar leta hai.
   * Us ke baad ke qadam (maal bandh diya, bhej diya, pohanch gaya) sirf portal mein
   * the — yani login, password nahi to OTP, aur ek aur app jaisi cheez. Bohot se
   * dukan wale wahan tak jate hi nahi.
   *
   * Us ki qeemat kisi aur ne bhugatni thi: DELIVERED wohi qadam hai jis par reseller ka
   * hissa khulta hai. Login na hone ka matlab tha ke us ka paisa hawa mein latka rahe.
   *
   * Hifazat wohi jo pehle thi: token 32 bytes ka hai, ek hi order par chalta hai, aur
   * IP par rate limit lagi hai. Faida uthane ki soorat bhi nahi banti — DELIVERED
   * likhne se dukan ke ZIMME paisa charhta hai, ghatta nahi.
   */
  async markStatusByToken(
    token: string,
    toStatus: 'PACKED' | 'DISPATCHED' | 'DELIVERED' | 'RTO' | 'CANCELLED',
    reason?: string,
    /*
     * 🔴 Magic link wale raste par bhi wohi shart lagti hai jo portal par.
     *
     * Agar yahan CN maafi ho jati to raasta khul jata: dukan portal chhor kar hamesha
     * link se DISPATCHED kar deti aur courier ka koi record kabhi bhi na banta. Ek hi
     * kaam ke do darwaze rakhna theek hai; un par do alag shartein rakhna nahi.
     */
    shipment?: { courier: string; trackingNo?: string | undefined },
  ): Promise<InternalOrderView> {
    const view = await this.orders.findBySupplierToken(token)
    if (!view) throw new NotFoundError('Order')

    /*
     * Token wale view mein dukan ki id hai hi nahi (us safhe ko us ki zaroorat nahi
     * thi), aur aage wali sab methods usi par chalti hain — is liye yahan ek dafa
     * poora order utha lete hain.
     */
    const order = await this.orders.findById(view.id)
    if (!order) throw new NotFoundError('Order', view.orderNo)

    // Aage ka kaam wohi service karti hai jo portal ke liye karti hai — do raste, ek hisab
    switch (toStatus) {
      case 'PACKED':
        return this.markPackedBySupplier(order.supplierId, order.orderNo)
      case 'DISPATCHED':
        if (!shipment) throw new ValidationError('Courier chunen')
        return this.markDispatchedBySupplier(order.supplierId, order.orderNo, shipment)
      case 'DELIVERED':
        return this.markDeliveredBySupplier(order.supplierId, order.orderNo)
      case 'RTO':
        return this.markRtoBySupplier(order.supplierId, order.orderNo, reason ?? '')
      case 'CANCELLED':
        return this.cancelBySupplier(order.supplierId, order.orderNo, reason ?? '')
    }
  }

  /** Portal se — logged-in wholesaler. Order us ka na ho to milta hi nahi. */
  async acceptForSupplier(supplierId: string, orderNo: string): Promise<InternalOrderView> {
    const view = await this.orders.findForSupplier(supplierId, orderNo)
    if (!view) throw new NotFoundError('Order', orderNo)
    return this.applyAccept(view.id, 'portal')
  }

  private async applyAccept(orderId: string, via: 'link' | 'portal'): Promise<InternalOrderView> {
    const order = await this.orders.findById(orderId)
    if (!order) throw new NotFoundError('Order', orderId)

    // Dobara dabana ghalti nahi — sirf kuch nahi hota
    if (order.status === 'ACCEPTED') return order

    assertTransition(order.status, 'ACCEPTED', { confirmedAt: order.confirmedAt })

    const updated = await this.orders.applyStatusChange({
      orderId: order.id,
      from: order.status,
      to: 'ACCEPTED',
      at: this.clock.now(),
      // Kaam dukan ne kiya hai — record mein bhi wohi likha jaye, "ops" nahi
      actorType: 'supplier',
      actorId: order.supplierId,
      note: via === 'link' ? 'Wholesaler ne link se qubool kiya' : 'Wholesaler ne portal se qubool kiya',
    })

    await this.analytics.track({
      name: 'order_accepted_by_supplier',
      actorType: 'supplier',
      actorId: order.supplierId,
      properties: { orderNo: order.orderNo, supplierId: order.supplierId, via },
    })

    // Reseller ko foran khabar — wo customer ka intezar khatam kar sakti hai
    await this.notifyReseller(order, 'baji_order_accepted', {
      orderNo: order.orderNo,
    })

    this.logger.info('order_accepted_by_supplier', { orderNo: order.orderNo })
    return updated
  }

  /**
   * Wholesaler ne MANA kiya (maal khatam / ilaqa door).
   *
   * Order foran CANCELLED ho jata hai aur fee WRITTEN_OFF. Reseller ko abhi pata
   * chal jaye — teesre din customer ke phone se pata chalne se hazaar guna behtar hai.
   */
  async rejectBySupplier(token: string, reason: string): Promise<InternalOrderView> {
    const view = await this.orders.findBySupplierToken(token)
    if (!view) throw new NotFoundError('Order')
    return this.applyReject(view.id, reason)
  }

  async rejectForSupplier(
    supplierId: string,
    orderNo: string,
    reason: string,
  ): Promise<InternalOrderView> {
    const view = await this.orders.findForSupplier(supplierId, orderNo)
    if (!view) throw new NotFoundError('Order', orderNo)
    return this.applyReject(view.id, reason)
  }

  /**
   * Mana karna sirf status nahi badalta: fee likh di jati hai (write-off) aur reseller
   * ko foran khabar jati hai — wo customer ko doosra option de sake.
   */
  private async applyReject(orderId: string, reason: string): Promise<InternalOrderView> {
    if (!reason.trim()) throw new ValidationError('Wajah likhna zaroori hai')

    const order = await this.orders.findById(orderId)
    if (!order) throw new NotFoundError('Order', orderId)
    if (order.status === 'REJECTED' || order.status === 'CANCELLED') return order

    const now = this.clock.now()
    assertTransition(order.status, 'REJECTED', { confirmedAt: order.confirmedAt })

    await this.orders.applyStatusChange({
      orderId: order.id,
      from: order.status,
      to: 'REJECTED',
      at: now,
      // Inkar dukan ka hai — record mein us ka apna naam
      actorType: 'supplier',
      actorId: order.supplierId,
      note: reason,
      rejectionReason: reason,
    })

    // REJECTED apne aap CANCELLED banta hai — adhoore order qatar mein nahi rehne chahiyen
    const cancelled = await this.orders.applyStatusChange({
      orderId: order.id,
      from: 'REJECTED',
      to: 'CANCELLED',
      at: now,
      actorType: 'system',
      note: `Wholesaler ne mana kiya: ${reason}`,
    })

    await this.feeLedger.markWrittenOff(order.id, `Supplier rejected: ${reason}`)
    await this.releaseStock(order)

    await this.notifyReseller(order, 'baji_order_rejected', {
      orderNo: order.orderNo,
      reason,
    })

    await this.analytics.track({
      name: 'order_rejected_by_supplier',
      actorType: 'supplier',
      actorId: order.supplierId,
      properties: { orderNo: order.orderNo, supplierId: order.supplierId, reason },
    })

    return cancelled
  }

  /** Reseller ko WhatsApp — message fail ho to order na ruke. */
  /**
   * Order mar gaya — maal wapas ginti mein.
   *
   * Har nakaam order ke sath stock hamesha ke liye kam hota rehta to kuch hafton mein
   * poora catalogue "khatam" dikhne lagta, halanke dukan par maal para hota.
   */
  private async releaseStock(
    order: InternalOrderView,
    reason: 'ORDER_RELEASED' | 'RETURN_TO_SHELF' = 'ORDER_RELEASED',
  ): Promise<void> {
    for (const item of order.items) {
      await this.inventory.release(
        {
          productId: item.productId,
          qty: item.qty,
          // Wapas usi variant mein jis se nikla tha
          ...(item.variantId ? { variantId: item.variantId } : {}),
          // Register mein qatar isi number se bandhti hai
          orderNo: order.orderNo,
        },
        reason,
      )
    }
  }

  /** Reseller ka munafa: (us ka rate − hamara rate) × tadaad. */
  private resellerEarnings(order: InternalOrderView): Pkr {
    const total = order.items.reduce(
      (sum, item) => sum + (item.retailPriceSnapshot - item.bajiPriceSnapshot) * item.qty,
      0,
    )
    return pkr(Math.max(total, 0))
  }

  private async notifyReseller(
    order: InternalOrderView,
    template: string,
    params: Record<string, string>,
  ): Promise<void> {
    const reseller = await this.resellers.findById(order.resellerId)
    if (!reseller) return

    await this.messaging
      .sendTemplate({ to: reseller.whatsappPhone, template, params })
      .catch((error: unknown) => {
        this.logger.error('reseller_notify_failed', {
          orderNo: order.orderNo,
          error: error instanceof Error ? error.message : String(error),
        })
      })
  }

  async markDispatched(orderId: string, opsUserId: string): Promise<InternalOrderView> {
    return this.transition(orderId, 'DISPATCHED', { actorType: 'ops', actorId: opsUserId })
  }

  /**
   * Maal pohanch gaya — yahin hamari kamai banti hai.
   *
   * 🔴 Fee row pehle sirf PENDING padi rehti thi aur DELIVERED par kuch nahi hota tha,
   * halanke domain (feeOutcomeFor) kehta hai ke DELIVERED = EARNED. Natija ye ke raste
   * ka order bhi invoice mein chala jata, aur RTO hone par hum wholesaler ko pehle hi
   * bill kar chuke hote.
   */
  async markDelivered(orderId: string, actorId: string): Promise<InternalOrderView> {
    const updated = await this.transition(orderId, 'DELIVERED', { actorType: 'ops', actorId })
    return this.afterDelivered(updated, { actorType: 'ops', actorId })
  }

  /**
   * DELIVERED ke baad jo kuch hota hai — ek hi jagah.
   *
   * 🔴 Ye alag isliye hai ke ab do raste DELIVERED tak jate hain: ops ka aur khud
   * wholesaler ka. Agar dono apna apna hisab likhte, to ek raste par fee EARNED hoti
   * aur doosre par nahi — aur "kuch orders ka paisa kabhi bana hi nahi" jaisi kharabi
   * mahine baad, statement mein, pakri jati.
   */
  private async afterDelivered(
    updated: InternalOrderView,
    actor: { actorType: 'ops' | 'supplier'; actorId: string },
  ): Promise<InternalOrderView> {
    await this.feeLedger.markEarned(updated.id, this.clock.now())

    // Reseller ka hissa ab wholesaler ke zimme — hisab khul gaya
    await this.payouts.openForDeliveredOrder({
      orderId: updated.id,
      resellerId: updated.resellerId,
      supplierId: updated.supplierId,
      amount: this.resellerEarnings(updated),
    })

    // Reseller ko khabar — aur usi paighaam mein us ki kamai, kyunke asal sawal wohi hai
    await this.notifyReseller(updated, 'baji_order_delivered', {
      orderNo: updated.orderNo,
      earnings: formatPkr(this.resellerEarnings(updated)),
    })
    await this.analytics.track({
      name: 'fee_earned',
      actorType: actor.actorType,
      actorId: actor.actorId,
      properties: { orderNo: updated.orderNo, amount: updated.bajiFee },
    })

    return updated
  }

  /** RTO — fee WRITTEN_OFF hoti hai, row delete nahi hoti (nuqsan naapna zaroori hai). */
  async markRto(orderId: string, reason: string, actorId: string): Promise<InternalOrderView> {
    const updated = await this.transition(orderId, 'RTO', {
      actorType: 'ops',
      actorId,
      note: reason,
    })
    await this.feeLedger.markWrittenOff(orderId, `RTO: ${reason}`)
    await this.releaseStock(updated, 'RETURN_TO_SHELF')
    await this.analytics.track({
      name: 'order_rto',
      actorType: 'ops',
      actorId,
      properties: { orderNo: updated.orderNo, reason },
    })
    return updated
  }

  async cancel(
    orderNo: string,
    resellerId: string,
    reason: string,
  ): Promise<InternalOrderView> {
    const order = await this.requireResellerOrder(orderNo, resellerId)
    const updated = await this.transition(order.id, 'CANCELLED', {
      actorType: 'reseller',
      actorId: resellerId,
      note: reason,
    })
    if (order.confirmedAt) await this.feeLedger.markWrittenOff(order.id, `Cancelled: ${reason}`)
    return updated
  }

  private async transition(
    orderId: string,
    to: OrderStatus,
    actor: {
      actorType: 'reseller' | 'supplier' | 'ops' | 'system'
      actorId?: string
      note?: string
      shipment?: { courier: string; trackingNo: string | null }
    },
  ): Promise<InternalOrderView> {
    const order = await this.orders.findById(orderId)
    if (!order) throw new NotFoundError('Order', orderId)

    assertTransition(order.status, to, { confirmedAt: order.confirmedAt })

    return this.orders.applyStatusChange({
      orderId,
      from: order.status,
      to,
      at: this.clock.now(),
      actorType: actor.actorType,
      actorId: actor.actorId,
      note: actor.note,
      ...(actor.shipment ? { shipment: actor.shipment } : {}),
    })
  }

  /**
   * Ek number ka record — order lagane se PEHLE.
   *
   * 🔴 Ye reseller ko rokta NAHI, sirf batata hai. Faisla us ka hai.
   *
   * Rok lagane ka matlab hota ke hum ek aise shakhs ko black-list kar rahe hain jo kabhi
   * hamare saamne aaya hi nahi aur jis ke paas safai ka koi rasta nahi. Aur wo aksar
   * ghalat bhi hota: pichli teen wapsiyan kisi aur reseller ki ghalti se bhi ho sakti
   * hain — ghalat pata, bura maal, ya courier.
   *
   * Reseller ko jo chahiye wo ijazat nahi, KHABAR hai: "is number par pehle bhi wapsi
   * hui hai" — phir wo khud tay karti hai ke advance mangwaye, ya call kare, ya bhej de.
   */
  async phoneRecordFor(phone: string): Promise<PhoneRecord> {
    return phoneRecord(await this.orders.outcomesForPhone(phoneKey(phone)))
  }

  // ------------------------------------------------------------------ reads

  async getForReseller(orderNo: string, resellerId: string): Promise<ResellerOrderView> {
    const order = await this.orders.findForReseller(resellerId, orderNo)
    if (!order) throw new NotFoundError('Order', orderNo)
    return order
  }

  listForReseller(
    resellerId: string,
    query: CursorQuery & { status?: OrderStatus },
  ): Promise<Page<ResellerOrderView>> {
    return this.orders.listForReseller(resellerId, query)
  }

  /** Reseller ka munafa — bajiPrice aur us ke retail ka farq. */
  static earningsOf(items: readonly OrderLineView[]): Pkr {
    if (items.length === 0) return pkr(0)
    return addPkr(
      ...items.map((i) => multiplyPkr(subtractPkr(i.retailPriceSnapshot, i.bajiPriceSnapshot), i.qty)),
    )
  }

  private async requireResellerOrder(
    orderNo: string,
    resellerId: string,
  ): Promise<InternalOrderView> {
    const view = await this.orders.findForReseller(resellerId, orderNo)
    if (!view) throw new NotFoundError('Order', orderNo)

    const order = await this.orders.findById(view.id)
    if (!order) throw new NotFoundError('Order', orderNo)
    if (order.resellerId !== resellerId) throw new ForbiddenError()
    return order
  }
}
