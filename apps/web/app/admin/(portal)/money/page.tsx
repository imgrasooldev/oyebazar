import type { Metadata } from 'next'
import { formatPhoneLocal, formatPkr, whatsappLink } from '@oyebazar/shared'
import { canDo } from '@oyebazar/core'
import { AdminRowAction } from '@/components/admin-row-action'
import { AdminPostAction } from '@/components/admin-post-action'
import { AdminBonusPay } from '@/components/admin-bonus-pay'
import { AdminPayoutDecision } from '@/components/admin-payout-decision'
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
  const [money, payoutSummary, disputes, bonuses] = await Promise.all([
    container.admin.money(user),
    container.payouts.summariseBySupplier(),
    container.payouts.listDisputed(),
    /*
     * Bonus jo dena baqi hai.
     *
     * 🔴 Ye `Money` par hai, kisi alag safhe par nahi — kyunke ops ka sawal ek
     * hi hai: "aaj kis ko paisa dena hai". Bonus ko alag safha dene ka matlab ye hota
     * ke wo safha kabhi khola hi na jata aur ye qatarein mahinon khari rehteen, jab ke
     * reseller ka bharosa raqam ki chhotai par nahi, us DER par toot ta hai.
     */
    container.repositories.bonuses.listPending(50),
  ])

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

      {/*
        4 — jhagre. Sab se upar kyunke yahan ek asli banda intezar kar raha hai.
        Dono ki baat saath rakhi hai: wholesaler ka TID, aur reseller ka jumla. Faisla
        in dono ko saath dekhe baghair nahi hota, aur do screen par baant dena wo soorat
        banata hai jahan ops ek taraf dekh kar faisla kar leti hai.
      */}
      {/*
        Bonus jo dena baqi hai — jhagron se PEHLE.

        🔴 Tarteeb soch kar hai. Jhagra ek faisla maangta hai (dono taraf ki baat
        parhni parti hai); bonus sirf ek kaam maangta hai (paisa bhejo, TID likho). Aasan
        kaam pehle rakhne ka faida ye hai ke wo waqai HO jata hai — mushkil faisle ke
        neeche daba hua kaam har roz kal par chala jata hai.
      */}
      {bonuses.length > 0 && (
        <section>
          <div className="mb-4 flex items-baseline gap-2">
            <h2 className="text-[1.05rem] font-bold">Bonus to pay</h2>
            <span
              dir="ltr"
              className="numeric rounded-pill bg-paper-sunken px-2 py-0.5 text-[0.75rem] font-bold text-ink-soft"
            >
              {bonuses.length}
            </span>
          </div>

          <ul className="card divide-y divide-paper-sunken px-4">
            {bonuses.map((bonus) => (
              <li key={bonus.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{bonus.resellerName}</span>
                  <span className="block text-[0.76rem] text-ink-faint">
                    {/*
                      Kis baat ka bonus — aur kis order par.

                      Bina is ke ops ko wo qatar sirf ek raqam dikhti hai, aur jis din
                      koi poochhe "ye kis liye tha" us din jawab kahin nahi hota.
                    */}
                    {bonus.kind === 'REFERRAL' ? 'Invited a seller' : 'First orders'}
                    <span className="mx-1.5">·</span>
                    <span dir="ltr" className="numeric">
                      {bonus.orderNo}
                    </span>
                  </span>
                </span>

                <a
                  href={whatsappLink(bonus.resellerPhone, '')}
                  target="_blank"
                  rel="noopener noreferrer"
                  dir="ltr"
                  className="numeric shrink-0 text-[0.8rem] font-semibold text-accent-700 underline decoration-dotted underline-offset-2"
                >
                  {formatPhoneLocal(bonus.resellerPhone)}
                </a>

                <span dir="ltr" className="numeric shrink-0 text-[1rem] font-bold">
                  {formatPkr(bonus.amount)}
                </span>

                <AdminBonusPay bonusId={bonus.id} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {disputes.length > 0 && (
        <section>
          <h2 className="mb-3 text-[0.72rem] font-bold uppercase tracking-[0.14em] text-red-700">
            Disputes — {disputes.length} waiting
          </h2>
          <ul className="space-y-3">
            {disputes.map((dispute) => (
              <li key={dispute.id} className="card border-l-4 border-red-500 p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p dir="ltr" className="numeric font-bold">
                    {dispute.orderNo}
                  </p>
                  <p dir="ltr" className="numeric text-lg font-bold">
                    {formatPkr(dispute.amount)}
                  </p>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-card bg-paper-sunken p-3">
                    <p className="text-[0.72rem] uppercase tracking-wider text-ink-faint">
                      Wholesaler says
                    </p>
                    <p className="mt-1 text-sm font-semibold">{dispute.supplierName}</p>
                    <p dir="ltr" className="numeric text-[0.78rem] text-ink-soft">
                      {dispute.supplierPhone}
                    </p>
                    <p className="mt-1.5 text-[0.82rem]">
                      {dispute.sentReference ? (
                        <>
                          Sent ·{' '}
                          <span dir="ltr" className="numeric font-semibold">
                            {dispute.sentReference}
                          </span>
                        </>
                      ) : (
                        <span className="text-ink-faint">Never claimed to have sent</span>
                      )}
                    </p>
                  </div>

                  <div className="rounded-card bg-paper-sunken p-3">
                    <p className="text-[0.72rem] uppercase tracking-wider text-ink-faint">
                      Reseller says
                    </p>
                    <p className="mt-1 text-sm font-semibold">{dispute.resellerName}</p>
                    <p dir="ltr" className="numeric text-[0.78rem] text-ink-soft">
                      {dispute.resellerPhone}
                    </p>
                    <p className="mt-1.5 text-[0.82rem]">{dispute.disputeNote}</p>
                  </div>
                </div>

                {/* Faisla sirf wahi kar sakta hai jo order aage barha sakta hai */}
                {canDo(user.role, 'moveOrders') ? (
                  <AdminPayoutDecision payoutId={dispute.id} />
                ) : (
                  <p className="mt-3 text-[0.8rem] text-ink-faint">
                    Coordinator or above can decide this.
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/*
        5 — reseller ke paise.
        Ye hamari kamai nahi hai, magar hamare portal ka sab se bara bharosa yahin
        tootta hai: reseller ka paisa wholesaler ke paas atka rahe aur humein khabar na
        ho. Tarteeb umar se hai, raqam se nahi — purana baqaya pehle jhagra banta hai.
      */}
      <section>
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-[0.72rem] font-bold uppercase tracking-[0.14em] text-ink-faint">
            Reseller payouts held by wholesalers
          </h2>
          <p className="text-sm text-ink-soft">
            This money never touches us — we only record who said what.
          </p>
        </div>

        {payoutSummary.length === 0 ? (
          <p className="card p-6 text-ink-soft">Nothing outstanding.</p>
        ) : (
          <ul className="card divide-y divide-paper-sunken">
            {payoutSummary.map((row) => (
              <li
                key={row.supplierId}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold">{row.businessName}</p>
                  <p dir="ltr" className="numeric mt-0.5 text-[0.78rem] text-ink-faint">
                    {row.supplierPhone} · {row.pendingCount} order
                    {row.pendingCount === 1 ? '' : 's'}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  {row.disputedCount > 0 && (
                    <span className="badge bg-red-50 text-red-700">
                      {row.disputedCount} disputed
                    </span>
                  )}
                  {/* 14 din — is se aage baqaya wasooli ka masla hai, yaad-dihani ka nahi */}
                  <span
                    className={`badge ${
                      row.oldestPendingDays >= 14
                        ? 'bg-red-50 text-red-700'
                        : row.oldestPendingDays >= 3
                          ? 'bg-brand-50 text-brand-700'
                          : 'bg-paper-sunken text-ink-faint'
                    }`}
                  >
                    {row.oldestPendingDays}d oldest
                  </span>
                  <span dir="ltr" className="numeric font-bold">
                    {formatPkr(row.pendingAmount)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
