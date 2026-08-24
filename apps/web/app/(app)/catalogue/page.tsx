import Link from 'next/link'
import type { Metadata } from 'next'
import { DEFAULT_TEMPLATE_KEY, formatPkr, pkr } from '@oyebazar/shared'
import { DownloadIcon, SparkIcon } from '@/components/icons'
import { toResellerProductListItemDTO } from '@/lib/api/mappers'
import { requireReseller } from '@/lib/api/session'
import { container } from '@/lib/container'
import { CatalogueFilters } from '@/components/catalogue-filters'
import { LazyImage } from '@/components/lazy-image'
import { CatalogueToolbar } from '@/components/catalogue-toolbar'
import { ScrollRail } from '@/components/scroll-rail'
import { SearchSuggest } from '@/components/search-suggest'
import { pickName, pickTitle, timeAgo, translator } from '@/lib/i18n'
import { getLocale } from '@/lib/i18n-server'

export const metadata: Metadata = { title: 'Catalogue' }
export const dynamic = 'force-dynamic'

/**
 * Is se kam maal bache to card par ginti aati hai.
 *
 * 5 is liye ke ek reseller ka ek status aam tor par is se zyada order nahi laata — yani
 * is hadd se neeche wo waqai "mana karna par sakta hai" wale ilaqe mein hai.
 */
