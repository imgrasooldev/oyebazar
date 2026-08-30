/**
 * 🔴 RESELLER PAYOUT — reseller ke paison ka single source of truth.
 *
 * Qawaid FeeLedger jaise hi hain:
 *  · `amount` kabhi update nahi hota — snapshot hai. Baad mein rate badle to bhi wohi.
 *  · Har order par exactly EK row (orderId unique).
 *  · Row delete kabhi nahi hoti — jhagra hua to DISPUTED hoti hai, taake ginti ho sake
 *    ke kaun si dukan par kitne jhagre hain.
 *
 * Har halat badalne wali query `updateMany` + status ki shart se hoti hai: do banday
 * ek hi lamhe button dabayen to bhi doosri chalti nahi.
 */
import type { PrismaClient, Prisma } from '@prisma/client'
import type {
  PayoutRepository,
  PayoutStatus,
  PayoutView,
  SupplierPayoutSummary,
} from '@oyebazar/core'
import { pkr, type Pkr } from '@oyebazar/shared'

const PAYOUT_SELECT = {
  id: true,
  orderId: true,
  resellerId: true,
  supplierId: true,
  amount: true,
  termDays: true,
  status: true,
  sentAt: true,
  sentReference: true,
  sentProofUrl: true,
  confirmedAt: true,
  disputedAt: true,
  disputeNote: true,
  createdAt: true,
  order: { select: { orderNo: true } },
} satisfies Prisma.ResellerPayoutSelect

type Row = Prisma.ResellerPayoutGetPayload<{ select: typeof PAYOUT_SELECT }>

function toView(row: Row): PayoutView {
  return {
    id: row.id,
    orderId: row.orderId,
    orderNo: row.order.orderNo,
    resellerId: row.resellerId,
    supplierId: row.supplierId,
    amount: pkr(row.amount),
    termDays: row.termDays,
    status: row.status,
    sentAt: row.sentAt,
    sentReference: row.sentReference,
    sentProofUrl: row.sentProofUrl,
    confirmedAt: row.confirmedAt,
    disputedAt: row.disputedAt,
    disputeNote: row.disputeNote,
    createdAt: row.createdAt,
  }
}

export class PrismaPayoutRepository implements PayoutRepository {
  constructor(private readonly db: PrismaClient) {}

  async create(input: {
    orderId: string
    resellerId: string
    supplierId: string
    amount: Pkr
    termDays: number
  }): Promise<void> {
    await this.db.resellerPayout.upsert({
      where: { orderId: input.orderId },
      create: {
        orderId: input.orderId,
        resellerId: input.resellerId,
        supplierId: input.supplierId,
        amount: input.amount,
        termDays: input.termDays,
        status: 'PENDING',
      },
      // 🔴 Jaan boojh kar khali: dobara delivered mark hone par purani row jyun ki tyun
      update: {},
    })
  }

  async findByOrderId(orderId: string): Promise<PayoutView | null> {
    const row = await this.db.resellerPayout.findUnique({
      where: { orderId },
      select: PAYOUT_SELECT,
    })
    return row ? toView(row) : null
  }

  async findForSupplier(supplierId: string, payoutId: string): Promise<PayoutView | null> {
    const row = await this.db.resellerPayout.findFirst({
      where: { id: payoutId, supplierId },
      select: PAYOUT_SELECT,
    })
    return row ? toView(row) : null
  }

  async findForReseller(resellerId: string, payoutId: string): Promise<PayoutView | null> {
    const row = await this.db.resellerPayout.findFirst({
      where: { id: payoutId, resellerId },
      select: PAYOUT_SELECT,
    })
    return row ? toView(row) : null
  }

