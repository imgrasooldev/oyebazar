import type { Metadata } from 'next'
import { formatPkr } from '@oyebazar/shared'
import { CounterpartyLedger } from '@/components/counterparty-ledger'
import { ResellerPayoutReply } from '@/components/payout-actions'
import { requireReseller } from '@/lib/api/session'
import { container } from '@/lib/container'
import { timeAgo, translator } from '@/lib/i18n'
import { getLocale } from '@/lib/i18n-server'

export const metadata: Metadata = { title: 'Mere paise' }
export const dynamic = 'force-dynamic'

/**
 * Reseller ke paise — poori tafseel.
 *
 * Dashboard par sirf wo rows aati hain jin par KAAM baqi hai. Ye safha doosra sawal
 * uthata hai: "kis dukan ke saath mera kya hisab hai" — kitne order kiye, kitna kamaya,
 * kitna mila, kitna atka hai, aur kitne arse se.
 *
 * Tarteeb mein baqi raqam sab se upar hai, jama kamai nahi. Wajah: is safhe par aane ki
 * wajah "meri total kamai kitni hai" nahi hoti — wo dashboard par hai. Yahan wo aati hai
 * jab kisi ka paisa atka ho.
 */
export default async function ResellerMoneyPage() {
  const [{ reseller }, locale] = await Promise.all([requireReseller(), getLocale()])
  const t = translator(locale)

  const [ledger, totals, payouts] = await Promise.all([
    container.payouts.ledgerBySupplier(reseller.id),
    container.payouts.totalsForReseller(reseller.id),
    container.payouts.listForReseller(reseller.id),
  ])

  const now = new Date()
  const open = payouts.filter((payout) => payout.status !== 'SETTLED')

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[1.35rem] font-bold tracking-tight">{t('myMoney')}</h1>
        <p className="mt-1 max-w-2xl text-[0.92rem] text-ink-soft">{t('payoutNote')}</p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="card bg-coal-900 p-5 text-white">
          <p className="text-[0.72rem] uppercase tracking-wider text-white/50">
            {t('moneyAwaiting')}
          </p>
          <p dir="ltr" className="numeric mt-2 text-[1.7rem] font-bold leading-none text-brand-300">
            {formatPkr(totals.awaiting)}
          </p>
        </div>
        <div className="card p-5">
          <p className="text-[0.72rem] uppercase tracking-wider text-ink-faint">
            {t('moneyReceived')}
          </p>
          <p dir="ltr" className="numeric mt-2 text-[1.7rem] font-bold leading-none text-accent-700">
            {formatPkr(totals.settled)}
          </p>
        </div>
      </section>

      {/* Pehle wo jis par ISI waqt kuch karna hai, phir poora naqsha */}
      {open.length > 0 && (
        <section>
          <h2 className="mb-3 text-[0.78rem] font-bold uppercase tracking-wider text-ink-faint">
            {t('moneyAwaiting')}
          </h2>
          <ul className="card divide-y divide-paper-sunken">
            {open.map((payout) => (
              <li key={payout.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p dir="ltr" className="numeric text-sm font-semibold">
                    {payout.orderNo}
                  </p>
                  <p className="mt-0.5 text-[0.76rem] text-ink-faint">
                    {payout.status === 'SENT' ? t('payoutSentClaim') : null}
                    {payout.status === 'PENDING' ? t('payoutPending') : null}
                    {payout.status === 'DISPUTED' ? t('payoutDisputed') : null}
                    <span className="mx-1.5">·</span>
                    {timeAgo(locale, payout.createdAt, now)}
                  </p>
                </div>

                <span dir="ltr" className="numeric font-bold">
                  {formatPkr(payout.amount)}
                </span>

                {payout.status !== 'DISPUTED' && (
                  <ResellerPayoutReply
                    payoutId={payout.id}
                    labels={{
                      received: t('payoutReceived'),
                      notReceived: t('payoutNotReceived'),
                      reason: t('payoutReason'),
                      send: t('payoutSend'),
                      cancel: t('cancel'),
                      saving: t('saving'),
                    }}
                  />
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-[0.78rem] font-bold uppercase tracking-wider text-ink-faint">
          {t('moneyByWholesaler')}
        </h2>
        <CounterpartyLedger
          rows={ledger}
          locale={locale}
          now={now}
          labels={{
            empty: t('noDealingsYet'),
            orders: t('ordersCount'),
            delivered: t('ordersDeliveredShort'),
            running: t('ordersRunningShort'),
            lost: t('ordersLostShort'),
            earned: t('moneyEarnedTotal'),
            received: t('moneyReceived'),
            awaiting: t('moneyAwaiting'),
            disputed: t('disputedShort'),
            lastOrder: t('lastOrder'),
          }}
        />
      </section>
    </div>
  )
}
