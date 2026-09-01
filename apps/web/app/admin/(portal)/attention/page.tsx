import Link from 'next/link'
import type { Metadata } from 'next'
import type { Route } from 'next'
import { formatPhoneLocal, formatPkr, whatsappLink } from '@oyebazar/shared'
import type { OpsFlag } from '@oyebazar/core'
import { StatTile } from '@/components/dash-kit'
import { ShieldIcon, WhatsAppIcon } from '@/components/icons'
import { requireOpsUser } from '@/lib/api/admin-session'
import { container } from '@/lib/container'

export const metadata: Metadata = {
  title: 'Needs attention',
  robots: { index: false, follow: false },
}
export const dynamic = 'force-dynamic'

/**
 * Needs attention — the one page that asks what nobody was asking.
 *
 * 🔴 This does NOT replace any other page. Money, Products and Orders keep everything
 * they had. This surfaces only the rows that sink to the bottom of those lists — and
 * those are exactly the expensive ones: the disputed payout, the price with a missing
 * zero, the order a wholesaler has ignored for three days.
 *
 * 🔴 Nothing here decides anything. Every row links to the page where the work actually
 * happens — a screen that both accuses and executes is the one people stop trusting, and
 * ops needs the surrounding context before deciding anyway.
 *
 * 🔴 But where the next step is simply "phone the wholesaler", the number is ON the row.
 * That is the difference between a page that reports and a page that gets used: ops has
 * twenty other rows waiting, and a number three pages away is a call that never happens.
 *
 * Angrezi mein — baqi admin ki tarah (dekhen (portal)/layout.tsx).
 */
export default async function AttentionPage() {
  await requireOpsUser()
  const { flags, counts } = await container.opsTriage.flags()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[1.35rem] font-bold tracking-tight">Needs attention</h1>
        <p className="mt-1 text-[0.92rem] leading-relaxed text-ink-soft">
          Everything below is already visible somewhere else — this is what would have
          stayed at the bottom of that list. Oldest first within each level.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile
          icon={<ShieldIcon />}
          tone={counts.high > 0 ? 'danger' : 'plain'}
          label="Now"
          value={String(counts.high)}
          hint="Money or a waiting customer"
        />
        <StatTile
          icon={<ShieldIcon />}
          tone={counts.medium > 0 ? 'brand' : 'plain'}
          label="Soon"
          value={String(counts.medium)}
          hint="Wrong data reaching resellers"
        />
        <StatTile
          icon={<ShieldIcon />}
          label="Whenever"
          value={String(counts.low)}
          hint="Tidying, no one is blocked"
        />
      </div>

      {flags.length === 0 ? (
        /*
         * Khali list ACHHI khabar hai — aur usay waise hi likha jana chahiye. "No results"
         * jaisa jumla parh kar banda samajhta hai ke chhanni tooti hui hai.
         */
        <div className="card p-10 text-center">
          <p className="text-[1.05rem] font-bold">Nothing needs attention.</p>
          <p className="mt-1 text-[0.9rem] text-ink-soft">
            No disputes, no overdue money, no odd prices, no ignored orders.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {flags.map((flag) => (
            <FlagRow key={`${flag.kind}-${flag.id}`} flag={flag} />
          ))}
        </ul>
      )}
    </div>
  )
}

