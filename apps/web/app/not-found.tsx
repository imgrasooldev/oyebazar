import Link from 'next/link'
import { translator } from '@/lib/i18n'
import { getLocale } from '@/lib/i18n-server'

/**
 * 404.
 *
 * App Router mein ye page na ho to Next purane pages-router `_error` par girta hai —
 * jo is app mein build hi tor deta hai (`<Html> should not be imported...`). Aur us se
 * bara masla: mara hua link kholne wali reseller ko angrezi ka sada safha milta hai.
 * Yahan se wo ek tap mein wapas bazaar ja sakti hai.
 */
export default async function NotFound() {
  const locale = await getLocale()
  const t = translator(locale)

  return (
    <main className="flex min-h-[70vh] items-center justify-center px-5 py-16">
      <div className="card w-full max-w-md p-8 text-center">
        <p dir="ltr" className="numeric text-5xl font-black text-brand-500">
          404
        </p>
        <h1 className="mt-4 text-[1.3rem] font-bold tracking-tight">{t('notFoundTitle')}</h1>
        <p className="mt-2 text-[0.95rem] leading-relaxed text-ink-soft">{t('notFoundBody')}</p>

        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link href="/bazaar" className="btn-primary">
            {t('goToBazaar')}
          </Link>
          <Link href="/" className="btn-ghost">
            {t('goHome')}
          </Link>
        </div>
      </div>
    </main>
  )
}