  /** PENDING ya DISPUTED se SENT — pehle se settled row dobara nahi khulti. */
  async markSent(
    payoutId: string,
    reference: string,
    at: Date,
    proofUrl?: string | undefined,
  ): Promise<boolean> {
    const { count } = await this.db.resellerPayout.updateMany({
      where: { id: payoutId, status: { in: ['PENDING', 'DISPUTED'] } },
      data: {
        status: 'SENT',
        sentAt: at,
        sentReference: reference,
        disputedAt: null,
        /*
         * 🔴 Tasveer na di gayi ho to purani MITTI NAHI jati.
         *
         * Ye soorat asli hai: DISPUTED hisab par dukan wala dobara "bhej diye" dabata
         * hai aur is dafa sirf naya TID likhta hai. `sentProofUrl: undefined` likh dena
         * pehli tasveer ko mita deta — yani wo sabooot jo jhagre ke liye rakha hi is
         * liye tha. Prisma `undefined` ko "is khaane ko haath na lagao" samajhta hai;
         * yahan wohi chahiye.
         */
        ...(proofUrl ? { sentProofUrl: proofUrl } : {}),
      },
    })
    return count > 0
  }

  /**
   * 🔴 PENDING se bhi tasdeeq ho sakti hai — jaan boojh kar.
   *
   * Bolton Market ka thok wala EasyPaisa kar ke portal kholta hi nahi. Agar hum sirf
   * SENT se tasdeeq lete to us ki saari rows hamesha "baqi" dikhtin, halanke paisa
   * pohanch chuka hota. Reseller ka "mil gaye" hamare paas sab se mazboot gawahi hai —
   * paisa us ke haath mein hai, dawa kisi ne kiya ho ya na kiya ho.
   */
  async markConfirmed(payoutId: string, at: Date): Promise<boolean> {
    const { count } = await this.db.resellerPayout.updateMany({
      where: { id: payoutId, status: { in: ['PENDING', 'SENT', 'DISPUTED'] } },
      data: { status: 'SETTLED', confirmedAt: at },
    })
    return count > 0
  }

  async markDisputed(payoutId: string, note: string, at: Date): Promise<boolean> {
    const { count } = await this.db.resellerPayout.updateMany({
      where: { id: payoutId, status: { in: ['PENDING', 'SENT'] } },
      data: { status: 'DISPUTED', disputedAt: at, disputeNote: note },
    })
    return count > 0
  }

  async resolve(input: {
    payoutId: string
    status: Extract<PayoutStatus, 'SETTLED' | 'PENDING'>
    opsUserId: string
    note: string
    at: Date
  }): Promise<void> {
    await this.db.resellerPayout.update({
      where: { id: input.payoutId },
      data: {
        status: input.status,
        resolvedById: input.opsUserId,
        resolvedAt: input.at,
        resolveNote: input.note,
        ...(input.status === 'SETTLED' ? { confirmedAt: input.at } : {}),
      },
    })
  }

  async listForPeriod(
    scope: { resellerId?: string; supplierId?: string },
    from: Date,
    to: Date,
  ): Promise<PayoutView[]> {
    const rows = await this.db.resellerPayout.findMany({
      where: {
        ...(scope.resellerId ? { resellerId: scope.resellerId } : {}),
        ...(scope.supplierId ? { supplierId: scope.supplierId } : {}),
        // Hisab us din ka hai jis din maal pohancha — us din wo raqam bani
        createdAt: { gte: from, lt: to },
      },
      select: PAYOUT_SELECT,
      orderBy: { createdAt: 'asc' },
    })
    return rows.map(toView)
  }

  async listForSupplier(supplierId: string, status?: PayoutStatus): Promise<PayoutView[]> {
    const rows = await this.db.resellerPayout.findMany({
      where: { supplierId, ...(status ? { status } : {}) },
      select: PAYOUT_SELECT,
      // Sab se purana baqaya sab se upar — wohi sab se pehle jhagra banta hai
      orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
      take: 100,
    })
    return rows.map(toView)
  }

