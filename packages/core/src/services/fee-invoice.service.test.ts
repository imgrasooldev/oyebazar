import { describe, expect, it } from 'vitest'
import { pkr, type Pkr } from '@oyebazar/shared'
import { FeeInvoiceService } from './fee-invoice.service'
import type {
  FeeCollectionStats,
  FeeLedgerRepository,
  SupplierFeeSummary,
} from '../ports/order-repositories'
import type { Analytics, Clock, Logger } from '../ports/infrastructure'

const NOW = new Date('2026-09-01T05:00:00.000Z') // 1 September, 10:00 PKT

interface Row {
  orderId: string
  supplierId: string
  amount: number
  status: 'PENDING' | 'INVOICED' | 'COLLECTED' | 'WRITTEN_OFF'
  invoiceId?: string
  createdAt: Date
}

/** Fake ledger — asli Postgres jaise qawaid: sirf PENDING invoice hoti hai. */
class FakeFeeLedger implements FeeLedgerRepository {
  constructor(
    readonly rows: Row[],
    private readonly names: Record<string, string> = {},
  ) {}

  async create() {}

  async markEarned() {}
  async markWrittenOff() {}
  async findByOrderId() {
    return null
  }

  async summarisePending(period: { from: Date; to: Date }): Promise<SupplierFeeSummary[]> {
    const map = new Map<string, { orders: number; amount: number }>()
    for (const row of this.rows) {
      if (row.status !== 'PENDING') continue
      if (row.createdAt < period.from || row.createdAt >= period.to) continue
      const current = map.get(row.supplierId) ?? { orders: 0, amount: 0 }
      map.set(row.supplierId, { orders: current.orders + 1, amount: current.amount + row.amount })
    }
    return [...map.entries()].map(([supplierId, value]) => ({
      supplierId,
      businessName: this.names[supplierId] ?? supplierId,
      orders: value.orders,
      amount: pkr(value.amount),
    }))
  }

  async markInvoiced(input: {
    supplierId: string
    invoiceId: string
    from: Date
    to: Date
  }): Promise<{ rows: number; amount: Pkr }> {
    // 🔴 SIRF PENDING — yehi wo shart hai jo dohra bill rokti hai
    const target = this.rows.filter(
      (row) =>
        row.supplierId === input.supplierId &&
        row.status === 'PENDING' &&
        row.createdAt >= input.from &&
        row.createdAt < input.to,
    )
    for (const row of target) {
      row.status = 'INVOICED'
      row.invoiceId = input.invoiceId
    }
    return { rows: target.length, amount: pkr(target.reduce((sum, r) => sum + r.amount, 0)) }
  }

  async markCollected(invoiceId: string): Promise<{ rows: number; amount: Pkr }> {
    const target = this.rows.filter((r) => r.invoiceId === invoiceId && r.status === 'INVOICED')
    for (const row of target) row.status = 'COLLECTED'
    return { rows: target.length, amount: pkr(target.reduce((sum, r) => sum + r.amount, 0)) }
  }

  async collectionStats(): Promise<FeeCollectionStats> {
    const sum = (status: Row['status']) =>
      this.rows.filter((r) => r.status === status).reduce((total, r) => total + r.amount, 0)
    const total = this.rows.reduce((t, r) => t + r.amount, 0)
    const collected = sum('COLLECTED')
    const writtenOff = sum('WRITTEN_OFF')
    const billable = total - writtenOff
    return {
      total: pkr(total),
      collected: pkr(collected),
      writtenOff: pkr(writtenOff),
      collectionPct: billable === 0 ? 100 : Math.round((collected / billable) * 1000) / 10,
    }
  }
}

const CLOCK: Clock = { now: () => NOW }
const NOOP_ANALYTICS: Analytics = { async track() {} }
const NOOP_LOGGER: Logger = { info() {}, warn() {}, error() {} }

const AUGUST = new Date('2026-08-15T10:00:00.000Z')
const JULY = new Date('2026-07-15T10:00:00.000Z')

function build(rows: Row[]) {
  const ledger = new FakeFeeLedger(rows, { sup_1: 'المدینہ فیبرکس', sup_2: 'نور ٹیکسٹائل' })
  return {
    ledger,
    service: new FeeInvoiceService(ledger, CLOCK, NOOP_ANALYTICS, NOOP_LOGGER),
  }
}

