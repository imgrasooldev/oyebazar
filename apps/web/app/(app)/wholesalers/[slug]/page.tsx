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
import Link from 'next/link'
import { formatPkr } from '@oyebazar/shared'
import { requireReseller } from '@/lib/api/session'
import { toResellerProductListItemDTO } from '@/lib/api/mappers'
import { container } from '@/lib/container'
import { getLocale } from '@/lib/i18n-server'
import { pickName, timeAgo, translator } from '@/lib/i18n'
import { SupplierLogo } from '@/components/supplier-logo'
import { ProductCard } from '@/components/product-card'

export const dynamic = 'force-dynamic'

/**
 * Safhe par kitna maal.
 *
 * 🔴 Poori list yahan NAHI aati, aur ye kanjoosi nahi hai. Jis dukan ke paas 400 maal
 * hon, us ka safha kholte hi 400 tasveerein utarna sasta phone hangwa deta hai — aur
 * reseller ko yahan chhanni aur tarteeb bhi nahi milti (wo catalogue par hai). Yahan
 * "ye dukan kya bechti hai" ka jawab chahiye; "in mein se kya chunna hai" ka jawab
 * catalogue ka kaam hai, aur us ka rasta neeche khula hua hai.
 */
const PREVIEW = 12

export default async function WholesalerPage({ params }: { params: Promise<{ slug: string }> }) {
  const { reseller } = await requireReseller()
  const { slug } = await params
  const locale = await getLocale()
  const t = translator(locale)
  // Ek hi "abhi" poore safhe ke liye
  const now = new Date()

  const supplier = await container.bazaar.getSupplier(slug).catch(() => null)
  if (!supplier) notFound()

  /*
   * Maal ab YAHIN dikhta hai.
   *
   * Pehle yahan sirf ek button tha jo catalogue par bhej deta tha, aur us ke saath likhi
   * wajah ye thi ke "maal ka card teesri dafa likhna parega". Aitraaz durust tha — magar
   * us ka hal maal chhupa dena nahi tha. Card ab `ProductCard` mein ek hi jagah hai, aur
   * dono safhe usi ko istemal karte hain.
   */
  const [goods, rating] = await Promise.all([
    container.catalogue.list(reseller.id, { limit: PREVIEW, supplierSlug: slug }),
    container.repositories.supplierReviews
      .ratingsForSlugs([slug])
      .then((map) => map.get(slug)),
  ])

  const items = goods.items.map(toResellerProductListItemDTO)

  return (
    <div className="space-y-5">
      <header className="flex items-start gap-3">
        <SupplierLogo name={supplier.businessName} logoUrl={supplier.logoUrl} size="lg" />
        <div className="min-w-0">
          <h1 className="truncate text-[1.35rem] font-bold tracking-tight">
            {supplier.businessName}
          </h1>
          <p className="mt-0.5 truncate text-[0.88rem] text-ink-soft">
            {supplier.marketName ? `${supplier.marketName} · ` : ''}
            {supplier.city}
          </p>
          {supplier.address && (
            <p className="mt-0.5 text-[0.8rem] text-ink-faint">{supplier.address}</p>
          )}
        </div>
      </header>

      {/*
        Dukan ki apni shartein — aur ye safhe par sitaron se PEHLE hain.

        🔴 Sitare raye hain, ye SHART hai. Raye badalti rehti hai aur us mein doosron ka
        tajurba bolta hai; ye do number seedha is reseller ke apne hisab mein jate hain:
        delivery ka rate us ke munafe se katta hai, aur "kitne din baad paisa" wo ginti
        hai jis par us ka apna khareed ka chakkar chalta hai. Jis cheez par hisab lagta
        hai wo pehle aani chahiye.
      */}
      <section className="grid gap-2 sm:grid-cols-3">
        <Fact
          label={t('shopDeliveryCity')}
          value={formatPkr(supplier.deliveryFeeCity)}
        />
        <Fact
          label={t('shopDeliveryOther')}
          value={formatPkr(supplier.deliveryFeeOther)}
        />
        <Fact
          label={t('shopPayoutTerm')}
          value={
            supplier.payoutTermDays === 0
              ? t('shopPayoutSameDay')
              : `${supplier.payoutTermDays} ${t('days')}`
          }
        />
      </section>

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
        <section className="rounded-card bg-paper-raised p-4 shadow-soft">
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
        <p className="text-[0.82rem] text-ink-faint">{t('reviewNotEnough')}</p>
      )}

      {supplier.bioUr && (
        <p className="text-[0.9rem] leading-relaxed text-ink-soft">{supplier.bioUr}</p>
      )}

      {/*
        Dukan kitni purani hai, kya kya bechti hai, aur naya maal kab laga.

        🔴 "Naya maal kab laga" sab se kaam ki cheez hai aur aksar chhoot jati hai: jis
        dukan ne teen mahine se kuch nahi laga, us ka catalogue bhara hua dikhta hai
        magar wo waqai chal nahi rahi. Ye ek line reseller ko wo baat bata deti hai jo
        maal ki ginti kabhi nahi batati.
      */}
      <section className="flex flex-wrap gap-1.5 text-[0.75rem]">
        <span className="rounded-pill bg-paper-sunken px-3 py-1 text-ink-soft">
          <span dir="ltr" className="numeric font-semibold">
            {supplier.productCount}
          </span>{' '}
          {t('shopItems')}
        </span>
        <span className="rounded-pill bg-paper-sunken px-3 py-1 text-ink-soft">
          {t('shopSince')} {timeAgo(locale, supplier.memberSince, now)}
        </span>
        {supplier.lastListedAt && (
          <span className="rounded-pill bg-paper-sunken px-3 py-1 text-ink-soft">
            {t('shopLastListed')} {timeAgo(locale, supplier.lastListedAt, now)}
          </span>
        )}
        {supplier.categories.map((category) => (
          <span
            key={category.nameEn}
            className="rounded-pill bg-paper-sunken px-3 py-1 text-ink-faint"
          >
            {pickName(locale, category)}
          </span>
        ))}
      </section>

      {items.length === 0 ? (
        <p className="text-[0.9rem] text-ink-soft">{t('wholesalerNoGoods')}</p>
      ) : (
        <section>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-[1.05rem] font-bold">{t('shopGoodsTitle')}</h2>
            {/*
              Poori list ka rasta — chhanni, tarteeb aur rate ki hadd sab wahan hain.
              Yahan wo dobara banane ka matlab hota ke wo do jagah rakhni parti.
            */}
            {supplier.productCount > items.length && (
              <Link
                href={{ pathname: '/catalogue', query: { supplier: slug } }}
                className="text-[0.82rem] font-semibold text-brand-700 underline"
              >
                {t('shopSeeAll')} (
                <span dir="ltr" className="numeric">
                  {supplier.productCount}
                </span>
                )
              </Link>
            )}
          </div>

          <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {items.map((item) => (
              <ProductCard
                key={item.id}
                item={item}
                locale={locale}
                rating={rating}
                now={now}
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

/** Ek shart — naam upar, qadar neeche. Teen ek qatar mein. */
function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card bg-paper-raised px-3 py-2.5 shadow-soft">
      <p className="text-[0.72rem] font-semibold uppercase tracking-wider text-ink-faint">
        {label}
      </p>
      <p dir="ltr" className="numeric mt-0.5 text-[1rem] font-bold">
        {value}
      </p>
    </div>
  )
}
