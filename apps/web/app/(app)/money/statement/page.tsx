import Link from 'next/link'
import type { Metadata } from 'next'
import { MoneyStatement } from '@/components/money-statement'
import { requireReseller } from '@/lib/api/session'
import { container } from '@/lib/container'
import { translator } from '@/lib/i18n'
import { getLocale } from '@/lib/i18n-server'
import { monthNav, monthOrCurrent } from '@/lib/month'

export const metadata: Metadata = { title: 'Mahane ka gosh-wara' }
export const dynamic = 'force-dynamic'

/**
 * Reseller ka mahana statement.
 *
 * Wohi safha wholesaler ke paas bhi hai (`/supplier/statement`) aur us mein bilkul yehi
 * numbers hote hain — kyunke dono ek hi rows se bante hain. "Aap ka hisab mere wale se
 * alag hai" wali baat yahin khatam ho jati hai.
 */
export default async function ResellerStatementPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const [{ reseller }, locale, query] = await Promise.all([
    requireReseller(),
    getLocale(),
    searchParams,
  ])
  const t = translator(locale)

  const month = monthOrCurrent(query.month)
  const { rows, totals } = await container.payouts.statement({ resellerId: reseller.id }, month)
  const nav = monthNav(month)

  return (
    <div className="space-y-4">
      {/* Chhapte waqt ye patti gayab — kaghaz par button ka koi matlab nahi */}
      <div className="flex flex-wrap items-center gap-3 print:hidden">
        <Link href={{ pathname: '/money/statement', query: { month: nav.prev } }} className="btn-ghost">
          ← {t('stPrev')}
        </Link>
        {nav.next && (
          <Link href={{ pathname: '/money/statement', query: { month: nav.next } }} className="btn-ghost">
            {t('stNext')} →
          </Link>
        )}
        <Link href="/money" className="ms-auto text-sm text-ink-soft hover:text-brand-700">
          {t('myMoney')}
        </Link>
      </div>

      <MoneyStatement
        title={t('statement')}
        subtitle={reseller.name}
        month={month}
        rows={rows}
        totals={totals}
        locale={locale}
        labels={{
          order: t('stOrder'),
          date: t('stDate'),
          amount: t('stAmount'),
          status: t('stStatus'),
          reference: t('stReference'),
          earned: t('moneyEarnedTotal'),
          received: t('moneyReceived'),
          awaiting: t('moneyAwaiting'),
          empty: t('stEmpty'),
          settled: t('payoutSettled'),
          sent: t('payoutSentClaim'),
          pending: t('payoutPending'),
          disputed: t('payoutDisputed'),
          footnote: t('stFootnote'),
        }}
      />
    </div>
  )
}
