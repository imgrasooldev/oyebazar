import Link from 'next/link'
import type { Metadata } from 'next'
import { isFresh } from '@oyebazar/shared'
import { LazyImage } from '@/components/lazy-image'
import { PinIcon } from '@/components/icons'
import { toPublicProductDTO } from '@/lib/api/mappers'
import { getResellerOrNull } from '@/lib/api/session'
import { container } from '@/lib/container'
import { pickName, timeAgo, translator } from '@/lib/i18n'
import { getLocale } from '@/lib/i18n-server'
import { canonical, itemListLd, jsonLd } from '@/lib/seo'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'سارا مال — تھوک ریٹ پر | OyeBazar',
  description: 'تصدیق شدہ ہول سیلرز کا سارا مال — کیٹگری کے حساب سے۔',
  /*
   * 🔴 Canonical hamesha bina chhanni ke.
   *
   * Is safhe ki chhanni URL mein jati hai (`?city=`, `?category=`, `?cursor=`), aur
   * har jor ek naya pata banata hai jis par TQREEBAN wohi maal hota hai. Bina is ke
   * Google un saikron patoon ko alag safhe ginta hai, un ka aapas mein moqabla
   * karwata hai, aur aakhir mein kisi ek ko bhi theek se nahi dikhata.
   *
   * Chhanni wale safhe crawl phir bhi hote hain (un ke andar ke link chahiyen) — bas
   * ginti EK ki hoti hai.
   */
  alternates: canonical('/bazaar/items'),
}

/**
 * Sara maal — public list.
 *
 * 🔴 Ye safha pehle tha hi nahi, aur us ki ghair-mojoodgi safhe par nazar aati thi:
 * "مقبول مال" ke "سب دیکھیں" par click karne wala DUKANON ki list par pohanchta tha,
 * aur maal ke card bhi dukan ke safhe par le jate the. Yani Bazaar par maal DEKHNE ka
 * koi rasta hi nahi tha — halanke poora bazaar maal hi ke liye khola jata hai.
 *
 * Qeemat yahan bhi kahin nahi (qanooni tahaffuz — dekhen (public)/layout.tsx). Logged-in
 * reseller ko card us ke apne safhe par le jata hai jahan us ka rate mojood hai.
 */
export default async function BazaarItemsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string }>
}) {
  const [locale, query] = await Promise.all([getLocale(), searchParams])
  const t = translator(locale)
  const now = new Date()

  const category = query.category?.trim() || undefined
  const search = query.q?.trim() || undefined

  const [page, categories, actor] = await Promise.all([
    container.bazaar.listProducts({
      limit: 48,
      ...(category ? { categorySlug: category } : {}),
      ...(search ? { search } : {}),
    }),
    container.repositories.categories.findAll(),
    getResellerOrNull(),
  ])

  const products = page.items.map(toPublicProductDTO)
  const loggedIn = actor !== null

  return (
    <div className="mx-auto max-w-shell space-y-6 px-4 py-6 lg:px-8">
      {/* Jo maal is safhe par nazar aa raha hai — sirf pate, tafseel har ek ke apne safhe par */}
      {products.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={jsonLd(
            itemListLd(products.map((product) => `/bazaar/item/${product.slug}`)),
          )}
        />
      )}

      <nav className="text-sm text-ink-faint">
        <Link href="/bazaar" className="link-tap hover:text-brand-700">
          {t('bazaar')}
        </Link>
        <span className="mx-2">›</span>
        <span className="text-ink">{t('allStock')}</span>
      </nav>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-[1.5rem] font-bold tracking-tight">
          {search ? `"${search}"` : t('allStock')}
        </h1>
        <span className="numeric text-sm text-ink-faint">
          {products.length} {t('items')}
        </span>
      </div>

      {/* Category ki patti — sab kuch DB se, ops jo banati hai wohi yahan aata hai */}
      <div className="rail">
        <Link href="/bazaar/items" className={category ? 'chip' : 'chip chip-active'} scroll={false}>
          {t('all')}
        </Link>
        {categories.map((item) => (
          <Link
            key={item.slug}
            href={{ pathname: '/bazaar/items', query: { category: item.slug } }}
            className={item.slug === category ? 'chip chip-active' : 'chip'}
            scroll={false}
          >
            {pickName(locale, item)}
          </Link>
        ))}
      </div>

      {products.length === 0 ? (
        <p className="card p-8 text-center text-ink-soft">{t('noItemsListed')}</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
          {products.map((product) => {
            const title = locale === 'ur' ? product.titleUr : product.titleEn

            return (
              <li key={product.slug} className="tile group transition hover:shadow-lift">
                {/*
                  Logged-in reseller ko seedha us maal ke apne safhe par (wahan rate hai),
                  baqi sab ko Bazaar wala safha — jahan rate kabhi nahi hota.
                */}
                <Link
                  href={
                    loggedIn ? `/catalogue/s/${product.slug}` : `/bazaar/item/${product.slug}`
                  }
                  className="block"
                >
                  <div className="tile-media-wrap aspect-square bg-paper-sunken">
                    {product.coverImageUrl && (
                      <LazyImage
                        src={product.coverImageUrl}
                        alt={title}
                        className="tile-media h-full"
                      />
                    )}
                  </div>

                  <div className="p-2.5">
                    <p className="text-[0.85rem] leading-snug">{title}</p>
                    <p className="mt-1 flex items-center gap-1 text-[0.72rem] text-ink-faint">
                      <PinIcon className="h-3 w-3 shrink-0" />
                      {product.supplierCity}
                    </p>
                    <p
                      className={`mt-0.5 text-[0.72rem] ${
                        isFresh(product.listedAt, now)
                          ? 'font-semibold text-accent-700'
                          : 'text-ink-faint'
                      }`}
                    >
                      {timeAgo(locale, product.listedAt, now)}
                    </p>

                    {/* 🔴 قیمت یہاں کبھی نہیں — صرف لاگ اِن کے بعد */}
                    <p className="mt-2 border-t border-paper-sunken pt-2 text-[0.72rem] font-semibold text-brand-700">
                      {loggedIn ? t('seeMyRate') : t('askRate')}
                    </p>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
