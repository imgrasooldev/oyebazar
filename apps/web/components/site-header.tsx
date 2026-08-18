import Link from 'next/link'
import { BRAND } from '@oyebazar/shared'
import { LanguageToggle } from '@/components/language-toggle'
import { SearchSuggest } from '@/components/search-suggest'
import { translator, type Locale } from '@/lib/i18n'

/**
 * Public header.
 *
 * · Upar patli gehri patti — brand ka rang, magar bhaari nahi.
 * · Neeche kaghaz par tairta hua search — border nahi, narm parchhain.
 * · Scroll par backdrop blur, taake content neeche se jhalke (flat safed patti purani lagti hai).
 *
 * Mobile par search apni alag line mein jata hai — ek hi row mein wo itna chhota reh
 * jata hai ke likha hua nazar nahi aata.
 */
export function SiteHeader({
  loggedIn,
  locale,
  query,
}: {
  loggedIn: boolean
  locale: Locale
  query?: string
}) {
  const t = translator(locale)

  return (
    <header className="sticky top-0 z-30">
      <div className="bg-coal-900 text-white/90">
        <div className="mx-auto flex max-w-shell items-center justify-between gap-3 px-5 py-1 text-[0.75rem] lg:px-8">
          {/*
            min-w-0 lazmi hai: truncate tab hi chalta hai jab flex item ko sikurne ki
            ijazat ho. Ye na ho to teen zabanon ka switcher patti ko 360px se bahar
            dhakel deta hai (mobile audit ne 28px overflow pakra tha).
          */}
          <p className="min-w-0 truncate">{t('brandTagline')}</p>
          <div className="flex shrink-0 items-center gap-3">
            <span className="hidden sm:inline">{t('noOrderButton')}</span>
            <span className="hidden text-white/30 sm:inline">•</span>
            <span className="hidden sm:inline">{t('directoryFree')}</span>
            <LanguageToggle locale={locale} />
          </div>
        </div>
      </div>

      <div className="border-b border-black/[0.05] bg-paper/85 backdrop-blur-xl">
        <div className="mx-auto max-w-shell px-5 lg:px-8 py-3">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex min-h-tap shrink-0 flex-col justify-center leading-none"
            >
              <span className="block text-[1.35rem] font-bold text-brand-800">
                {locale === 'ur' ? BRAND.nameUr : BRAND.name}
              </span>
              {/* Domain sirf desktop par — mobile par ye itna chhota hota hai ke parha
                  hi nahi jata, aur jagah bhi khaata hai */}
              <span className="mt-1 hidden text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-ink-faint sm:block">
                {BRAND.domain}
              </span>
            </Link>

            <SearchSuggest
              locale={locale}
              source="public"
              action="/bazaar"
              defaultValue={query ?? ''}
              className="hidden flex-1 sm:block"
            />

            <Link
              href={loggedIn ? '/catalogue' : '/login'}
              className="btn-secondary ms-auto shrink-0 !px-5 !py-2.5 !text-sm sm:ms-0"
            >
              {loggedIn ? t('myCatalogue') : t('resellerLogin')}
            </Link>
          </div>

          {/* Mobile par search apni line mein — ek row mein wo itna chhota reh jata hai
              ke likha hua nazar nahi aata */}
          <SearchSuggest
            locale={locale}
            source="public"
            action="/bazaar"
            defaultValue={query ?? ''}
            className="mt-3 sm:hidden"
          />
        </div>
      </div>
    </header>
  )
}
