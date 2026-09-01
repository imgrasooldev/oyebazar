import type { Metadata } from 'next'
import { LazyImage } from '@/components/lazy-image'
import { formatPkr } from '@oyebazar/shared'
import { SupplierEditProduct } from '@/components/supplier-edit-product'
import { SeoFields } from '@/components/seo-fields'
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

  const [products, categories, internal, pendingPriceRequests, trending] = await Promise.all([
    container.supplierCatalogue.listMyProducts(supplier.id),
    // 🔴 findTree, findAll nahi — maal SUB-category par lagta hai aur findAll sirf
    // bari categories deta hai
    container.repositories.categories.findTree(),
    container.repositories.suppliers.findInternal(supplier.id),
    container.priceChanges.listMyPending(supplier.id),
    /*
     * Apni dukan ka chalta hua maal — sirf isi dukan ka, aur mare hue order ke baghair.
     * Ye wohi ginti hai jo reseller apni taraf dekhti hai; dono taraf ek hi hisab hona
     * chahiye, warna "aap ke haan to kuch aur likha hai" wali baat shuru hoti hai.
     */
    container.repositories.products.findTrending({ limit: 6, days: 30, supplierId: supplier.id }),
  ])

  // Jis maal par pehle se darkhwast khuli hai us par dobara form kholne ka faida nahi
  const pendingByProduct = new Map(pendingPriceRequests.map((row) => [row.productId, row]))

  /*
   * 🔴 Saare variants EK query mein.
   *
   * Pehle yahan har maal par alag query chalti thi (`Promise.all` ke andar map): chalees
   * maal = chalees chakkar DB tak. Safha do second se upar chala jata tha — aur yehi wo
   * safha hai jo dukan wala din mein sab se zyada kholta hai.
   */
  const variantsByProduct = await container.supplierCatalogue.listVariantsFor(
    supplier.id,
    products.filter((product) => product.status !== 'DRAFT').map((product) => product.id),
  )

  /*
   * Ginti ko maal ke saath jorhna yahin hota hai — trending sirf ids aur ginti deti hai.
   * Jo maal ab list mein nahi (archived) wo chup chaap gir jata hai.
   */
  const productById = new Map(products.map((product) => [product.id, product]))
  const movers = trending.flatMap((row) => {
    const product = productById.get(row.productId)
    return product ? [{ product, orders: row.orders, qty: row.qty }] : []
  })

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
        // Key na ho to sahulat mojood hi nahi — aur us surat mein button bhi nahi
        canDescribe={container.describer !== null}
      />

      {/*
        Kya chal raha hai — pichhle 30 din.

        Ye is safhe par is liye hai ke faisla yahin hota hai: maal dobara mangwana hai ya
        nahi. Ginti ke baghair wo faisla yaadasht se hota tha ("mujhe lagta hai ye chalta
        hai"), aur yaadasht sab se zyada wohi maal yaad rakhti hai jo haal hi mein bika.
      */}
      {movers.length > 0 && (
        <section className="card p-4">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-[1rem] font-bold">{t('yourMovers')}</h2>
            <span className="text-[0.78rem] text-ink-faint">{t('trendingWindow')}</span>
          </div>

          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {movers.map((row) => (
              <li
                key={row.product.id}
                className="flex items-center gap-3 rounded-card bg-paper-sunken p-2"
              >
                <div className="h-11 w-11 shrink-0 overflow-hidden rounded-card bg-paper">
                  {row.product.imageUrl && (
                    <LazyImage
                      src={row.product.imageUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-[0.88rem] font-semibold">
                    {locale === 'ur' ? row.product.titleUr : row.product.titleEn}
                  </p>
                  <p className="text-[0.76rem] text-ink-faint">
                    <span dir="ltr" className="numeric font-bold text-ink">
                      {row.orders}
                    </span>{' '}
                    {t('ordersShort')}
                    {' · '}
                    <span dir="ltr" className="numeric">
                      {row.qty}
                    </span>{' '}
                    {t('piecesShort')}
                  </p>
                </div>

                {/* Bacha hua maal saath — "chal raha hai" aur "khatam hone wala hai" ek hi nazar mein */}
                <span dir="ltr" className="numeric shrink-0 text-[0.78rem] text-ink-soft">
                  {row.product.stockQty}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {products.length === 0 && (
        <div className="card p-8 text-center text-ink-soft">{t('noSupplierProducts')}</div>
      )}

      <ul className="space-y-3">
        {products.map((product) => (
          <li key={product.id} className="card overflow-hidden">
            <div className="flex flex-wrap items-center gap-3 p-3">
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-card bg-paper-sunken">
              {product.imageUrl && (
                <LazyImage
                  src={product.imageUrl}
                  alt=""
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
              Tafseel band rehti hai.
              🔴 Ek dukan ke paas chalees maal hote hain. Har ek par variants, tasveerein,
              rate ki darkhwast aur edit khule rehte to ek safhe par teen maal aate the
              aur "kis cheez ka stock khatam hai" jaanne ke liye poora safha scroll karna
              parta. Ab qatar chhoti hai aur andar ka kaam ek tap door.

              `<details>` jaan boojh kar — koi JavaScript nahi, phone par bhi foran khulta
              hai, aur browser ka apna Ctrl+F is ke andar bhi dhoondh leta hai.
            */}
            <details className="group border-t border-paper-sunken">
              <summary className="flex min-h-tap cursor-pointer list-none items-center gap-2 px-3 py-2 text-[0.82rem] font-semibold text-ink-soft transition hover:bg-paper-sunken">
                <span className="text-ink-faint transition group-open:rotate-90 rtl:rotate-180 rtl:group-open:-rotate-90">
                  ›
                </span>
                {t('manage')}
                <span className="font-normal text-ink-faint">
                  {(variantsByProduct.get(product.id) ?? []).length > 0 && (
                    <>
                      {(variantsByProduct.get(product.id) ?? []).length} {t('variantCount')}
                    </>
                  )}
                  {product.media.length > 0 && (
                    <>
                      {(variantsByProduct.get(product.id) ?? []).length > 0 ? ' · ' : ''}
                      {product.media.length} {t('photos')}
                    </>
                  )}
                </span>
              </summary>

              <div className="space-y-4 px-3 pb-4">

            {/*
              Rang aur size — sirf LIVE/OUT_OF_STOCK maal par.
              DRAFT par nahi: wo abhi ops ki nazar se guzra hi nahi, aur us par variants
              banate rehna us kaam ka doharao hai jo manzoori ke baad waise bhi karna hai.
            */}
            {product.status !== 'DRAFT' && (
              <SupplierVariants
                locale={locale}
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

            {/*
              Google wala matn — har maal par, DRAFT ho ya LIVE.

              🔴 Ye upar wale DRAFT wale block se BAHAR hai, aur ye farq jaan boojh
              kar hai. Naam aur rate LIVE hote hi jam jate hain (reseller un par apna
              status bana chuki hoti hai); ye do line un mein se kisi cheez ko nahi
              chhoteen — wo sirf Google ke natije ki shakl hai, aur usay theek karne ki
              zaroorat LIVE hone ke BAAD hi parti hai.

              ARCHIVED yahan aata hi nahi (repository us ko chhodti hai), aur DRAFT ka
              koi public safha nahi — magar us par abhi likh lena theek hai: LIVE hote
              hi wo matn apne aap kaam karne lag jata hai.
            */}
            <div className="border-t border-line pt-3">
              <SeoFields
                endpoint={`/api/v1/supplier/products/${product.id}/seo`}
                method="PATCH"
                seoTitle={product.seoTitle}
                seoDescription={product.seoDescription}
                fallbackTitle={`${product.titleUr} — ${supplier.businessName}`}
                fallbackDescription={`${product.titleUr} (${product.titleEn}) — ${supplier.city} کے تصدیق شدہ ہول سیلر ${supplier.businessName} کے پاس۔ تھوک ریٹ کے لیے سیدھا رابطہ۔`}
                previewUrl={`oyebazar.com/bazaar/item/${product.slug}`}
                labels={{
                  title: t('seoTitle'),
                  note: t('seoNoteProduct'),
                  fieldTitle: t('seoFieldTitle'),
                  fieldDescription: t('seoFieldDescription'),
                  hint: t('seoHint'),
                  autoHint: t('seoAutoHint'),
                  preview: t('seoPreview'),
                  save: t('save'),
                  saving: t('saving'),
                  saved: t('payoutAccountSaved'),
                }}
              />
            </div>

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
              </div>
            </details>
          </li>
        ))}
      </ul>
    </div>
  )
}
