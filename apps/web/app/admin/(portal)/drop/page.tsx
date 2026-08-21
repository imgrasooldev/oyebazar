import type { Metadata } from 'next'
import { canDo } from '@oyebazar/core'
import { formatPkr } from '@oyebazar/shared'
import { BuildDropButton } from '@/components/build-drop-button'
import { StatTile, Widget } from '@/components/dash-kit'
import { SparkIcon, UsersIcon } from '@/components/icons'
import { requireOpsUser } from '@/lib/api/admin-session'
import { container } from '@/lib/container'

export const metadata: Metadata = {
  title: 'Daily drop · Admin',
  robots: { index: false, follow: false },
}
export const dynamic = 'force-dynamic'

/**
 * Aaj ka drop — subah 9 baje jo paanch cheezein har reseller ke paas jati hain.
 *
 * Ye safha pehle tha hi nahi: drop sirf worker ki CLI se banta tha aur cron se jata tha.
 * Amal mein us ka matlab ye tha ke ops ke paas ye jaanne ka koi rasta hi nahi tha ke
 * aaj kuch gaya bhi ya nahi — aur agar na gaya ho to karne ka bhi koi rasta nahi tha.
 * Aur ye wo cheez hai jis par poore platform ka roz ka kaam khara hai: reseller subah
 * apne status par yehi lagati hai.
 *
 * Curation yahan se nahi hoti (wo qawaid DailyDropService mein hain aur jaan boojh kar
 * saaday hain). Yahan sirf teen sawal hain: aaj kya ja raha hai, gaya ya nahi, aur na
 * bana ho to bana do.
 */
export default async function AdminDropPage() {
  const { user } = await requireOpsUser()

  const [today, recent] = await Promise.all([
    container.dailyDrops.getTodaysDrop(),
    container.dailyDrops.recentDrops(10),
  ])

  const items = today ? await container.dailyDrops.dropItems(today.productIds) : []

  /*
   * Jo maal drop mein hai magar ab LIVE nahi raha, wo `dropItems` se chup chaap gir
   * jata hai. Ye farq chhupana nahi chahiye: drop mein 5 the aur nazar 4 aa rahe hain,
   * to ops ko wajah dhoondni chahiye (khatam ho gaya, ya archive kar diya gaya).
   */
  const missing = today ? today.productIds.length - items.length : 0

  const sentToday = recent.find((drop) => drop.id === today?.id)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[1.4rem] font-bold tracking-tight">Daily drop</h1>
          <p className="mt-1 max-w-3xl text-sm text-ink-soft">
            The five items that go out to every reseller at 9am. Built once a day — building
            again returns the same drop, it never makes a second one.
          </p>
        </div>

        {/* Button sirf tab jab aaj ka drop bana hi na ho — bana hua ho to dabane ko kuch nahi */}
        {!today && canDo(user.role, 'buildDailyDrop') && (
          <BuildDropButton label="Build today’s drop" working="Building…" />
        )}
      </div>

      {!today ? (
        /*
         * Khali halat — aur us ka matlab saaf likha hua.
         * "Koi drop nahi" apne aap mein khabar nahi; khabar ye hai ke aaj kisi reseller
         * ke paas lagane ko kuch naya nahi hai.
         */
        <div className="card p-8 text-center">
          <p className="font-semibold">No drop for today yet</p>
          <p className="mt-1 text-sm text-ink-soft">
            Until this is built, no reseller has anything new to post this morning.
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <StatTile
              icon={<SparkIcon className="h-5 w-5" />}
              label="Items in today’s drop"
              value={String(today.productIds.length)}
              {...(missing > 0 ? { hint: `${missing} no longer live`, tone: 'danger' } : {})}
            />
            <StatTile
              icon={<UsersIcon className="h-5 w-5" />}
              label="Sent to"
              value={sentToday ? String(sentToday.sentCount) : '0'}
              hint={
                today.sentAt
                  ? `Broadcast ${today.sentAt.toISOString().slice(11, 16)} UTC`
                  : 'Not broadcast yet'
              }
              tone={today.sentAt ? 'accent' : 'plain'}
            />
            <StatTile
              icon={<SparkIcon className="h-5 w-5" />}
              label="Status"
              value={today.status}
              hint={today.dropDate.toISOString().slice(0, 10)}
            />
          </div>

          <Widget title="Today’s items" subtitle="In the order resellers see them">
            <ul className="divide-y divide-paper-sunken">
              {items.map((product) => (
                <li key={product.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-card bg-paper-sunken">
                    {product.coverImageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element -- storage URLs
                      <img
                        src={product.coverImageUrl}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{product.titleEn || product.titleUr}</p>
                    <p className="text-[0.78rem] text-ink-faint">
                      {product.category.nameEn}
                      {!product.inStock && <span className="ms-2 text-red-600">out of stock</span>}
                    </p>
                  </div>

                  <span dir="ltr" className="numeric shrink-0 text-sm font-semibold">
                    {formatPkr(product.bajiPrice)}
                  </span>
                </li>
              ))}
            </ul>
          </Widget>
        </>
      )}

      <Widget title="Recent drops" subtitle="Was anything sent, and to how many">
        {recent.length === 0 ? (
          <p className="px-4 py-6 text-sm text-ink-soft">No drops yet.</p>
        ) : (
          <ul className="divide-y divide-paper-sunken">
            {recent.map((drop) => (
              <li key={drop.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                <span dir="ltr" className="numeric w-28 shrink-0 text-sm font-semibold">
                  {drop.dropDate.toISOString().slice(0, 10)}
                </span>

                <span className="min-w-0 flex-1 text-[0.85rem] text-ink-soft">
                  <span dir="ltr" className="numeric">
                    {drop.itemCount}
                  </span>{' '}
                  items
                </span>

                {/*
                  "Kis ko gaya" — 0 bhi ek jawab hai, aur SENT ke saath 0 sab se ahem
                  jawab hai: broadcast chala magar kisi tak nahi pohancha.
                */}
                <span dir="ltr" className="numeric shrink-0 text-[0.85rem] text-ink-soft">
                  {drop.sentCount} resellers
                </span>

                <span
                  className={`badge shrink-0 ${
                    drop.status === 'SENT'
                      ? 'bg-accent-50 text-accent-700'
                      : 'bg-paper-sunken text-ink-soft'
                  }`}
                >
                  {drop.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Widget>
    </div>
  )
}
