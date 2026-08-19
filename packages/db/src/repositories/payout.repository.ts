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
  status: true,
  sentAt: true,
  sentReference: true,
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
    status: row.status,
    sentAt: row.sentAt,
    sentReference: row.sentReference,
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
  }): Promise<void> {
    await this.db.resellerPayout.upsert({
      where: { orderId: input.orderId },
      create: {
        orderId: input.orderId,
        resellerId: input.resellerId,
        supplierId: input.supplierId,
        amount: input.amount,
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
  async markSent(payoutId: string, reference: string, at: Date): Promise<boolean> {
    const { count } = await this.db.resellerPayout.updateMany({
      where: { id: payoutId, status: { in: ['PENDING', 'DISPUTED'] } },
      data: { status: 'SENT', sentAt: at, sentReference: reference, disputedAt: null },
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

  async listOverduePending(olderThan: Date): Promise<PayoutView[]> {
    const rows = await this.db.resellerPayout.findMany({
      where: { status: 'PENDING', createdAt: { lt: olderThan } },
      select: PAYOUT_SELECT,
      orderBy: { createdAt: 'asc' },
      take: 200,
    })
    return rows.map(toView)
  }
}
