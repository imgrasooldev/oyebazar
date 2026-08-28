'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { LOCALES, LOCALE_COOKIE, LOCALE_LABEL, type Locale } from '@/lib/i18n'

/**
 * زبان بدلیں / Zaban badlen / Change language.
 *
 * Cookie set kar ke page dobara server se aata hai — is se `dir`, font aur saare jumle
 * ek saath badalte hain, aur URL wohi rehta hai (WhatsApp par share kiya hua link
 * teenon zubanon mein khulta hai).
 *
 * Teen zubanein hain, is liye ab "agli zaban" wala toggle nahi: chhoti si patti mein
 * teeno saath dikhti hain. Toggle par user ko do bar dabana parta aur ye pata nahi
 * chalta ke teesri zaban mojood bhi hai — Roman Urdu ka to poora faida hi yehi hai
 * ke us ki mojoodgi nazar aaye.
 */
export function LanguageToggle({ locale }: { locale: Locale }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function choose(next: Locale) {
    if (next === locale) return
    startTransition(() => {
      // 1 saal — zaban ka faisla har baar dobara na poochha jaye
      document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${365 * 24 * 3600}; samesite=lax`
      router.refresh()
    })
  }

  return (
    <div
      role="group"
      aria-label="Language"
      className="inline-flex items-center gap-0.5 rounded-pill p-0.5"
    >
      {LOCALES.map((option) => {
        const active = option === locale

        return (
          <button
            key={option}
            type="button"
            disabled={pending}
            onClick={() => choose(option)}
            aria-current={active ? 'true' : undefined}
            /*
              min-h-tap: ungli se lagne wala size. 23px ka button sasta phone par miss
              hota hai.

              🔴 Magar `lg:` par ye hadd uthh jati hai. 44px ka sabab UNGLI hai; bari
              screen par mouse chal raha hota hai jo pixel par lagta hai. Wahan yehi hadd
              patti ko be-wajah mota kar deti thi — teen zubanein 169×48px kha jati thin,
              jabke kaam is se kafi kam mein ho jata hai.
            */
            className={`inline-flex min-h-tap items-center rounded-pill px-2.5 text-xs font-semibold transition disabled:opacity-60 lg:min-h-0 lg:px-1.5 lg:py-0.5 lg:text-[0.68rem] ${
              active ? 'bg-white text-coal-900' : 'text-white/70 hover:bg-white/10 hover:text-white'
            }`}
          >
            {LOCALE_LABEL[option]}
          </button>
        )
      })}
    </div>
  )
}
