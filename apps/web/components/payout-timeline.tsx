import { formatPkr } from '@oyebazar/shared'
import type { PayoutView } from '@oyebazar/core'
import { timeAgo, type Locale } from '@/lib/i18n'

/**
 * Ek hisab ki poori tareekh — kis ne kya kaha, kab.
 *
 * 🔴 Dono taraf BILKUL yehi list dikhti hai. Jhagre aksar isi baat par barhte hain ke
 * har banda apni yaadasht se baat karta hai ("maine to parson bheja tha"). Ek hi tareekh
 * jo dono ke saamne ho, aadha jhagra wahin khatam kar deti hai.
 *
 * Yahan koi cheez mitti nahi. Reseller ne "nahi mile" kaha to wholesaler ka TID apni
 * jagah rehta hai, aur wholesaler ne dobara bheja to purana dawa bhi list mein rehta hai.
 */
export function PayoutTimeline({
  payout,
  locale,
  now,
  labels,
}: {
  payout: PayoutView
  locale: Locale
  now: Date
  labels: {
    delivered: string
    claimedSent: string
    confirmed: string
    disputed: string
    reference: string
  }
}) {
  const steps: { at: Date; text: string; note?: string; tone: 'plain' | 'good' | 'bad' }[] = [
    { at: payout.createdAt, text: `${labels.delivered} · ${formatPkr(payout.amount)}`, tone: 'plain' },
  ]

  if (payout.sentAt) {
    steps.push({
      at: payout.sentAt,
      text: labels.claimedSent,
      ...(payout.sentReference ? { note: `${labels.reference} ${payout.sentReference}` } : {}),
      tone: 'plain',
    })
  }

  if (payout.disputedAt) {
    steps.push({
      at: payout.disputedAt,
      text: labels.disputed,
      ...(payout.disputeNote ? { note: payout.disputeNote } : {}),
      tone: 'bad',
    })
  }

  if (payout.confirmedAt) {
    steps.push({ at: payout.confirmedAt, text: labels.confirmed, tone: 'good' })
  }

  // Waqt ke hisab se — DB ki tarteeb par bharosa nahi, kyunke jhagre ke baad dobara
  // bhejne par sentAt purane disputedAt se aage nikal jata hai
  steps.sort((a, b) => a.at.getTime() - b.at.getTime())

  return (
    <ol className="mt-3 space-y-1.5 border-t border-paper-sunken pt-2.5">
      {steps.map((step, index) => (
        <li key={index} className="flex items-baseline gap-2 text-[0.78rem]">
          <span
            aria-hidden="true"
            className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
              step.tone === 'good'
                ? 'bg-accent-500'
                : step.tone === 'bad'
                  ? 'bg-red-500'
                  : 'bg-ink-faint'
            }`}
          />
          <span className="min-w-0 flex-1">
            <span className={step.tone === 'bad' ? 'text-red-700' : 'text-ink-soft'}>
              {step.text}
            </span>
            {step.note && (
              <span dir="ltr" className="numeric ms-1.5 text-ink-faint">
                {step.note}
              </span>
            )}
          </span>
          <span className="shrink-0 text-ink-faint">{timeAgo(locale, step.at, now)}</span>
        </li>
      ))}
    </ol>
  )
}