describe('previousMonthPeriod', () => {
  /*
   * 🔴 Haddein PAKISTAN ke calendar se hain, UTC se nahi. 1 August 00:00 PKT =
   * 31 July 19:00 UTC — aur DB mein har waqt UTC mein hai, is liye chhanni bhi usi
   * lamhe par lagni chahiye.
   */
  it('1 September ko chale to August ka period deta hai', () => {
    const { service } = build([])
    const { period, from, to } = service.previousMonthPeriod()

    expect(period).toBe('2026-08')
    expect(from.toISOString()).toBe('2026-07-31T19:00:00.000Z')
    expect(to.toISOString()).toBe('2026-08-31T19:00:00.000Z')
  })

  /*
   * 🔴 Wo paanch ghanton ki khirki jis mein asal kharabi thi: 1 September ki subah
   * 4:27 PKT par UTC abhi 31 August hai. Pehle yahan July nikalta tha — do mahine
   * peechay — aur ops ke safhe par wohi chhapta tha.
   */
  it('1 September ki subah (UTC par abhi 31 August) par bhi August deta hai', () => {
    const { service } = build([])
    const early = new Date('2026-08-31T23:27:00.000Z')

    expect(service.previousMonthPeriod(early).period).toBe('2026-08')
  })

  it('31 August ki raat (Pakistan mein abhi August) par July deta hai', () => {
    const { service } = build([])
    // 18:00 UTC = 23:00 PKT, 31 August
    expect(service.previousMonthPeriod(new Date('2026-08-31T18:00:00.000Z')).period).toBe('2026-07')
  })
})

describe('generateMonthlyInvoices', () => {
  const rows = (): Row[] => [
    { orderId: 'o1', supplierId: 'sup_1', amount: 100, status: 'PENDING', createdAt: AUGUST },
    { orderId: 'o2', supplierId: 'sup_1', amount: 140, status: 'PENDING', createdAt: AUGUST },
    { orderId: 'o3', supplierId: 'sup_2', amount: 200, status: 'PENDING', createdAt: AUGUST },
    // pichhle mahine ka — is invoice mein nahi aana chahiye
    { orderId: 'o4', supplierId: 'sup_1', amount: 999, status: 'PENDING', createdAt: JULY },
    // RTO ho chuka — is par bill nahi hota
    { orderId: 'o5', supplierId: 'sup_1', amount: 500, status: 'WRITTEN_OFF', createdAt: AUGUST },
  ]

  it('har supplier ka alag invoice, sirf us mahine ki PENDING fees', async () => {
    const { service } = build(rows())
    const invoices = await service.generateMonthlyInvoices()

    expect(invoices).toHaveLength(2)
    const madina = invoices.find((i) => i.supplierId === 'sup_1')
    expect(madina?.amount).toBe(240) // 100 + 140 — na July ka 999, na WRITTEN_OFF ka 500
    expect(madina?.orders).toBe(2)
    expect(madina?.period).toBe('2026-08')
  })

  it('🔴 dobara chalane par dohra bill NAHI banta', async () => {
    const { service } = build(rows())

    const first = await service.generateMonthlyInvoices()
    const second = await service.generateMonthlyInvoices()

    expect(first).toHaveLength(2)
    expect(second).toHaveLength(0) // rows ab PENDING nahi rahin
  })

  it('WRITTEN_OFF rows ko haath nahi lagata', async () => {
    const { service, ledger } = build(rows())
    await service.generateMonthlyInvoices()

    expect(ledger.rows.find((r) => r.orderId === 'o5')?.status).toBe('WRITTEN_OFF')
  })

  it('invoice id parhne mein aasan hai', async () => {
    const { service } = build(rows())
    const invoices = await service.generateMonthlyInvoices()
    expect(invoices[0]?.invoiceId).toMatch(/^BJ-INV-2026-08-/)
  })
})

describe('markCollected', () => {
  it('INVOICED rows COLLECTED ho jati hain', async () => {
    const { service, ledger } = build([
      { orderId: 'o1', supplierId: 'sup_1', amount: 100, status: 'PENDING', createdAt: AUGUST },
    ])

    const [invoice] = await service.generateMonthlyInvoices()
    const result = await service.markCollected(invoice!.invoiceId)

    expect(result).toEqual({ rows: 1, amount: 100 })
    expect(ledger.rows[0]?.status).toBe('COLLECTED')
  })
})

describe('collectionHealth', () => {
  it('🔴 guardrail: 85% se neeche ho to healthy = false', async () => {
    const { service } = build([
      { orderId: 'o1', supplierId: 'sup_1', amount: 100, status: 'COLLECTED', createdAt: AUGUST },
      { orderId: 'o2', supplierId: 'sup_1', amount: 100, status: 'INVOICED', createdAt: AUGUST },
    ])

    const health = await service.collectionHealth()
    expect(health.collectionPct).toBe(50)
    expect(health.healthy).toBe(false)
  })

  it('RTO (written off) collection % ko nuqsan nahi pohanchata — wo alag masla hai', async () => {
    const { service } = build([
      { orderId: 'o1', supplierId: 'sup_1', amount: 100, status: 'COLLECTED', createdAt: AUGUST },
      { orderId: 'o2', supplierId: 'sup_1', amount: 300, status: 'WRITTEN_OFF', createdAt: AUGUST },
    ])

    const health = await service.collectionHealth()
    expect(health.collectionPct).toBe(100)
    expect(health.healthy).toBe(true)
  })
})
