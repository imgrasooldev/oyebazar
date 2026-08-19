import { formatPkr } from '@oyebazar/shared'
import type { CounterpartyLedgerRow } from '@oyebazar/core'
import { timeAgo, type Locale } from '@/lib/i18n'

/**
 * "Falan ke saath mera kya hisab hai" — ek hi jadwal, dono taraf.
 *
 * Reseller ke safhe par har qatar ek DUKAN hai, wholesaler ke safhe par har qatar ek
 * RESELLER. Ginti aur raqam ke maani dono taraf bilkul ek jaise hain, is liye do alag
 * component banane ka matlab sirf ye hota ke ek taraf ka lafz badal kar doosri badalna
 * bhool jayen.
 *
 * Tarteeb repository se aati hai (baqi raqam sab se upar) — UI usay dobara nahi lagati.
 */
export function CounterpartyLedger({
  rows,
  locale,
  labels,
  now,
}: {
  rows: readonly CounterpartyLedgerRow[]
  locale: Locale
  now: Date
  labels: {
    empty: string
    orders: string
    delivered: string
    running: string
    lost: string
    earned: string
    received: string
    awaiting: string
    disputed: string
    lastOrder: string
  }
}) {
  if (rows.length === 0) {
    return <p className="card p-6 text-ink-soft">{labels.empty}</p>
  }

  return (
    <ul className="space-y-3">
      {rows.map((row) => (
        <li key={row.id} className="card p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <div className="min-w-0">
              <h3 className="truncate font-bold">{row.name}</h3>
              <p className="mt-0.5 text-[0.78rem] text-ink-faint">
                {row.city}
                {row.lastOrderAt && (
                  <>
                    <span className="mx-1.5">·</span>
                    {labels.lastOrder} {timeAgo(locale, row.lastOrderAt, now)}
                  </>
                )}
              </p>
            </div>

            {/*
              Baqi raqam sab se numaya — is safhe par aane ki wajah yehi ek number hai.
              Sifar ho to khamosh rang: "sab hisab saaf hai" bhi ek khabar hai.
            */}
            <div className="text-end">
              <p
                dir="ltr"
                className={`numeric text-lg font-bold ${
                  row.awaiting > 0 ? 'text-brand-700' : 'text-ink-faint'
                }`}
              >
                {formatPkr(row.awaiting)}
              </p>
              <p className="text-[0.72rem] text-ink-faint">{labels.awaiting}</p>
            </div>
          </div>

          {/* Order ki ginti — paison se alag lakeer ke neeche, kyunke ye alag sawal hai */}
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-paper-sunken pt-2.5 text-[0.78rem] text-ink-soft">
            <span>
              <span dir="ltr" className="numeric font-semibold text-ink">
                {row.ordersTotal}
              </span>{' '}
              {labels.orders}
            </span>
            <span className="text-ink-faint">
              <span dir="ltr" className="numeric">
                {row.ordersDelivered}
              </span>{' '}
              {labels.delivered}
            </span>
            {row.ordersRunning > 0 && (
              <span className="text-ink-faint">
                <span dir="ltr" className="numeric">
                  {row.ordersRunning}
                </span>{' '}
                {labels.running}
              </span>
            )}
            {/* Zaya hue order chhupaye nahi jate — RTO ka number hi behtari ka rasta hai */}
            {row.ordersLost > 0 && (
              <span className="text-ink-faint">
                <span dir="ltr" className="numeric">
                  {row.ordersLost}
                </span>{' '}
                {labels.lost}
              </span>
            )}
            {row.disputedCount > 0 && (
              <span className="rounded-pill bg-red-50 px-2 py-0.5 font-semibold text-red-700">
                <span dir="ltr" className="numeric">
                  {row.disputedCount}
                </span>{' '}
                {labels.disputed}
              </span>
            )}
          </div>

          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[0.78rem]">
            <span className="text-ink-faint">
              {labels.earned}{' '}
              <span dir="ltr" className="numeric font-semibold text-ink">
                {formatPkr(row.earned)}
              </span>
            </span>
            <span className="text-ink-faint">
              {labels.received}{' '}
              <span dir="ltr" className="numeric font-semibold text-accent-700">
                {formatPkr(row.received)}
              </span>
            </span>
            {/*
              Purana baqaya — sirf tab jab waqai purana ho. Har qatar par "0 din" likhna
              us jagah ko bhar deta hai jahan asal khabar aani chahiye.
            */}
            {row.oldestAwaitingDays >= 3 && (
              <span
                className={`font-semibold ${
                  row.oldestAwaitingDays >= 14 ? 'text-red-700' : 'text-brand-700'
                }`}
              >
                <span dir="ltr" className="numeric">
                  {row.oldestAwaitingDays}
                </span>
                d
              </span>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}
