import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { LazyImage } from '@/components/lazy-image'
import { PinIcon, StoreIcon } from '@/components/icons'
import { toPublicProductDTO } from '@/lib/api/mappers'
import { getResellerOrNull } from '@/lib/api/session'
import { container } from '@/lib/container'
import { pickName, timeAgo, translator } from '@/lib/i18n'
import { getLocale } from '@/lib/i18n-server'
import { resolveSeoText } from '@oyebazar/core'
import { breadcrumbLd, canonical, jsonLd, productLd } from '@/lib/seo'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const product = await container.bazaar.getProduct(slug).catch(() => null)
  /* 🔴 Jo maal hai hi nahi, us ka safha Google par na jaye */
  if (!product) return { title: 'OyeBazar', robots: { index: false, follow: false } }

  /*
   * 🔴 Title aur description mein bhi koi rate nahi — ye safha Google par jata hai,
   * aur wahan qeemat chhapna wohi cheez hai jis se hum Bazaar ko bahar rakhte hain.
   */
  // Dukandar ka apna matn pehle — dekhen dukan wale safhe ka note
  const title = resolveSeoText(product.seoTitle, `${product.titleUr} — ${product.supplierName}`)
  const description = resolveSeoText(
    product.seoDescription,
    `${product.titleUr} (${product.titleEn}) — ${product.supplierCity} کے تصدیق شدہ ہول سیلر ${product.supplierName} کے پاس۔ تھوک ریٹ کے لیے سیدھا رابطہ۔`,
  )

  return {
    title,
    description,
    alternates: canonical(`/bazaar/item/${slug}`),
    /*
     * 🔴 Maal ki APNI tasveer — aur ye is poori site ka sab se ahem OG khaana hai.
     *
     * Is platform par har link WhatsApp par jata hai. Tasveer ke baghair wo link ek
     * nangi line hoti hai jise koi nahi kholta; tasveer ke saath wo ek card ban jata
     * hai. Ye maal pehle se tasveer wala hai — bas us ka poora pata bhejna tha, aur
     * wo `metadataBase` ke baghair adhoora ja raha tha.
     */
    openGraph: {
      type: 'website',
      title,
      description,
      url: `/bazaar/item/${slug}`,
      ...(product.coverImageUrl
        ? { images: [{ url: product.coverImageUrl, alt: product.titleUr }] }
        : {}),
    },
  }
}

/**
 * Maal ka apna safha — Bazaar par.
 *
 * Ye pehle tha hi nahi: maal ke card seedha DUKAN ke safhe par le jate the. Banda
 * kisi ek cheez par ungli rakhta tha aur us ke saamne poori dukan khul jati thi — wo
 * cheez dobara dhoondni parti thi. Ab har maal ka apna pata hai (jo WhatsApp par bheja
 * bhi ja sakta hai).
 *
 * 🔴 Yahan koi rate nahi, koi order button nahi — Bazaar ka poora usool wohi hai
 * (dekhen (public)/layout.tsx). Rate sirf login ke baad, reseller ke apne catalogue mein.
 */
