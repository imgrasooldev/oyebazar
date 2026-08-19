import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { BRAND, isFresh, whatsappLink } from '@oyebazar/shared'
import { CheckBadgeIcon, PinIcon, WhatsAppIcon } from '@/components/icons'
import { SupplierLogo } from '@/components/supplier-logo'
import { toPublicProductDTO, toPublicSupplierDetailDTO } from '@/lib/api/mappers'
import { container } from '@/lib/container'
import { pickName, timeAgo, translator } from '@/lib/i18n'
import { getLocale } from '@/lib/i18n-server'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  try {
    const supplier = await container.bazaar.getSupplier(slug)
    return {
      title: `${supplier.businessName} — ${supplier.city}`,
      description: supplier.bioUr ?? `${supplier.businessName}, ${supplier.city}.`,
    }
  } catch {
    return { title: 'Not found' }
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
  const productPage = await container.bazaar.listSupplierProducts(slug, { limit: 24 })
  const products = productPage.items.map(toPublicProductDTO)

  return (
    <div className="mx-auto max-w-shell space-y-6 px-4 py-6">
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
      <section className="card overflow-hidden">
        <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
          <div className="flex min-w-0 items-start gap-4">
            <SupplierLogo name={detail.businessName} logoUrl={detail.logoUrl} size="lg" />

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-[1.6rem] font-bold leading-tight tracking-tight">
                  {detail.businessName}
                </h1>
                <span className="badge-verified">
                  <CheckBadgeIcon className="h-3.5 w-3.5" />
                  {t('verified')}
                </span>
              </div>

              <p className="mt-1.5 flex items-center gap-1.5 text-[0.95rem] text-ink-soft">
                <PinIcon className="h-4 w-4 shrink-0 text-ink-faint" />
                {detail.city}
                {detail.marketName ? ` · ${detail.marketName}` : ''}
              </p>

              {detail.bioUr && (
                <p className="mt-3 max-w-xl leading-relaxed text-ink">{detail.bioUr}</p>
              )}

              {/* Categories ab chips — lambi "·" wali qatar parhi nahi jati thi */}
              {detail.categories.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {detail.categories.map((category) => (
                    <li
                      key={category.nameEn}
                      className="rounded-pill bg-paper-sunken px-3 py-1 text-[0.78rem] text-ink-soft"
                    >
                      {pickName(locale, category)}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3 lg:w-64">
            {/*
              Taazgi — number se zyada ye batata hai ke dukan chal rahi hai ya nahi, aur
              WhatsApp par rate poochhne se pehle bandi yehi dekhti hai. Is liye ye CTA
              ke SAATH hai, kahin neeche matn mein nahi.
            */}
            <div className="rounded-card bg-paper-sunken px-4 py-3">
              <p className="numeric text-[1.15rem] font-bold leading-none">
                {detail.productCount}{' '}
                <span className="text-[0.85rem] font-semibold text-ink-soft">{t('items')}</span>
              </p>
              <p className="mt-2 text-[0.82rem]">
                {detail.lastListedAt ? (
                  <span
                    className={
                      isFresh(detail.lastListedAt, now)
                        ? 'font-semibold text-accent-700'
                        : 'text-ink-faint'
                    }
                  >
                    {isFresh(detail.lastListedAt, now) ? t('newStock') : t('lastListed')}{' '}
                    {timeAgo(locale, detail.lastListedAt, now)}
                  </span>
                ) : (
                  <span className="text-ink-faint">{t('noListingYet')}</span>
                )}
              </p>
              <p className="mt-1 text-[0.78rem] text-ink-faint">
                {t('onBazaarSince')} {detail.memberSince.getFullYear()}
              </p>
            </div>

            {/* 🔴 Wahid call to action — order button NAHI, seedha WhatsApp */}
            {detail.whatsappPublic && (
              <a
                href={whatsappLink(detail.whatsappPublic)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary w-full justify-center gap-2"
              >
                <WhatsAppIcon className="h-5 w-5" />
                {t('askRateWhatsapp')}
              </a>
            )}
          </div>
        </div>

        {/* 🔴 Qanooni jumla — patti ki shakl mein, card ke andar dabba nahi */}
        <p className="border-t border-paper-sunken bg-paper-sunken/60 px-5 py-3 text-[0.8rem] text-ink-soft sm:px-6">
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
                  {product.coverImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- storage URLs
                    <img
                      src={product.coverImageUrl}
                      alt={title}
                      loading="lazy"
                      className="aspect-square w-full object-cover"
                    />
                  ) : (
                    <div className="aspect-square w-full bg-paper-sunken" />
                  )}
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
                      {t('askRate')}
                    </p>
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
