import Link from 'next/link'
import type { Metadata } from 'next'
import { DEFAULT_TEMPLATE_KEY, formatPkr, pkr } from '@oyebazar/shared'
import { DownloadIcon, SparkIcon } from '@/components/icons'
import { toResellerProductListItemDTO } from '@/lib/api/mappers'
import { requireReseller } from '@/lib/api/session'
import { container } from '@/lib/container'
import { CatalogueFilters } from '@/components/catalogue-filters'
import { SearchSuggest } from '@/components/search-suggest'
import { pickName, pickTitle, timeAgo, translator } from '@/lib/i18n'
import { getLocale } from '@/lib/i18n-server'

export const metadata: Metadata = { title: 'Catalogue' }
export const dynamic = 'force-dynamic'

/**
 * Reseller catalogue.
 *
 * Sab se upar "آج کا پیک" — wohi 5 items jo subah 9 baje WhatsApp par gaye. Ye
 * pehli cheez is liye hai ke Sadia yahan browse karne nahi, AAJ ki post banane aati hai.
 *
 * Har card par munafa numaya — kyunke wohi us ka faisla hai: is par kitna bachega?
 */
export default async function CataloguePage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string
    category?: string
    minPrice?: string
    maxPrice?: string
    inStockOnly?: string
  }>
}) {
  const { reseller } = await requireReseller()
  const [locale, query] = await Promise.all([getLocale(), searchParams])
  const t = translator(locale)
  // Ek hi "abhi" poori list ke liye
  const now = new Date()

  const search = query.q?.trim() || undefined
  const category = query.category || undefined

  /*
   * Rate ki hadd URL se aati hai. Ghalat ya khali qadar ko chup chaap girate hain —
   * ek ajeeb link (kisi ne khud type kar liya) par safha tootna nahi chahiye, wo
   * bas bina us filter ke chal jaye.
   */
  const toPositive = (value: string | undefined): number | undefined => {
    if (!value?.trim()) return undefined
    const parsed = Number(value)
    return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : undefined
  }

  const minPrice = toPositive(query.minPrice)
  const maxPrice = toPositive(query.maxPrice)
  const inStockOnly = query.inStockOnly === 'true'

  const [page, dailyPacks, categories] = await Promise.all([
    container.catalogue.list(reseller.id, {
      limit: 24,
      ...(search ? { search } : {}),
      ...(category ? { categorySlug: category } : {}),
      ...(minPrice !== undefined ? { minPrice: pkr(minPrice) } : {}),
      // Ulti hadd (min > max) par sirf max girate hain — us se list khali nahi hoti
      ...(maxPrice !== undefined && (minPrice === undefined || maxPrice >= minPrice)
        ? { maxPrice: pkr(maxPrice) }
        : {}),
      ...(inStockOnly ? { inStockOnly: true } : {}),
    }),
    container.dailyDrops.packsForReseller(reseller.id, DEFAULT_TEMPLATE_KEY),
    container.repositories.categories.findAll(),
  ])
  const items = page.items.map(toResellerProductListItemDTO)
  const readyCount = dailyPacks.filter((pack) => pack.imageUrl).length

  return (
    <div className="space-y-10">
      {/* --------------------------------------------------------- آج کا پیک */}
      {dailyPacks.length > 0 && !search && !category && (
        <section className="overflow-hidden rounded-card bg-coal-900 text-white shadow-lift">
          <div className="flex flex-wrap items-center gap-3 px-6 pb-4 pt-6">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-pill bg-brand-500/20 text-brand-300">
              <SparkIcon />
            </span>
            <div>
              <h2 className="text-[1.15rem] font-bold">{t('todaysPack')}</h2>
              <p className="text-[0.85rem] text-white/60">
                <span className="numeric">{readyCount}</span> {t('packsReady')}
              </p>
            </div>
          </div>

          <ul className="rail px-6 pb-6">
            {dailyPacks.map((pack) => (
              <li key={pack.productId} className="w-36 shrink-0 sm:w-40">
                <Link href={`/catalogue/${pack.productId}`} className="group block">
                  <div className="relative aspect-[9/16] overflow-hidden rounded-2xl bg-white/10 ring-1 ring-white/15">
                    {(pack.imageUrl ?? pack.coverImageUrl) && (
                      // eslint-disable-next-line @next/next/no-img-element -- storage URLs
                      <img
                        src={pack.imageUrl ?? pack.coverImageUrl ?? ''}
                        alt={pickTitle(locale, pack)}
                        loading="lazy"
                        className="h-full w-full object-cover transition duration-500 ease-soft group-hover:scale-105"
                      />
                    )}
                    {/* Tayyar pack par download ka nishan — ek nazar mein pata chale */}
                    {pack.imageUrl && (
                      <span className="absolute end-2 top-2 flex h-8 w-8 items-center justify-center rounded-pill bg-brand-500 text-white shadow-lift">
                        <DownloadIcon className="h-4 w-4" />
                      </span>
                    )}
                  </div>
                  <p className="mt-2 truncate text-[0.82rem] text-white/90">{pickTitle(locale, pack)}</p>
                  <p dir="ltr" className="numeric text-[0.82rem] font-bold text-brand-300">
                    {formatPkr(pack.myPrice)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* --------------------------------------------------------- سارا مال */}
      <section>
        <div className="mb-5 space-y-4">
          <div className="flex items-end justify-between gap-4">
            <h1 className="text-[1.35rem] font-bold tracking-tight">
              {search ? `"${search}"` : t('allStock')}
            </h1>
            <span className="numeric text-sm text-ink-faint">
              {items.length} {t('items')}
            </span>
          </div>

          {/* Search — tajweez wali patti, taake poora naam yaad na karna pare */}
          <SearchSuggest
            locale={locale}
            source="catalogue"
            action="/catalogue"
            defaultValue={search ?? ''}
            placeholder={t('searchStockPlaceholder')}
            className="max-w-xl"
          />

          {/* Category ki qatar — chhoti screen par bagal mein sarakti hai */}
          <div className="rail">
            <Link
              href="/catalogue"
              className={!category ? 'chip chip-active' : 'chip'}
              scroll={false}
            >
              {t('all')}
            </Link>
            {categories.map((item) => (
              <Link
                key={item.slug}
                href={{ pathname: '/catalogue', query: { category: item.slug } }}
                className={item.slug === category ? 'chip chip-active' : 'chip'}
                scroll={false}
              >
                {pickName(locale, item)}
              </Link>
            ))}
          </div>
        </div>

        {/* Rate ki hadd aur "sirf mojood maal" — server ye pehle se jaanta tha */}
        <CatalogueFilters
          labels={{
            price: t('filterPrice'),
            from: t('filterFrom'),
            to: t('filterTo'),
            inStockOnly: t('filterInStock'),
            apply: t('filterApply'),
            clear: t('filterClear'),
          }}
        />

        {items.length === 0 ? (
          <p className="card p-6 text-ink-soft">{t('noItemsListed')}</p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {items.map((item) => {
              const title = locale === 'ur' ? item.titleUr : item.titleEn
              const myPrice = item.myRetailPrice ?? item.suggestedRetail
              const profit = Math.max(myPrice - item.bajiPrice, 0)

              return (
                <li key={item.id} className="tile group flex flex-col">
                  <Link href={`/catalogue/${item.id}`} className="block">
                    <div className="relative aspect-square overflow-hidden bg-paper-sunken">
                      {item.coverImageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element -- storage URLs
                        <img
                          src={item.coverImageUrl}
                          alt={title}
                          loading="lazy"
                          className="tile-media h-full"
                        />
                      )}
                      {!item.inStock && (
                        <span className="badge absolute start-2 top-2 bg-coal-900/85 text-white">
                          {t('outOfStock')}
                        </span>
                      )}
                    </div>
                  </Link>

                  {/*
                    Card ab kasa hua hai: pehle har card poore screen ka bara hissa kha
                    jata tha aur ek nazar mein chaar hi maal dikhte the. Reseller yahan
                    scroll kar ke chunti hai — zyada maal ek saath dikhna hi kaam ka hai.

                    Lagat halke rang mein, rate gehra, aur munafa usi qatar mein sabz —
                    teen alag lines teen guna jagah leti thin, jabke faisla ek number par
                    hota hai.
                  */}
                  <div className="flex flex-1 flex-col p-3">
                    <p className="line-clamp-2 text-[0.85rem] font-semibold leading-snug">
                      {title}
                    </p>
                    {/*
                      Sirf waqt — "naya" ka tamgha yahan nahi lagaya. Catalogue naye maal
                      se shuru hota hai, to pehle safhe par har card par tamgha lag jata
                      aur tamghe ka matlab hi khatam ho jata. Chhota sa waqt kaafi hai.
                    */}
                    <p className="mt-1 text-[0.7rem] text-ink-faint">
                      {timeAgo(locale, item.listedAt, now)}
                    </p>

                    <div className="mt-2 flex items-baseline justify-between gap-2 text-[0.78rem]">
                      <span className="text-ink-faint line-clamp-1">
                        {t('yourCost')}{' '}
                        <span dir="ltr" className="numeric">
                          {formatPkr(item.bajiPrice)}
                        </span>
                      </span>
                      <span dir="ltr" className="numeric font-bold">
                        {formatPkr(myPrice)}
                      </span>
                    </div>

                    {/*
                      Munafa aur button ek hi qatar mein thay — 214px ke card mein dono
                      samate nahi the aur button ke lafz toot jate the. Ab munafa apni
                      line mein (chhota, sabz) aur button poori chaurai par: ek nazar
                      mein saaf, aur ungli ke liye bara nishana.
                    */}
                    <div className="mt-auto pt-2.5">
                      <span className="inline-flex rounded-pill bg-accent-50 px-2.5 py-1 text-[0.72rem] font-semibold text-accent-700">
                        <span dir="ltr" className="numeric">
                          +{formatPkr(profit)}
                        </span>
                      </span>

                      <Link
                        href={`/catalogue/${item.id}`}
                        className="btn-primary mt-2 w-full !px-2 !py-1.5 !text-[0.78rem]"
                      >
                        {t('makePackShort')}
                      </Link>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
