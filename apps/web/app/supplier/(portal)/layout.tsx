import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BRAND } from '@oyebazar/shared'
import { LanguageToggle } from '@/components/language-toggle'
import { SupplierLogoutButton } from '@/components/supplier-logout-button'
import { BoxesIcon, GridIcon, ListIcon, MoneyIcon, ShieldIcon } from '@/components/icons'
import { getSupplierOrNull } from '@/lib/api/supplier-session'
import { translator } from '@/lib/i18n'
import { getLocale } from '@/lib/i18n-server'

export const dynamic = 'force-dynamic'

/**
 * Wholesaler portal.
 *
 * Reseller wale portal se dekhne mein alag rakha hai (gehra charcoal sar) — jaan
 * boojh kar. Dukan par aksar ek hi computer par dono kaam hote hain; ek nazar mein
 * pata chalna chahiye ke abhi kis taraf khare hain.
 *
 * Dhaancha wohi jo baqi portals ka hai: bari screen par side mein nav, chhoti par upar
 * patti. Sirf do kaam: aaye hue order, aur apna maal.
 */
const NAV = [
  { href: '/supplier/dashboard', key: 'supplierDashboardNav', Icon: GridIcon },
  { href: '/supplier/orders', key: 'supplierOrdersNav', Icon: ListIcon },
  { href: '/supplier/stock', key: 'supplierStockNav', Icon: BoxesIcon },
  { href: '/supplier/payouts', key: 'payoutsNav', Icon: MoneyIcon },
  { href: '/supplier/settings', key: 'shopRules', Icon: ShieldIcon },
] as const

export default async function SupplierPortalLayout({ children }: { children: React.ReactNode }) {
  const [session, locale] = await Promise.all([getSupplierOrNull(), getLocale()])
  if (!session) redirect('/supplier/login')

  const t = translator(locale)

  return (
    <div className="min-h-screen bg-paper">
      <header className="sticky top-0 z-30 bg-coal-900 text-white">
        <div className="mx-auto flex max-w-shell items-center justify-between gap-3 px-5 py-3 lg:px-8">
          <Link
            href="/supplier/dashboard"
            className="flex min-h-tap flex-col justify-center leading-none"
          >
            <span className="text-[1.15rem] font-bold text-brand-300">
              {locale === 'ur' ? BRAND.nameUr : BRAND.name}
            </span>
            <span className="mt-1 text-[0.7rem] text-white/55">{t('wholesalerPortal')}</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="hidden max-w-[12rem] truncate text-sm text-white/75 sm:inline">
              {session.supplier.businessName}
            </span>
            <span className="rounded-pill bg-white/10 px-1">
              <LanguageToggle locale={locale} />
            </span>
            <SupplierLogoutButton label={t('logout')} />
          </div>
        </div>

        {/* Chhoti screen par upar — bari par neeche side nav hai */}
        <nav className="mx-auto flex max-w-shell gap-1 px-5 lg:hidden">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="inline-flex min-h-tap items-center gap-2 rounded-t-card px-4 py-2 text-sm font-semibold text-white/70 transition hover:bg-white/10 hover:text-white"
            >
              <item.Icon className="h-4 w-4" />
              {t(item.key)}
            </Link>
          ))}
        </nav>
      </header>

      <div className="mx-auto flex max-w-shell gap-8 px-5 py-6 lg:px-8">
        <aside className="hidden w-52 shrink-0 lg:block">
          <nav className="sticky top-24 space-y-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex min-h-tap items-center gap-3 rounded-card px-4 text-[0.95rem] font-semibold text-ink-soft transition hover:bg-paper-raised hover:text-brand-700 hover:shadow-soft"
              >
                <item.Icon className="h-5 w-5" />
                {t(item.key)}
              </Link>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  )
}
