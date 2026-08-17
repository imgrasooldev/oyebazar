import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BRAND } from '@oyebazar/shared'
import { getResellerOrNull } from '@/lib/api/session'
import { LanguageToggle } from '@/components/language-toggle'
import { LogoutButton } from '@/components/logout-button'
import { translator } from '@/lib/i18n'
import { getLocale } from '@/lib/i18n-server'

export const dynamic = 'force-dynamic'

/**
 * APP zone (login ke baad) — yahan price dikhta hai aur Content Studio chalta hai.
 *
 * 🔴 Logout button HAR screen par mojood hai — shared phone rule. Ye design choice nahi,
 *    security requirement hai (28% aurtein doosre ka phone use karti hain).
 *
 * Neeche ki patti (bottom nav) mobile app jaisi hai — teen kaam, teen tap.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [actor, locale] = await Promise.all([getResellerOrNull(), getLocale()])
  if (!actor) redirect('/login')

  const t = translator(locale)

  return (
    <div className="min-h-screen bg-paper-sunken pb-20">
      <header className="sticky top-0 z-20 bg-white shadow-sm">
        <div className="mx-auto flex max-w-shell items-center justify-between gap-3 px-4 py-3">
          <Link href="/catalogue" className="leading-tight">
            <span className="block text-xl font-bold text-brand-700">
              {locale === 'ur' ? BRAND.nameUr : BRAND.name}
            </span>
            <span className="block text-[10px] text-ink-faint">{t('resellerPortal')}</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-ink-soft sm:inline">{actor.reseller.name}</span>
            <div className="rounded bg-brand-700 px-1 py-0.5">
              <LanguageToggle locale={locale} />
            </div>
            <LogoutButton label={t('logout')} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-shell px-4 py-5">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-black/[0.06] bg-white">
        <div className="mx-auto grid max-w-shell grid-cols-3">
          <BottomLink href="/catalogue" label={t('catalogue')} />
          <BottomLink href="/orders" label={t('orders')} />
          <BottomLink href="/bazaar" label={t('bazaar')} />
        </div>
      </nav>
    </div>
  )
}

function BottomLink({ href, label }: { href: '/catalogue' | '/orders' | '/bazaar'; label: string }) {
  return (
    <Link
      href={href}
      className="flex min-h-tap items-center justify-center py-3 text-sm font-semibold text-ink-soft hover:text-brand-700"
    >
      {label}
    </Link>
  )
}
