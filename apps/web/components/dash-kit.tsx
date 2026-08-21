import Link from 'next/link'
import type { Route } from 'next'

/**
 * Dashboard ke purze — dono taraf (dukan aur reseller) ek hi shakl.
 *
 * Pehle dono dashboard sirf "card mein ek number" the. Number to sahi tha, magar safha
 * parhne mein flat tha: har khana ek jaisa wazan rakhta tha, is liye aankh ko har dafa
 * poora safha parhna parta tha ye jaanne ke liye ke asal khabar kahan hai.
 *
 * Yahan teen purze hain, aur teenon ka kaam alag hai:
 *
 *   · StatTile — ek number, apne nishan (icon) ke saath. Nishan sirf sajawat nahi:
 *     wo ginti se pehle nazar mein aata hai aur "ye kis cheez ka number hai" ka jawab
 *     parhne se pehle de deta hai.
 *   · Widget — sar-nama, us ke neeche tafseel, aur kone mein wo jagah jahan poora kaam
 *     hota hai. Har list ko apna sar-nama dena safhe ko khanon mein baant deta hai.
 *   · MiniBars — pichhle kuch dinon ki chaal. Ek number "aaj kitne" batata hai; ye
 *     batata hai ke wo number oopar ja raha hai ya neeche.
 *
 * 🔴 Rang wohi hain jo poore app mein hain — ye sirf tarteeb aur wazan ki tabdeeli hai.
 */

type Tone = 'plain' | 'brand' | 'accent' | 'coal' | 'danger'

const CHIP: Record<Tone, string> = {
  plain: 'bg-paper-sunken text-ink-soft',
  brand: 'bg-brand-50 text-brand-700',
  accent: 'bg-accent-50 text-accent-700',
  coal: 'bg-coal-900/[0.06] text-coal-900',
  danger: 'bg-red-50 text-red-700',
}

const VALUE: Record<Tone, string> = {
  plain: 'text-ink',
  brand: 'text-brand-700',
  accent: 'text-accent-700',
  coal: 'text-coal-900',
  danger: 'text-red-700',
}

export function StatTile({
  icon,
  label,
  value,
  hint,
  tone = 'plain',
  href,
  progress,
}: {
  icon: React.ReactNode
  label: string
  value: string
  /** Chhoti si doosri baat — "kul", "is mahine", waghera */
  hint?: string
  tone?: Tone
  href?: Route
  /**
   * 0–100. Sirf tab den jab hissa waqai kisi cheez ka hissa ho (jaise "kitna mila
   * kitne mein se") — warna ye lakeer sirf sajawat ban jati hai aur log us se matlab
   * nikalne lagte hain jo hai hi nahi.
   */
  progress?: number
}) {
  const body = (
    <>
      <span
        className={`flex h-10 w-10 items-center justify-center rounded-card ${CHIP[tone]}`}
        aria-hidden="true"
      >
        {icon}
      </span>

      <p className="mt-3 text-[0.72rem] font-semibold uppercase tracking-wider text-ink-faint">
        {label}
      </p>
      <p dir="ltr" className={`numeric mt-1 text-[1.5rem] font-bold leading-none ${VALUE[tone]}`}>
        {value}
      </p>
      {hint && <p className="mt-1.5 text-[0.76rem] text-ink-faint">{hint}</p>}

      {progress !== undefined && (
        <span className="mt-3 block h-1.5 w-full overflow-hidden rounded-pill bg-paper-sunken">
          <span
            className={`block h-full rounded-pill ${
              tone === 'brand'
                ? 'bg-brand-500'
                : tone === 'accent'
                  ? 'bg-accent-500'
                  : tone === 'danger'
                    ? 'bg-red-500'
                    : 'bg-coal-900'
            }`}
            style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
          />
        </span>
      )}
    </>
  )

  // Jis number par kaam ho sakta hai wo dabne wala hona chahiye; baqi khamosh khana
  return href ? (
    <Link href={href} className="card p-4 transition hover:shadow-lift">
      {body}
    </Link>
  ) : (
    <div className="card p-4">{body}</div>
  )
}

export function Widget({
  title,
  subtitle,
  action,
  children,
}: {
  title: string
  subtitle?: string
  /** Kone wala rasta — poori list, ya us kaam ka safha */
  action?: { label: string; href: Route }
  children: React.ReactNode
}) {
  return (
    <section className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-paper-sunken px-4 py-3">
        <div className="min-w-0">
          <h2 className="text-[1rem] font-bold leading-tight">{title}</h2>
          {subtitle && <p className="mt-0.5 text-[0.76rem] text-ink-faint">{subtitle}</p>}
        </div>

        {action && (
          <Link
            href={action.href}
            className="inline-flex min-h-tap shrink-0 items-center rounded-pill bg-paper-sunken px-4 text-[0.78rem] font-semibold text-ink-soft transition hover:text-ink"
          >
            {action.label}
          </Link>
        )}
      </div>

      {children}
    </section>
  )
}

/**
 * Pichhle kuch dinon ki chaal — chhoti bars.
 *
 * SVG ya koi chart library nahi: ye chodah divs hain. Is safhe par ye sab se kam ahem
 * cheez hai, aur us ke liye ek library utarna (aur us ka JavaScript har bar bhejna)
 * mehnga sauda hai — khaas kar us phone par jis par ye safha khulta hai.
 */
export function MiniBars({
  points,
  caption,
  unit,
}: {
  /** Har din ki ginti — purane se naye ki tarteeb mein */
  points: readonly { label: string; value: number }[]
  caption: string
  unit: string
}) {
  const peak = Math.max(...points.map((point) => point.value), 1)

  return (
    <div className="px-4 py-4">
      <div dir="ltr" className="flex h-20 items-end gap-1">
        {points.map((point, index) => (
          <span
            key={index}
            // Poori patti par title — khali din par bhi jawab milna chahiye
            title={`${point.label}: ${point.value} ${unit}`}
            className="flex h-full flex-1 items-end"
          >
            <span
              className={`w-full rounded-t-[3px] ${
                point.value > 0 ? 'bg-brand-500' : 'bg-paper-sunken'
              }`}
              /* Khali din bhi ek lakeer chhorta hai — warna patti mein sooraakh lagta hai */
              style={{ height: `${point.value > 0 ? Math.max((point.value / peak) * 100, 8) : 4}%` }}
            />
          </span>
        ))}
      </div>

      <p className="mt-2 text-[0.72rem] text-ink-faint">{caption}</p>
    </div>
  )
}
