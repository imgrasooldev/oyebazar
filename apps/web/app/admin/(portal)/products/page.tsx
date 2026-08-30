import type { Metadata } from 'next'
import { LazyImage } from '@/components/lazy-image'
import { formatPkr } from '@oyebazar/shared'
import { AdminPriceDecision } from '@/components/admin-price-decision'
import { AdminFixNaming } from '@/components/admin-fix-naming'
import { AdminRowAction } from '@/components/admin-row-action'
import { requireOpsUser } from '@/lib/api/admin-session'
import { container } from '@/lib/container'

export const metadata: Metadata = {
  title: 'Products · Admin',
  robots: { index: false, follow: false },
}
export const dynamic = 'force-dynamic'

/**
 * Products — asal darwaza.
 *
 * DRAFT maal reseller ko dikhta hi nahi. Yahan se LIVE karna ek tap ka kaam hai, magar
 * har row par chaar number saath dikhte hain: lagat, hamara rate, hamara munafa aur
 * reseller ka munafa. Approve karte waqt yehi dekhna hota hai — agar reseller ke liye
 * kuch bachta hi nahi to maal live karne ka koi matlab nahi, wo kabhi bikega nahi.
 */
export default async function AdminProductsPage() {
  const { user } = await requireOpsUser()
  const [products, priceRequests, categories] = await Promise.all([
    container.admin.listProducts(user),
    container.priceChanges.listPending(),
    container.repositories.categories.findAll(),
  ])

  /*
    🔴 Tasveer se tajweez mumkin hai ya nahi — SERVER par tay hota hai.

    Jawab sirf yahan maloom hai (key lagi hai ya nahi). Client ka andaza lagane ka
    matlab ye hota ke button har jagah dikhta, aur jahan key nahi hai wahan wo har dafa
    nakaam hota — jo us button se bura hai jo hai hi nahi.
  */
  const canSuggest = container.describer !== null
  const flatCategories = categories.map((category) => ({
    slug: category.slug,
    nameEn: category.nameEn,
  }))

  const drafts = products.filter((product) => product.status === 'DRAFT')
  const rest = products.filter((product) => product.status !== 'DRAFT')

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[1.4rem] font-bold tracking-tight">Products</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Draft stock is invisible to resellers. Check the margins before making it live.
        </p>
      </div>

      {/*
        🔴 Rate ki darkhwastein sab se upar — draft se bhi upar.
        Draft maal abhi kisi ke kaam ka nahi; rate ki khuli darkhwast us maal par hai jo
        ABHI bik raha hai. Har din ki dair mein dukan wala purane rate par maal deta hai.
      */}
      {priceRequests.length > 0 && (
        <section>
          <h2 className="mb-3 rounded-card bg-accent-50 px-4 py-3 font-bold text-accent-800">
            Price changes to approve ({priceRequests.length})
          </h2>

          <ul className="space-y-3">
            {priceRequests.map((row) => {
              const up = row.requestedSupplierPrice > row.currentSupplierPrice
              return (
                <li key={row.id} className="card space-y-3 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold">{row.productTitleEn}</p>
                      <p className="text-sm text-ink-soft">{row.supplierName}</p>
                    </div>
                    <span
                      className={
                        up
                          ? 'badge bg-red-50 text-red-700'
                          : 'badge bg-emerald-50 text-emerald-700'
                      }
                    >
                      {up ? 'Price up' : 'Price down'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 rounded-card bg-paper-sunken p-3 text-center sm:grid-cols-4">
                    <div>
                      <p className="text-[0.7rem] text-ink-faint">Wholesaler now</p>
                      <p dir="ltr" className="numeric font-bold">
                        {formatPkr(row.currentSupplierPrice)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[0.7rem] text-ink-faint">Wholesaler wants</p>
                      <p dir="ltr" className="numeric font-bold">
                        {formatPkr(row.requestedSupplierPrice)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[0.7rem] text-ink-faint">Resellers see now</p>
                      <p dir="ltr" className="numeric font-bold">
                        {formatPkr(row.currentBajiPrice)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[0.7rem] text-ink-faint">Would become</p>
                      <p dir="ltr" className="numeric font-bold text-accent-700">
                        {formatPkr(row.proposedBajiPrice)}
                      </p>
                    </div>
                  </div>

                  {/*
                    🔴 Ye line hi is poore safhe ki wajah hai.
                    Itni resellers ne is maal par apna rate save kar rakha hai jo naye
                    cost se NEECHE hai — un ka status pack pehle se WhatsApp par laga
                    hua hai aur wo apni lagat se kam par bech rahi hongi.
                  */}
                  {row.resellersUnderWater > 0 ? (
                    <p className="rounded-card bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                      {row.resellersUnderWater} of {row.resellersWithSavedPrice} resellers priced
                      below the new cost — approving raises their saved price too.
                    </p>
                  ) : (
                    <p className="text-sm text-ink-soft">
                      {row.resellersWithSavedPrice} reseller
                      {row.resellersWithSavedPrice === 1 ? '' : 's'} priced this — none below the
                      new cost.
                    </p>
                  )}

                  {row.reason && <p className="text-sm text-ink-soft">“{row.reason}”</p>}

                  <AdminPriceDecision requestId={row.id} underWater={row.resellersUnderWater} />
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {drafts.length > 0 && (
        <section>
          <h2 className="mb-3 rounded-card bg-brand-50 px-4 py-3 font-bold text-brand-800">
            Waiting for approval ({drafts.length})
          </h2>
          <ProductList rows={drafts} categories={flatCategories} canSuggest={canSuggest} />
        </section>
      )}

      <section>
        <h2 className="mb-3 text-[0.72rem] font-bold uppercase tracking-[0.14em] text-ink-faint">
          All products
        </h2>
        <ProductList rows={rest} categories={flatCategories} canSuggest={canSuggest} />
      </section>
    </div>
  )
}

function ProductList({
  rows,
  categories,
  canSuggest,
}: {
  rows: Awaited<ReturnType<typeof container.admin.listProducts>>
  categories: readonly { slug: string; nameEn: string }[]
  canSuggest: boolean
}) {
  if (rows.length === 0) {
    return <p className="card p-6 text-center text-sm text-ink-soft">Nothing here.</p>
  }

  return (
    <ul className="space-y-3">
      {rows.map((product) => {
        const ourMargin = product.bajiPrice - product.supplierPrice
        const resellerMargin = product.suggestedRetail - product.bajiPrice

        return (
          <li key={product.id} className="card flex flex-wrap items-center gap-4 p-4">
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-card bg-paper-sunken">
              {product.imageUrl && (
                <LazyImage
                  src={product.imageUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              )}
            </div>

            <div className="min-w-[12rem] flex-1">
              <p className="font-bold">{product.titleEn}</p>
              <p className="mt-0.5 text-[0.82rem] text-ink-soft">
                {product.supplierName} · {product.categoryNameUr}
              </p>
            </div>

            <dl dir="ltr" className="numeric flex shrink-0 gap-5 text-[0.8rem]">
              <Figure label="Cost" value={formatPkr(product.supplierPrice)} />
              <Figure label="Our rate" value={formatPkr(product.bajiPrice)} />
              <Figure
                label="Our margin"
                value={formatPkr(Math.max(ourMargin, 0))}
                good={ourMargin > 0}
              />
              <Figure
                label="Reseller margin"
                value={formatPkr(Math.max(resellerMargin, 0))}
                good={resellerMargin > 0}
              />
            </dl>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <span
                className={`badge ${
                  product.status === 'LIVE'
                    ? 'bg-accent-50 text-accent-700'
                    : product.status === 'DRAFT'
                      ? 'bg-brand-50 text-brand-800'
                      : 'bg-paper-sunken text-ink-soft'
                }`}
              >
                {product.status}
              </span>

              {product.status !== 'LIVE' && (
                <AdminRowAction
                  endpoint={`/api/v1/admin/products/${product.id}`}
                  body={{ status: 'LIVE' }}
                  label="Make live"
                  tone="primary"
                />
              )}

              {product.status !== 'ARCHIVED' && (
                <AdminRowAction
                  endpoint={`/api/v1/admin/products/${product.id}`}
                  body={{ status: 'ARCHIVED' }}
                  label="Archive"
                  confirmText={`Archive ${product.titleEn}? Resellers lose it from their catalogue.`}
                />
              )}

              {/*
                Naam theek karna — Archive ke BAAD, aur halke andaz mein.

                Ye rozana ka kaam nahi: aksar maal ka naam theek hota hai. Isay "Make
                live" jitna numaya karne se wo do button dab jate jo har qatar par
                waqai istemal hote hain.
              */}
              <AdminFixNaming
                productId={product.id}
                titleUr={product.titleUr}
                titleEn={product.titleEn}
                categories={categories}
                canSuggest={canSuggest}
              />
            </div>
          </li>
        )
      })}
    </ul>
  )
}

/** Ulta margin surkh rang mein — ye woh soorat hai jis mein maal live NAHI hona chahiye. */
function Figure({ label, value, good }: { label: string; value: string; good?: boolean }) {
  const tone = good === undefined ? 'font-bold' : good ? 'font-bold text-accent-700' : 'font-bold text-red-600'

  return (
    <div>
      <dt className="text-ink-faint">{label}</dt>
      <dd className={tone}>{value}</dd>
    </div>
  )
}
