/**
 * OrderRepository — Prisma adapter.
 *
 * 🔴 Do surfaces, do shapes:
 *   · `findForReseller` / `listForReseller` → RESELLER view (supplier ka koi zikr nahi)
 *   · `findById` → INTERNAL view (supplier cost, fee) — sirf service/ops ke liye
 *
 * Status change aur audit event HAMESHA ek transaction mein — warna kisi din event
 * gum ho jayega aur order ki tareekh adhoori reh jayegi.
 */
import type { Prisma, PrismaClient } from '@prisma/client'
import type {
  InternalOrderView,
  OrderRepository,
  OrderStatusChange,
  PendingConfirmationOrder,
  StuckInTransitOrder,
  PersistOrderInput,
  SupplierOrderView,
  ResellerOrderView,
  OrderRiskFacts,
  CursorQuery,
  OrderStatus,
} from '@oyebazar/core'
import { pkr, toPage, type Page } from '@oyebazar/shared'

const INTERNAL_SELECT = {
  id: true,
  orderNo: true,
  resellerId: true,
  supplierId: true,
  status: true,
  total: true,
  bajiFee: true,
  feeRateBps: true,
  confirmedAt: true,
  confirmedBy: true,
  items: {
    select: {
      productId: true,
      variantId: true,
      qty: true,
      supplierPriceSnapshot: true,
      bajiPriceSnapshot: true,
      retailPriceSnapshot: true,
    },
  },
} satisfies Prisma.OrderSelect

/** 🔴 supplierId, supplierPriceSnapshot, bajiFee — in mein se kuch bhi yahan nahi. */
/**
 * 🔴 Wholesaler ko dikhne wale khaane. `retailPriceSnapshot` aur `bajiPriceSnapshot`
 * yahan JAAN BOOJH KAR nahi hain — us ko sirf apni raqam dikhni chahiye. Agar us ko
 * reseller ka retail nazar aa gaya to us ke paas hamein bypass karne ki wajah ban jati hai.
 */
const SUPPLIER_SELECT = {
  id: true,
  orderNo: true,
  // RTO ka record isi se banta hai — dukan ko qubool karne se pehle
  resellerId: true,
  // Magic link par login nahi hota — "main kaun hoon" ka jawab order se aata hai
  supplierId: true,
  status: true,
  customerName: true,
  customerPhone: true,
  customerAddress: true,
  area: true,
  locationLat: true,
  locationLng: true,
  paymentMethod: true,
  // Wapsi par yehi raqam jati hai — dukan ka apna rate, snapshot shuda
  deliveryFee: true,
  total: true,
  createdAt: true,
  acceptedAt: true,
  dispatchedAt: true,
  courier: true,
  trackingNo: true,
  items: {
    select: {
      qty: true,
      supplierPriceSnapshot: true,
      productId: true,
    },
  },
} as const

const RESELLER_SELECT = {
  id: true,
  orderNo: true,
  status: true,
  customerName: true,
  customerPhone: true,
  customerAddress: true,
  area: true,
  subtotal: true,
  deliveryFee: true,
  total: true,
  confirmedAt: true,
  confirmedBy: true,
  createdAt: true,
  // Courier aur CN — dukan ki shanakht nahi, parcel ki. Reseller ka apna kaam.
  dispatchedAt: true,
  courier: true,
  trackingNo: true,
  items: {
    select: {
      productId: true,
      qty: true,
      bajiPriceSnapshot: true,
      retailPriceSnapshot: true,
      // supplierPriceSnapshot: JAAN BOOJH KAR NAHI
    },
  },
} satisfies Prisma.OrderSelect

type InternalRow = Prisma.OrderGetPayload<{ select: typeof INTERNAL_SELECT }>
type ResellerRow = Prisma.OrderGetPayload<{ select: typeof RESELLER_SELECT }>

function toInternal(row: InternalRow): InternalOrderView {
  return {
    id: row.id,
    orderNo: row.orderNo,
    resellerId: row.resellerId,
    supplierId: row.supplierId,
    status: row.status,
    total: pkr(row.total),
    bajiFee: pkr(row.bajiFee),
    feeRateBps: row.feeRateBps,
    confirmedAt: row.confirmedAt,
    confirmedBy: row.confirmedBy,
    items: row.items.map((item) => ({
      productId: item.productId,
      variantId: item.variantId,
      qty: item.qty,
      supplierPriceSnapshot: pkr(item.supplierPriceSnapshot),
      bajiPriceSnapshot: pkr(item.bajiPriceSnapshot),
      retailPriceSnapshot: pkr(item.retailPriceSnapshot),
    })),
  }
}

