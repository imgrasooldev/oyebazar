import Link from 'next/link'
import type { Metadata } from 'next'
import { BazaarQuerySchema } from '@oyebazar/shared'
import { CategoryStrip } from '@/components/category-strip'
import { toPublicSupplierListDTO } from '@/lib/api/mappers'
import { container } from '@/lib/container'
import { SupplierLogo } from '@/components/supplier-logo'
import { pickName, translator } from '@/lib/i18n'
import { getLocale } from '@/lib/i18n-server'

export const metadata: Metadata = {
  title: 'بازار — ہول سیلرز کی ڈائریکٹری',
  description: 'پاکستان بھر کے تصدیق شدہ ہول سیلرز — شہر اور کیٹگری کے حساب سے۔ مفت ڈائریکٹری۔',
}

export const dynamic = 'force-dynamic'

/**
 * Bazaar — public wholesaler directory (marketplace layout: filter side, natije grid).
 *
 * 🔴 Yahan sirf naam, sheher aur WhatsApp number hai. Koi price nahi, koi order button nahi,
 *    koi fee nahi. Ye teeno cheezein add karne se hum "online marketplace" ban jate hain.
 */
export default async function BazaarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const raw = await searchParams
  const query = BazaarQuerySchema.parse({
    city: typeof raw.city === 'string' ? raw.city : undefined,
    category: typeof raw.category === 'string' ? raw.category : undefined,
    q: typeof raw.q === 'string' ? raw.q : undefined,
    limit: '24',
  })

  const [locale, categories, cities, page] = await Promise.all([
    getLocale(),
    container.repositories.categories.findAll(),
    container.bazaar.listCities(),
    container.bazaar.listSuppliers({
      limit: query.limit,
      city: query.city,
      categorySlug: query.category,
      search: query.q,
    }),
  ])

  const t = translator(locale)
  const suppliers = page.items.map(toPublicSupplierListDTO)

  return (
    <>
      <CategoryStrip categories={categories} locale={locale} active={query.category} />

      <div className="mx-auto max-w-shell gap-6 px-4 py-6 lg:grid lg:grid-cols-[240px_1fr]">
        {/* Filters — desktop par side, mobile par upar chips */}
        <aside className="mb-4 lg:mb-0">
          <div className="card p-4">
            <p className="font-bold">{t('city')}</p>
            <ul className="mt-3 space-y-1 text-sm">
              <li>
                <Link
                  href="/bazaar"
                  className={`link-tap ${query.city ? 'text-ink-soft hover:text-brand-700' : 'font-bold text-brand-700'}`}
                >
                  {t('allCities')}
                </Link>
              </li>
              {cities.map((city) => (
                <li key={city.city}>
                  <Link
                    href={{ pathname: '/bazaar', query: { city: city.city } }}
                    className={`link-tap ${query.city === city.city ? 'font-bold text-brand-700' : 'text-ink-soft hover:text-brand-700'}`}
                  >
                    {city.city} <span className="text-ink-faint">({city.count})</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="card mt-3 p-4 text-sm text-ink-soft">
            <p className="font-bold text-ink">{t('noOrdersHere')}</p>
            <p className="mt-1">{t('noOrdersHereBody')}</p>
          </div>
        </aside>

        <section>
          <div className="section-head">
            <h1 className="section-title">
              {query.city
                ? locale === 'ur'
                  ? `${query.city} کے ہول سیلرز`
                  : `Wholesalers in ${query.city}`
                : t('verifiedWholesalers')}
            </h1>
            <span className="text-sm text-ink-faint">
              {suppliers.length} {t('results')}
            </span>
          </div>

          {suppliers.length === 0 ? (
            <p className="card p-6 text-ink-soft">{t('noSuppliersFound')}</p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {suppliers.map((supplier) => (
                // min-w-0: andar truncate hai, warna column poore naam jitna chaura ho jata hai
                <li key={supplier.slug} className="min-w-0">
                  <Link href={`/bazaar/${supplier.slug}`} className="tile group block p-4">
                    <div className="flex items-start gap-3">
                      <SupplierLogo name={supplier.businessName} logoUrl={supplier.logoUrl} />

                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <h2 className="truncate font-bold">{supplier.businessName}</h2>
                          <span className="shrink-0 rounded bg-accent-50 px-2 py-0.5 text-xs font-semibold text-accent-700">
                            {t('verified')}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-ink-soft">
                          {supplier.city}
                          {supplier.marketName ? ` · ${supplier.marketName}` : ''}
                        </p>
                      </div>
                    </div>
                    {supplier.categories.length > 0 && (
                      <p className="mt-2 line-clamp-1 text-sm text-ink-soft">
                        {supplier.categories
                          .map((category) => pickName(locale, category))
                          .join(' · ')}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-ink-faint">
                      {supplier.productCount} {t('items')}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  )
}
