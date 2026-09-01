import Link from 'next/link'
import { getResellerOrNull } from '@/lib/api/session'
import { LazyImage } from '@/components/lazy-image'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { BRAND, isFresh, whatsappLink } from '@oyebazar/shared'
import { CheckBadgeIcon, PinIcon, WhatsAppIcon } from '@/components/icons'
import { SupplierLogo } from '@/components/supplier-logo'
import { toPublicProductDTO, toPublicSupplierDetailDTO } from '@/lib/api/mappers'
import { container } from '@/lib/container'
import { pickName, timeAgo, translator } from '@/lib/i18n'
import { getLocale } from '@/lib/i18n-server'
import { resolveSeoText } from '@oyebazar/core'
import { breadcrumbLd, canonical, itemListLd, jsonLd, storeLd } from '@/lib/seo'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  try {
    const supplier = await container.bazaar.getSupplier(slug)

    /*
     * Dukan ka apna matn pehle, hamara bana hua us ke baad.
     *
     * 🔴 `resolveSeoText` se — koi `??` nahi. Farq asli hai: `??` sirf `null` par
     * chalta hai, aur khaana khali string (`''`) bhi ho sakta hai. Us soorat mein safha
     * BILKUL be-naam chhap jata, aur dukandar ko wajah kabhi pata na chalti.
     */
    const title = resolveSeoText(supplier.seoTitle, `${supplier.businessName} — ${supplier.city}`)
    const description = resolveSeoText(
      supplier.seoDescription,
      supplier.bioUr ??
        `${supplier.businessName}, ${supplier.city}${supplier.marketName ? ` (${supplier.marketName})` : ''} — ${supplier.productCount} آئٹمز۔ تھوک ریٹ کے لیے سیدھا رابطہ۔`,
    )

    return {
      title,
      description,
      alternates: canonical(`/bazaar/${slug}`),
      /*
       * OG par dukan ka apna logo. Na ho to koi tasveer NAHI — poori site ka default
       * (layout se) apna kaam kar leta hai.
       *
       * 🔴 Yahan pehli tasveer wale maal ki tasveer daalna aasan tha aur ghalat hota:
       * WhatsApp par dukan ka link bhejne par kisi EK cheez ki tasveer aati, aur
       * dekhne wala samajhta ke link us cheez ka hai.
       */
      openGraph: {
        type: 'profile',
        title,
        description,
        url: `/bazaar/${slug}`,
        ...(supplier.logoUrl ? { images: [{ url: supplier.logoUrl }] } : {}),
      },
    }
  } catch {
    /* 🔴 Jo safha hai hi nahi wo Google par bhi na jaye — warna 404 index ho jate hain */
    return { title: 'Not found', robots: { index: false, follow: false } }
  }
}

/**
 * Supplier ka public page.
 *
 * 🔴 Product cards par koi price nahi — `PublicProductDTO` mein price field maujood hi nahi.
 * 🔴 Koi "order karen" button nahi. Sirf ہول سیلر ka apna WhatsApp link.
 */