function FlagRow({ flag }: { flag: OpsFlag }) {
  const tone = TONES[flag.severity]

  /*
   * 🔴 Qatar ab POORI ek link nahi hai — aur ye tabdeeli soch kar ki gayi.
   *
   * Pehle wo thi, aur us mein "call" wala button andar nahi rakha ja sakta tha (link ke
   * andar link). Us se ye safha aadha reh jata: nishan dikhta, aur us par kaam karne ke
   * liye teen safhe door jana parta — jab ke ops ke paas bees aur qataren pari hoti hain
   * aur wo teesra safha khulta hi nahi.
   */
  return (
    <li className="card flex flex-wrap items-start gap-3 p-4">
      {/*
        Rang ki patti — na ke ek aur badge. Qatar par pehle se do lafz hain (kism aur
        naam); teesra badge us jagah ko bhar deta jahan asal khabar aani chahiye.
      */}
      <span className={`mt-1 w-1 shrink-0 self-stretch rounded-pill ${tone.bar}`} />

      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-baseline gap-x-2">
          <span className={`text-[0.72rem] font-bold uppercase tracking-wider ${tone.text}`}>
            {KIND_LABEL[flag.kind]}
          </span>
          <span className="truncate font-semibold">{flag.label}</span>
        </p>

        <p className="mt-1 text-[0.85rem] leading-relaxed text-ink-soft">{sentence(flag)}</p>

        {flag.context && <p className="mt-0.5 text-[0.78rem] text-ink-faint">{flag.context}</p>}
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2 self-center">
        {/*
          WhatsApp ka button sirf wahan jahan agla qadam WAQAI paighaam bhejna hai. Har
          qatar par ek button chipka dena us button ko bemani bana deta hai — aur number
          bhi saath likha hai, kyunke ops aksar apne phone se baat karti hai, is screen
          se nahi.

          🔴 Jahan hamare paas bhejne ko kuch TAYYAR hai (dukan ka apna order-link), wo
          paighaam pehle se bhara hua jata hai. Ye sirf sahulat nahi: WhatsApp ka provider
          abhi juda nahi hai, is liye dukan tak order ki khabar pohanchane ka WAHID
          amli rasta yehi ek tap hai.
        */}
        {flag.action && (
          <a
            href={whatsappLink(flag.action.phone, flag.action.text)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-tap items-center gap-1.5 rounded-pill bg-accent-50 px-3.5 text-[0.78rem] font-semibold text-accent-700 transition hover:bg-accent-100"
          >
            <WhatsAppIcon className="h-4 w-4" />
            <span dir="ltr" className="numeric">
              {formatPhoneLocal(flag.action.phone)}
            </span>
          </a>
        )}

        <Link
          href={hrefFor(flag)}
          className="inline-flex min-h-tap items-center rounded-pill px-3 text-[0.8rem] font-semibold text-brand-700 transition hover:bg-brand-50"
        >
          Open ›
        </Link>
      </div>
    </li>
  )
}

const TONES = {
  high: { bar: 'bg-red-500', text: 'text-red-700' },
  medium: { bar: 'bg-brand-500', text: 'text-brand-700' },
  low: { bar: 'bg-paper-sunken', text: 'text-ink-faint' },
} as const

const KIND_LABEL: Record<OpsFlag['kind'], string> = {
  payoutDisputed: 'Disputed',
  payoutOverdue: 'Overdue',
  orderUnanswered: 'No answer',
  openIssue: 'Issue raised',
  duplicateProduct: 'Duplicate',
  uncategorised: 'No category',
  oddPrice: 'Odd price',
  oddTitle: 'Odd name',
  oddCategory: 'Odd category',
  stockChurn: 'Stock churn',
  unsellable: 'Cannot be sold',
  appError: 'Broken',
}

/**
 * Har nishan ka jumla — us ke apne NUMBERS ke saath.
 *
 * 🔴 Sirf darja ("high") par ops kuch nahi kar sakta. "9 days late · Rs 4,200" par wo
 * phone utha leta hai. Wahi soch `OrderRiskNote` par bhi hai.
 */
function sentence(flag: OpsFlag): string {
  const v = flag.values

  switch (flag.kind) {
    case 'payoutDisputed':
      return `Reseller says the money never arrived — ${formatPkr(Number(v.amount))}${
        v.note ? `. "${String(v.note)}"` : ''
      }`

    case 'payoutOverdue':
      return `${v.days} day(s) past the agreed term — ${formatPkr(Number(v.amount))} still with the wholesaler`

    case 'orderUnanswered':
      return `Sent to the wholesaler ${v.hours} hours ago and still unanswered — a customer is waiting`

    /*
      🔴 The reseller's own words carry this row, not a sentence we compose.

      Every other flag is something we NOTICED. This one is something a person WROTE,
      and paraphrasing it would be the one place on this page where we put words in
      someone's mouth. Her sentence is also the only thing that tells ops whether this
      is a wrong colour or a lost parcel — which is exactly the call this page exists
      to let them make.

      So the sentence here only carries the clock; `context` carries what she said.
    */
    case 'openIssue':
      return `Open for ${v.hours} hours — she wrote this and nobody has closed it`

    case 'oddPrice':
      return `Rs ${Number(v.price).toLocaleString('en-PK')} against a ${String(
        v.category,
      )} median of Rs ${Number(v.median).toLocaleString('en-PK')} — ${v.times}× off. Often a missing zero.`

    case 'duplicateProduct':
      return `The same wholesaler lists this name ${v.copies} times — resellers see it twice`

    case 'uncategorised':
      return 'Sitting in the fallback category, so it never shows up under a filter'

    case 'oddTitle':
      return TITLE_PROBLEM[String(v.problem)] ?? 'The name does not identify the product'

    /*
     * 🔴 Ginti jumle mein: khaana mitana mahenga faisla hai agar us mein maal para ho,
     * aur ops ko wo baat NISHAN par chahiye, us safhe par ja kar nahi. "0 products" wala
     * khaana ek click ka kaam hai; "31 products" wala pehle sochne ka.
     */
    case 'oddCategory':
      return `${TITLE_PROBLEM[String(v.problem)] ?? 'The name does not identify anything'} — and a category shows on the reseller's filter bar and on the public Bazaar (${v.products} products in it)`

    case 'appError':
      return `Something threw an error ${v.count} time(s) in the last 24 hours — someone's screen was broken`

    case 'unsellable':
      return 'Live on Bazaar but has no stock at all — a reseller can post it and the order will be refused'

    case 'stockChurn':
      return `Count corrected by hand ${v.fixes} times in ${v.days} days — the number on screen may not be the number in the shop`
  }
}

const TITLE_PROBLEM: Record<string, string> = {
  tooShort: 'Name is too short to identify the product',
  // Ye rozana hota hai, aur nuqsan dohra hai — dekhen `domain/ops-flags.ts`
  hasPhone: 'There is a phone number in the name — it prints on Bazaar and takes the order off-platform',
  mostlyDigits: 'The name is mostly digits',
  placeholder: 'Looks like a test entry that went live',
  repeatedChars: 'A key was held down while typing',
}

/**
 * Har nishan ka rasta — us safhe par jahan kaam WAQAI hota hai.
 *
 * 🔴 Yahan koi button nahi hai, sirf link. Faisla us safhe par hota hai jahan us ke gird
 * ki poori baat mojood hoti hai — aur ek aisi screen jo ilzam bhi lagaye aur amal bhi
 * kare, wohi hoti hai jis par log bharosa karna chhor dete hain.
 */
function hrefFor(flag: OpsFlag): Route {
  switch (flag.subject) {
    case 'payout':
      return '/admin/money'
    case 'order':
      return '/admin/orders'
    case 'category':
      return '/admin/categories'
    default:
      return '/admin/products'
  }
}