export class PrismaOrderRepository implements OrderRepository {
  constructor(private readonly db: PrismaClient) {}

  async create(input: PersistOrderInput): Promise<InternalOrderView> {
    const row = await this.db.order.create({
      data: {
        orderNo: input.orderNo,
        resellerId: input.resellerId,
        supplierId: input.supplierId,
        customerName: input.customer.name,
        customerPhone: input.customer.phone,
        customerAddress: input.customer.address,
        area: input.customer.area,
        locationLat: input.customer.locationLat ?? null,
        locationLng: input.customer.locationLng ?? null,
        subtotal: input.subtotal,
        deliveryFee: input.deliveryFee,
        total: input.total,
        bajiFee: input.bajiFee,
        feeRateBps: input.feeRateBps,
        paymentMethod: input.paymentMethod,
        status: 'PENDING_CONFIRM',
        idempotencyKey: input.idempotencyKey ?? null,
        items: {
          create: input.lines.map((line) => ({
            productId: line.productId,
            variantId: line.variantId,
            qty: line.qty,
            supplierPriceSnapshot: line.supplierPriceSnapshot,
            bajiPriceSnapshot: line.bajiPriceSnapshot,
            retailPriceSnapshot: line.retailPriceSnapshot,
          })),
        },
        events: {
          create: {
            toStatus: 'PENDING_CONFIRM',
            actorType: 'reseller',
            actorId: input.resellerId,
          },
        },
      },
      select: INTERNAL_SELECT,
    })
    return toInternal(row)
  }

  /**
   * Wholesaler ka magic link.
   *
   * 🔴 Select mein reseller ka retail price NAHI hai — wholesaler ko sirf apna price
   * dikhta hai. Us ko ye pata chal gaya ke reseller kis bhaav bech rahi hai, to wo
   * kal usay bypass karne ki soch sakta hai.
   */
  async findBySupplierToken(token: string): Promise<SupplierOrderView | null> {
    const row = await this.db.order.findUnique({
      where: { supplierToken: token },
      select: SUPPLIER_SELECT,
    })
    if (!row) return null
    return this.toSupplierView(row, await this.loadTitles([row]))
  }

  /**
   * 🔴 supplierId `where` ke andar hai, baad ke filter mein nahi — doosre wholesaler ka
   * order query se nikalta hi nahi.
   */
  async listForSupplier(
    supplierId: string,
    query: CursorQuery & { status?: OrderStatus | undefined },
  ): Promise<Page<SupplierOrderView>> {
    const rows = await this.db.order.findMany({
      where: { supplierId, ...(query.status ? { status: query.status } : {}) },
      select: SUPPLIER_SELECT,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    })

    // Titles ek hi query mein — warna har order par ek aur query (N+1)
    const titles = await this.loadTitles(rows)
    const views = rows.map((row) => this.toSupplierView(row, titles))
    return toPage(views, query.limit, (o) => o.id)
  }

  async findForSupplier(supplierId: string, orderNo: string): Promise<SupplierOrderView | null> {
    const row = await this.db.order.findFirst({
      where: { orderNo, supplierId },
      select: SUPPLIER_SELECT,
    })
    if (!row) return null
    return this.toSupplierView(row, await this.loadTitles([row]))
  }

  private async loadTitles(
    rows: readonly Prisma.OrderGetPayload<{ select: typeof SUPPLIER_SELECT }>[],
  ): Promise<Map<string, { titleUr: string; titleEn: string }>> {
    const ids = [...new Set(rows.flatMap((row) => row.items.map((item) => item.productId)))]
    if (ids.length === 0) return new Map()

    const products = await this.db.product.findMany({
      where: { id: { in: ids } },
      select: { id: true, titleUr: true, titleEn: true },
    })
    return new Map(products.map((p) => [p.id, { titleUr: p.titleUr, titleEn: p.titleEn }]))
  }