const LOW_STOCK = 5

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
            {items.map((item) => {
              const title = locale === 'ur' ? item.titleUr : item.titleEn
              const myPrice = item.myRetailPrice ?? item.suggestedRetail
              const profit = Math.max(myPrice - item.bajiPrice, 0)

              /*
                Qatar wali shakl — ek maal, ek poori line.
                Yahan tasveer chhoti hai aur numbers ek hi line par: lagat, rate, munafa.
                Grid mein aankh ko har card par neeche utarna parta hai; moqable ke waqt
                wo teen guna kaam hai.
              */
              if (listView) {
                return (
                  <li key={item.id} className="card flex flex-wrap items-center gap-3 p-2.5">
                    <Link
                      href={`/catalogue/${item.id}`}
                      className="tile-media-wrap h-16 w-16 shrink-0 rounded-card bg-paper-sunken"
                    >
                      {item.coverImageUrl && (
                        <LazyImage
                          src={item.coverImageUrl}
                          alt={title}
                          wrapperClassName="h-full w-full"
                          className="h-full w-full object-cover"
                        />
                      )}
                    </Link>

                    <div className="min-w-0 flex-1">
                      <Link href={`/catalogue/${item.id}`} className="block">
                        <p className="truncate text-[0.92rem] font-semibold">{title}</p>
                      </Link>
                      <p className="mt-0.5 text-[0.74rem] text-ink-faint">
                        {pickName(locale, item.category)}
                        <span className="mx-1.5">·</span>
                        {timeAgo(locale, item.listedAt, now)}
                        {!item.inStock && (
                          <span className="ms-2 rounded-pill bg-coal-900/85 px-2 py-0.5 text-white">
                            {t('outOfStock')}
                          </span>
                        )}
                        {/*
                          Bacha hua maal SIRF tab jab wo kam ho.
                          Har card par "47 bache hain" likhna khabar nahi, shor hai — aur
                          us shor mein wo "3 bache hain" bhi doob jata hai jo asal khabar
                          hai. Hadd wohi jahan reseller ka faisla waqai badalta hai.
                        */}
                        {item.inStock && item.stockLeft > 0 && item.stockLeft <= LOW_STOCK && (
                          <span className="ms-2 rounded-pill bg-red-50 px-2 py-0.5 font-semibold text-red-700">
                            <span dir="ltr" className="numeric">
                              {item.stockLeft}
                            </span>{' '}
                            {t('onlyLeft')}
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="text-end">
                      <p className="text-[0.72rem] text-ink-faint">
                        {t('yourCost')}{' '}
                        <span dir="ltr" className="numeric">
                          {formatPkr(item.bajiPrice)}
                        </span>
                      </p>
                      <p dir="ltr" className="numeric text-[1.05rem] font-bold">
                        {formatPkr(myPrice)}
                      </p>
                    </div>

                    {/* Qatar mein bhi wahi wazan — chhoti goli baqi numbers mein gum ho jati thi */}
                    <span className="inline-flex items-baseline gap-1.5 rounded-card bg-accent-50 px-3 py-1.5 text-accent-700">
                      <span className="text-[0.75rem] font-semibold uppercase tracking-wide text-accent-700/80">
                        {t('yourProfit')}
                      </span>
                      <span dir="ltr" className="numeric text-[1rem] font-bold">
                        +{formatPkr(profit)}
                      </span>
                    </span>

                    <Link
                      href={`/catalogue/${item.id}`}
                      className="btn-primary !px-4 !py-2 !text-[0.8rem]"
                    >
                      {t('makePackShort')}
                    </Link>
                  </li>
                )
              }

              return (
                <li key={item.id} className="tile group flex flex-col">
                  <Link href={`/catalogue/${item.id}`} className="block">
                    <div className="relative aspect-square overflow-hidden bg-paper-sunken">
                      {item.coverImageUrl && (
                        <LazyImage
                          src={item.coverImageUrl}
                          alt={title}
                          wrapperClassName="h-full w-full"
                          className="tile-media h-full"
                        />
                      )}

                      {/*
                        Waqt aur "sirf itne bache" — tasveer ke KONE par, apni qatar mein
                        nahi.

                        🔴 Ye ek qatar 22px leti thi (18px likhai + 4px faasla), aur card
                        pehle hi 456px ka tha. Tasveer ke neeche ka kona waise bhi khali
                        rehta hai — wahan rakh dene se wohi maloomat milti hai aur oonchai
                        ka kuch bhi kharch nahi hota.

                        Halka kaala parda is liye ke tasveer chamakdaar bhi ho sakti hai
                        aur safed likhai us par gum ho jati hai.
                      */}
                      <p className="absolute inset-x-0 bottom-0 flex items-center gap-1.5 bg-gradient-to-t from-black/55 to-transparent px-2 pb-1.5 pt-4 text-[0.68rem] text-white/85">
                        {timeAgo(locale, item.listedAt, now)}
                        {item.inStock && item.stockLeft > 0 && item.stockLeft <= LOW_STOCK && (
                          <span className="font-semibold text-red-300">
                            ·{' '}
                            <span dir="ltr" className="numeric">
                              {item.stockLeft}
                            </span>{' '}
                            {t('onlyLeft')}
                          </span>
                        )}
                      </p>
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
                  <div className="flex flex-1 flex-col px-3 pb-3 pt-2.5">
                    <p className="line-clamp-2 text-[0.85rem] font-semibold leading-snug">
                      {title}
                    </p>

                    {/*
                      🔴 Teen number, teen alag qatarein — ek hi line mein thay aur 214px
                      ke card mein "Your cost Rs…" kat jata tha aur rate do lines mein
                      toot jata ("Rs" upar, "1,350" neeche). Ab har number apni qatar
                      mein hai aur kisi ko tootna nahi parta.

                      Mashwara (hamara tajweez kardah rate) bhi yahin: reseller ko lagat
                      aur mashwara dono saath chahiyen, warna wo apna rate andaze se
                      lagati hai.
                    */}
                    <dl className="mt-2 space-y-0.5 text-[0.75rem] leading-tight">
                      <div className="flex items-baseline justify-between gap-2">
                        <dt className="shrink-0 text-ink-faint">{t('yourCost')}</dt>
                        <dd dir="ltr" className="numeric whitespace-nowrap text-ink-soft">
                          {formatPkr(item.bajiPrice)}
                        </dd>
                      </div>
                      <div className="flex items-baseline justify-between gap-2">
                        <dt className="shrink-0 text-ink-faint">{t('suggested')}</dt>
                        <dd dir="ltr" className="numeric whitespace-nowrap text-ink-soft">
                          {formatPkr(item.suggestedRetail)}
                        </dd>
                      </div>
                      <div className="flex items-baseline justify-between gap-2 pt-0.5">
                        <dt className="shrink-0 text-[0.72rem] font-semibold text-ink">
                          {t('yourPriceShort')}
                        </dt>
                        <dd
                          dir="ltr"
                          className="numeric whitespace-nowrap text-[0.95rem] font-bold"
                        >
                          {formatPkr(myPrice)}
                        </dd>
                      </div>
                    </dl>

                    {/*
                      Munafa aur button ek hi qatar mein thay — 214px ke card mein dono
                      samate nahi the aur button ke lafz toot jate the. Ab munafa apni
                      line mein (chhota, sabz) aur button poori chaurai par: ek nazar
                      mein saaf, aur ungli ke liye bara nishana.
                    */}
                    <div className="mt-auto pt-2">
                      {/*
                        Munafa — card ka sab se numaya number.
                        Pehle ye ek chhoti si goli thi aur "+Rs 350" par lafz bhi nahi
                        tha. Reseller ke liye YEHI faisla hai (baqi do number us tak
                        pohanchne ka rasta hain), is liye ab poori chaurai par apna
                        khaana, bara hindsa aur sabz zameen.
                      */}
                      <div className="rounded-card bg-accent-50 px-3 py-1.5">
                        {/*
                          Lafz upar, hindsa neeche — saath rakhte to 180px ke card mein
                          dono toot jate the ("YOUR / PROFIT" aur "+Rs / 350"). Tootа hua
                          number parhne mein sab se buri cheez hai.
                        */}
                        <span className="block text-[0.75rem] font-semibold text-accent-700/70">
                          {t('yourProfit')}
                        </span>
                        <span
                          dir="ltr"
                          className="numeric mt-0.5 block whitespace-nowrap text-[1.1rem] font-bold leading-none text-accent-700"
                        >
                          +{formatPkr(profit)}
                        </span>
                      </div>

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
