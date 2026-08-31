import type { Metadata } from 'next'
import { REFERRAL_BONUS, REFERRAL_BONUS_LIMIT, SIGNUP_BONUS_TOTAL } from '@oyebazar/core'
import { formatPkr } from '@oyebazar/shared'
import { InviteCard } from '@/components/invite-card'
import { requireReseller } from '@/lib/api/session'
import { container } from '@/lib/container'
import { timeAgo, translator } from '@/lib/i18n'
import { getLocale } from '@/lib/i18n-server'

export const metadata: Metadata = { title: 'Invites' }
export const dynamic = 'force-dynamic'

/**
 * "Maine kis kis ko bulaya" — reseller ka apna safha.
 *
 * 🔴 Ye nav mein NAHI hai, aur wo jaan boojh kar hai. Phone ki patti par pehle se saat
 * khaane hain; aathwan daalne se baqi saat bhi chhote ho jate — yani har roz ka kaam
 * mushkil, us fehrist ke liye jo hafte mein ek dafa dekhi jati hai.
 *
 * Rasta dashboard ke invite card se hai. Wohi durust jagah hai: banda pehle link bhejta
 * hai, aur ye sawal ("kya hua un ka?") us ke BAAD uthta hai — us se pehle nahi.
 *
 * 🔴 Ye safha wo dikhata hai jo dashboard ka ek adad nahi dikha sakta: kaun aaya magar
 * abhi tak kuch becha nahi. Wohi qatarein hain jin par bulane wali kaam kar sakti hai —
 * aur sirf ginti dekh kar wo unhen kabhi nahi dhoondh sakti.
 */
export default async function InvitesPage() {
  const { reseller } = await requireReseller()
  const locale = await getLocale()
  const t = translator(locale)

  const [referred, bonus, invited] = await Promise.all([
    container.repositories.resellers.listReferred(reseller.id, 50),
    container.repositories.bonuses.totalsFor(reseller.id),
    container.repositories.resellers.countReferred(reseller.id),
  ])

  const now = new Date()

  return (
    <div className="space-y-6">
      <InviteCard
        resellerId={reseller.id}
        referred={invited}
        bonusEarned={bonus.earned}
        bonusPending={bonus.pending}
        labels={{
          title: t('inviteTitle'),
          body: t('inviteBody'),
          share: t('inviteShare'),
          copied: t('inviteCopied'),
          count: t('inviteCount'),
          bonus: t('bonusEarned'),
          bonusPending: t('bonusPending'),
          promise: t('bonusPromise'),
        }}
      />

      {referred.length === 0 ? (
        /*
          Khali fehrist par ek KAAM ki baat — "abhi koi nahi" nahi.

          🔴 "Abhi koi nahi aayi" wo baat hai jo banda pehle se jaanta hai (us ne khud
          link bheja tha ya nahi bheja tha). Us jagah wo likhna chahiye jo usay maloom
          nahi: kitna ban sakta hai, aur kis par.
        */
        <p className="card p-6 text-center text-[0.9rem] leading-relaxed text-ink-soft">
          {t('invitesEmpty')}
        </p>
      ) : (
        <section>
          <h2 className="text-[1.05rem] font-bold tracking-tight">{t('invitesWho')}</h2>

          <ul className="card mt-3 divide-y divide-paper-sunken px-4">
            {referred.map((row) => (
              <li key={row.resellerId} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{row.name}</span>
                  <span className="block text-[0.76rem] text-ink-faint">
                    {row.city}
                    <span className="mx-1.5">·</span>
                    {timeAgo(locale, row.joinedAt, now)}
                  </span>
                </span>

                {/*
                  Teen mumkin haalat, aur teenon ka jumla ALAG hai.

                  🔴 Sab se ahem beech wala hai: aa to gayi, magar abhi kuch becha nahi.
                  Us qatar par "bonus nahi bana" likhna nakaami ki khabar hai; "abhi
                  pehla order baqi hai" wohi baat kaam ki shakl mein kehta hai — aur
                  bulane wali us qatar par kuch KAR sakti hai (call kar sakti hai,
                  samjha sakti hai).
                */}
                {row.bonusAmount === null ? (
                  <span className="shrink-0 text-[0.78rem] text-ink-faint">
                    {row.delivered === 0 ? t('inviteWaitingFirst') : t('inviteNoBonus')}
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
                      {row.bonusStatus === 'PAID' ? t('inviteBonusPaid') : t('inviteBonusSoon')}
                    </span>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/*
        Qaide — sab se neeche, aur poore.

        🔴 Yahan wo teen baatein likhi hain jo card par jagah ki wajah se poori nahi
        aatin: "Rs 100 tak" kyun (bikri ki apni fee se), hadd kitni hai, aur signup wala
        kitna. Adhoora waada us waade se bura hai jo kiya hi na jaye — aur jis din koi
        poochhe "mujhe sau kyun nahi mile", us din jawab safhe par pehle se hona chahiye.
      */}
      <p className="text-[0.78rem] leading-relaxed text-ink-faint">
        {t('inviteRules')
          .replace('{bonus}', String(REFERRAL_BONUS))
          .replace('{limit}', String(REFERRAL_BONUS_LIMIT))
          .replace('{signup}', String(SIGNUP_BONUS_TOTAL))}
      </p>
    </div>
  )
}
