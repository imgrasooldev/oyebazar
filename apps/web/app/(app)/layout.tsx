import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BRAND } from '@oyebazar/shared'
import { getResellerOrNull } from '@/lib/api/session'
import { LanguageToggle } from '@/components/language-toggle'
import { Avatar } from '@/components/avatar'
import { LogoutButton } from '@/components/logout-button'
import { RouteProgress } from '@/components/route-progress'
import { PortalSidebar } from '@/components/portal-sidebar'
import { GridIcon, ListIcon, MoneyIcon, SparkIcon, StoreIcon } from '@/components/icons'
import { translator } from '@/lib/i18n'
import { getLocale } from '@/lib/i18n-server'

export const dynamic = 'force-dynamic'

/**
 * APP zone (login ke baad) — yahan price dikhta hai aur Content Studio chalta hai.
 *
 * Do shakl, ek code:
 *  · Phone par — neeche patti, app jaisi. Sadia ka poora kaam angoothe se hota hai.
 *  · Computer par — side mein nav aur upar khata (dashboard jaisa). Bari screen par
 *    neeche ki patti ajeeb lagti hai aur beech ka poora area zaya jata hai.
 *
 * 🔴 Logout HAR screen par mojood hai — shared phone rule. Ye design choice nahi,
 *    security requirement hai (28% aurtein doosre ka phone use karti hain).
 */
const NAV = [
  { href: '/dashboard', key: 'dashboard', Icon: SparkIcon },
  { href: '/catalogue', key: 'catalogue', Icon: GridIcon },
  { href: '/orders', key: 'orders', Icon: ListIcon },
  { href: '/money', key: 'moneyNav', Icon: MoneyIcon },
  { href: '/bazaar', key: 'bazaar', Icon: StoreIcon },
] as const

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [actor, locale] = await Promise.all([getResellerOrNull(), getLocale()])
  if (!actor) redirect('/login')

  const t = translator(locale)
  const label = (key: (typeof NAV)[number]['key']) =>
    key === 'dashboard' ? t('dashboardNav') : t(key)

  return (
    <div className="min-h-screen bg-paper pb-24 lg:pb-0">
      {/* Click ka foran jawab — dekhen RouteProgress */}
      <RouteProgress />

      <header className="sticky top-0 z-30 border-b border-black/[0.05] bg-paper/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-shell items-center justify-between gap-3 px-5 py-3 lg:px-8">
          <Link href="/dashboard" className="flex min-h-tap flex-col justify-center leading-none">
            <span className="text-[1.25rem] font-bold text-brand-700">
              {locale === 'ur' ? BRAND.nameUr : BRAND.name}
            </span>
            <span className="mt-1 text-[0.7rem] text-ink-faint">{t('resellerPortal')}</span>
          </Link>

          <div className="flex items-center gap-2">
            {/*
              Apna nishan aur naam — shared phone par pehla sawal yehi hota hai ke abhi
              kaun logged in hai (aur ye 28% ghar hain). Nishan phone par bhi rehta hai,
              naam sirf bari screen par jahan jagah hai.
            */}
            <Link
              href="/dashboard"
              className="flex min-h-tap items-center gap-2 rounded-pill px-1.5 transition hover:bg-paper-sunken"
              title={actor.reseller.name}
            >
              <Avatar name={actor.reseller.name} size="sm" />
              <span className="hidden max-w-[10rem] truncate text-sm font-semibold text-ink sm:inline">
                {actor.reseller.name}
              </span>
            </Link>
            <span className="rounded-pill bg-coal-900 px-1">
              <LanguageToggle locale={locale} />
            </span>
            <LogoutButton label={t('logout')} />
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-shell gap-8 px-5 py-6 lg:px-8">
        {/* Side nav sirf bari screen par — phone par neeche wali patti kaam karti hai */}
        <aside className="hidden shrink-0 lg:block">
          <PortalSidebar
            storageKey="oyebazar_reseller_nav"
            items={NAV.map((item) => ({
              href: item.href,
              label: label(item.key),
              icon: <item.Icon className="h-5 w-5" />,
            }))}
            labels={{ collapse: t('navCollapse'), expand: t('navExpand') }}
          />
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>

      {/*
        Neeche ki patti — mobile app jaisi. Chaar kaam, chaar tap.
        `pb-[env(safe-area-inset-bottom)]`: iPhone ke home bar ke peechay na chhupe.
      */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-black/[0.06] bg-paper-raised/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
        <div className="mx-auto grid max-w-shell grid-cols-4">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex min-h-tap flex-col items-center justify-center gap-1 py-2.5 text-[0.72rem] font-semibold text-ink-faint transition hover:bg-brand-50 hover:text-brand-700"
            >
              <item.Icon className="h-5 w-5" />
              {label(item.key)}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  )
}
