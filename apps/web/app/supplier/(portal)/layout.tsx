import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BRAND } from '@oyebazar/shared'
import { LanguageToggle } from '@/components/language-toggle'
import { SupplierLogoutButton } from '@/components/supplier-logout-button'
import { BoxesIcon, ListIcon } from '@/components/icons'
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
 * Sirf do kaam upar hain: aaye hue order, aur apna maal on/off. Baqi sab ops ka kaam
 * hai — is portal ka maqsad wholesaler ka waqt bachana hai, use software dena nahi.
 */
export default async function SupplierPortalLayout({ children }: { children: React.ReactNode }) {
  const [session, locale] = await Promise.all([getSupplierOrNull(), getLocale()])
  if (!session) redirect('/supplier/login')

  const t = translator(locale)

  return (
    <div className="min-h-screen bg-paper">
      <header className="sticky top-0 z-30 bg-coal-900 text-white">
        <div className="mx-auto flex max-w-shell items-center justify-between gap-3 px-5 py-3 lg:px-8">
          <Link href="/supplier/orders" className="flex min-h-tap flex-col justify-center leading-none">
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

        <nav className="mx-auto flex max-w-shell gap-1 px-5 lg:px-8">
          <PortalTab href="/supplier/orders" label={t('supplierOrdersNav')} Icon={ListIcon} />
          <PortalTab href="/supplier/stock" label={t('supplierStockNav')} Icon={BoxesIcon} />
        </nav>
      </header>

      <main className="mx-auto max-w-shell px-5 py-6 lg:px-8">{children}</main>
    </div>
  )
}

/**
 * Tab ka "abhi yahan hain" wala nishan CSS se nahi aata — layout server component hai
 * aur pathname yahan nahi milta. Halka rang dono par, aur hover par ubhaar: is chhoti
 * si navigation mein active state ke liye poora client component banana zyada mehnga hai.
 */
function PortalTab({
  href,
  label,
  Icon,
}: {
  href: '/supplier/orders' | '/supplier/stock'
  label: string
  Icon: (props: { className?: string }) => React.ReactElement
}) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-tap items-center gap-2 rounded-t-card px-4 py-2 text-sm font-semibold text-white/70 transition hover:bg-white/10 hover:text-white"
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  )
}
