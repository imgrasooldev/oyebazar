import Link from 'next/link'
import { BRAND } from '@oyebazar/shared'
import { Avatar } from '@/components/avatar'
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
  locale,
  query,
  reseller,
  supplier,
}: {
  locale: Locale
  query?: string
  /**
   * Logged-in banda kaun hai.
   *
   * 🔴 Pehle header ko sirf itna pata tha ke koi logged in hai (`loggedIn`), kaun hai ye
   * nahi. Natija: apni hi site par banda anjaan lagta tha — "Reseller login" ki jagah
   * "My catalogue" likha aa jata tha aur bas. Apna naam dikhna sirf sajawat nahi: shared
   * phone par (aur ye 28% ghar hain) ye pehla sawal hota hai — abhi kaun logged in hai.
   */
  reseller?: { name: string } | undefined
  /** Dukan ka logo mojood hota hai, is liye wahan asli logo aata hai */
  supplier?: { businessName: string; logoUrl: string | null } | undefined
}) {
  const t = translator(locale)

  return (
    <header className="sticky top-0 z-30">
      {/* Dhalta hua chrome — flat gehra rang safhe ke upar patti jaisa lagta hai */}
      <div className="bg-gradient-to-r from-coal-950 via-coal-900 to-coal-950 text-white/90">
        <div className="mx-auto flex max-w-shell items-center justify-between gap-3 px-5 py-1 text-[0.75rem] lg:px-8">
          {/*
            min-w-0 lazmi hai: truncate tab hi chalta hai jab flex item ko sikurne ki
            ijazat ho. Ye na ho to teen zabanon ka switcher patti ko 360px se bahar
            dhakel deta hai (mobile audit ne 28px overflow pakra tha).
          */}
          <p className="min-w-0 truncate">{t('brandTagline')}</p>
          <div className="flex shrink-0 items-center gap-3">
            {/*
              Wholesaler ka darwaza. Footer mein bhi hai, magar footer tak har koi nahi
              pohanchta — aur dukan wale ke liye ye ek hi cheez hai jo usay yahan chahiye.
            */}
            {/*
              Dukan wala pehle se andar ho to usay "login" dikhana bemani hai — usay
              apna portal chahiye. Ye wohi jumla hai jo us ne abhi abhi karke aaya hai.
            */}
            <Link
              href={supplier ? '/supplier/dashboard' : '/supplier/login'}
              className="hidden link-tap sm:inline"
            >
              {supplier ? t('wholesalerPortal') : t('wholesalerLogin')}
            </Link>
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
              <span className="block font-nastaliq text-[1.35rem] font-bold text-brand-800">
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
              /*
                Enter dabane par MAAL ki list — dukanon ki nahi.
                "bachon ke kapre" likhne wali reseller maal dhoond rahi hai; `/bazaar`
                dukanon ke naam par chhanta hai, is liye us par jawab hamesha khali aata
                tha. Dukan wali chhanni apni jagah mojood hai (Bazaar ka apna safha).
              */
              action="/bazaar/items"
              defaultValue={query ?? ''}
              className="hidden flex-1 sm:block"
            />

            {reseller ? (
              /*
                Apna naam aur nishan — dashboard ka rasta.
                Naam sirf bari screen par: phone par wo search ki jagah kha jata hai,
                aur wahan nishan hi pehchan ke liye kaafi hai.
              */
              <span className="ms-auto flex shrink-0 items-center gap-2 sm:ms-0">
                <Link
                  href="/dashboard"
                  className="flex min-h-tap items-center gap-2 rounded-pill px-2 transition hover:bg-paper-sunken"
                  title={reseller.name}
                >
                  <Avatar name={reseller.name} size="sm" />
                  <span className="hidden max-w-[9rem] truncate text-sm font-semibold lg:inline">
                    {reseller.name}
                  </span>
                </Link>

                <Link href="/catalogue" className="btn-secondary shrink-0 !px-4 !py-2.5 !text-sm">
                  {t('myCatalogue')}
                </Link>
              </span>
            ) : supplier ? (
              /* Dukan wala Bazaar par aaya ho — us ka apna rasta, reseller wala nahi */
              <Link
                href="/supplier/dashboard"
                className="ms-auto flex min-h-tap shrink-0 items-center gap-2 rounded-pill px-2 transition hover:bg-paper-sunken sm:ms-0"
                title={supplier.businessName}
              >
                <Avatar name={supplier.businessName} imageUrl={supplier.logoUrl} size="sm" />
                <span className="hidden max-w-[10rem] truncate text-sm font-semibold lg:inline">
                  {supplier.businessName}
                </span>
              </Link>
            ) : (
              <Link
                href="/login"
                className="btn-secondary ms-auto shrink-0 !px-5 !py-2.5 !text-sm sm:ms-0"
              >
                {t('resellerLogin')}
              </Link>
            )}
          </div>

          {/* Mobile par search apni line mein — ek row mein wo itna chhota reh jata hai
              ke likha hua nazar nahi aata */}
          <SearchSuggest
            locale={locale}
            source="public"
            action="/bazaar/items"
            defaultValue={query ?? ''}
            className="mt-3 sm:hidden"
          />
        </div>
      </div>
    </header>
  )
}
