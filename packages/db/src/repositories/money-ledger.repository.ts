/**
 * Dono taraf ka poora hisab.
 *
 * Tareeqa: DB se do chhote grouped natije lo (order ki ginti, paison ka jama) aur JS
 * mein jorh do. Ek bara join likhna mumkin tha magar us mein har naya sawal poori query
 * badalta — aur ye safha har hafte badalta rahega.
 *
 * 🔴 Order ki ginti Order table se aati hai, payout se nahi. Payout ki row sirf pohanche
 * hue order par banti hai; usi se ginte to reseller ko lagta ke us ke aadhe order gum
 * ho gaye — jo raste mein hain ya wapas aa gaye, wo kahin dikhte hi nahi.
 */
import type { PrismaClient } from '@prisma/client'
import type {
  CounterpartyLedgerRow,
  DisputedPayoutRow,
  MoneyLedgerRepository,
  ResellerRiskRecord,
  SupplierPaymentRecord,
} from '@oyebazar/core'
import { pkr, type Pkr } from '@oyebazar/shared'

/** Ye teen halaton mein kisi ka kisi par kuch nahi banta. */
const LOST_STATUSES = ['CANCELLED', 'REJECTED', 'RTO'] as const

interface Bucket {
  ordersTotal: number
  ordersDelivered: number
  ordersLost: number
  earned: number
  received: number
  awaiting: number
  disputedCount: number
  oldestAwaitingAt: Date | null
  lastOrderAt: Date | null
}

function emptyBucket(): Bucket {
  return {
    ordersTotal: 0,
    ordersDelivered: 0,
    ordersLost: 0,
    earned: 0,
    received: 0,
    awaiting: 0,
    disputedCount: 0,
    oldestAwaitingAt: null,
    lastOrderAt: null,
  }
}

function daysSince(date: Date | null, now: number): number {
  if (!date) return 0
  return Math.floor((now - date.getTime()) / 86_400_000)
}

function finish(
  id: string,
  name: string,
  city: string,
  bucket: Bucket,
  now: number,
): CounterpartyLedgerRow {
  return {
    id,
    name,
    city,
    ordersTotal: bucket.ordersTotal,
    ordersDelivered: bucket.ordersDelivered,
    ordersRunning: bucket.ordersTotal - bucket.ordersDelivered - bucket.ordersLost,
    ordersLost: bucket.ordersLost,
    earned: pkr(bucket.earned),
    received: pkr(bucket.received),
    awaiting: pkr(bucket.awaiting),
    disputedCount: bucket.disputedCount,
    oldestAwaitingDays: daysSince(bucket.oldestAwaitingAt, now),
    lastOrderAt: bucket.lastOrderAt,
  }
}

export class PrismaMoneyLedgerRepository implements MoneyLedgerRepository {
  constructor(private readonly db: PrismaClient) {}

  async bySupplierForReseller(resellerId: string): Promise<CounterpartyLedgerRow[]> {
    const [orders, payouts] = await Promise.all([
      this.db.order.findMany({
        where: { resellerId },
        select: {
          supplierId: true,
          status: true,
          createdAt: true,
          supplier: { select: { businessName: true, city: true } },
        },
      }),
      this.db.resellerPayout.findMany({
        where: { resellerId },
        select: { supplierId: true, amount: true, status: true, createdAt: true },
      }),
    ])

    const names = new Map<string, { name: string; city: string }>()
    const buckets = new Map<string, Bucket>()

    /*
     * 🔴 Yahan pehle laqab ("Dukan 1") jata tha, asli naam nahi — aur wo faisla WAPAS
     * le liya gaya hai. Wajah ye nahi ke usool badal gaya; wajah ye ke us usool ka
     * yahan koi faida tha hi nahi.
     *
     * Purani dalil: naam mil jaye to reseller Bazaar se dukan ka WhatsApp number nikal
     * kar seedha sauda kar sakti hai. Magar wo naam usay pehle se mil raha hai — maal
     * ke apne safhe par (`/catalogue/<id>`) aur `/wholesalers` par, dono login ke andar,
     * aur `/bazaar` par to wo Google par bhi hai. Yani raaz kabhi raaz tha hi nahi.
     *
     * Rehta sirf us ka KHARCHA tha, aur wo poora reseller par tha: "Dukan 1 ke paas
     * Rs 750 atke hain" us ke liye ek pahaili hai. Wo apna paisa maang nahi sakti agar
     * usay ye pata na ho ke kis se maangna hai — aur us safhe ka poora maqsad yehi ek
     * sawal hai.
     *
     * (`dto/supplier.ts` ka qaida apni jagah qaim hai: wo API ke jawab ke bare mein hai
     * jahan naam ka koi kaam nahi. Ye safha us se alag cheez hai — ye reseller ka apna
     * hisab hai.)
     */
    for (const order of orders) {
      names.set(order.supplierId, {
        name: order.supplier.businessName,
        city: order.supplier.city,
      })
      this.countOrder(buckets, order.supplierId, order.status, order.createdAt)
    }

    for (const payout of payouts) {
      this.countPayout(buckets, payout.supplierId, payout)
    }

    return this.assemble(buckets, names)
  }