export default async function SupplierPage({ params }: Props) {
  const { slug } = await params
  const locale = await getLocale()
  const t = translator(locale)

  const supplier = await container.bazaar.getSupplier(slug).catch(() => null)
  if (!supplier) notFound()

  const detail = toPublicSupplierDetailDTO(supplier)
  const now = new Date()
  // Logged-in reseller ke liye rate us ke apne catalogue mein hai — yahan sirf rasta
  const loggedIn = (await getResellerOrNull()) !== null
  const productPage = await container.bazaar.listSupplierProducts(slug, { limit: 24 })
  const products = productPage.items.map(toPublicProductDTO)

  return (
    <div className="mx-auto max-w-shell space-y-6 px-4 py-6">
      {/*
        `Store` — `Organization` nahi. Google `Store` ko maqami karobar ki tarah samajhta
        hai (sheher, pata), aur ye hai bhi wohi: Bolton Market ki asli dukan.
      */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd(
          storeLd({
            name: detail.businessName,
            slug,
            city: detail.city,
            address: detail.address,
            logoUrl: detail.logoUrl,
            description: detail.bioUr,
          }),
        )}
      />
      {/* Safhe par jo rasta nazar aa raha hai, wohi Google ke natije mein bhi chhape */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd(
          breadcrumbLd([
            { name: t('bazaar'), path: '/bazaar' },
            { name: detail.businessName, path: `/bazaar/${slug}` },
          ]),
        )}
      />
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
        <span className="text-ink">{detail.businessName}</span>
      </nav>

      {/*
        Dukan ka sarwarq.
        Pehle yahan sirf matn ki qatarein thin — naam, sheher, ginti, tareekh — sab ek
        hi wazan par, aur dukan ka koi chehra nahi. Ab do hisse hain: baen pehchan
        (logo, naam, tasdeeq, ilaqa) aur daen wo do cheezein jin par faisla hota hai —
        WhatsApp ka rasta, aur ye ke dukan zinda hai ya nahi.
      */}
      {/*
        Dukan ka sarwarq — kasa hua.
        Pehle ye do sutoon ka grid tha: baen pehchan, daen stats ka dabba aur bara CTA.
        Jis dukan ka bio na ho aur ek hi category ho, us par baen wala hissa chhota reh
        jata aur daen wala lamba — beech mein poora safed maidan. Ab sab kuch ek hi qatar
        mein hai aur card utna hi lamba hota hai jitna us mein waqai likha ho.
      */}
      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3 p-4 sm:p-5">
          <SupplierLogo name={detail.businessName} logoUrl={detail.logoUrl} size="lg" />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[1.4rem] font-bold leading-tight tracking-tight">
                {detail.businessName}
              </h1>
              <span className="badge-verified">
                <CheckBadgeIcon className="h-3.5 w-3.5" />
                {t('verified')}
              </span>
            </div>

            {/* Sheher, taazgi aur ginti ek hi qatar mein — teen alag qatarein teen guna jagah leti thin */}
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.88rem] text-ink-soft">
              <PinIcon className="h-4 w-4 shrink-0 text-ink-faint" />
              {detail.city}
              {detail.marketName ? ` · ${detail.marketName}` : ''}
              <span aria-hidden="true" className="text-ink-faint">·</span>
              <span className="numeric">
                {detail.productCount} {t('items')}
              </span>
              <span aria-hidden="true" className="text-ink-faint">·</span>
              {detail.lastListedAt ? (
                <span
                  className={
                    isFresh(detail.lastListedAt, now) ? 'font-semibold text-accent-700' : undefined
                  }
                >
                  {isFresh(detail.lastListedAt, now) ? t('newStock') : t('lastListed')}{' '}
                  {timeAgo(locale, detail.lastListedAt, now)}
                </span>
              ) : (
                <span>{t('noListingYet')}</span>
              )}
              <span aria-hidden="true" className="text-ink-faint">·</span>
              <span className="text-ink-faint">
                {t('onBazaarSince')} {detail.memberSince.getFullYear()}
              </span>
            </p>

            {detail.bioUr && (
              <p className="mt-2 max-w-2xl text-[0.92rem] leading-relaxed text-ink">
                {detail.bioUr}
              </p>
            )}

            {detail.categories.length > 0 && (
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {detail.categories.map((category) => (
                  <li
                    key={category.nameEn}
                    className="rounded-pill bg-paper-sunken px-3 py-1 text-[0.76rem] text-ink-soft"
                  >
                    {pickName(locale, category)}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* 🔴 Wahid call to action — order button NAHI, seedha WhatsApp */}
          {detail.whatsappPublic && (
            <a
              href={whatsappLink(detail.whatsappPublic)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary shrink-0 gap-2"
            >
              <WhatsAppIcon className="h-5 w-5" />
              {t('askRateWhatsapp')}
            </a>
          )}
        </div>

        {/* 🔴 Qanooni jumla — patti ki shakl mein */}
        <p className="border-t border-paper-sunken bg-paper-sunken/60 px-4 py-2.5 text-[0.78rem] text-ink-soft sm:px-5">
          {locale === 'ur'
            ? `${BRAND.nameUr} یہاں سے آرڈر نہیں لیتا اور کوئی فیس نہیں لیتا — سودا براہِ راست ہول سیلر سے ہوتا ہے۔`
            : `${BRAND.name} takes no orders and charges no fee here — you deal with the wholesaler directly.`}
        </p>
      </section>

      <section>
        <div className="section-head">
          <h2 className="section-title">{t('wholesalerStock')}</h2>
          <span className="text-sm text-ink-faint">
            {products.length} {t('items')}
          </span>
        </div>

        {products.length === 0 ? (
          <p className="card p-6 text-ink-soft">{t('noItemsListed')}</p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {products.map((product) => {
              const title = locale === 'ur' ? product.titleUr : product.titleEn
              return (
                <li key={product.slug} className="tile group transition hover:shadow-lift">
                  {/*
                    Logged-in reseller ka poora card us maal ke apne safhe par le jata
                    hai; baqi sab ke liye card wahi khamosh card hai jo pehle tha.
                  */}
                  <ProductShell loggedIn={loggedIn} slug={product.slug}>
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
                    <p className="line-clamp-2 text-sm leading-snug">{title}</p>
                    <p className="mt-1.5 text-[0.72rem] text-ink-faint">
                      {pickName(locale, product.category)}
                    </p>

                    {/*
                      Naya maal sabz mein, purana khamosh — Bazaar par asal sawal yehi
                      hai ke dukan mein cheezein aa rahi hain ya nahi.
                    */}
                    <p
                      className={`mt-0.5 text-[0.72rem] ${
                        isFresh(product.listedAt, now) ? 'font-semibold text-accent-700' : 'text-ink-faint'
                      }`}
                    >
                      {timeAgo(locale, product.listedAt, now)}
                    </p>

                    {/* 🔴 قیمت یہاں کبھی نہیں — صرف لاگ اِن کے بعد */}
                    <p className="mt-2 border-t border-paper-sunken pt-2 text-[0.72rem] font-semibold text-brand-700">
                      {loggedIn ? t('seeMyRate') : t('askRate')}
                    </p>
                  </div>
                  </ProductShell>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}

/**
 * Card ka khol — logged-in reseller ke liye rasta, baqi ke liye sada khana.
 *
 * 🔴 Poore card ko link banane ka faisla sirf logged-in halat mein hai: logged out
 * safhe par card kahin nahi le jata (wahan rate hai hi nahi), aur usay link bana kar
 * "kuch milega" ka jhoota wada karna Bazaar ki poori soorat badal deta.
 */
function ProductShell({
  loggedIn,
  slug,
  children,
}: {
  loggedIn: boolean
  slug: string
  children: React.ReactNode
}) {
  if (!loggedIn) return <>{children}</>

  return (
    <Link href={`/catalogue/s/${slug}`} className="block">
      {children}
    </Link>
  )
}
