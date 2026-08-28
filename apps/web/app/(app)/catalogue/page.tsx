import Link from 'next/link'
import type { Metadata } from 'next'
import { DEFAULT_TEMPLATE_KEY, formatPkr, pkr } from '@oyebazar/shared'
import { DownloadIcon, SparkIcon } from '@/components/icons'
import { toResellerProductListItemDTO } from '@/lib/api/mappers'
import { requireReseller } from '@/lib/api/session'
import { container } from '@/lib/container'
import { CatalogueFilters } from '@/components/catalogue-filters'
import { ProductCard } from '@/components/product-card'
import { LazyImage } from '@/components/lazy-image'
import { CatalogueToolbar } from '@/components/catalogue-toolbar'
import { ScrollRail } from '@/components/scroll-rail'
import { SearchSuggest } from '@/components/search-suggest'
import { pickName, pickTitle, translator } from '@/lib/i18n'
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
    sort?: string
    view?: string
    /** Ek dukan ka maal — `/wholesalers/<slug>` se aata hai. */
    supplier?: string
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
   * Dukan ki chhanni — `/wholesalers/<slug>` se yahan aati hai.
   *
   * Alag safha bana kar wahan apna grid rakhne ka matlab hota ke maal ka card teesri
   * dafa likha jaye. Yahan bhejne se reseller ko us ki saari chhanni aur tarteeb bhi
   * mil jati hai, aur hisaab ek hi jagah rehta hai.
   */
  const supplierSlug = query.supplier || undefined

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

  // Anjaan qadar par default — URL koi bhi haath se likh sakta hai
  const sort = (['priceLow', 'priceHigh', 'profitHigh'] as const).find(
    (option) => option === query.sort,
  )
  const listView = query.view === 'list'

  const [page, dailyPacks, categories, trending] = await Promise.all([
    container.catalogue.list(reseller.id, {
      /*
       * 48 — pehle 24 the aur reseller ko roz "aur dikhao" ka intezar karna parta tha.
       * Ye safha tasveeron ka hai magar wo sab `lazy` hain: neeche wali tasveerein
       * tabhi utarti hain jab wahan tak scroll ho.
       */
      limit: 48,
      ...(search ? { search } : {}),
      ...(category ? { categorySlug: category } : {}),
      ...(supplierSlug ? { supplierSlug } : {}),
      ...(minPrice !== undefined ? { minPrice: pkr(minPrice) } : {}),
      // Ulti hadd (min > max) par sirf max girate hain — us se list khali nahi hoti
      ...(maxPrice !== undefined && (minPrice === undefined || maxPrice >= minPrice)
        ? { maxPrice: pkr(maxPrice) }
        : {}),
      ...(inStockOnly ? { inStockOnly: true } : {}),
      ...(sort ? { sort } : {}),
    }),
    container.dailyDrops.packsForReseller(reseller.id, DEFAULT_TEMPLATE_KEY),
    container.repositories.categories.findAll(),
    /*
     * 30 din — 7 din zyada "abhi wala" hota, magar is bazaar mein har maal par har
     * hafte order nahi aate, aur khali patti "kuch nahi chal raha" ka ghalat paighaam
     * deti hai. Jo hadd istemal hui hai wohi patti par likhi bhi hai — warna ye sirf
     * hamara dawa reh jata.
     */
    container.catalogue.trending(reseller.id, { limit: 12, days: 30 }),
  ])
  const items = page.items.map(toResellerProductListItemDTO)
  /*
   * Dukanon ke sitare — EK query mein sab ke liye.
   *
   * 🔴 Har card ko apni query karne dena N+1 hai: is safhe par 48 cheezein hoti hain.
   * Ek saath laane ka farq ek query aur athtaalees ka hai.
   */
  const ratings = await container.repositories.supplierReviews.ratingsFor([
    ...new Set(page.items.map((item) => item.product.supplier.id)),
  ])

  const readyCount = dailyPacks.filter((pack) => pack.imageUrl).length

  return (
    <div className="space-y-10">
      {/* --------------------------------------------------------- آج کا پیک */}
      {/*
        🔴 `!supplierSlug` bhi — warna chhanni jhoot bolti hai.

        Ye do rail (aaj ka pack, aur trending) chhanni ke MUTABIQ nahi chalte: wo poore
        platform ki cheezein dikhate hain. `search` aur `category` par ye pehle se chhup
        jate the, magar dukan wali chhanni nayi hai aur usay shart mein daalna reh gaya —
        yani "sirf is dukan ka maal" wale safhe par doosri dukanon ka maal upar khara
        rehta tha. Test mein yehi pakra: jhooti dukan par bhi paanch cheezein dikh rahi
        thin.
      */}
      {dailyPacks.length > 0 && !search && !category && !supplierSlug && (
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
                      <LazyImage
                        src={pack.imageUrl ?? pack.coverImageUrl ?? ''}
                        alt={pickTitle(locale, pack)}
                        wrapperClassName="h-full w-full"
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

      {/* ------------------------------------------------- ابھی کیا چل رہا ہے */}
      {/*
        Filter ya search ke waqt ye patti nahi aati: us waqt reseller kuch DHOOND rahi
        hai, aur us ke saamne alag maal rakhna sirf raste mein aana hai.
      */}
      {trending.length > 0 && !search && !category && !supplierSlug && (
        <section>
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-[1.15rem] font-bold tracking-tight">{t('trendingNow')}</h2>
            <span className="text-[0.78rem] text-ink-faint">{t('trendingWindow')}</span>
          </div>

          <ScrollRail labels={{ prev: t('stPrev'), next: t('stNext') }}>
            {trending.map((entry) => {
              const item = toResellerProductListItemDTO(entry)
              const title = locale === 'ur' ? item.titleUr : item.titleEn
              const myPrice = item.myRetailPrice ?? item.suggestedRetail
              const profit = Math.max(myPrice - item.bajiPrice, 0)

              return (
                <Link
                  key={item.id}
                  href={`/catalogue/${item.id}`}
                  className="card group w-40 shrink-0 p-2.5 sm:w-44"
                >
                  <div className="tile-media-wrap aspect-square rounded-card bg-paper-sunken">
                    {item.coverImageUrl && (
                      <LazyImage
                        src={item.coverImageUrl}
                        alt={title}
                        wrapperClassName="h-full w-full"
                        className="h-full w-full object-cover transition duration-500 ease-soft group-hover:scale-105"
                      />
                    )}

                    {/*
                      Ginti tasveer par — yehi is patti ka poora nuqta hai. "Trending"
                      likh dena hamara dawa hai; "9 آرڈر" ek waqia hai.
                    */}
                    <span className="absolute start-2 top-2 rounded-pill bg-coal-900/85 px-2 py-0.5 text-[0.7rem] font-semibold text-white">
                      <span dir="ltr" className="numeric">
                        {entry.orders}
                      </span>{' '}
                      {t('ordersShort')}
                    </span>
                  </div>

                  <p className="mt-2 truncate text-[0.85rem] font-semibold">{title}</p>
                  <p className="mt-0.5 flex items-baseline justify-between gap-2 text-[0.78rem]">
                    <span dir="ltr" className="numeric font-bold">
                      {formatPkr(myPrice)}
                    </span>
                    <span dir="ltr" className="numeric font-semibold text-accent-700">
                      +{formatPkr(profit)}
                    </span>
                  </p>
                </Link>
              )
            })}
          </ScrollRail>
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

          {/* Category ki qatar — dono taraf sarakti hai, aur kinare par ishara deti hai */}
          <ScrollRail labels={{ prev: t('stPrev'), next: t('stNext') }}>
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
          </ScrollRail>
        </div>

        {/*
          Tarteeb, filter aur list — teenon alag cheezein hain, is liye teenon ke beech
          khuli jagah. Pehle ye ek doosre se chipke hue the aur ek hi patti lagte the.
        */}
        <div className="mb-5 space-y-3">
        <CatalogueToolbar
          count={items.length}
          labels={{
            results: t('filterResults'),
            sortNewest: t('sortNewest'),
            sortPriceLow: t('sortPriceLow'),
            sortPriceHigh: t('sortPriceHigh'),
            sortProfit: t('sortProfit'),
            viewGrid: t('viewGrid'),
            viewList: t('viewList'),
          }}
        />

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
        </div>

        {items.length === 0 ? (
          <p className="card p-6 text-ink-soft">{t('noItemsListed')}</p>
        ) : (
          /*
            Do shaklen, ek hi data.
            Grid mein zyada maal ek nazar mein aata hai — jab reseller "kuch dekhna" chahti
            hai. Qatar wali shakl tab kaam ki hai jab wo moqabla kar rahi ho: lagat, rate
            aur munafa teenon ek hi line par, aankh ko neeche utarna nahi parta.
          */
          <ul
            className={
              listView
                ? 'space-y-2'
                : 'grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6'
            }
          >
            {items.map((item) => (
              <ProductCard
                key={item.id}
                item={item}
                locale={locale}
                rating={ratings.get(item.supplier.id)}
                now={now}
                listView={listView}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
