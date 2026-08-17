import Link from 'next/link'
import type { CategoryView } from '@oyebazar/core'
import { pickName, translator, type Locale } from '@/lib/i18n'

/** Categories ki patti — mobile par swipe hoti hai, desktop par ek line. */
export function CategoryStrip({
  categories,
  locale,
  active,
  basePath = '/bazaar',
}: {
  categories: CategoryView[]
  locale: Locale
  active?: string
  /** typedRoutes: sirf wo raaste jahan category filter kaam karta hai */
  basePath?: '/bazaar' | '/catalogue'
}) {
  if (categories.length === 0) return null
  const t = translator(locale)

  return (
    <nav className="bg-paper">
      <div className="mx-auto max-w-shell px-5 lg:px-8">
        <div className="rail py-4">
          <Link href={basePath} className={active ? 'chip' : 'chip chip-active'}>
            {t('all')}
          </Link>
          {categories.map((category) => (
            <Link
              key={category.slug}
              href={{ pathname: basePath, query: { category: category.slug } }}
              className={active === category.slug ? 'chip chip-active' : 'chip'}
            >
              {pickName(locale, category)}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  )
}
