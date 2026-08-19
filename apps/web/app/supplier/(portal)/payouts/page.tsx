import Link from 'next/link'
import type { Metadata } from 'next'
import { formatPkr } from '@oyebazar/shared'
import { isOverdue } from '@oyebazar/core'
import { CounterpartyLedger } from '@/components/counterparty-ledger'
import { SupplierPayoutSend } from '@/components/payout-actions'
import { PayoutTimeline } from '@/components/payout-timeline'
import { requireSupplier } from '@/lib/api/supplier-session'
import { container } from '@/lib/container'
import { timeAgo, translator } from '@/lib/i18n'
import { getLocale } from '@/lib/i18n-server'

export const metadata: Metadata = { title: 'Reseller ke paise' }
export const dynamic = 'force-dynamic'

/**
 * Wholesaler ka hisab — reseller ka wo hissa jo COD mein us ke haath aaya.
 *
 * Tarteeb umar se hai, raqam se nahi: sab se purana baqaya sab se upar. Ek chhoti raqam
 * jo do hafte se ruki hai, us bari raqam se zyada khatarnak hai jo kal bani thi — jhagra
 * hamesha waqt se banta hai, raqam se nahi.
 *
 * 🔴 "Bhej diye" dabane se hisab band NAHI hota — wo sirf dawa darj karta hai. Band tab
 * hota hai jab reseller apni taraf se tasdeeq kare. Yehi baat safhe par bhi likhi hui hai,
 * warna dukan wala samajhta hai ke us ka kaam khatam ho gaya.
 */
export default async function SupplierPayoutsPage() {
  const [{ supplier }, locale] = await Promise.all([requireSupplier(), getLocale()])
  const t = translator(locale)

  const [payouts, ledger, platformFee] = await Promise.all([
    container.payouts.listForSupplier(supplier.id),
    container.payouts.ledgerByReseller(supplier.id),
    container.payouts.platformFeeForSupplier(supplier.id),
  ])
  const now = new Date()

  const open = payouts.filter((payout) => payout.status !== 'SETTLED')
  const settled = payouts.filter((payout) => payout.status === 'SETTLED')
  const owed = open.reduce((sum, payout) => sum + payout.amount, 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
        <h1 className="text-[1.3rem] font-bold tracking-tight">{t('payoutsNav')}</h1>
        {/* Dukan wale ke liye apne lafz — reseller wala jumla yahan ulta parhta hai */}
        <p className="mt-1 max-w-2xl text-sm text-ink-soft">{t('payoutNoteSupplier')}</p>
        </div>
        {/* Reseller ke paas bilkul yehi kaghaz hai — numbers dono taraf ek */}
        <Link href="/supplier/statement" className="btn-ghost shrink-0">
          {t('statement')}
        </Link>
      </div>

      {/*
        Do bilkul alag khaane, jaan boojh kar saath saath: baayen reseller ka paisa
        (jo aap ne dena hai), daayen hamari fee (jo hamein deni hai). Dukan par ye dono
        aksar aapas mein gaddmadd ho jate hain — aur phir na reseller ko poora milta hai
        na hamein.
      */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="card p-5">
          <p className="text-[0.78rem] text-ink-faint">{t('moneyOwedToResellers')}</p>
          <p dir="ltr" className="numeric mt-1 text-2xl font-bold text-brand-700">
            {formatPkr(owed)}
          </p>
        </div>

        <div className="card p-5">
          <p className="text-[0.78rem] text-ink-faint">{t('platformFee')}</p>
          <p dir="ltr" className="numeric mt-1 text-2xl font-bold">
            {formatPkr(platformFee.earned + platformFee.invoiced)}
          </p>
          <p className="mt-1 text-[0.74rem] text-ink-faint">
            {t('feeInvoicedLabel')}{' '}
            <span dir="ltr" className="numeric">
              {formatPkr(platformFee.invoiced)}
            </span>
            <span className="mx-1.5">·</span>
            {t('feeCollectedLabel')}{' '}
            <span dir="ltr" className="numeric">
              {formatPkr(platformFee.collected)}
            </span>
          </p>
        </div>
      </div>

      {open.length === 0 ? (
        <p className="card p-6 text-ink-soft">{t('payoutEmpty')}</p>
      ) : (
        <ul className="space-y-3">
          {open.map((payout) => (
            <li key={payout.id} className="card p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="min-w-0">
                  <p dir="ltr" className="numeric font-bold">
                    {payout.orderNo}
                  </p>
                  <p className="mt-0.5 text-[0.78rem] text-ink-faint">
                    {timeAgo(locale, payout.createdAt, now)}
                    {/* Der ka nishan — ye wohi rows hain jin par reseller pehle shikayat karti hai */}
                    {isOverdue(payout, now) && (
                      <span className="ms-2 rounded-pill bg-red-50 px-2 py-0.5 font-semibold text-red-700">
                        {t('payoutOverdue')}
                      </span>
                    )}
                  </p>
                </div>
                <p dir="ltr" className="numeric text-lg font-bold">
                  {formatPkr(payout.amount)}
                </p>
              </div>

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
                }}
              />
              <div className="mt-3">
                {payout.status === 'SENT' ? (
                  <p className="text-[0.82rem] text-ink-soft">
                    {t('payoutSentClaim')}
                    {payout.sentReference && (
                      <span dir="ltr" className="numeric ms-2 text-ink-faint">
                        {payout.sentReference}
                      </span>
                    )}
                  </p>
                ) : (
                  <>
                    {payout.status === 'DISPUTED' && (
                      <p className="mb-2 rounded-card bg-red-50 px-3 py-2 text-[0.8rem] text-red-700">
                        {t('payoutDisputed')}
                        {payout.disputeNote && <span className="ms-1">— {payout.disputeNote}</span>}
                      </p>
                    )}
                    <SupplierPayoutSend
                      payoutId={payout.id}
                      labels={{
                        send: t('payoutSend'),
                        reference: t('payoutReference'),
                        saving: t('saving'),
                      }}
                    />
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <section>
        <h2 className="mb-3 text-[0.78rem] font-bold uppercase tracking-wider text-ink-faint">
          {t('moneyByReseller')}
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
            received: t('feeCollectedLabel'),
            awaiting: t('moneyAwaiting'),
            disputed: t('disputedShort'),
            lastOrder: t('lastOrder'),
          }}
        />
      </section>

      {settled.length > 0 && (
        <section>
          <h2 className="mb-2 text-[0.78rem] font-bold uppercase tracking-wider text-ink-faint">
            {t('payoutSettled')}
          </h2>
          <ul className="card divide-y divide-paper-sunken">
            {settled.slice(0, 20).map((payout) => (
              <li key={payout.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <span dir="ltr" className="numeric text-sm">
                  {payout.orderNo}
                </span>
                <span dir="ltr" className="numeric text-sm text-ink-soft">
                  {formatPkr(payout.amount)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
