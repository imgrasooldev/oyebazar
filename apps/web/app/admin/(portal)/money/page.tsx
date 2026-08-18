import type { Metadata } from 'next'
import { formatPkr } from '@oyebazar/shared'
import { canDo } from '@oyebazar/core'
import { AdminRowAction } from '@/components/admin-row-action'
import { AdminPostAction } from '@/components/admin-post-action'
import { requireOpsUser } from '@/lib/api/admin-session'
import { container } from '@/lib/container'

export const metadata: Metadata = {
  title: 'Money · Admin',
  robots: { index: false, follow: false },
}
export const dynamic = 'force-dynamic'

/**
 * Money — hamari kamai kahan khari hai.
 *
 * Teen sawal, teen hisse:
 *  1. Is mahine kitni fee bani aur kitni wasool hui (collection %)
 *  2. Agli invoice mein kis supplier ka kitna jayega
 *  3. Jo invoice ban chuke — un mein se kaun sa paisa aa gaya
 *
 * 🔴 Collection % guardrail hai, target ≥85%. Is se neeche jaye to matlab hai ke fee
 * wahan se nikal rahi hai jahan hum bill nahi kar pa rahe — order routing badalni hogi.
 * Isi liye ye number sab se upar aur sab se bara hai.
 */
export default async function AdminMoneyPage() {
  const { user } = await requireOpsUser()
  const money = await container.admin.money(user)

  const pendingTotal = money.pending.reduce((sum, row) => sum + row.amount, 0)
  const canGenerate = canDo(user.role, 'generateInvoices')

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[1.4rem] font-bold tracking-tight">Money</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Fee earned, invoiced and collected. The ledger is the source of truth — invoices
          are just its summary.
        </p>
      </div>

      {/* 1 — sehat */}
      <section className="card p-6">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-[0.72rem] uppercase tracking-wider text-ink-faint">
              Collection rate this month
            </p>
            <p
              dir="ltr"
              className={`numeric mt-2 text-[2.2rem] font-bold leading-none ${
                money.health.healthy ? 'text-accent-700' : 'text-brand-700'
              }`}
            >
              {money.health.collectionPct}%
            </p>
            <p className="mt-2 text-[0.8rem] text-ink-faint">
              Target is 85%. Below that, the fee is coming from orders we cannot bill.
            </p>
          </div>

          <dl dir="ltr" className="numeric flex flex-wrap gap-6 text-sm">
            <div>
              <dt className="text-ink-faint">Earned</dt>
              <dd className="font-bold">{formatPkr(money.health.total)}</dd>
            </div>
            <div>
              <dt className="text-ink-faint">Collected</dt>
              <dd className="font-bold text-accent-700">{formatPkr(money.health.collected)}</dd>
            </div>
            <div>
              <dt className="text-ink-faint">Written off</dt>
              <dd className="font-bold text-ink-soft">{formatPkr(money.health.writtenOff)}</dd>
            </div>
          </dl>
        </div>
      </section>

      {/* 2 — agli invoice */}
      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[0.72rem] font-bold uppercase tracking-[0.14em] text-ink-faint">
            Ready to invoice · {money.period}
          </h2>

          {canGenerate ? (
            <AdminPostAction
              endpoint="/api/v1/admin/invoices"
              label="Generate invoices"
              confirmText={`Invoice ${money.period} for ${money.pending.length} wholesalers (${formatPkr(pendingTotal)})? Ledger rows move to INVOICED and cannot go back.`}
            />
          ) : (
            <span className="text-[0.78rem] text-ink-faint">Only a super admin can invoice</span>
          )}
        </div>

        {money.pending.length === 0 ? (
          <p className="card p-6 text-center text-sm text-ink-soft">
            Nothing pending for {money.period}.
          </p>
        ) : (
          <ul className="space-y-2">
            {money.pending.map((row) => (
              <li
                key={row.supplierId}
                className="card flex flex-wrap items-center justify-between gap-4 p-4"
              >
                <span className="font-bold">{row.businessName}</span>
                <span dir="ltr" className="numeric text-sm text-ink-soft">
                  {row.orders} orders
                </span>
                <span dir="ltr" className="numeric font-bold">
                  {formatPkr(row.amount)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 3 — bane hue invoice */}
      <section>
        <h2 className="mb-3 text-[0.72rem] font-bold uppercase tracking-[0.14em] text-ink-faint">
          Invoices
        </h2>

        {money.invoices.length === 0 ? (
          <p className="card p-6 text-center text-sm text-ink-soft">No invoices yet.</p>
        ) : (
          <ul className="space-y-2">
            {money.invoices.map((invoice) => (
              <li
                key={invoice.invoiceId}
                className="card flex flex-wrap items-center gap-4 p-4"
              >
                <div className="min-w-[10rem] flex-1">
                  <p dir="ltr" className="numeric font-bold">
                    {invoice.invoiceId}
                  </p>
                  <p className="mt-0.5 text-[0.82rem] text-ink-soft">
                    {invoice.supplierName} · {invoice.period}
                  </p>
                </div>

                <span dir="ltr" className="numeric text-sm text-ink-soft">
                  {invoice.orders} orders
                </span>
                <span dir="ltr" className="numeric font-bold">
                  {formatPkr(invoice.amount)}
                </span>

                <span
                  className={`badge ${
                    invoice.status === 'COLLECTED'
                      ? 'bg-accent-50 text-accent-700'
                      : 'bg-brand-50 text-brand-800'
                  }`}
                >
                  {invoice.status}
                </span>

                {invoice.status !== 'COLLECTED' && (
                  <AdminRowAction
                    endpoint={`/api/v1/admin/invoices/${invoice.invoiceId}`}
                    body={{ collected: true }}
                    label="Mark paid"
                    tone="primary"
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
