/**
 * Reseller ke portal mein dukanon ki list.
 *
 * 🔴 Ye safha `/bazaar` ki naqal NAHI hai, aur farq samajhna zaroori hai.
 *
 * `/bazaar` bahar ke logon ke liye hai — wahan dukan ka public WhatsApp number bhi hota
 * hai, kyunke us directory ki poori value yehi hai. Ye safha ANDAR hai: yahan reseller
 * dukan CHUNTI hai taake us ka maal apne rate ke saath dekh sake aur pack bana sake.
 * Rabte ka number yahan jaan boojh kar nahi — wo raasta bazaar par pehle se khula hai,
 * aur usay portal ke andar dohrana sirf bypass ko aasan banata hai.
 *
 * Pehle ye safha tha hi nahi: reseller ka `/catalogue` sirf maal ki list thi aur us mein
 * dukan ka zikr tak nahi tha. Yani "wholesaler dhoondho" wala poora safar sirf us
 * banday ke liye mojood tha jo login kiye baghair aata hai.
 */
import Link from 'next/link'
import { requireReseller } from '@/lib/api/session'
import { container } from '@/lib/container'
import { getLocale } from '@/lib/i18n-server'
import { translator } from '@/lib/i18n'
import { SupplierLogo } from '@/components/supplier-logo'

export const dynamic = 'force-dynamic'

export default async function WholesalersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireReseller()
  const raw = await searchParams
  const locale = await getLocale()
  const t = translator(locale)

  const search = typeof raw.q === 'string' ? raw.q.trim() : undefined
  const city = typeof raw.city === 'string' ? raw.city.trim() : undefined

  const page = await container.bazaar.listSuppliers({
    limit: 48,
    ...(search ? { search } : {}),
    ...(city ? { city } : {}),
  })

  /* Sab dukanon ke sitare ek saath — har card ke liye alag query nahi */
  const ratings = await container.repositories.supplierReviews.ratingsForSlugs(
    page.items.map((supplier) => supplier.slug),
  )

  return (
    <div>
      <h1 className="text-[1.35rem] font-bold tracking-tight">{t('wholesalersTitle')}</h1>
      <p className="mt-1 text-[0.92rem] text-ink-soft">{t('wholesalersBody')}</p>

      {/*
        Search `GET` form hai — koi JavaScript nahi.

        Sasta phone aur dheema net hamari aam soorat hai; form is soorat mein bhi chalta
        hai jab page ka JS abhi utra hi na ho, aur nateeja URL mein hota hai to reseller
        usay WhatsApp par doosri reseller ko bhej sakti hai.
      */}
      <form method="GET" className="mt-4 flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={search ?? ''}
          placeholder={t('wholesalersSearchHint')}
          className="field flex-1 text-[0.95rem]"
        />
        <button type="submit" className="btn-primary shrink-0">
          {t('search')}
        </button>
      </form>

      {page.items.length === 0 ? (
        <p className="mt-8 text-center text-[0.9rem] text-ink-soft">{t('wholesalersEmpty')}</p>
      ) : (
        <ul className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {page.items.map((supplier) => (
            <li key={supplier.slug}>
              <Link
                href={{ pathname: `/wholesalers/${supplier.slug}` }}
                className="tile flex h-full items-center gap-3 p-3"
              >
                <SupplierLogo name={supplier.businessName} logoUrl={supplier.logoUrl} size="sm" />
                <div className="min-w-0">
                  <p className="truncate text-[0.95rem] font-semibold">{supplier.businessName}</p>
                  <p className="mt-0.5 truncate text-[0.78rem] text-ink-soft">
                    {supplier.marketName ? `${supplier.marketName} · ` : ''}
                    {supplier.city}
                  </p>
                  {/* Sitare tabhi jab kaafi raye hon — warna kuch nahi, ginti bhi nahi */}
                  {(() => {
                    const rating = ratings.get(supplier.slug)
                    return rating?.stars ? (
                      <p className="mt-0.5 text-[0.78rem] font-semibold text-accent-700">
                        ★ <span dir="ltr" className="numeric">{rating.stars}</span>{' '}
                        <span className="font-normal text-ink-faint">
                          (<span dir="ltr" className="numeric">{rating.count}</span>)
                        </span>
                      </p>
                    ) : null
                  })()}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
