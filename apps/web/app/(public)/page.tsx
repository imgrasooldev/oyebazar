import Link from 'next/link'
import { getResellerOrNull } from '@/lib/api/session'
import { LazyImage } from '@/components/lazy-image'
import { isFresh } from '@oyebazar/shared'
import { CategoryMenu } from '@/components/category-menu'
import { CategoryStrip } from '@/components/category-strip'
import { NextDropCountdown } from '@/components/next-drop-countdown'
import { SupplierLogo } from '@/components/supplier-logo'
import {
  BoxesIcon,
  ChatIcon,
  CheckBadgeIcon,
  ChevronIcon,
  GridIcon,
  NoCartIcon,
  PinIcon,
  ShieldIcon,
  StoreIcon,
} from '@/components/icons'
import { toPublicProductDTO, toPublicSupplierListDTO } from '@/lib/api/mappers'
import { container } from '@/lib/container'
import { pickName, timeAgo, translator } from '@/lib/i18n'
import { getLocale } from '@/lib/i18n-server'

/**
 * Abhi dynamic — build ke waqt DB call na ho (CI mein Neon reachable nahi hota).
 * Prod DB CI se milne lage to ISR par shift kar denge; SEO ke liye wo behtar hai.
 */
export const dynamic = 'force-dynamic'

/**
 * Home.
 *
 * Design ka bunyadi usool: ye safha TASVEER se chalta hai, text se nahi. Kapra
 * dekh kar khareeda jata hai — is liye hero mein asli maal, categories par asli
 * tasveerein, aur product cards mein tasveer poori chaurai mein.
 *
 * 🔴 Ek bunyadi farq Alahdeen se: wo "Recent Buyer Requests" dikhata hai. Hamare paas public
 * buyer requests hain hi nahi (yahan order hota hi nahi), is liye us jagah ASLI activity
 * hai — kaun sa maal abhi list hua. Banawati requests dikhana bharosa torta hai.
 *
 * 🔴 Poore safhe par koi price nahi. Price sirf login ke baad.
 */
