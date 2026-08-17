import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { BRAND, whatsappLink } from '@oyebazar/shared'
import { toPublicProductDTO, toPublicSupplierDetailDTO } from '@/lib/api/mappers'
import { container } from '@/lib/container'
import { pickName, translator } from '@/lib/i18n'
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
  const productPage = await container.bazaar.listSupplierProducts(slug, { limit: 24 })
  const products = productPage.items.map(toPublicProductDTO)

  return (
    <div className="mx-auto max-w-shell space-y-6 px-4 py-6">
      <nav className="text-sm text-ink-faint">
        <Link href="/bazaar" className="hover:text-brand-700">
          {t('bazaar')}
        </Link>
        <span className="mx-2">›</span>
        <span className="text-ink">{detail.businessName}</span>
      </nav>

      <section className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{detail.businessName}</h1>
              <span className="rounded bg-accent-50 px-2 py-0.5 text-xs font-semibold text-accent-700">
                {t('verified')}
              </span>
            </div>
            <p className="mt-1 text-ink-soft">
              {detail.city}
              {detail.marketName ? ` · ${detail.marketName}` : ''}
            </p>
            {detail.bioUr && <p className="mt-3 max-w-xl text-ink">{detail.bioUr}</p>}
            <p className="mt-3 text-sm text-ink-soft">
              {detail.productCount} {t('items')} ·{' '}
              {detail.categories.map((category) => pickName(locale, category)).join(' · ')}
            </p>
          </div>

          {/* 🔴 Wahid call to action — order button NAHI, seedha WhatsApp */}
          {detail.whatsappPublic && (
            <a
              href={whatsappLink(detail.whatsappPublic)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary"
            >
              {t('askRateWhatsapp')}
            </a>
          )}
        </div>

        <p className="mt-4 rounded-lg bg-paper-sunken p-3 text-xs text-ink-soft">
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
                <li key={product.slug} className="tile group">
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
                  <div className="p-2">
                    <p className="line-clamp-2 text-sm leading-relaxed">{title}</p>
                    <p className="mt-1 text-xs text-ink-faint">{pickName(locale, product.category)}</p>
                    {/* 🔴 قیمت یہاں کبھی نہیں — صرف لاگ اِن کے بعد */}
                    <p className="mt-1 text-xs font-semibold text-brand-700">{t('askRate')}</p>
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
