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

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const product = await container.bazaar.getProduct(slug).catch(() => null)
  if (!product) return { title: 'OyeBazar' }

  /*
   * 🔴 Title aur description mein bhi koi rate nahi — ye safha Google par jata hai,
   * aur wahan qeemat chhapna wohi cheez hai jis se hum Bazaar ko bahar rakhte hain.
   */
  return {
    title: `${product.titleUr} — ${product.supplierName} | OyeBazar`,
    description: `${product.titleEn} — ${product.supplierCity} ki تصدیق شدہ hول سیلر se. Thok rate ke liye rabta karen.`,
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
