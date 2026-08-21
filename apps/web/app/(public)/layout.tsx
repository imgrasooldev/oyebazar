import { RouteProgress } from '@/components/route-progress'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { getResellerOrNull } from '@/lib/api/session'
import { getLocale } from '@/lib/i18n-server'

/**
 * PUBLIC zone (logged-out).
 *
 * 🔴 Yahan koi price, koi order button, koi fee nahi. Ye qanooni tahaffuz hai:
 * Sales Tax Act 2(18A) ki "online marketplace" tareef fee AUR digital orders — dono
 * par poori hoti hai. Bazaar dono par bahar hai. Is layout ke andar order UI na banayen.
 */
export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const [actor, locale] = await Promise.all([getResellerOrNull(), getLocale()])

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      {/* Click ka foran jawab — Bazaar ke safhe sab se bhaari hain (tasveerein) */}
      <RouteProgress />

      <SiteHeader loggedIn={actor !== null} locale={locale} />
      <main className="flex-1">{children}</main>
      <SiteFooter locale={locale} />
    </div>
  )
}
