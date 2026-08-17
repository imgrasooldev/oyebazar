'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { LOCALE_COOKIE, type Locale } from '@/lib/i18n'

/**
 * زبان بدلیں / Change language.
 *
 * Cookie set kar ke page dobara server se aata hai — is se `dir` aur saare jumle
 * ek saath badalte hain, aur URL wohi rehta hai (WhatsApp par share kiya hua link
 * dono zubanon mein khulta hai).
 */
export function LanguageToggle({ locale }: { locale: Locale }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const next: Locale = locale === 'ur' ? 'en' : 'ur'

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(() => {
          // 1 saal — zaban ka faisla har baar dobara na poochha jaye
          document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${365 * 24 * 3600}; samesite=lax`
          router.refresh()
        })
      }
      // min-h-tap: ungli se lagne wala size. 23px ka button sasta phone par miss hota hai.
      className="inline-flex min-h-tap items-center rounded-pill border border-white/40 px-3 text-xs font-semibold text-white transition hover:bg-white/10"
      aria-label={next === 'en' ? 'Switch to English' : 'اردو میں دیکھیں'}
    >
      {next === 'en' ? 'English' : 'اردو'}
    </button>
  )
}
