/**
 * 🔴 FeeInvoiceService — hamari kamai wasool karne ka nizaam.
 *
 * Mahine ki 1 tareekh ko pichhle mahine ki saari PENDING fees supplier ke hisab se
 * jama hoti hain, ek invoice number banta hai, aur rows INVOICED ho jati hain.
 *
 * Qawaid:
 *  · Rows IMMUTABLE — amount kabhi nahi badalta, sirf status aage barhta hai
 *  · PENDING → INVOICED → COLLECTED (ya WRITTEN_OFF). Peechay nahi ja sakta.
 *  · Invoice banana idempotent hai: dobara chalane par wohi rows dobara invoice nahi hotin
 *    (kyunke wo ab PENDING nahi rahin) — yani supplier ko dohra bill kabhi nahi jata.
 *
 * Is file ke PR sirf founder ke hain (docs/CONVENTIONS.md).
 */
import { pkMonthKey, pkMonthStart } from '../domain/pk-month'
import { ValidationError, formatPkr, type Pkr } from '@oyebazar/shared'
import type { FeeLedgerRepository, SupplierFeeSummary } from '../ports/order-repositories'
import type { Analytics, Clock, Logger } from '../ports/infrastructure'

export interface GeneratedInvoice {
  readonly invoiceId: string
  readonly supplierId: string
  readonly businessName: string
  readonly period: string
  readonly orders: number
  readonly amount: Pkr
}

export class FeeInvoiceService {
  constructor(
    private readonly feeLedger: FeeLedgerRepository,
    private readonly clock: Clock,
    private readonly analytics: Analytics,
    private readonly logger: Logger,
  ) {}

  /**
   * Pichhla mahina — job mahine ki 1 tareekh ko chalta hai.
   *
   * 🔴 Hadd PAKISTAN ke calendar se, UTC se nahi. Pehle yahan `getUTCMonth()` tha, aur
   * us ka nateeja live safhe par dekha gaya: 1 September ki subah ops ko "Ready to
   * invoice · 2026-07" likha aa raha tha — do mahine peechay. Pakistan mein us waqt
   * September shuru ho chuka tha magar UTC par abhi 31 August tha.
   *
   * Sirf unwan ki baat nahi thi: `generateMonthlyInvoices()` isi hadd par chalta hai.
   * Us paanch ghanton ki khirki mein job chal jati to GHALAT mahine ka bill banta, aur
   * shak bhi na hota — jawab hamesha "kuch pending nahi" hota.
   */
  previousMonthPeriod(reference?: Date): { period: string; from: Date; to: Date } {
    const now = reference ?? this.clock.now()
    const from = pkMonthStart(now, -1)
    const to = pkMonthStart(now, 0)
    return { period: pkMonthKey(from), from, to }
  }

  async generateMonthlyInvoices(reference?: Date): Promise<GeneratedInvoice[]> {
    const { period, from, to } = this.previousMonthPeriod(reference)
    const summaries = await this.feeLedger.summarisePending({ from, to })

    if (summaries.length === 0) {
      this.logger.info('fee_invoices_none', { period })
      return []
    }

    const invoices: GeneratedInvoice[] = []
    const at = this.clock.now()

    for (const summary of summaries) {
      const invoiceId = this.buildInvoiceId(period, summary)

      const result = await this.feeLedger.markInvoiced({
        supplierId: summary.supplierId,
        invoiceId,
        invoicePeriod: period,
        from,
        to,
        at,
      })

      // Rows beech mein WRITTEN_OFF ho gayi hon to summary aur haqeeqat mein farq aa sakta hai —
      // hamesha wo raqam bhejen jo waqai INVOICED hui
      if (result.rows === 0) continue

      invoices.push({
        invoiceId,
        supplierId: summary.supplierId,
        businessName: summary.businessName,
        period,
        orders: result.rows,
        amount: result.amount,
      })

      this.logger.info('fee_invoice_generated', {
        invoiceId,
        supplier: summary.businessName,
        orders: result.rows,
        amount: result.amount,
      })
    }

    await this.analytics.track({
      name: 'fee_invoices_generated',
      actorType: 'system',
      properties: {
        period,
        suppliers: invoices.length,
        total: invoices.reduce((sum, i) => sum + i.amount, 0),
      },
    })

    return invoices
  }

  /** Paisa aa gaya — invoice COLLECTED. Ops ye ops console se karti hai. */
  async markCollected(invoiceId: string): Promise<{ rows: number; amount: Pkr }> {
    if (!invoiceId.trim()) throw new ValidationError('Invoice number chahiye')
    const result = await this.feeLedger.markCollected(invoiceId, this.clock.now())

    await this.analytics.track({
      name: 'fee_invoice_collected',
      actorType: 'ops',
      properties: { invoiceId, rows: result.rows, amount: result.amount },
    })

    return result
  }

  /** 🔴 Guardrail #3 — collection ≥85%. Har Monday dekha jata hai. */
  async collectionHealth(period?: { from: Date; to: Date }) {
    const range = period ?? this.currentMonth()
    const stats = await this.feeLedger.collectionStats(range)

    return {
      ...stats,
      healthy: stats.collectionPct >= 85,
      summaryUr: `اس مہینے ${formatPkr(stats.collected)} وصول ہوئے (${stats.collectionPct}%)`,
    }
  }

  /** "Is mahine" — wohi jo dukan wale ke calendar par hai (Pakistan), UTC ka nahi. */
  private currentMonth(): { from: Date; to: Date } {
    const now = this.clock.now()
    return { from: pkMonthStart(now, 0), to: pkMonthStart(now, 1) }
  }

  /** BJ-INV-2026-08-almadina — parhne mein aasan, aur supplier ke saath baat karne mein bhi. */
  private buildInvoiceId(period: string, summary: SupplierFeeSummary): string {
    const slug = summary.businessName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 20)
    return `BJ-INV-${period}-${slug || summary.supplierId.slice(0, 6)}`
  }
}
