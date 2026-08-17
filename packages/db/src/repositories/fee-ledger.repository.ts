/**
 * 🔴 FEE LEDGER — hamare paise ka single source of truth.
 *
 * Qawaid (docs/CONVENTIONS.md):
 *  · Rows IMMUTABLE — amount kabhi update nahi hota. Ghalti ho to reversing entry.
 *  · Har order par exactly EK row (orderId unique).
 *  · RTO/cancel par row delete nahi hoti — WRITTEN_OFF hoti hai, warna hum apna
 *    nuqsan naap hi nahi sakenge.
 *
 * Is file ke PR sirf founder ke hain.
 */
import type { PrismaClient } from '@prisma/client'
import type { FeeCollectionStats, FeeLedgerRepository, SupplierFeeSummary } from '@oyebazar/core'
import { pkr, type Pkr } from '@oyebazar/shared'

export class PrismaFeeLedgerRepository implements FeeLedgerRepository {
  constructor(private readonly db: PrismaClient) {}

  async create(input: { orderId: string; supplierId: string; amount: Pkr }): Promise<void> {
    // Dobara confirm hone par crash nahi — ek hi row rehti hai (orderId unique)
    await this.db.feeLedger.upsert({
      where: { orderId: input.orderId },
      create: {
        orderId: input.orderId,
        supplierId: input.supplierId,
        amount: input.amount,
        status: 'PENDING',
      },
      // 🔴 amount yahan kabhi update nahi hota — ye jaan boojh kar khali hai
      update: {},
    })
  }

  async markWrittenOff(orderId: string, reason: string): Promise<void> {
    const existing = await this.db.feeLedger.findUnique({
      where: { orderId },
      select: { status: true },
    })
    if (!existing) return

    // COLLECTED fee wapas nahi hoti — wo paisa aa chuka hai
    if (existing.status === 'COLLECTED') return

    await this.db.feeLedger.update({
      where: { orderId },
      data: { status: 'WRITTEN_OFF' },
    })

    await this.db.orderEvent.create({
      data: {
        orderId,
        toStatus: 'RTO',
        actorType: 'system',
        note: `Fee written off — ${reason}`,
      },
    })
  }

  async findByOrderId(orderId: string): Promise<{ amount: Pkr; status: string } | null> {
    const row = await this.db.feeLedger.findUnique({
      where: { orderId },
      select: { amount: true, status: true },
    })
    return row ? { amount: pkr(row.amount), status: row.status } : null
  }

  async summarisePending(period: { from: Date; to: Date }): Promise<SupplierFeeSummary[]> {
    const grouped = await this.db.feeLedger.groupBy({
      by: ['supplierId'],
      where: { status: 'PENDING', createdAt: { gte: period.from, lt: period.to } },
      _sum: { amount: true },
      _count: { _all: true },
    })

    if (grouped.length === 0) return []

    const suppliers = await this.db.supplier.findMany({
      where: { id: { in: grouped.map((g) => g.supplierId) } },
      select: { id: true, businessName: true },
    })
    const names = new Map(suppliers.map((s) => [s.id, s.businessName]))

    return grouped
      .map((row) => ({
        supplierId: row.supplierId,
        businessName: names.get(row.supplierId) ?? row.supplierId,
        orders: row._count._all,
        amount: pkr(row._sum.amount ?? 0),
      }))
      .sort((a, b) => b.amount - a.amount)
  }

  /**
   * 🔴 Sirf PENDING rows INVOICED hoti hain.
   *
   * Isi shart se dohra bill namumkin hai: dobara job chale to wo rows ab PENDING nahi rahin,
   * is liye `updateMany` unhen chhoo hi nahi sakta. Supplier ka bharosa isi ek line par hai.
   */
  async markInvoiced(input: {
    supplierId: string
    invoiceId: string
    invoicePeriod: string
    from: Date
    to: Date
    at: Date
  }): Promise<{ rows: number; amount: Pkr }> {
    return this.db.$transaction(async (tx) => {
      const target = await tx.feeLedger.findMany({
        where: {
          supplierId: input.supplierId,
          status: 'PENDING',
          createdAt: { gte: input.from, lt: input.to },
        },
        select: { id: true, amount: true },
      })

      if (target.length === 0) return { rows: 0, amount: pkr(0) }

      await tx.feeLedger.updateMany({
        where: { id: { in: target.map((r) => r.id) } },
        data: {
          status: 'INVOICED',
          invoiceId: input.invoiceId,
          invoicePeriod: input.invoicePeriod,
          invoicedAt: input.at,
        },
      })

      return {
        rows: target.length,
        amount: pkr(target.reduce((sum, row) => sum + row.amount, 0)),
      }
    })
  }

  async markCollected(invoiceId: string, at: Date): Promise<{ rows: number; amount: Pkr }> {
    return this.db.$transaction(async (tx) => {
      const rows = await tx.feeLedger.findMany({
        where: { invoiceId, status: 'INVOICED' },
        select: { id: true, amount: true },
      })
      if (rows.length === 0) return { rows: 0, amount: pkr(0) }

      await tx.feeLedger.updateMany({
        where: { id: { in: rows.map((r) => r.id) } },
        data: { status: 'COLLECTED', collectedAt: at },
      })

      return { rows: rows.length, amount: pkr(rows.reduce((sum, r) => sum + r.amount, 0)) }
    })
  }

  /** 🔴 Guardrail #3 — fee collection ≥85%. */
  async collectionStats(period: { from: Date; to: Date }): Promise<FeeCollectionStats> {
    const grouped = await this.db.feeLedger.groupBy({
      by: ['status'],
      where: { createdAt: { gte: period.from, lt: period.to } },
      _sum: { amount: true },
    })

    const byStatus = new Map(grouped.map((g) => [g.status, g._sum.amount ?? 0]))
    const collected = byStatus.get('COLLECTED') ?? 0
    const writtenOff = byStatus.get('WRITTEN_OFF') ?? 0
    const total = [...byStatus.values()].reduce((sum, value) => sum + value, 0)

    // Write-off ko denominator se nikal dete hain — RTO fee collection ki nakami nahi,
    // wo alag masla hai aur alag number (RTO %) se naapa jata hai
    const billable = total - writtenOff

    return {
      total: pkr(total),
      collected: pkr(collected),
      writtenOff: pkr(writtenOff),
      collectionPct: billable === 0 ? 100 : Math.round((collected / billable) * 1000) / 10,
    }
  }
}
