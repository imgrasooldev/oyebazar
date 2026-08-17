import Link from 'next/link'
import type { Metadata } from 'next'
import { DEFAULT_TEMPLATE_KEY, formatPkr } from '@oyebazar/shared'
import { toResellerProductListItemDTO } from '@/lib/api/mappers'
import { requireReseller } from '@/lib/api/session'
import { container } from '@/lib/container'
import { translator } from '@/lib/i18n'
import { getLocale } from '@/lib/i18n-server'

export const metadata: Metadata = { title: 'Catalogue' }
export const dynamic = 'force-dynamic'

/**
 * Reseller catalogue — login ke baad.
 *
 * Upar "آج کا پیک" (wohi 5 items jo subah broadcast hue), neeche poora maal.
 * Har card par SEEDHA "اسٹیٹس پیک بنائیں" — yehi asal kaam hai.
 */
export default async function CataloguePage() {
  const { reseller } = await requireReseller()
  const locale = await getLocale()
  const t = translator(locale)

  const [page, dailyPacks] = await Promise.all([
    container.catalogue.list(reseller.id, { limit: 24 }),
    container.dailyDrops.packsForReseller(reseller.id, DEFAULT_TEMPLATE_KEY),
  ])
  const items = page.items.map(toResellerProductListItemDTO)

  return (
    <div className="space-y-6">
      {dailyPacks.length > 0 && (
        <section className="card border-brand-200 bg-brand-50 p-4">
          <h2 className="text-lg font-bold">{t('todaysPack')}</h2>
          <p className="mt-1 text-sm text-ink-soft">
            {dailyPacks.filter((pack) => pack.imageUrl).length} {t('packsReady')}
          </p>

          <ul className="rail mt-3">
            {dailyPacks.map((pack) => (
              <li key={pack.productId} className="w-32 shrink-0">
                <Link href={`/catalogue/${pack.productId}`} className="block">
                  {pack.imageUrl ?? pack.coverImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- storage URLs
                    <img
                      src={pack.imageUrl ?? pack.coverImageUrl ?? ''}
                      alt={pack.titleUr}
                      loading="lazy"
                      className="aspect-[9/16] w-full rounded-lg object-cover"
                    />
                  ) : (
                    <div className="aspect-[9/16] w-full rounded-lg bg-paper-sunken" />
                  )}
                  <p className="mt-1 truncate text-xs">{pack.titleUr}</p>
                  <p dir="ltr" className="text-xs font-semibold">
                    {formatPkr(pack.myPrice)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="section-head">
        <h1 className="section-title">{t('allStock')}</h1>
        <span className="text-sm text-ink-faint">
          {items.length} {t('items')}
        </span>
      </div>

      {items.length === 0 ? (
        <p className="card p-6 text-ink-soft">{t('noItemsListed')}</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => {
            const title = locale === 'ur' ? item.titleUr : item.titleEn
            return (
              <li key={item.id} className="tile group">
                <Link href={`/catalogue/${item.id}`} className="block">
                  {item.coverImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- storage URLs
                    <img
                      src={item.coverImageUrl}
                      alt={title}
                      loading="lazy"
                      className="aspect-square w-full object-cover"
                    />
                  ) : (
                    <div className="aspect-square w-full bg-paper-sunken" />
                  )}
                </Link>

                <div className="space-y-1 p-3">
                  <p className="line-clamp-2 text-sm font-semibold leading-relaxed">{title}</p>

                  {/* Baji price = reseller ki lagat. Naam ke bajaye kaam likhte hain. */}
                  <p className="text-sm text-ink-soft">
                    {t('yourCost')}: <span dir="ltr">{formatPkr(item.bajiPrice)}</span>
                  </p>
                  <p className="text-xs text-ink-faint">
                    {t('yourPrice')}:{' '}
                    <span dir="ltr">{formatPkr(item.myRetailPrice ?? item.suggestedRetail)}</span>
                    {item.myRetailPrice === null && ` (${t('suggested')})`}
                  </p>

                  {!item.inStock && <p className="text-xs text-red-600">{t('outOfStock')}</p>}

                  <Link
                    href={`/catalogue/${item.id}`}
                    className="btn-primary mt-2 w-full !py-2 text-sm"
                  >
                    {t('makeStatusPack')}
                  </Link>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