export default async function BazaarItemPage({ params }: Props) {
  const { slug } = await params
  const locale = await getLocale()
  const t = translator(locale)

  const found = await container.bazaar.getProduct(slug).catch(() => null)
  if (!found) notFound()

  const product = toPublicProductDTO(found)
  const title = locale === 'ur' ? product.titleUr : product.titleEn
  const now = new Date()

  const [actor, more] = await Promise.all([
    getResellerOrNull(),
    // Usi dukan ka baqi maal — banda ek cheez dekhne aata hai, teen dekh kar jata hai
    container.bazaar.listSupplierProducts(product.supplierSlug, { limit: 12 }),
  ])
  const loggedIn = actor !== null

  const others = more.items
    .map(toPublicProductDTO)
    .filter((item) => item.slug !== product.slug)
    .slice(0, 6)

  return (
    <div className="mx-auto max-w-shell space-y-6 px-4 py-6 lg:px-8">
      {/*
        🔴 `Product` — magar QEEMAT ke baghair (`offers` nahi). Dekhen `lib/seo.ts`:
        qeemat structured data mein daalna Bazaar ko usi tareef ke andar le aata hai
        jis se hum jaan boojh kar bahar hain (Sales Tax Act 2(18A)) — chahe wo safhe
        par nazar bhi na aaye.
      */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd(
          productLd({
            titleUr: product.titleUr,
            titleEn: product.titleEn,
            slug,
            imageUrl: product.coverImageUrl,
            categoryUr: product.category.nameUr,
            supplierName: product.supplierName,
            supplierSlug: product.supplierSlug,
          }),
        )}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd(
          breadcrumbLd([
            { name: t('bazaar'), path: '/bazaar' },
            { name: product.supplierName, path: `/bazaar/${product.supplierSlug}` },
            { name: product.titleUr, path: `/bazaar/item/${slug}` },
          ]),
        )}
      />

      <nav className="text-sm text-ink-faint">
        <Link href="/bazaar" className="link-tap hover:text-brand-700">
          {t('bazaar')}
        </Link>
        <span className="mx-2">›</span>
        <Link
          href={{ pathname: '/bazaar/items', query: { category: product.category.slug } }}
          className="link-tap hover:text-brand-700"
        >
          {pickName(locale, product.category)}
        </Link>
      </nav>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="card overflow-hidden">
          {product.coverImageUrl ? (
            <LazyImage
              src={product.coverImageUrl}
              alt={title}
              eager
              wrapperClassName="w-full bg-paper-sunken"
              className="max-h-[28rem] w-full object-cover"
            />
          ) : (
            <div className="aspect-[4/3] w-full bg-paper-sunken" />
          )}
        </div>

        <div className="space-y-5">
          <div>
            <h1 className="text-[1.5rem] font-bold tracking-tight">{title}</h1>
            <p className="mt-2 text-[0.85rem] text-ink-faint">
              {pickName(locale, product.category)}
              <span className="mx-2">·</span>
              {timeAgo(locale, product.listedAt, now)}
            </p>
          </div>

          {/* Dukan — maal ka bharosa usi se banta hai */}
          <Link
            href={`/bazaar/${product.supplierSlug}`}
            className="card flex items-center gap-3 p-4 transition hover:shadow-lift"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-card bg-brand-50 text-brand-700">
              <StoreIcon className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-bold">{product.supplierName}</span>
              <span className="mt-0.5 flex items-center gap-1 text-[0.8rem] text-ink-faint">
                <PinIcon className="h-3.5 w-3.5 shrink-0" />
                {product.supplierCity}
              </span>
            </span>
            <span className="shrink-0 text-[0.8rem] font-semibold text-brand-700">
              {t('viewAll')} ›
            </span>
          </Link>

          {/*
            🔴 Rate ka khana: Bazaar par kabhi nahi chhapta. Logged-in reseller ke liye
            sirf RASTA hai — us ka rate us ke apne catalogue mein pehle se mojood hai.
          */}
          {loggedIn ? (
            <Link href={`/catalogue/s/${product.slug}`} className="btn-primary w-full">
              {t('seeMyRate')}
            </Link>
          ) : (
            <div className="card bg-paper-sunken p-4">
              <p className="text-[0.92rem] font-semibold">{t('askRate')}</p>
              <p className="mt-1 text-[0.85rem] leading-relaxed text-ink-soft">
                {t('bazaarPriceNote')}
              </p>
              <Link href="/login" className="btn-primary mt-3 w-full">
                {t('resellerLogin')}
              </Link>
            </div>
          )}
        </div>
      </div>

      {others.length > 0 && (
        <section>
          <h2 className="mb-3 text-[1.05rem] font-bold">{t('moreFromShop')}</h2>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {others.map((item) => {
              const itemTitle = locale === 'ur' ? item.titleUr : item.titleEn
              return (
                <li key={item.slug} className="tile group transition hover:shadow-lift">
                  <Link
                    href={loggedIn ? `/catalogue/s/${item.slug}` : `/bazaar/item/${item.slug}`}
                    className="block"
                  >
                    <div className="tile-media-wrap aspect-square bg-paper-sunken">
                      {item.coverImageUrl && (
                        <LazyImage
                          src={item.coverImageUrl}
                          alt={itemTitle}
                          className="tile-media h-full"
                        />
                      )}
                    </div>
                    <p className="p-2.5 text-[0.82rem] leading-snug">{itemTitle}</p>
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}
