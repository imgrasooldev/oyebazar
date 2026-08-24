/**
 * Ek dukan ka safha — reseller ke portal ke ANDAR.
 *
 * 🔴 Is safhe ki poori wajah ek hi hai: yahan reseller ko us ka APNA rate dikhta hai.
 *
 * `/bazaar/<slug>` par wohi dukan bahar ke banday ko dikhti hai, magar wahan sirf public
 * maloomat hoti hai — reseller ki lagat, us ka rate aur us ka munafa wahan ho hi nahi
 * sakte. Wo teen number hi us ka asal faisla hain. Isi liye ye safha `/bazaar` ki naqal
 * nahi: wahan "ye dukan kya bechti hai" ka jawab hai, yahan "is dukan se mujhe kya
 * milega" ka.
 *
 * Rabte ka number yahan jaan boojh kar nahi — dekhen `RESELLER_PRODUCT_SELECT` ka note.
 */
import { notFound } from 'next/navigation'
import { requireReseller } from '@/lib/api/session'
import { container } from '@/lib/container'
import { getLocale } from '@/lib/i18n-server'
import { translator } from '@/lib/i18n'
import Link from 'next/link'
import { SupplierLogo } from '@/components/supplier-logo'

export const dynamic = 'force-dynamic'

export default async function WholesalerPage({ params }: { params: Promise<{ slug: string }> }) {
  const { reseller } = await requireReseller()
  const { slug } = await params
  const locale = await getLocale()
  const t = translator(locale)

  const supplier = await container.bazaar.getSupplier(slug).catch(() => null)
  if (!supplier) notFound()

  /*
   * 🔴 Maal yahan DOBARA nahi dikhaya jata — reseller ko usi catalogue par bheja jata
   * hai jo wo roz dekhti hai, bas dukan ki chhanni lagi hui.
   *
   * Yahan apna grid banane ka matlab hota ke maal ka card TEESRI dafa likha jaye (do
   * dafa pehle se catalogue mein hai). Aur us naqal ka anjaam maloom hai: kal card ki
   * oonchai ya rate ka hisaab ek jagah badalta aur baqi jagah purana reh jata. Us se
   * bara faida ye hai ke reseller ko wahan apni saari chhanni aur tarteeb bhi mil jati
   * hai — jo yahan dobara banani parti.
   */
  const goods = await container.catalogue.list(reseller.id, { limit: 1, supplierSlug: slug })
  const rating = (await container.repositories.supplierReviews.ratingsForSlugs([slug])).get(slug)

  return (
    <div>
      <div className="flex items-center gap-3">
        <SupplierLogo name={supplier.businessName} logoUrl={supplier.logoUrl} size="lg" />
        <div className="min-w-0">
          <h1 className="truncate text-[1.35rem] font-bold tracking-tight">
            {supplier.businessName}
          </h1>
          <p className="mt-0.5 truncate text-[0.88rem] text-ink-soft">
            {supplier.marketName ? `${supplier.marketName} · ` : ''}
            {supplier.city}
          </p>
        </div>
      </div>

      {/*
        Sitare aur teenon sawal alag alag.

        🔴 Sirf jorh dikhana kaafi nahi. Ek dukan jis ka maal achha hai magar commission
        der se deta hai, aur ek jis ka maal maamooli hai magar paisa waqt par — dono ka
        jorh ek jaisa aa sakta hai, jabke do alag reseller ke liye wo do BILKUL alag
        dukanein hain. Faisla us ka hai, hamara nahi.

        Kaafi raye na hon to jorh bhi nahi, ginti bhi nahi — "0 raye" ek khali khaana
        chhaap deta hai jo bure number jaisa dikhta hai.
      */}
      {rating?.stars ? (
        <section className="mt-4 rounded-card bg-paper-raised p-4 shadow-soft">
          <p className="text-[1.1rem] font-bold text-accent-700">
            ★ <span dir="ltr" className="numeric">{rating.stars}</span>
            <span className="ms-2 text-[0.78rem] font-normal text-ink-faint">
              <span dir="ltr" className="numeric">{rating.count}</span> {t('reviewCount')}
            </span>
          </p>
          <dl className="mt-2 space-y-1 text-[0.82rem]">
            {(
              [
                [t('reviewQuality'), rating.quality],
                [t('reviewCommunication'), rating.communication],
                [t('reviewPayout'), rating.payoutOnTime],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="flex items-baseline justify-between gap-3">
                <dt className="text-ink-soft">{label}</dt>
                <dd dir="ltr" className="numeric font-semibold">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ) : (
        <p className="mt-4 text-[0.82rem] text-ink-faint">{t('reviewNotEnough')}</p>
      )}

      {supplier.bioUr && (
        <p className="mt-3 text-[0.9rem] leading-relaxed text-ink-soft">{supplier.bioUr}</p>
      )}

      {goods.items.length === 0 ? (
        <p className="mt-6 text-[0.9rem] text-ink-soft">{t('wholesalerNoGoods')}</p>
      ) : (
        <Link
          href={{ pathname: '/catalogue', query: { supplier: slug } }}
          className="btn-primary mt-6 inline-flex"
        >
          {t('wholesalerGoods')}
        </Link>
      )}
    </div>
  )
}