  private toSupplierView(
    row: Prisma.OrderGetPayload<{ select: typeof SUPPLIER_SELECT }>,
    titles: Map<string, { titleUr: string; titleEn: string }>,
  ): SupplierOrderView {
    return {
      id: row.id,
      orderNo: row.orderNo,
      resellerId: row.resellerId,
      supplierId: row.supplierId,
      status: row.status,
      customerName: row.customerName,
      customerPhone: row.customerPhone,
      customerAddress: row.customerAddress,
      area: row.area,
      locationLat: row.locationLat,
      locationLng: row.locationLng,
      paymentMethod: row.paymentMethod,
      deliveryFee: pkr(row.deliveryFee),
      total: pkr(row.total),
      createdAt: row.createdAt,
      acceptedAt: row.acceptedAt,
      dispatchedAt: row.dispatchedAt,
      courier: row.courier,
      trackingNo: row.trackingNo,
      items: row.items.map((item) => ({
        titleUr: titles.get(item.productId)?.titleUr ?? '',
        titleEn: titles.get(item.productId)?.titleEn ?? '',
        qty: item.qty,
        supplierPrice: pkr(item.supplierPriceSnapshot),
      })),
    }
  }

  async setSupplierToken(orderId: string, token: string): Promise<void> {
    await this.db.order.update({ where: { id: orderId }, data: { supplierToken: token } })
  }

  async findById(orderId: string): Promise<InternalOrderView | null> {
    const row = await this.db.order.findUnique({ where: { id: orderId }, select: INTERNAL_SELECT })
    return row ? toInternal(row) : null
  }

  async findByIdempotencyKey(resellerId: string, key: string): Promise<InternalOrderView | null> {
    const row = await this.db.order.findFirst({
      where: { resellerId, idempotencyKey: key },
      select: INTERNAL_SELECT,
    })
    return row ? toInternal(row) : null
  }

  async findForReseller(resellerId: string, orderNo: string): Promise<ResellerOrderView | null> {
    const row = await this.db.order.findFirst({
      where: { orderNo, resellerId },
      select: RESELLER_SELECT,
    })
    if (!row) return null
    // Ek order — wohi helper, bas usi ke maal ke naam
    return this.toResellerView(row, await this.titlesFor(row.items.map((i) => i.productId)))
  }

  async listForReseller(
    resellerId: string,
    query: CursorQuery & { status?: OrderStatus | undefined },
  ): Promise<Page<ResellerOrderView>> {
    const rows = await this.db.order.findMany({
      where: { resellerId, ...(query.status ? { status: query.status } : {}) },
      select: RESELLER_SELECT,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    })

    /*
     * 🔴 Maal ke naam SAB orders ke liye EK query mein — pehle har order ki apni thi.
     *
     * `Promise.all(rows.map(...))` parallel dikhta hai magar wo N+1 hai: bees order =
     * bees alag query. Saath saath chalne se DB par bojh kam nahi hota, sirf ek hi lamhe
     * mein par jata hai — aur connection pool theek us waqt bharta hai jab safha sab se
     * ziyada khulta hai.
     */
    const titles = await this.titlesFor(rows.flatMap((row) => row.items.map((i) => i.productId)))
    const views = rows.map((row) => this.toResellerView(row, titles))
    return toPage(views, query.limit, (o) => o.id)
  }

  /** 🔴 Status + audit event ek saath. Ek bhi kam hua to order ki tareekh jhooti ho jati hai. */
  async applyStatusChange(change: OrderStatusChange): Promise<InternalOrderView> {
    const [, updated] = await this.db.$transaction([
      this.db.orderEvent.create({
        data: {
          orderId: change.orderId,
          fromStatus: change.from,
          toStatus: change.to,
          actorType: change.actorType,
          actorId: change.actorId ?? null,
          note: change.note ?? null,
          createdAt: change.at,
        },
      }),
      this.db.order.update({
        where: { id: change.orderId },
        data: {
          status: change.to,
          ...(change.to === 'CONFIRMED'
            ? { confirmedAt: change.at, confirmedBy: change.confirmedBy ?? 'RESELLER' }
            : {}),
          ...(change.to === 'SENT_TO_SUPPLIER' ? { sentToSupplierAt: change.at } : {}),
          ...(change.to === 'ACCEPTED' ? { acceptedAt: change.at } : {}),
          ...(change.to === 'REJECTED'
            ? { rejectedAt: change.at, rejectionReason: change.rejectionReason ?? change.note ?? null }
            : {}),
          /*
           * Courier aur CN status ke SAATH, usi ek update mein.
           *
           * 🔴 Alag call se likhne ka matlab hota ke beech mein kuch toot jane par order
           * "raste mein" ho jata magar CN kahin likha hi na jata — aur us soorat mein
           * dobara likhne ka koi rasta bhi nahi tha, kyunke DISPATCHED se DISPATCHED
           * wali transition mana hai.
           */
          ...(change.to === 'DISPATCHED'
            ? {
                dispatchedAt: change.at,
                ...(change.shipment
                  ? {
                      courier: change.shipment.courier,
                      trackingNo: change.shipment.trackingNo,
                    }
                  : {}),
              }
            : {}),
          ...(change.to === 'DELIVERED' ? { deliveredAt: change.at } : {}),
          ...(change.to === 'RTO' ? { rtoReason: change.note ?? null } : {}),
        },
        select: INTERNAL_SELECT,
      }),
    ])

    return toInternal(updated)
  }

