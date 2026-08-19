import type { Metadata } from 'next'
import { formatPkr } from '@oyebazar/shared'
import { SupplierAddProduct } from '@/components/supplier-add-product'
import { SupplierStockQuantity } from '@/components/supplier-stock-quantity'
import { SupplierStockToggle } from '@/components/supplier-stock-toggle'
import { requireSupplier } from '@/lib/api/supplier-session'
import { container } from '@/lib/container'
import { translator } from '@/lib/i18n'
import { getLocale } from '@/lib/i18n-server'

export const metadata: Metadata = {
  title: 'Stock',
  robots: { index: false, follow: false },
}
export const dynamic = 'force-dynamic'

/**
 * Apna maal — stock on/off.
 *
 * Ye portal ka asal kaam hai. Maal khatam hone par listing LIVE reh jaye to resellers
 * us ke status lagati rehti hain, customer order karta hai, aur akhir mein RTO ban kar
 * sab ka nuqsan hota hai. Is liye switch har row par sab se numaya cheez hai.
 *
 * Har row par "is par chal rahe order" bhi likha hai — band karne se pehle wholesaler
 * ko dikhna chahiye ke kitne wade pehle se ho chuke hain.
 */
export default async function SupplierStockPage() {
  const { supplier } = await requireSupplier()
  const locale = await getLocale()
  const t = translator(locale)

  const [products, categories, internal] = await Promise.all([
    container.supplierCatalogue.listMyProducts(supplier.id),
    container.repositories.categories.findAll(),
    container.repositories.suppliers.findInternal(supplier.id),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[1.35rem] font-bold tracking-tight">{t('myStock')}</h1>
        <p className="mt-1 text-[0.92rem] leading-relaxed text-ink-soft">{t('stockBody')}</p>
      </div>

      {/* Apna maal daalne ka rasta sab se upar — yehi wo kaam hai jo naya wholesaler
          pehle din karna chahta hai */}
      <SupplierAddProduct
        categories={categories}
        feeRateBps={internal?.feeRateBps ?? 500}
        locale={locale}
      />

      {products.length === 0 && (
        <div className="card p-8 text-center text-ink-soft">{t('noSupplierProducts')}</div>
      )}

      <ul className="space-y-3">
        {products.map((product) => (
          <li key={product.id} className="card flex items-center gap-4 p-4">
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-card bg-paper-sunken">
              {product.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element -- storage URLs; next/image Phase 2
                <img
                  src={product.imageUrl}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate font-bold">
                {locale === 'ur' ? product.titleUr : product.titleEn}
              </p>
              <p className="mt-0.5 text-[0.85rem] text-ink-soft">
                <span dir="ltr" className="numeric font-semibold">
                  {formatPkr(product.supplierPrice)}
                </span>
                {product.openOrders > 0 && (
                  <>
                    {' · '}
                    <span className="text-brand-700">
                      {t('openOrdersOnThis')}{' '}
                      <span dir="ltr" className="numeric">
                        {product.openOrders}
                      </span>
                    </span>
                  </>
                )}
              </p>
            </div>

            <SupplierStockQuantity
              productId={product.id}
              stockQty={product.stockQty}
              label={t('inStockQty')}
              saveLabel={t('save')}
            />

            {/* DRAFT maal wholesaler khud live nahi kar sakta — pehle ops verify karti hai */}
            {product.status === 'DRAFT' ? (
              <span className="badge bg-paper-sunken text-ink-faint">{t('notLiveYet')}</span>
            ) : (
              <SupplierStockToggle
                productId={product.id}
                inStock={product.status === 'LIVE'}
                labels={{ inStock: t('inStock'), outOfStock: t('outOfStock') }}
              />
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
