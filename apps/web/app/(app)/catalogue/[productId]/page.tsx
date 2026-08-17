import Link from 'next/link'
import { notFound } from 'next/navigation'
import { STATUS_PACK_TEMPLATES } from '@oyebazar/shared'
import { StatusPackStudio } from '@/components/status-pack-studio'
import { toResellerProductDetailDTO } from '@/lib/api/mappers'
import { requireReseller } from '@/lib/api/session'
import { container } from '@/lib/container'
import { pickName, translator } from '@/lib/i18n'
import { getLocale } from '@/lib/i18n-server'

export const dynamic = 'force-dynamic'

/**
 * ⭐ Product page = Content Studio.
 *
 * Ye screen hamara asal product hai. Yahan se Sadia 3 tap mein status pack le kar
 * WhatsApp par chali jati hai: ریٹ → ٹیمپلیٹ → بنائیں → ڈاؤن لوڈ.
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

  return (
    <div className="space-y-5">
      <div className="card overflow-hidden">
        {product.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- storage URLs; next/image Phase 2
          <img src={product.coverImageUrl} alt={title} className="aspect-[3/4] w-full object-cover" />
        ) : (
          <div className="aspect-[3/4] w-full bg-paper-sunken" />
        )}
        <div className="p-4">
          <h1 className="text-xl font-bold">{title}</h1>
          <p className="mt-1 text-sm text-ink-faint">{pickName(locale, product.category)}</p>
          {product.descriptionUr && locale === 'ur' && (
            <p className="mt-3 text-sm text-ink-soft">{product.descriptionUr}</p>
          )}
          {!product.inStock && (
            <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {t('outOfStockWarning')}
            </p>
          )}
        </div>
      </div>

      <StatusPackStudio
        productId={product.id}
        bajiPrice={product.bajiPrice}
        suggestedRetail={product.suggestedRetail}
        myRetailPrice={product.myRetailPrice}
        templates={[...STATUS_PACK_TEMPLATES]}
        locale={locale}
      />

      {/* Customer se baat ho chuki ho to yahan se order lagta hai */}
      <Link href={`/orders/new/${product.id}`} className="btn-secondary w-full">
        {t('placeOrderForItem')}
      </Link>
    </div>
  )
}
