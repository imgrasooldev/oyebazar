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
import type { CounterpartyLedgerRow, MoneyLedgerRepository } from '@oyebazar/core'
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