  async byResellerForSupplier(supplierId: string): Promise<CounterpartyLedgerRow[]> {
    const [orders, payouts] = await Promise.all([
      this.db.order.findMany({
        where: { supplierId },
        select: {
          resellerId: true,
          status: true,
          createdAt: true,
          reseller: { select: { name: true, city: true } },
        },
      }),
      this.db.resellerPayout.findMany({
        where: { supplierId },
        select: { resellerId: true, amount: true, status: true, createdAt: true },
      }),
    ])

    const names = new Map<string, { name: string; city: string }>()
    const buckets = new Map<string, Bucket>()

    for (const order of orders) {
      names.set(order.resellerId, { name: order.reseller.name, city: order.reseller.city })
      this.countOrder(buckets, order.resellerId, order.status, order.createdAt)
    }

    for (const payout of payouts) {
      this.countPayout(buckets, payout.resellerId, payout)
    }

    return this.assemble(buckets, names)
  }

  async platformFeeForSupplier(supplierId: string): Promise<{
    earned: Pkr
    invoiced: Pkr
    collected: Pkr
  }> {
    const grouped = await this.db.feeLedger.groupBy({
      by: ['status'],
      where: { supplierId },
      _sum: { amount: true },
    })

    const sumOf = (status: string) =>
      grouped.find((row) => row.status === status)?._sum.amount ?? 0

    return {
      // PENDING jaan boojh kar shamil nahi — wo raste ka order hai, abhi kamai nahi
      earned: pkr(sumOf('EARNED')),
      invoiced: pkr(sumOf('INVOICED')),
      collected: pkr(sumOf('COLLECTED')),
    }
  }

  /**
   * Payment record — reseller ko faisle se pehle dikhne wala number.
   *
   * Aosat sirf BAND ho chuke hisab par ginta hai. Baqi rows ko shamil karte to jo dukan
   * abhi tak ek bhi hisab band nahi kar payi us ka aosat sab se achha aata — kyunke us
   * ki ginti abhi shuru hi nahi hui.
   */
  async paymentRecords(supplierIds: readonly string[]): Promise<SupplierPaymentRecord[]> {
    if (supplierIds.length === 0) return []

    const [rows, suppliers] = await Promise.all([
      this.db.resellerPayout.findMany({
        where: { supplierId: { in: [...supplierIds] } },
        select: { supplierId: true, status: true, createdAt: true, confirmedAt: true },
      }),
      this.db.supplier.findMany({
        where: { id: { in: [...supplierIds] } },
        select: { id: true, payoutTermDays: true },
      }),
    ])

    const promised = new Map(suppliers.map((s) => [s.id, s.payoutTermDays]))

    const now = Date.now()
    const acc = new Map<
      string,
      { total: number; settled: number; open: number; disputed: number; days: number[]; oldest: number }
    >()

    for (const row of rows) {
      const current = acc.get(row.supplierId) ?? {
        total: 0,
        settled: 0,
        open: 0,
        disputed: 0,
        days: [] as number[],
        oldest: 0,
      }

      current.total += 1

      if (row.status === 'SETTLED') {
        current.settled += 1
        if (row.confirmedAt) {
          current.days.push((row.confirmedAt.getTime() - row.createdAt.getTime()) / 86_400_000)
        }
      } else {
        current.open += 1
        if (row.status === 'DISPUTED') current.disputed += 1
        current.oldest = Math.max(current.oldest, Math.floor((now - row.createdAt.getTime()) / 86_400_000))
      }

      acc.set(row.supplierId, current)
    }

    return [...acc.entries()].map(([supplierId, value]) => ({
      supplierId,
      total: value.total,
      settled: value.settled,
      open: value.open,
      disputed: value.disputed,
      avgDaysToSettle:
        value.days.length > 0
          ? Math.round((value.days.reduce((sum, d) => sum + d, 0) / value.days.length) * 10) / 10
          : null,
      oldestOpenDays: value.oldest,
      promisedDays: promised.get(supplierId) ?? 3,
    }))
  }

  async paymentRecordForProduct(
    productId: string,
  ): Promise<Omit<SupplierPaymentRecord, 'supplierId'> | null> {
    const product = await this.db.product.findUnique({
      where: { id: productId },
      select: { supplierId: true },
    })
    if (!product) return null

    const [record] = await this.paymentRecords([product.supplierId])

    /*
     * Nayi dukan par abhi ek bhi hisab nahi bana — magar us ka WAADA phir bhi hai, aur
     * reseller ko wohi chahiye. Khali lauta dete to nayi dukan par safha bilkul khamosh
     * rehta aur us ke saath koi shart hi nazar na aati.
     */
    if (!record) {
      const supplier = await this.db.supplier.findUnique({
        where: { id: product.supplierId },
        select: { payoutTermDays: true },
      })
      return {
        total: 0,
        settled: 0,
        open: 0,
        disputed: 0,
        avgDaysToSettle: null,
        oldestOpenDays: 0,
        promisedDays: supplier?.payoutTermDays ?? 3,
      }
    }

    // supplierId yahin gir jati hai — safhe tak sirf ginti jati hai
    const { supplierId: _ignored, ...rest } = record
    return rest
  }