export default async function HomePage() {
  const locale = await getLocale()
  const t = translator(locale)
  const now = new Date()

  /*
   * Home par bhi ye jaanna zaroori hai ke banda logged in hai ya nahi.
   *
   * Layout ye pehle se poochhta hai (header ke liye), magar safhe ko us ka pata nahi
   * tha — is liye logged-in reseller ko bhi wohi "rate ke liye rabta karen" dikhta tha
   * jo anjaan bande ko dikhta hai, halanke rate us ke apne catalogue mein mojood tha.
   */
  const actor = await getResellerOrNull()
  const loggedIn = actor !== null

  const [categories, tree, stats, cities, suppliers, activity, popular] = await Promise.all([
    container.repositories.categories.findAll(),
    container.repositories.categories.findTree(),
    container.bazaar.stats(),
    container.bazaar.listCities(),
    container.bazaar.listSuppliers({ limit: 6 }),
    container.bazaar.recentlyListed(5),
    container.bazaar.popularProducts(12),
  ])

  const supplierCards = suppliers.items.map(toPublicSupplierListDTO)
  const productCards = popular.map(toPublicProductDTO)
  const heroImages = productCards
    .map((product) => product.coverImageUrl)
    .filter((url): url is string => Boolean(url))
    .slice(0, 3)
  const steps = [t('step1'), t('step2'), t('step3'), t('step4')]

  return (
    <>
      <CategoryStrip categories={categories} locale={locale} />

      <div className="mx-auto max-w-shell space-y-12 px-5 pb-4 pt-2">
        {/* -------------------------------------------------- categories + hero row */}
        <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
          {/* Mega-menu — desktop par. Mobile par upar chips ki patti hai. */}
          <aside className="hidden lg:block">
            <CategoryMenu
              tree={tree}
              locale={locale}
              title={t('topCategories')}
              itemsLabel={t('items')}
              viewAllLabel={t('viewAll')}
            />
          </aside>

        {/* ------------------------------------------------------------------ hero */}
        <section className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-coal-800 via-coal-900 to-coal-950 text-white shadow-lift">
          <div
            aria-hidden
            className="pointer-events-none absolute -end-32 -top-32 h-[26rem] w-[26rem] rounded-full bg-brand-500/25 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-40 start-1/4 h-[26rem] w-[26rem] rounded-full bg-brand-500/30 blur-3xl"
          />

          <div className="relative grid items-center gap-7 p-7 sm:p-9 lg:grid-cols-[1.15fr_1fr]">
            <div>
              <span className="badge bg-white/10 text-brand-300">{t('directoryFree')}</span>
              <h1 className="display mt-4 max-w-xl">{t('heroTitle')}</h1>
              <p className="mt-3 max-w-lg text-[1rem] leading-relaxed text-white/70">
                {t('heroBody')}
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                {/*
                  Jo pehle se andar hai usay "login karen" kehna us ka waqt zaya karna
                  hai — us ka agla qadam aaj ka pack banana hai, dobara login nahi.
                */}
                <Link
                  href={loggedIn ? '/catalogue' : '/login'}
                  className="btn bg-white px-8 text-brand-800 shadow-lift hover:bg-accent-50"
                >
                  {loggedIn ? t('myCatalogue') : t('resellerLogin')}
                </Link>
                <Link href="/bazaar" className="btn bg-white/10 px-8 text-white hover:bg-white/20">
                  {t('seeWholesalers')}
                </Link>
              </div>

              <dl className="mt-7 flex flex-wrap gap-x-10 gap-y-4">
                <Stat value={stats.suppliers} label={t('statWholesalers')} />
                <Stat value={stats.products} label={t('statItems')} />
                <Stat value={stats.cities} label={t('statCities')} />
              </dl>
            </div>

            {/*
              Asli maal, teen tirchi tasveerein — bilkul waise jaise status par lagti hain.
              Ye ek jumle se behtar bata deti hain ke hum banate kya hain.
            */}
            <div className="hidden justify-center lg:flex">
              {heroImages.map((url, index) => (
                <div
                  key={url}
                  className="aspect-[9/16] w-32 shrink-0 overflow-hidden rounded-2xl shadow-lift ring-1 ring-white/15 transition duration-500 ease-soft hover:z-10 hover:!rotate-0 hover:scale-105"
                  style={{
                    // beech wala seedha, dono kinare wale thora jhuke hue — haath mein pakre
                    // hue phone jaisa. Overlap negative margin se, absolute positioning se nahi
                    // (RTL mein absolute ulta baith jata hai).
                    rotate: `${(index - 1) * 6}deg`,
                    marginInlineStart: index === 0 ? '0' : '-2.5rem',
                    marginTop: index === 1 ? '-1.5rem' : '0',
                    zIndex: index === 1 ? 3 : 1,
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- storage URLs */}
                  <img src={url} alt="" className="h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                </div>
              ))}
            </div>
          </div>
        </section>
        </div>

        {/* ---------------------------------------------------- countdown + promo
            🔴 Ghadi asli hai: broadcast waqai roz 09:00 PKT par jata hai
            (apps/worker ka daily-broadcast job). Banawati "flash sale" nahi. */}
        <NextDropCountdown locale={locale} />

        {/* Do promo blocks — dono taraf ka bulawa: reseller aur wholesaler */}
        <section className="grid gap-5 lg:grid-cols-2">
          <div className="relative overflow-hidden rounded-card bg-brand-500 p-7 text-white shadow-lift">
            <div
              aria-hidden
              className="pointer-events-none absolute -end-16 -top-16 h-48 w-48 rounded-full bg-white/15 blur-2xl"
            />
            <p className="relative text-[1.3rem] font-bold leading-relaxed">
              {t('promoResellerTitle')}
            </p>
            <p className="relative mt-2 max-w-sm text-[0.92rem] text-white/85">
              {t('promoResellerBody')}
            </p>
            <Link
              href="/login"
              className="btn relative mt-5 bg-white px-7 text-brand-700 hover:bg-brand-50"
            >
              {t('promoResellerCta')}
            </Link>
          </div>

          <div className="relative overflow-hidden rounded-card bg-coal-800 p-7 text-white shadow-lift">
            <div
              aria-hidden
              className="pointer-events-none absolute -end-16 -bottom-16 h-48 w-48 rounded-full bg-accent-500/30 blur-2xl"
            />
            <p className="relative text-[1.3rem] font-bold leading-relaxed">
              {t('promoSupplierTitle')}
            </p>
            <p className="relative mt-2 max-w-sm text-[0.92rem] text-white/70">
              {t('promoSupplierBody')}
            </p>
            <Link
              href="/bazaar"
              className="btn relative mt-5 bg-white/10 px-7 text-white hover:bg-white/20"
            >
              {t('promoSupplierCta')}
            </Link>
          </div>
        </section>

        {/* ------------------------------------------------------------ value props
            Alahdeen jaisi patti — magar har jumla wo hai jo hamare model par SACH hai.
            "10,000+ businesses" jaise numbers nahi likhe: jab tak wo asli na hon,
            wo jhoot hain aur pehla wholesaler hi pakad lega. */}
        <section className="grid gap-px overflow-hidden rounded-card bg-black/[0.06] sm:grid-cols-2 lg:grid-cols-4">
          {[
            { Icon: NoCartIcon, title: t('propNoCartTitle'), body: t('propNoCartBody') },
            { Icon: ChatIcon, title: t('propNegotiateTitle'), body: t('propNegotiateBody') },
            { Icon: BoxesIcon, title: t('propBulkTitle'), body: t('propBulkBody') },
            { Icon: ShieldIcon, title: t('propVerifiedTitle'), body: t('propVerifiedBody') },
          ].map(({ Icon, title, body }) => (
            <div key={title} className="flex items-start gap-3 bg-paper-raised p-5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-pill bg-brand-50 text-brand-700">
                <Icon />
              </span>
              <div className="min-w-0">
                <p className="font-bold">{title}</p>
                <p className="mt-1 text-[0.85rem] leading-relaxed text-ink-faint">{body}</p>
              </div>
            </div>
          ))}
        </section>

        {/* ---------------------------------------------------------------- stats
            Sab ginti ASLI database se — koi round number nahi. */}
        <section className="grid grid-cols-2 gap-px overflow-hidden rounded-card bg-black/[0.06] sm:grid-cols-3 lg:grid-cols-5">
          <StatCell Icon={StoreIcon} value={String(stats.suppliers)} label={t('statWholesalers')} />
          <StatCell Icon={BoxesIcon} value={String(stats.products)} label={t('statItems')} />
          <StatCell Icon={GridIcon} value={String(tree.length)} label={t('statCategories')} />
          <StatCell Icon={PinIcon} value={String(stats.cities)} label={t('statCities')} />
          <StatCell Icon={ChatIcon} value={t('statContactValue')} label={t('statContact')} />
        </section>

        {/* ------------------------------------------------ categories + live rail */}
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <section>
            <SectionHead
              title={t('trendingCategories')}
              href="/bazaar"
              linkLabel={t('viewAll')}
            />

            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {tree.slice(0, 6).map((category) => (
                <li key={category.slug}>
                  <Link
                    href={{ pathname: '/bazaar', query: { category: category.slug } }}
                    className="tile group relative block aspect-[5/3]"
                  >
                    {category.coverImageUrl && (
                      <LazyImage
                        src={category.coverImageUrl}
                        alt=""
                        className="tile-media h-full"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-brand-900/85 via-brand-900/25 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                      <p className="text-[1.05rem] font-bold drop-shadow">
                        {pickName(locale, category)}
                      </p>
                      <p className="numeric text-xs text-white/70">
                        {category.productCount} {t('items')}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          {/* Live patti — asli activity, banawati requests nahi */}
          <section className="card overflow-hidden">
            <div className="flex items-center justify-between px-5 pb-3 pt-5">
              <p className="text-[0.72rem] font-bold uppercase tracking-[0.14em] text-ink-faint">
                {t('recentlyListed')}
              </p>
              <span className="badge-live">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-500 opacity-60" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-600" />
                </span>
                {t('liveNow')}
              </span>
            </div>

            <ul>
              {activity.map((item) => (
                <li key={item.slug}>
                  <Link
                    href={`/bazaar/${item.supplierSlug}`}
                    className="flex items-center gap-3 px-5 py-3 transition hover:bg-paper-sunken"
                  >
                    <span className="min-w-0 flex-1">
                      {/* Poora naam — Nastaliq par clamp/leading harf ka sar kaat deta hai */}
                      <span className="block text-[0.9rem]">
                        {locale === 'ur' ? item.titleUr : item.titleEn}
                      </span>
                      <span className="mt-0.5 flex items-center justify-between gap-2 text-[0.72rem] text-ink-faint">
                        <span className="flex min-w-0 items-center gap-1">
                          <PinIcon className="h-3 w-3 shrink-0" />
                          <span className="truncate">{item.city}</span>
                        </span>
                        <span className="numeric shrink-0">
                          {timeAgo(locale, item.listedAt, now)}
                        </span>
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* ------------------------------------------------------- popular products */}
        <section>
          <SectionHead
            title={t('popularProducts')}
            href="/bazaar"
            linkLabel={t('viewAll')}
          />

          {/*
            Card kase hue hain: pehle 4:5 ki tasveer aur chaar column the, jis se chaar
            maal poori screen kha jate the. Ye directory hai — dekhne wala scroll kar ke
            chunta hai, is liye ek nazar mein zyada maal dikhna hi kaam ka hai.
          */}
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
            {productCards.slice(0, 12).map((product) => {
              const title = locale === 'ur' ? product.titleUr : product.titleEn
              return (
                <li key={product.slug} className="tile group">
                  {/*
                    Logged-in reseller ko seedha us maal ke apne safhe par — wahan rate
                    hai. Baqi sab ko dukan ka safha, jahan rate kabhi nahi hota.
                  */}
                  <Link
                    href={loggedIn ? `/catalogue/s/${product.slug}` : `/bazaar/${product.supplierSlug}`}
                    className="block"
                  >
                    <div className="tile-media-wrap relative aspect-square bg-paper-sunken">
                      {product.coverImageUrl && (
                        <LazyImage
                          src={product.coverImageUrl}
                          alt={title}
                          className="tile-media h-full"
                        />
                      )}

                      {/* Hover par CTA upar aata hai — card "clickable" mehsoos hota hai */}
                      <div className="absolute inset-x-0 bottom-0 translate-y-full bg-gradient-to-t from-brand-900/90 to-transparent p-2.5 text-center text-[0.8rem] font-semibold text-white transition duration-300 ease-soft group-hover:translate-y-0">
                        {loggedIn ? t('seeMyRate') : t('askRate')}
                      </div>
                    </div>

                    <div className="p-3">
                      <p className="line-clamp-2 text-[0.85rem] font-semibold leading-snug">
                        {title}
                      </p>
                      <p className="mt-1 flex items-center gap-1 truncate text-[0.72rem] text-ink-faint">
                        <PinIcon className="h-3 w-3 shrink-0" />
                        {product.supplierCity}
                      </p>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>

        {/* ------------------------------------------------------ featured suppliers */}
        <section>
          <SectionHead
            title={t('featuredSuppliers')}
            href="/bazaar"
            linkLabel={t('viewAll')}
          />

          {/*
            🔴 `min-w-0` grid item par lazmi hai. Andar `truncate` hai, jo whitespace-nowrap
            lagata hai — us se column ka min-content poore naam jitna chaura ho jata hai
            aur 360px par card safhe se bahar nikal jata hai (mobile audit ne 28px pakra).
          */}
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {supplierCards.map((supplier) => (
              <li key={supplier.slug} className="min-w-0">
                <Link href={`/bazaar/${supplier.slug}`} className="tile group block p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <SupplierLogo name={supplier.businessName} logoUrl={supplier.logoUrl} />
                      <div className="min-w-0">
                      <h3 className="text-[1.02rem] font-bold">
                        {supplier.businessName}
                      </h3>
                      <p className="mt-1 flex items-center gap-1 text-[0.8rem] text-ink-faint">
                        <PinIcon className="h-3.5 w-3.5" />
                        {supplier.city}
                        {supplier.marketName ? ` · ${supplier.marketName}` : ''}
                      </p>
                      </div>
                    </div>
                    <span className="badge-verified shrink-0">
                      <CheckBadgeIcon className="h-3.5 w-3.5" />
                      {t('verified')}
                    </span>
                  </div>

                  <div className="hairline my-3" />

                  <div className="flex flex-wrap gap-1.5">
                    {supplier.categories.slice(0, 4).map((category) => (
                      <span
                        key={category.nameEn}
                        className="rounded-pill bg-paper-sunken px-2.5 py-0.5 text-[0.72rem] text-ink-soft"
                      >
                        {pickName(locale, category)}
                      </span>
                    ))}
                  </div>

                  <div className="mt-4 flex items-end justify-between gap-2">
                    <p className="numeric flex items-center gap-1 text-sm font-semibold text-brand-700">
                      {supplier.productCount} {t('items')}
                      <ChevronIcon className="h-3.5 w-3.5 transition group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
                    </p>

                    {/* Taazgi — "40 item" ka matlab tabhi hai jab maal naya bhi ho */}
                    {supplier.lastListedAt && (
                      <span
                        className={`text-[0.72rem] ${
                          isFresh(supplier.lastListedAt, now)
                            ? 'font-semibold text-accent-700'
                            : 'text-ink-faint'
                        }`}
                      >
                        {isFresh(supplier.lastListedAt, now) ? t('newStock') : t('lastListed')}{' '}
                        {timeAgo(locale, supplier.lastListedAt, now)}
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* ---------------------------------------------------------------- cities */}
        <section>
          <SectionHead title={t('byCity')} href="/bazaar" linkLabel={t('viewAll')} />
          <div className="rail">
            {cities.map((city) => (
              <Link
                key={city.city}
                href={{ pathname: '/bazaar', query: { city: city.city } }}
                className="chip"
              >
                <PinIcon className="h-3.5 w-3.5" />
                {city.city}
                <span className="numeric text-ink-faint">({city.count})</span>
              </Link>
            ))}
          </div>
        </section>

        {/* --------------------------------------------------------- how it works */}
        <section className="overflow-hidden rounded-[1.75rem] bg-paper-sunken p-8 sm:p-10">
          <h2 className="text-center text-[1.4rem] font-bold">{t('howItWorks')}</h2>
          <ol className="mt-8 grid gap-5 sm:grid-cols-4">
            {steps.map((step, index) => (
              <li key={step} className="card p-6 text-center">
                <span className="numeric mx-auto flex h-11 w-11 items-center justify-center rounded-pill bg-brand-700 text-base font-bold text-white shadow-soft">
                  {index + 1}
                </span>
                <p className="mt-4 text-[0.92rem] leading-loose text-ink-soft">{step}</p>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </>
  )
}

function SectionHead({
  title,
  href,
  linkLabel,
}: {
  title: string
  href: '/bazaar'
  linkLabel: string
}) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <h2 className="text-[1.35rem] font-bold tracking-tight">{title}</h2>
      <Link href={href} className="section-link shrink-0">
        {linkLabel}
      </Link>
    </div>
  )
}

function StatCell({
  Icon,
  value,
  label,
}: {
  Icon: (props: { className?: string }) => React.ReactElement
  value: string
  label: string
}) {
  return (
    <div className="flex items-center gap-3 bg-paper-raised px-5 py-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-pill bg-accent-50 text-accent-700">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="numeric text-lg font-bold leading-none">{value}</p>
        <p className="mt-1 truncate text-xs text-ink-faint">{label}</p>
      </div>
    </div>
  )
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <dt className="text-[0.7rem] uppercase tracking-[0.14em] text-white/45">{label}</dt>
      <dd className="numeric mt-1 text-2xl font-bold">{value.toLocaleString('en-PK')}</dd>
    </div>
  )
}
