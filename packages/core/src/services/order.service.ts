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
  type Page,
  type Pkr,
} from '@oyebazar/shared'
import { assertTransition, type OrderStatus } from '../domain/order-status'
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

    const subtotal = addPkr(...lines.map((l) => multiplyPkr(l.retailPriceSnapshot, l.qty)))
    const total = addPkr(subtotal, command.deliveryFee)
    const bajiFee = calculateBajiFee(lines, supplier.feeRateBps)

    const order = await this.orders.create({
      orderNo: await this.orderNumbers.next(),
      resellerId: command.resellerId,
      supplierId,
      customer: command.customer,
      lines,
      subtotal,
      deliveryFee: command.deliveryFee,
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
    return updated
  }

  // ------------------------------------------------------------------ fulfilment

  /**
   * 🔴 Wholesaler ko bhejna. `confirmedAt` null ho to state machine yahin rok deti hai —
   * ye check service layer mein hai, UI mein nahi.
   */
  async sendToSupplier(orderId: string, opsUserId: string): Promise<InternalOrderView> {
    const order = await this.orders.findById(orderId)
    if (!order) throw new NotFoundError('Order', orderId)

    assertTransition(order.status, 'SENT_TO_SUPPLIER', { confirmedAt: order.confirmedAt })

    const updated = await this.orders.applyStatusChange({
      orderId,
      from: order.status,
      to: 'SENT_TO_SUPPLIER',
      at: this.clock.now(),
      actorType: 'ops',
      actorId: opsUserId,
    })

    // 🔴 Magic link — wholesaler isi se order dekh kar accept/reject karta hai.
    // Token har order ka apna hai; ek order ka link doosre order par nahi chalta.
    const token = this.tokens.randomToken(32)
    await this.orders.setSupplierToken(orderId, token)

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
          // Message fail hone se order na ruke — ops console par order phir bhi dikhega
          this.logger.error('supplier_notify_failed', {
            orderNo: order.orderNo,
            error: error instanceof Error ? error.message : String(error),
          })
        })
    }

    return updated
  }

  // ------------------------------------------------------- wholesaler ka jawab

  /** Magic link se order dikhana — token hi chabi hai, koi login nahi. */
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
      actorType: 'ops',
      actorId: `supplier:${order.supplierId}`,
      note: via === 'link' ? 'Wholesaler ne link se qubool kiya' : 'Wholesaler ne portal se qubool kiya',
    })

    await this.analytics.track({
      name: 'order_accepted_by_supplier',
      actorType: 'ops',
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
      actorType: 'ops',
      actorId: `supplier:${order.supplierId}`,
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

    await this.notifyReseller(order, 'baji_order_rejected', {
      orderNo: order.orderNo,
      reason,
    })

    await this.analytics.track({
      name: 'order_rejected_by_supplier',
      actorType: 'ops',
      properties: { orderNo: order.orderNo, supplierId: order.supplierId, reason },
    })

    return cancelled
  }

  /** Reseller ko WhatsApp — message fail ho to order na ruke. */
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

    await this.feeLedger.markEarned(orderId, this.clock.now())
    await this.analytics.track({
      name: 'fee_earned',
      actorType: 'ops',
      actorId,
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
    actor: { actorType: 'reseller' | 'ops' | 'system'; actorId?: string; note?: string },
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
    })
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
