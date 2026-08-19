import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { STATUS_PACK_TEMPLATES, formatPkr } from '@oyebazar/shared'
import { StatusPackStudio } from '@/components/status-pack-studio'
import { ChevronIcon } from '@/components/icons'
import { toResellerProductDetailDTO } from '@/lib/api/mappers'
import { requireReseller } from '@/lib/api/session'
import { container } from '@/lib/container'
import { pickName, translator } from '@/lib/i18n'
import { getLocale } from '@/lib/i18n-server'

export const metadata: Metadata = { title: 'Product' }
export const dynamic = 'force-dynamic'

/**
 * ⭐ Product page = Content Studio.
 *
 * Ye screen hamara asal product hai. Yahan se Sadia teen tap mein status pack le kar
 * WhatsApp par chali jati hai: rate → design → download.
 *
 * Bari screen par do column: baen taraf tasveer aur maal ki tafseel, daen taraf studio.
 * Pehle tasveer poori chaurai leti thi aur 3:4 nisbat par computer par itni lambi ho
 * jati thi ke studio — jo asal kaam hai — screen se hi bahar chala jata tha.
 *
 * Nazar ka safar jaan boojh kar: tasveer → rate aur munafa → "pack banayen".
 */
export default async function ProductPage({
  params,
}: {
  params: Promise<{ productId: string }>
}) {
  const { reseller } = await requireReseller()
  const { productId } = await params
  const locale = await getLocale()
  const t = translator(locale)

  const item = await container.catalogue.getById(reseller.id, productId).catch(() => null)
  if (!item) notFound()

  const product = toResellerProductDetailDTO(item)
  const title = locale === 'ur' ? product.titleUr : product.titleEn

  // Reseller ka apna rate na ho to tajweez kardah — munafa isi par dikhta hai
  const myPrice = product.myRetailPrice ?? product.suggestedRetail
  const margin = myPrice - product.bajiPrice

  return (
    <div className="space-y-6">
      <Link
        href="/catalogue"
        className="link-tap inline-flex items-center gap-1 text-sm font-semibold text-ink-soft hover:text-brand-700"
      >
        <ChevronIcon className="h-4 w-4 rotate-180 rtl:rotate-0" />
        {t('catalogue')}
      </Link>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        {/* Baen: maal */}
        <div className="space-y-5">
          <div className="card overflow-hidden">
            {product.coverImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- storage URLs; next/image Phase 2
              <img
                src={product.coverImageUrl}
                alt={title}
                // max-h: bari screen par tasveer ko poora safha khane se rokta hai
                className="max-h-[26rem] w-full object-cover"
              />
            ) : (
              <div className="aspect-[4/3] w-full bg-paper-sunken" />
            )}

            <div className="space-y-3 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[0.78rem] font-semibold uppercase tracking-wider text-ink-faint">
                    {pickName(locale, product.category)}
                  </p>
                  <h1 className="mt-1 text-[1.3rem] font-bold leading-snug">{title}</h1>
                </div>

                <span
                  className={
                    product.inStock
                      ? 'badge bg-accent-50 text-accent-700'
                      : 'badge bg-coal-900 text-white'
                  }
                >
                  {product.inStock ? t('inStock') : t('outOfStock')}
                </span>
              </div>

              {product.descriptionUr && locale === 'ur' && (
                <p className="text-[0.9rem] leading-relaxed text-ink-soft">
                  {product.descriptionUr}
                </p>
              )}

              {!product.inStock && (
                <p className="rounded-card bg-brand-50 p-3 text-sm text-brand-800">
                  {t('outOfStockWarning')}
                </p>
              )}
            </div>
          </div>

          {/* Paise ka khulasa — teen number, ek nazar */}
          <div className="card grid grid-cols-3 divide-x divide-black/[0.05] rtl:divide-x-reverse">
            <Figure label={t('yourCost')} value={formatPkr(product.bajiPrice)} />
            <Figure label={t('yourPrice')} value={formatPkr(myPrice)} />
            <Figure
              label={t('yourProfit')}
              value={formatPkr(Math.max(margin, 0))}
              tone={margin > 0 ? 'good' : 'plain'}
            />
          </div>

          {/* Customer se baat ho chuki ho to yahan se order lagta hai */}
          <Link href={`/orders/new/${product.id}`} className="btn-secondary w-full">
            {t('placeOrderForItem')}
          </Link>
        </div>

        {/* Daen: studio — bari screen par saath saath, chhoti par neeche */}
        <StatusPackStudio
          productId={product.id}
          // Sirf tasveerein — video par pack nahi banta
          images={product.media
            .filter((item) => item.type === 'IMAGE')
            .map((item) => ({ id: item.id, url: item.url }))}
          bajiPrice={product.bajiPrice}
          suggestedRetail={product.suggestedRetail}
          myRetailPrice={product.myRetailPrice}
          templates={[...STATUS_PACK_TEMPLATES]}
          locale={locale}
        />
      </div>
    </div>
  )
}

function Figure({
  label,
  value,
  tone = 'plain',
}: {
  label: string
  value: string
  tone?: 'plain' | 'good'
}) {
  return (
    <div className="px-4 py-4 text-center">
      <p className="text-[0.72rem] text-ink-faint">{label}</p>
      <p
        dir="ltr"
        className={`numeric mt-1 font-bold ${tone === 'good' ? 'text-accent-700' : ''}`}
      >
        {value}
      </p>
    </div>
  )
}
