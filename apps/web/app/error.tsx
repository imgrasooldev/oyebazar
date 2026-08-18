'use client'

import { useEffect } from 'react'
import { translator, type Locale } from '@/lib/i18n'

/**
 * Route-level error boundary — layout (header/nav) apni jagah rehta hai, sirf safhay ka
 * andar wala hissa error dikhata hai. Is tarah user phansta nahi, upar wale links zinda hain.
 */
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    // Server ka asli sabab logger mein hai; yahan sirf digest — production mein
    // Next stack chhupa deta hai, digest hi dono taraf jodne ka zariya hai.
    console.error('page_error', (error as Error & { digest?: string }).digest ?? error.message)
  }, [error])

  const locale: Locale =
    typeof document !== 'undefined' && document.documentElement.lang === 'en' ? 'en' : 'ur'
  const t = translator(locale)

  return (
    <div className="flex min-h-[50vh] items-center justify-center px-5 py-12">
      <div className="card w-full max-w-md p-8 text-center">
        <h1 className="text-[1.25rem] font-bold tracking-tight">{t('errorTitle')}</h1>
        <p className="mt-2 text-[0.95rem] leading-relaxed text-ink-soft">{t('errorBody')}</p>
        <button type="button" onClick={reset} className="btn-primary mt-7">
          {t('tryAgain')}
        </button>
      </div>
    </div>
  )
}
