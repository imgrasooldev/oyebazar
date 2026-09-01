import Link from 'next/link'
import type { Metadata } from 'next'
import { BazaarQuerySchema } from '@oyebazar/shared'
import { CategoryStrip } from '@/components/category-strip'
import { toPublicSupplierListDTO } from '@/lib/api/mappers'
import { container } from '@/lib/container'
import { SupplierLogo } from '@/components/supplier-logo'
import { isFresh } from '@oyebazar/shared'
import { pickName, timeAgo, translator } from '@/lib/i18n'
import { getLocale } from '@/lib/i18n-server'
import { canonical, itemListLd, jsonLd } from '@/lib/seo'

export const metadata: Metadata = {
  title: 'بازار — ہول سیلرز کی ڈائریکٹری',
  description: 'پاکستان بھر کے تصدیق شدہ ہول سیلرز — شہر اور کیٹگری کے حساب سے۔ مفت ڈائریکٹری۔',
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
  alternates: canonical('/bazaar'),
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
    fresh: raw.fresh === 'true' ? 'true' : undefined,
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
      freshOnly: query.fresh,
    }),
  ])

  const t = translator(locale)
  const suppliers = page.items.map(toPublicSupplierListDTO)
  // Ek hi "abhi" poore safhe ke liye — warna list ke aakhri card ka waqt pehle se alag hota
  const now = new Date()

  return (
    <>
      {/* Jo dukanen is safhe par nazar aa rahi hain — sirf un ke pate, tafseel un ke apne safhon par */}
      {suppliers.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={jsonLd(
            itemListLd(suppliers.map((supplier) => `/bazaar/${supplier.slug}`)),
          )}
        />
      )}

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

          {/*
            "Sirf naya maal" — Bazaar ka asal sawal yehi hai ke kaun si dukan zinda hai.
            City ki list ke saath rakha hai kyunke dono ek hi tarah ke faisle hain:
            "kahan se" aur "kis mein jaan hai".
          */}
          <div className="card mt-3 p-4">
            <Link
              href={{
                pathname: '/bazaar',
                query: {
                  ...(query.city ? { city: query.city } : {}),
                  ...(query.category ? { category: query.category } : {}),
                  ...(query.fresh ? {} : { fresh: 'true' }),
                },
              }}
              className={`flex min-h-tap items-center justify-between rounded-card px-3 text-sm font-semibold transition ${
                query.fresh
                  ? 'bg-accent-500 text-white'
                  : 'bg-paper-sunken text-ink-soft hover:text-ink'
              }`}
            >
              {t('filterFresh')}
              <span aria-hidden="true">{query.fresh ? '✓' : '+'}</span>
            </Link>
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

                    {/*
                      Neeche ki patti — dukan zinda hai ya nahi, ek nazar mein.
                      Sirf ginti kaafi nahi thi: 40 item wali dukan jis ne 8 mahine se
                      kuch naya nahi laga, 4 item wali taaza dukan se buri hai.
                    */}
                    <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-paper-sunken pt-2 text-xs text-ink-faint">
                      <span className="font-semibold text-ink-soft">
                        {supplier.productCount} {t('items')}
                      </span>
                      <span aria-hidden="true">·</span>
                      {supplier.lastListedAt ? (
                        <span
                          className={
                            isFresh(supplier.lastListedAt, now)
                              ? 'font-semibold text-accent-700'
                              : undefined
                          }
                        >
                          {isFresh(supplier.lastListedAt, now) ? t('newStock') : t('lastListed')}{' '}
                          {timeAgo(locale, supplier.lastListedAt, now)}
                        </span>
                      ) : (
                        <span>{t('noListingYet')}</span>
                      )}
                      <span className="ms-auto whitespace-nowrap">
                        {t('onBazaarSince')} {supplier.memberSince.getFullYear()}
                      </span>
                    </div>
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
