import { formatPkr } from '@oyebazar/shared'
import type { PayoutView } from '@oyebazar/core'
import type { Locale } from '@/lib/i18n'

/**
 * Mahine ka statement — dono taraf BILKUL ek jaisa kaghaz.
 *
 * 🔴 PDF server par nahi banti. Ye ek chhapne wala safha hai jise dono apne browser se
 * PDF bana lete hain (Ctrl+P → Save as PDF, phone par bhi wohi).
 *
 * Wajah: PDF banane ke liye Playwright ek poora browser chalata hai — sasta Fly.io ka
 * dabba us par jhukta hai, aur us ke badle milta kya hai? Wohi kaghaz jo browser khud
 * bana leta hai. Aur is tareeqe se dono ek hi URL kholte hain: "aap ka statement mere
 * wale se alag hai" wali baat hi nahi banti.
 *
 * Chhapte waqt jo cheez kaam ki nahi (nav, buttons) wo `print:hidden` se gaib ho jati
 * hai — ye ek class hai, alag print-only safha nahi, warna do jagah do sach reh jate.
 */
export function MoneyStatement({
  title,
  subtitle,
  month,
  rows,
  totals,
  locale,
  labels,
}: {
  title: string
  subtitle: string
  month: string
  rows: readonly PayoutView[]
  totals: { earned: number; received: number; awaiting: number }
  locale: Locale
  labels: {
    order: string
    date: string
    amount: string
    status: string
    reference: string
    earned: string
    received: string
    awaiting: string
    empty: string
    settled: string
    sent: string
    pending: string
    disputed: string
    footnote: string
  }
}) {
  const statusLabel = (status: PayoutView['status']) =>
    status === 'SETTLED'
      ? labels.settled
      : status === 'SENT'
        ? labels.sent
        : status === 'DISPUTED'
          ? labels.disputed
          : labels.pending

  const dateOf = (value: Date) =>
    // Ek hi shakl dono taraf — locale ke hisab se badle to do kaghaz alag lagne lagte hain
    value.toISOString().slice(0, 10)

  return (
    <article className="card mx-auto max-w-3xl p-6 print:border-0 print:p-0 print:shadow-none">
      <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-paper-sunken pb-4">
        <div>
          <h1 className="text-[1.3rem] font-bold tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-ink-soft">{subtitle}</p>
        </div>
        <p dir="ltr" className="numeric text-lg font-bold">
          {month}
        </p>
      </header>

      <dl className="grid grid-cols-3 gap-3 border-b border-paper-sunken py-4 text-center">
        <div>
          <dt className="text-[0.72rem] uppercase tracking-wider text-ink-faint">
            {labels.earned}
          </dt>
          <dd dir="ltr" className="numeric mt-1 font-bold">
            {formatPkr(totals.earned)}
          </dd>
        </div>
        <div>
          <dt className="text-[0.72rem] uppercase tracking-wider text-ink-faint">
            {labels.received}
          </dt>
          <dd dir="ltr" className="numeric mt-1 font-bold text-accent-700">
            {formatPkr(totals.received)}
          </dd>
        </div>
        <div>
          <dt className="text-[0.72rem] uppercase tracking-wider text-ink-faint">
            {labels.awaiting}
          </dt>
          <dd dir="ltr" className="numeric mt-1 font-bold text-brand-700">
            {formatPkr(totals.awaiting)}
          </dd>
        </div>
      </dl>

      {rows.length === 0 ? (
        <p className="py-8 text-center text-ink-soft">{labels.empty}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="text-[0.72rem] uppercase tracking-wider text-ink-faint">
                <th className="pb-2 text-start font-semibold">{labels.order}</th>
                <th className="pb-2 text-start font-semibold">{labels.date}</th>
                <th className="pb-2 text-start font-semibold">{labels.status}</th>
                <th className="pb-2 text-start font-semibold">{labels.reference}</th>
                <th className="pb-2 text-end font-semibold">{labels.amount}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-paper-sunken">
                  <td dir="ltr" className="numeric py-2">
                    {row.orderNo}
                  </td>
                  <td dir="ltr" className="numeric py-2 text-ink-soft">
                    {dateOf(row.createdAt)}
                  </td>
                  <td className="py-2 text-ink-soft">{statusLabel(row.status)}</td>
                  <td dir="ltr" className="numeric py-2 text-ink-faint">
                    {row.sentReference ?? '—'}
                  </td>
                  <td dir="ltr" className="numeric py-2 text-end font-semibold">
                    {formatPkr(row.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/*
        Ye jumla kaghaz par lazmi hai: statement gawahi nahi, record hai. Paisa hamare
        haath se nahi guzarta — hum sirf likhte hain ke kis ne kya kaha aur kab.
      */}
      <p className="mt-6 border-t border-paper-sunken pt-3 text-[0.78rem] text-ink-faint">
        {labels.footnote}
      </p>

      <p className="mt-1 text-[0.72rem] text-ink-faint" dir="ltr">
        oyebazar.com · {locale}
      </p>
    </article>
  )
}