  async findAwaitingConfirmation(options: {
    olderThan: Date
    onlyWithoutReminder: boolean
    limit: number
  }): Promise<PendingConfirmationOrder[]> {
    const rows = await this.db.order.findMany({
      where: {
        status: 'PENDING_CONFIRM',
        createdAt: { lt: options.olderThan },
        ...(options.onlyWithoutReminder ? { reminderSentAt: null } : {}),
      },
      select: {
        id: true,
        orderNo: true,
        resellerId: true,
        customerName: true,
        total: true,
        createdAt: true,
        reminderSentAt: true,
        reseller: { select: { name: true, whatsappPhone: true } },
      },
      orderBy: { createdAt: 'asc' },
      take: options.limit,
    })

    return rows.map((row) => ({
      id: row.id,
      orderNo: row.orderNo,
      resellerId: row.resellerId,
      resellerName: row.reseller.name,
      resellerPhone: row.reseller.whatsappPhone,
      customerName: row.customerName,
      total: pkr(row.total),
      createdAt: row.createdAt,
      reminderSentAt: row.reminderSentAt,
    }))
  }

  async markReminderSent(orderId: string, at: Date): Promise<void> {
    await this.db.order.update({ where: { id: orderId }, data: { reminderSentAt: at } })
  }

  async outcomesForPhone(phoneKey: string): Promise<{ delivered: number; returned: number }> {
    /*
     * 🔴 `groupBy` — sirf GINTI, koi row nahi.
     *
     * `findMany` se bhi ye kaam ho jata, magar us soorat mein doosri resellers ke order
     * is process ki yaadasht mein aa jate: naam, pata, raqam, sab kuch. Jo data uthaya
     * hi na jaye, wo galti se leak bhi nahi ho sakta. Hifazat wahan lagti hai jahan
     * QUERY likhi jati hai, us ke baad wale mapper mein nahi.
     *
     * Aur sirf MUKAMMAL order: raste wale ka koi natija hai hi nahi, aur usay "abhi
     * wapas nahi aaya" keh kar achha ginna ghalat jawab dega.
     */
    const grouped = await this.db.order.groupBy({
      by: ['status'],
      where: { customerPhone: phoneKey, status: { in: ['DELIVERED', 'RTO'] } },
      _count: { _all: true },
    })

    const count = (status: 'DELIVERED' | 'RTO') =>
      grouped.find((row) => row.status === status)?._count._all ?? 0

    return { delivered: count('DELIVERED'), returned: count('RTO') }
  }

  async findStuckInTransit(options: {
    olderThan: Date
    limit: number
  }): Promise<StuckInTransitOrder[]> {
    const rows = await this.db.order.findMany({
      where: {
        status: 'DISPATCHED',
        // Ginti bhejne ke din se, order banne ke din se nahi
        dispatchedAt: { lt: options.olderThan },
        // Ek hi dafa poochha jata hai — roz ka nag paighaam parhna band karwa deta hai
        transitReminderAt: null,
      },
      select: {
        id: true,
        orderNo: true,
        supplierId: true,
        customerName: true,
        dispatchedAt: true,
        supplier: { select: { phone: true } },
      },
      orderBy: { dispatchedAt: 'asc' },
      take: options.limit,
    })

    return rows.flatMap((row) =>
      // `dispatchedAt` schema mein optional hai magar DISPATCHED par hamesha likha jata
      // hai; TypeScript ko ye pata nahi, aur bina tareekh ke "kitne din" ka jawab hi
      // nahi banta — is liye aisi qatar chhorh dete hain, farz nahi karte
      row.dispatchedAt
        ? [
            {
              id: row.id,
              orderNo: row.orderNo,
              supplierId: row.supplierId,
              supplierPhone: row.supplier.phone,
              customerName: row.customerName,
              dispatchedAt: row.dispatchedAt,
            },
          ]
        : [],
    )
  }