  async listDisputed(): Promise<DisputedPayoutRow[]> {
    const rows = await this.db.resellerPayout.findMany({
      where: { status: 'DISPUTED' },
      select: {
        id: true,
        amount: true,
        sentReference: true,
        sentAt: true,
        disputeNote: true,
        disputedAt: true,
        createdAt: true,
        order: { select: { orderNo: true } },
        supplier: { select: { businessName: true, phone: true } },
        reseller: { select: { name: true, whatsappPhone: true } },
      },
      // Sab se purana jhagra sab se upar — wahi sab se zyada bharosa kha chuka hai
      orderBy: { disputedAt: 'asc' },
      take: 100,
    })

    return rows.map((row) => ({
      id: row.id,
      orderNo: row.order.orderNo,
      amount: pkr(row.amount),
      supplierName: row.supplier.businessName,
      supplierPhone: row.supplier.phone,
      resellerName: row.reseller.name,
      resellerPhone: row.reseller.whatsappPhone,
      sentReference: row.sentReference,
      sentAt: row.sentAt,
      disputeNote: row.disputeNote,
      disputedAt: row.disputedAt,
      createdAt: row.createdAt,
    }))
  }

  async resellerRisk(
    resellerIds: readonly string[],
    supplierId?: string,
  ): Promise<ResellerRiskRecord[]> {
    if (resellerIds.length === 0) return []

    const orders = await this.db.order.findMany({
      where: {
        resellerId: { in: [...resellerIds] },
        ...(supplierId ? { supplierId } : {}),
      },
      select: { resellerId: true, status: true, deliveryFee: true },
    })

    const acc = new Map<string, { orders: number; delivered: number; rto: number; cost: number }>()

    for (const order of orders) {
      const current = acc.get(order.resellerId) ?? { orders: 0, delivered: 0, rto: 0, cost: 0 }
      current.orders += 1

      if (order.status === 'DELIVERED') current.delivered += 1
      if (order.status === 'RTO') {
        current.rto += 1
        current.cost += order.deliveryFee
      }

      acc.set(order.resellerId, current)
    }

    return [...acc.entries()].map(([resellerId, value]) => {
      /*
       * Rate sirf MUKAMMAL hue orders par: chal rahe order ka anjaam abhi maloom nahi,
       * aur unhen shamil karne se naya banda hamesha achha lagta hai (kyunke us ke
       * saare order abhi raaste mein hain).
       */
      const finished = value.delivered + value.rto

      return {
        resellerId,
        orders: value.orders,
        delivered: value.delivered,
        rto: value.rto,
        rtoRate: finished > 0 ? Math.round((value.rto / finished) * 100) : null,
        rtoDeliveryCost: pkr(value.cost),
      }
    })
  }

  private countOrder(
    buckets: Map<string, Bucket>,
    key: string,
    status: string,
    createdAt: Date,
  ): void {
    const bucket = buckets.get(key) ?? emptyBucket()

    bucket.ordersTotal += 1
    if (status === 'DELIVERED') bucket.ordersDelivered += 1
    if ((LOST_STATUSES as readonly string[]).includes(status)) bucket.ordersLost += 1
    if (!bucket.lastOrderAt || createdAt > bucket.lastOrderAt) bucket.lastOrderAt = createdAt

    buckets.set(key, bucket)
  }

  private countPayout(
    buckets: Map<string, Bucket>,
    key: string,
    payout: { amount: number; status: string; createdAt: Date },
  ): void {
    const bucket = buckets.get(key) ?? emptyBucket()

    // "Earned" har banayi gayi row hai — mila ya nahi, bana to hai
    bucket.earned += payout.amount

    if (payout.status === 'SETTLED') {
      bucket.received += payout.amount
    } else {
      bucket.awaiting += payout.amount
      if (payout.status === 'DISPUTED') bucket.disputedCount += 1
      if (!bucket.oldestAwaitingAt || payout.createdAt < bucket.oldestAwaitingAt) {
        bucket.oldestAwaitingAt = payout.createdAt
      }
    }

    buckets.set(key, bucket)
  }

  private assemble(
    buckets: Map<string, Bucket>,
    names: Map<string, { name: string; city: string }>,
  ): CounterpartyLedgerRow[] {
    const now = Date.now()

    return [...buckets.entries()]
      .map(([id, bucket]) =>
        finish(id, names.get(id)?.name ?? '—', names.get(id)?.city ?? '', bucket, now),
      )
      /*
       * Tarteeb: pehle wo jin ka paisa baqi hai (zyada baqi upar), phir baqi sab naye
       * order ke hisab se. Jama raqam se lagate to purane bare gahak hamesha upar rehte
       * aur wo dukan jis ne kal se paisa roka hua hai neeche kahin dab jati.
       */
      .sort((a, b) => {
        if (a.awaiting !== b.awaiting) return b.awaiting - a.awaiting
        return (b.lastOrderAt?.getTime() ?? 0) - (a.lastOrderAt?.getTime() ?? 0)
      })
  }
}
