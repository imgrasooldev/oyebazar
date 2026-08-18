import type { Metadata } from 'next'
import { formatPkr } from '@oyebazar/shared'
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
  const products = await container.admin.listProducts(user)

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

      {drafts.length > 0 && (
        <section>
          <h2 className="mb-3 rounded-card bg-brand-50 px-4 py-3 font-bold text-brand-800">
            Waiting for approval ({drafts.length})
          </h2>
          <ProductList rows={drafts} />
        </section>
      )}

      <section>
        <h2 className="mb-3 text-[0.72rem] font-bold uppercase tracking-[0.14em] text-ink-faint">
          All products
        </h2>
        <ProductList rows={rest} />
      </section>
    </div>
  )
}

function ProductList({
  rows,
}: {
  rows: Awaited<ReturnType<typeof container.admin.listProducts>>
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
                // eslint-disable-next-line @next/next/no-img-element -- storage URLs; next/image Phase 2
                <img
                  src={product.imageUrl}
                  alt=""
                  loading="lazy"
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
