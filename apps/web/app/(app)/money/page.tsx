import Link from 'next/link'
import type { Metadata } from 'next'
import { formatPkr } from '@oyebazar/shared'
import { CounterpartyLedger } from '@/components/counterparty-ledger'
import { StatTile, Widget } from '@/components/dash-kit'
import { MoneyIcon, CheckBadgeIcon } from '@/components/icons'
import { ResellerPayoutReply } from '@/components/payout-actions'
import { PayoutTimeline } from '@/components/payout-timeline'
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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[1.35rem] font-bold tracking-tight">{t('myMoney')}</h1>
          <p className="mt-1 max-w-2xl text-[0.92rem] text-ink-soft">{t('payoutNote')}</p>
        </div>
        {/* Wohi kaghaz jo wholesaler ke paas hai — jhagre mein "apna hisab bhejein" khatam */}
        <Link href="/money/statement" className="btn-ghost shrink-0">
          {t('statement')}
        </Link>
      </div>

      {/*
        Baqi raqam kaale khane mein — is safhe par aane ki wajah yehi number hota hai.
        Mila hua paisa us ke barabar, magar khamosh: wo khabar hai, kaam nahi.
      */}
      <section className="grid gap-3 sm:grid-cols-2">
        <div className="card bg-coal-900 p-4 text-white">
          <span
            className="flex h-10 w-10 items-center justify-center rounded-card bg-white/10 text-brand-300"
            aria-hidden="true"
          >
            <MoneyIcon className="h-5 w-5" />
          </span>
          <p className="mt-3 text-[0.72rem] font-semibold uppercase tracking-wider text-white/50">
            {t('moneyAwaiting')}
          </p>
          <p dir="ltr" className="numeric mt-1 text-[1.5rem] font-bold leading-none text-brand-300">
            {formatPkr(totals.awaiting)}
          </p>
        </div>

        <StatTile
          icon={<CheckBadgeIcon className="h-5 w-5" />}
          label={t('moneyReceived')}
          value={formatPkr(totals.settled)}
          tone="accent"
          {...(totals.settled + totals.awaiting > 0
            ? {
                progress: Math.round(
                  (totals.settled / (totals.settled + totals.awaiting)) * 100,
                ),
              }
            : {})}
        />
      </section>

      {/* Pehle wo jis par ISI waqt kuch karna hai, phir poora naqsha */}
      {open.length > 0 && (
        <Widget title={t('moneyAwaiting')} subtitle={`${open.length} · ${formatPkr(totals.awaiting)}`}>
          <ul className="divide-y divide-paper-sunken">
            {open.map((payout) => (
              <li key={payout.id} className="px-5 py-3">
                <div className="flex flex-wrap items-center gap-3">
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
                </div>

                {/* Wohi tareekh jo wholesaler ke safhe par hai — lafz bhi wohi */}
                  <PayoutTimeline
                    payout={payout}
                    locale={locale}
                    now={now}
                    labels={{
                      delivered: t('tlDelivered'),
                      claimedSent: t('tlClaimedSent'),
                      confirmed: t('tlConfirmed'),
                      disputed: t('tlDisputed'),
                      reference: t('tlReference'),
                      proof: t('payoutProofView'),
                    }}
                  />
              </li>
            ))}
          </ul>
        </Widget>
      )}

      <Widget title={t('moneyByWholesaler')}>
        <div className="p-4">
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
        </div>
      </Widget>
    </div>
  )
}
