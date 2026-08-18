import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BRAND } from '@oyebazar/shared'
import { getResellerOrNull } from '@/lib/api/session'
import { LanguageToggle } from '@/components/language-toggle'
import { LogoutButton } from '@/components/logout-button'
import { GridIcon, ListIcon, StoreIcon } from '@/components/icons'
import { translator } from '@/lib/i18n'
import { getLocale } from '@/lib/i18n-server'

export const dynamic = 'force-dynamic'

/**
 * APP zone (login ke baad) — yahan price dikhta hai aur Content Studio chalta hai.
 *
 * Public site ke bar-aks yahan chrome kam hai: koi search patti nahi, koi footer nahi.
 * Sadia yahan browse karne nahi, ek kaam karne aati hai — aur jaldi nikalna chahti hai.
 *
 * 🔴 Logout HAR screen par mojood hai — shared phone rule. Ye design choice nahi,
 *    security requirement hai (28% aurtein doosre ka phone use karti hain).
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [actor, locale] = await Promise.all([getResellerOrNull(), getLocale()])
  if (!actor) redirect('/login')

  const t = translator(locale)

  return (
    <div className="min-h-screen bg-paper pb-24">
      <header className="sticky top-0 z-30 border-b border-black/[0.05] bg-paper/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-shell items-center justify-between gap-3 px-5 py-3 lg:px-8">
          <Link href="/catalogue" className="flex min-h-tap flex-col justify-center leading-none">
            <span className="text-[1.25rem] font-bold text-brand-700">
              {locale === 'ur' ? BRAND.nameUr : BRAND.name}
            </span>
            <span className="mt-1 text-[0.7rem] text-ink-faint">{t('resellerPortal')}</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="hidden max-w-[10rem] truncate text-sm text-ink-soft sm:inline">
              {actor.reseller.name}
            </span>
            <span className="rounded-pill bg-coal-900 px-1">
              <LanguageToggle locale={locale} />
            </span>
            <LogoutButton label={t('logout')} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-shell px-5 py-6 lg:px-8">{children}</main>

      {/*
        Neeche ki patti — mobile app jaisi. Teen kaam, teen tap.
        `pb-[env(safe-area-inset-bottom)]`: iPhone ke home bar ke peechay na chhupe.
      */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-black/[0.06] bg-paper-raised/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
        <div className="mx-auto grid max-w-shell grid-cols-3">
          <BottomLink href="/catalogue" label={t('catalogue')} Icon={GridIcon} />
          <BottomLink href="/orders" label={t('orders')} Icon={ListIcon} />
          <BottomLink href="/bazaar" label={t('bazaar')} Icon={StoreIcon} />
        </div>
      </nav>
    </div>
  )
}

function BottomLink({
  href,
  label,
  Icon,
}: {
  href: '/catalogue' | '/orders' | '/bazaar'
  label: string
  Icon: (props: { className?: string }) => React.ReactElement
}) {
  return (
    <Link
      href={href}
      className="flex min-h-tap flex-col items-center justify-center gap-1 py-2.5 text-[0.72rem] font-semibold text-ink-faint transition hover:bg-brand-50 hover:text-brand-700"
    >
      <Icon className="h-5 w-5" />
      {label}
    </Link>
  )
}
