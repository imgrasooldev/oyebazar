import type { Metadata } from 'next'
import { formatPkr } from '@oyebazar/shared'
import { SupplierEditProduct } from '@/components/supplier-edit-product'
import { SupplierPriceRequest } from '@/components/supplier-price-request'
import { SupplierProductMedia } from '@/components/supplier-product-media'
import { SupplierAddProduct } from '@/components/supplier-add-product'
import { SupplierStockQuantity } from '@/components/supplier-stock-quantity'
import { SupplierVariants } from '@/components/supplier-variants'
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

  const [products, categories, internal, pendingPriceRequests] = await Promise.all([
    container.supplierCatalogue.listMyProducts(supplier.id),
    // 🔴 findTree, findAll nahi — maal SUB-category par lagta hai aur findAll sirf
    // bari categories deta hai
    container.repositories.categories.findTree(),
    container.repositories.suppliers.findInternal(supplier.id),
    container.priceChanges.listMyPending(supplier.id),
  ])

  // Jis maal par pehle se darkhwast khuli hai us par dobara form kholne ka faida nahi
  const pendingByProduct = new Map(pendingPriceRequests.map((row) => [row.productId, row]))

  /*
   * Saare variants ek saath — har maal par alag query se 40 maal ka safha 40 query
   * maangta. Ye list waise bhi chhoti hai (ek dukan ka apna maal).
   */
  const variantLists = await Promise.all(
    products
      .filter((product) => product.status !== 'DRAFT')
      .map(async (product) => [
        product.id,
        await container.supplierCatalogue.listVariants(supplier.id, product.id),
      ] as const),
  )
  const variantsByProduct = new Map(variantLists)

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
          <li key={product.id} className="card space-y-4 p-4">
            <div className="flex items-center gap-4">
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
            </div>

            {/*
              Rang aur size — sirf LIVE/OUT_OF_STOCK maal par.
              DRAFT par nahi: wo abhi ops ki nazar se guzra hi nahi, aur us par variants
              banate rehna us kaam ka doharao hai jo manzoori ke baad waise bhi karna hai.
            */}
            {product.status !== 'DRAFT' && (
              <SupplierVariants
                productId={product.id}
                variants={variantsByProduct.get(product.id) ?? []}
                /*
                 * Kis jorhe par kaunsi tasveer — pehli wali. Ek variant par kai
                 * tasveerein ho sakti hain; qatar mein sirf ek dikhani hai.
                 */
                images={Object.fromEntries(
                  product.media
                    .filter((item) => item.variantId && item.type === 'IMAGE')
                    .map((item) => [item.variantId as string, item.url])
                    .reverse(),
                )}
                labels={{
                  photo: t('variantPhoto'),
                  photoAdd: t('variantPhotoAdd'),
                  title: t('variantsTitle'),
                  colour: t('variantColour'),
                  size: t('variantSize'),
                  qty: t('inStockQty'),
                  add: t('variantAdd'),
                  remove: t('variantRemove'),
                  total: t('variantTotal'),
                  empty: t('variantEmpty'),
                  saving: t('saving'),
                }}
              />
            )}

            {/* 🔴 Tafseel badalna SIRF DRAFT par. Live maal par naam ya rate badalne ka
                matlab hai ke reseller ka pehle se laga hua status pack jhoot bol raha ho
                — wo alag flow hai (itla + us ke saved rate ka hisab), ye nahi. */}
            {product.status === 'DRAFT' && (
              <div className="space-y-2 border-t border-line pt-3">
                <SupplierEditProduct
                  product={{
                    id: product.id,
                    titleUr: product.titleUr,
                    titleEn: product.titleEn,
                    descriptionUr: product.descriptionUr,
                    categorySlug: product.categorySlug,
                    supplierPrice: product.supplierPrice,
                    stockQty: product.stockQty,
                  }}
                  categories={categories}
                  feeRateBps={internal?.feeRateBps ?? 500}
                  locale={locale}
                />
                <p className="text-[0.78rem] leading-relaxed text-ink-faint">
                  {t('draftEditNote')}
                </p>
              </div>
            )}

            {/* 🔴 LIVE maal ka rate dukan wala KHUD nahi badal sakta — sirf maang sakta
                hai. Wajah component ke andar likhi hai (aur safhe par bhi dikhti hai). */}
            {product.status !== 'DRAFT' && (
              <div className="border-t border-line pt-3">
                <SupplierPriceRequest
                  productId={product.id}
                  currentPrice={product.supplierPrice}
                  feeRateBps={internal?.feeRateBps ?? 500}
                  pending={pendingByProduct.get(product.id) ?? null}
                  locale={locale}
                />
              </div>
            )}

            {/* Tasveerein maal ke saath hi — alag safhe par bhejne se dukan wala
                wahan jata hi nahi, aur maal bina tasveer ke para reh jata hai */}
            <SupplierProductMedia
              productId={product.id}
              media={[...product.media]}
              locale={locale}
            />
          </li>
        ))}
      </ul>
    </div>
  )
}
