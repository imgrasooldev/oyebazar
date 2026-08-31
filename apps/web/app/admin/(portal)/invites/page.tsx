import type { Metadata } from 'next'
import { REFERRAL_BONUS, REFERRAL_BONUS_LIMIT } from '@oyebazar/core'
import { formatPkr } from '@oyebazar/shared'
import { StatTile } from '@/components/dash-kit'
import { UsersIcon } from '@/components/icons'
import { requireOpsUser } from '@/lib/api/admin-session'
import { container } from '@/lib/container'
import { timeAgo } from '@/lib/i18n'

export const metadata: Metadata = { title: 'Invites', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

/**
 * Invite ka poora silsila — ops ke liye.
 *
 * 🔴 Ye safha do sawalon ka jawab deta hai jo kahin aur se nahi milte:
 *
 *   1. Scheme KAAM kar rahi hai ya sirf chal rahi hai? Kul invite ka number ek do
 *      bandon se bhi bara ho sakta hai; asal khabar ye hai ke kitne log LAA rahe hain,
 *      aur un mein se kitne aane wale waqai kuch bech rahe hain.
 *   2. Kaun aaya magar ruk gaya? Wo qatarein hi wo jagah hain jahan ops kuch kar sakti
 *      hai — aur sirf ginti dekh kar wo unhen kabhi nahi dhoondh sakti.
 *
 * Angrezi mein — baqi admin ki tarah (dekhen (portal)/layout.tsx).
 */
export default async function AdminInvitesPage() {
  const { user } = await requireOpsUser()
  container.admin.assertPermission(user, 'view')

  const [referrals, given] = await Promise.all([
    container.repositories.adminReferrals.list(100),
    container.repositories.bonuses.countByKind('REFERRAL'),
  ])

  const now = new Date()

  /*
   * Teen adad — fehrist se GINE gaye, nayi query se nahi.
   *
   * 🔴 "Started selling" wohi ek number hai jis par is scheme ka faisla hona chahiye.
   * Join karna muft hai; bikna nahi. Agar sau log aayen aur teen bechen, to scheme log
   * to laa rahi hai magar RESELLER nahi laa rahi — aur wo do bilkul alag cheezein hain.
   */
  const selling = referrals.filter((row) => row.delivered > 0).length
  const inviters = new Set(referrals.map((row) => row.invitedById)).size

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[1.35rem] font-bold tracking-tight">Invites</h1>
        <p className="mt-1 text-[0.92rem] leading-relaxed text-ink-soft">
          Who brought whom, and whether it turned into a sale. The bonus opens on the
          invitee&rsquo;s first delivered order — never on signup.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile
          icon={<UsersIcon />}
          label="Came via invite"
          value={String(referrals.length)}
          /*
            Bulane walon ki ginti YAHIN — apni tile mein nahi.

            Wo akela ek adad nahi hai; wo upar wale adad ka SIYAQ hai. "40 came via
            invite" ka matlab bilkul badal jata hai agar wo 2 logon se aaye hon ya 25
            se — pehli surat do bandon par khari hai aur kisi din girti hai, doosri ek
            chalta hua silsila hai.
          */
          hint={`Through ${inviters} seller${inviters === 1 ? '' : 's'}`}
        />
        <StatTile
          icon={<UsersIcon />}
          tone={selling > 0 ? 'brand' : 'plain'}
          label="Started selling"
          value={String(selling)}
          hint="At least one delivered order"
        />
        <StatTile
          icon={<UsersIcon />}
          label="Bonuses used"
          value={`${given}/${REFERRAL_BONUS_LIMIT}`}
          hint={`Up to Rs ${REFERRAL_BONUS} each, from our fee on that sale`}
        />
      </div>

      {referrals.length === 0 ? (
        <p className="card p-6 text-center text-sm text-ink-soft">Nobody has come via an invite yet.</p>
      ) : (
        <ul className="card divide-y divide-paper-sunken px-4">
          {referrals.map((row) => (
            <li key={row.resellerId} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{row.name}</span>
                <span className="block truncate text-[0.76rem] text-ink-faint">
                  {row.city}
                  <span className="mx-1.5">·</span>
                  {timeAgo('rm', row.joinedAt, now)}
                  <span className="mx-1.5">·</span>
                  {/*
                    Bulane wali ka naam — YEHI is safhe ki asal khabar hai.

                    🔴 Reseller wale safhe par ye khaana hai hi nahi (wo khud bulane wali
                    hai). Ops ke liye ulta hai: "kaun laa raha hai" ka jawab isi ek
                    khaane mein hai, aur us ke baghair ye fehrist sirf naye naamon ki
                    ek qatar reh jati hai.
                  */}
                  invited by <span className="font-semibold text-ink-soft">{row.invitedByName}</span>
                </span>
              </span>

              <span dir="ltr" className="numeric shrink-0 text-[0.78rem] text-ink-faint">
                {row.delivered} delivered
              </span>

              {/*
                Teen haalat, teen alag jumle — aur beech wala sab se ahem hai.

                🔴 "Aa gayi magar abhi kuch becha nahi" wo qatar hai jahan ops kuch KAR
                sakti hai: phone kar sakti hai, samjha sakti hai. Usay "koi bonus nahi"
                likh dena us qatar ko nakaami ki khabar bana deta hai, jab ke wo asal
                mein ek kaam hai.
              */}
              {row.bonusAmount === null ? (
                <span className="shrink-0 text-[0.78rem] text-ink-faint">
                  {row.delivered === 0 ? 'no sale yet' : 'no bonus'}
                </span>
              ) : (
                <span
                  dir="ltr"
                  className={`numeric shrink-0 rounded-pill px-2.5 py-0.5 text-[0.8rem] font-bold ${
                    row.bonusStatus === 'PAID'
                      ? 'bg-accent-50 text-accent-700'
                      : 'bg-brand-50 text-brand-800'
                  }`}
                >
                  {formatPkr(row.bonusAmount)}
                  <span className="ms-1 font-semibold opacity-70">
                    {row.bonusStatus === 'PAID' ? 'paid' : 'due'}
                  </span>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      {/*
        🔴 Paisa dene ka rasta yahan NAHI hai — wo Money par hai.

        Ek hi jagah se paisa nikalna chahiye. Do jagah rakhne ka matlab ye hota ke ek
        hi bonus do safhon se diya ja sakta, aur jis din do log saath kaam kar rahe hon
        us din wo dobara chala jata.
      */}
      <p className="text-[0.78rem] text-ink-faint">
        Bonuses are paid from <span className="font-semibold">Money</span> — this page only
        shows what happened.
      </p>
    </div>
  )
}