  async markTransitReminderSent(orderId: string, at: Date): Promise<void> {
    await this.db.order.update({ where: { id: orderId }, data: { transitReminderAt: at } })
  }

  async listForOps(filters: {
    status?: OrderStatus | undefined
    supplierId?: string | undefined
    search?: string | undefined
    limit: number
    cursor?: string | undefined
  }): Promise<Page<InternalOrderView>> {
    /*
     * Talash — order ka number YA customer ka phone.
     *
     * 🔴 Sirf ye do khaane, aur ye hadd jaan boojh kar hai. Customer ka NAAM
     * shamil karne ka matlab hota ke "Ayesha" par teen sau qatarein aayen aur ops ko
     * un mein se chunna pare — yani talash ne kaam asaan nahi, ek naya kaam banaya.
     * Number aur phone dono aise hain jo ya to milte hain ya nahi.
     *
     * Phone se `-` aur khali jagah hata di jati hai: log usay "0300-1234567" aur
     * "0300 1234567" dono tarah likhte hain, aur DB mein wo ek hi shakl mein para hai.
     * Bina is ke talash us shakhs par nakaam hoti jis ne number theek likha ho.
     *
     * `mode: 'insensitive'` sirf order ke number par — "bj-1043" bhi milna chahiye.
     */
    const search = filters.search?.trim()
    const phoneish = search?.replace(/[\s-]/g, '')

    const rows = await this.db.order.findMany({
      where: {
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.supplierId ? { supplierId: filters.supplierId } : {}),
        ...(search
          ? {
              OR: [
                { orderNo: { contains: search, mode: 'insensitive' as const } },
                ...(phoneish ? [{ customerPhone: { contains: phoneish } }] : []),
              ],
            }
          : {}),
      },
      select: INTERNAL_SELECT,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: filters.limit + 1,
      ...(filters.cursor ? { cursor: { id: filters.cursor }, skip: 1 } : {}),
    })
    return toPage(rows.map(toInternal), filters.limit, (o) => o.id)
  }

  /**
   * Wapsi ke andaze ka kachcha maal — teen chhoti query, chahe kitne hi order hon.
   *
   * 🔴 Har order par alag query BILKUL nahi: ye safha dukan wala din mein sab se zyada
   * kholta hai, aur wahi ghalti stock wale safhe par pehle ho chuki hai (chalees maal =
   * chalees chakkar). Yahan wo shuru se hi ek chakkar hai.
   *
   * Sirf MUKAMMAL hue order ginte hain (pohancha ya wapas aya). Raste wale shamil karne
   * se har naya ilaqa aur har naya customer achha lagta hai — kyunke us ka anjaam abhi
   * maloom hi nahi.
   */
  async riskFacts(input: {
    supplierId: string
    orderIds: readonly string[]
  }): Promise<OrderRiskFacts> {
    // Sirf MUKAMMAL hue order — raste wale ka anjaam abhi maloom hi nahi
    const finished: Prisma.EnumOrderStatusFilter = { in: ['DELIVERED', 'RTO'] }

    if (input.orderIds.length === 0) return { medianOrder: 0, byOrder: new Map() }

    const targets = await this.db.order.findMany({
      where: { id: { in: [...input.orderIds] }, supplierId: input.supplierId },
      select: { id: true, customerPhone: true, area: true },
    })
    if (targets.length === 0) return { medianOrder: 0, byOrder: new Map() }

    const phones = [...new Set(targets.map((row) => row.customerPhone))]
    const areas = [...new Set(targets.map((row) => row.area))]

    const [customerRows, areaRows, totals] = await Promise.all([
      this.db.order.groupBy({
        by: ['customerPhone', 'status'],
        where: { customerPhone: { in: phones }, status: finished },
        _count: { _all: true },
      }),
      this.db.order.groupBy({
        by: ['area', 'status'],
        where: { area: { in: areas }, status: finished },
        _count: { _all: true },
      }),
      /*
       * Darmiyana nikalne ke liye sirf totals — aur sirf aakhri 200.
       *
       * Hadd is liye ke ye safhe ke har khulne par chalta hai; aur nayi is liye ke
       * "bara order" ka pemana dukan ke AAJ ke karobar se banna chahiye, us se nahi jo
       * do saal pehle bikta tha.
       */
      this.db.order.findMany({
        where: { supplierId: input.supplierId, status: finished },
        select: { total: true },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
    ])

    const tally = (
      rows: readonly { status: OrderStatus; key: string; count: number }[],
    ): Map<string, { delivered: number; rto: number }> => {
      const map = new Map<string, { delivered: number; rto: number }>()
      for (const row of rows) {
        const bucket = map.get(row.key) ?? { delivered: 0, rto: 0 }
        if (row.status === 'DELIVERED') bucket.delivered += row.count
        else bucket.rto += row.count
        map.set(row.key, bucket)
      }
      return map
    }

    const byPhone = tally(
      customerRows.map((row) => ({
        status: row.status,
        key: row.customerPhone,
        count: row._count._all,
      })),
    )
    const byArea = tally(
      areaRows.map((row) => ({ status: row.status, key: row.area, count: row._count._all })),
    )
    const none = { delivered: 0, rto: 0 }

    const byOrder = new Map(
      targets.map((row) => [
        row.id,
        {
          /*
           * 🔴 Ginti mein YE order khud shamil nahi ho sakta — wo abhi mukammal hua hi
           * nahi (SENT_TO_SUPPLIER hai). Isi liye alag se nikalne ki zaroorat nahi.
           */
          customer: byPhone.get(row.customerPhone) ?? none,
          area: byArea.get(row.area) ?? none,
        },
      ]),
    )

    return { medianOrder: median(totals.map((row) => row.total)), byOrder }
  }

  async findPendingConfirmationBefore(cutoff: Date, limit: number): Promise<InternalOrderView[]> {
    const rows = await this.db.order.findMany({
      where: { status: 'PENDING_CONFIRM', createdAt: { lt: cutoff } },
      select: INTERNAL_SELECT,
      orderBy: { createdAt: 'asc' },
      take: limit,
    })
    return rows.map(toInternal)
  }

  /** Reseller view mein product ka title chahiye — items ke saath ek hi query mein. */
  /** Maal ke naam — ek hi query, chahe kitne bhi order hon */
  private async titlesFor(productIds: readonly string[]): Promise<Map<string, string>> {
    if (productIds.length === 0) return new Map()

    const products = await this.db.product.findMany({
      // Ek hi maal kai orders mein ho sakta hai — dohra id bhejne ka koi faida nahi
      where: { id: { in: [...new Set(productIds)] } },
      select: { id: true, titleUr: true },
    })

    return new Map(products.map((p) => [p.id, p.titleUr]))
  }

  private toResellerView(row: ResellerRow, titles: Map<string, string>): ResellerOrderView {
    const myEarnings = row.items.reduce(
      (sum, item) => sum + (item.retailPriceSnapshot - item.bajiPriceSnapshot) * item.qty,
      0,
    )

    return {
      id: row.id,
      orderNo: row.orderNo,
      status: row.status,
      customerName: row.customerName,
      customerPhone: row.customerPhone,
      customerAddress: row.customerAddress,
      area: row.area,
      subtotal: pkr(row.subtotal),
      deliveryFee: pkr(row.deliveryFee),
      total: pkr(row.total),
      myEarnings: pkr(Math.max(myEarnings, 0)),
      confirmedAt: row.confirmedAt,
      confirmedBy: row.confirmedBy,
      createdAt: row.createdAt,
      courier: row.courier,
      trackingNo: row.trackingNo,
      dispatchedAt: row.dispatchedAt,
      items: row.items.map((item) => ({
        productId: item.productId,
        titleUr: titles.get(item.productId) ?? '',
        qty: item.qty,
        bajiPrice: pkr(item.bajiPriceSnapshot),
        retailPrice: pkr(item.retailPriceSnapshot),
      })),
    }
  }
}

/**
 * Darmiyana — ausat nahi.
 *
 * Ek Rs 90,000 wala order ausat ko itna upar utha deta hai ke phir har aam order
 * "chhota" lag ta hai aur "bara order" wali wajah kabhi lagti hi nahi. Darmiyane par
 * ek order ka koi asar nahi parta.
 */
function median(values: readonly number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? Math.round(((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2)
    : (sorted[middle] ?? 0)
}