  async listForReseller(resellerId: string, status?: PayoutStatus): Promise<PayoutView[]> {
    const rows = await this.db.resellerPayout.findMany({
      where: { resellerId, ...(status ? { status } : {}) },
      select: PAYOUT_SELECT,
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    return rows.map(toView)
  }

  async totalsForReseller(resellerId: string): Promise<{ settled: Pkr; awaiting: Pkr }> {
    const grouped = await this.db.resellerPayout.groupBy({
      by: ['status'],
      where: { resellerId },
      _sum: { amount: true },
    })

    const sumOf = (statuses: PayoutStatus[]) =>
      grouped
        .filter((row) => statuses.includes(row.status))
        .reduce((total, row) => total + (row._sum.amount ?? 0), 0)

    return {
      settled: pkr(sumOf(['SETTLED'])),
      // Jo abhi tak haath mein nahi aaya — chahe wholesaler keh chuka ho ke bhej diya
      awaiting: pkr(sumOf(['PENDING', 'SENT', 'DISPUTED'])),
    }
  }

  async summariseBySupplier(): Promise<SupplierPayoutSummary[]> {
    const open = await this.db.resellerPayout.findMany({
      where: { status: { in: ['PENDING', 'SENT', 'DISPUTED'] } },
      select: {
        supplierId: true,
        amount: true,
        status: true,
        createdAt: true,
        supplier: { select: { businessName: true, phone: true } },
      },
    })

    const now = Date.now()
    const bySupplier = new Map<string, SupplierPayoutSummary>()

    for (const row of open) {
      const current = bySupplier.get(row.supplierId) ?? {
        supplierId: row.supplierId,
        businessName: row.supplier.businessName,
        supplierPhone: row.supplier.phone,
        pendingCount: 0,
        pendingAmount: pkr(0),
        disputedCount: 0,
        oldestPendingDays: 0,
      }

      const days = Math.floor((now - row.createdAt.getTime()) / 86_400_000)

      bySupplier.set(row.supplierId, {
        ...current,
        pendingCount: current.pendingCount + 1,
        pendingAmount: pkr(current.pendingAmount + row.amount),
        disputedCount: current.disputedCount + (row.status === 'DISPUTED' ? 1 : 0),
        oldestPendingDays: Math.max(current.oldestPendingDays, days),
      })
    }

    // Sab se purana baqaya sab se upar — raqam se nahi, umar se. Ek chhoti raqam jo
    // teen hafte se ruki hai, us bari raqam se zyada khatarnak hai jo kal bani thi.
    return [...bySupplier.values()].sort((a, b) => b.oldestPendingDays - a.oldestPendingDays)
  }

  /**
   * 🔴 Chhantai SQL mein hoti hai, JS mein nahi: har row ki apni shart hai, is liye
   * hadd row ke apne `termDays` se banti hai. Saari PENDING rows utha kar JS mein
   * chhanne se ek din wo query poori table le aati.
   */
  async listUnconfirmedSent(before: Date): Promise<PayoutView[]> {
    /*
     * Dukan ka dawa purana ho chuka aur reseller ne kuch kaha hi nahi.
     *
     * `sentAt` par chhanti hai, `createdAt` par nahi: intezar us lamhe se ginna chahiye
     * jab dukan ne paisa bhejne ka dawa kiya — us se pehle ka arsa dukan ka apna waqt
     * tha, reseller ka nahi.
     */
    const rows = await this.db.resellerPayout.findMany({
      where: { status: 'SENT', sentAt: { not: null, lte: before } },
      orderBy: { sentAt: 'asc' },
      select: PAYOUT_SELECT,
      take: 200,
    })

    return rows.map(toView)
  }

  async listOverduePending(now: Date): Promise<PayoutView[]> {
    const ids = await this.db.$queryRaw<{ id: string }[]>`
      SELECT "id" FROM "ResellerPayout"
      WHERE "status" = 'PENDING'
        AND "createdAt" + make_interval(days => "termDays") < ${now}
      ORDER BY "createdAt" ASC
      LIMIT 200
    `

    if (ids.length === 0) return []

    const rows = await this.db.resellerPayout.findMany({
      where: { id: { in: ids.map((row) => row.id) } },
      select: PAYOUT_SELECT,
      orderBy: { createdAt: 'asc' },
    })
    return rows.map(toView)
  }

  async supplierTerm(supplierId: string): Promise<number> {
    const supplier = await this.db.supplier.findUnique({
      where: { id: supplierId },
      select: { payoutTermDays: true },
    })
    return supplier?.payoutTermDays ?? 3
  }

  async setSupplierTerm(supplierId: string, days: number): Promise<void> {
    await this.db.supplier.update({ where: { id: supplierId }, data: { payoutTermDays: days } })
  }
}
