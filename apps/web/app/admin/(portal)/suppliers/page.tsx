import type { Metadata } from 'next'
import { AdminRowAction } from '@/components/admin-row-action'
import { requireOpsUser } from '@/lib/api/admin-session'
import { container } from '@/lib/container'

export const metadata: Metadata = {
  title: 'Wholesalers · Admin',
  robots: { index: false, follow: false },
}
export const dynamic = 'force-dynamic'

/**
 * Wholesalers.
 *
 * Do alag switch, jaan boojh kar:
 *  · VERIFIED = "hum ne kaghaz dekh liye" (NTN, dukan, maal)
 *  · Listed   = "ye public bazaar mein dikhega"
 * Ek dukan verify ho sakti hai magar abhi listing ke liye tayyar na ho (tasveerein
 * baqi hain, rate tay nahi). Ek hi switch hota to ops ko intezar karna parta.
 */
export default async function AdminSuppliersPage() {
  const { user } = await requireOpsUser()
  const suppliers = await container.admin.listSuppliers(user)

  const pending = suppliers.filter((s) => s.status === 'PENDING')
  const rest = suppliers.filter((s) => s.status !== 'PENDING')

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[1.4rem] font-bold tracking-tight">Wholesalers</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Verify checks their papers. Listing puts them on the public bazaar — two
          separate decisions.
        </p>
      </div>

      {pending.length > 0 && (
        <section>
          <h2 className="mb-3 rounded-card bg-brand-50 px-4 py-3 font-bold text-brand-800">
            Waiting for verification ({pending.length})
          </h2>
          <SupplierTable rows={pending} />
        </section>
      )}

      <section>
        <h2 className="mb-3 text-[0.72rem] font-bold uppercase tracking-[0.14em] text-ink-faint">
          All wholesalers
        </h2>
        <SupplierTable rows={rest} />
      </section>
    </div>
  )
}

function SupplierTable({
  rows,
}: {
  rows: Awaited<ReturnType<typeof container.admin.listSuppliers>>
}) {
  if (rows.length === 0) {
    return <p className="card p-6 text-center text-sm text-ink-soft">Nothing here.</p>
  }

  return (
    <ul className="space-y-3">
      {rows.map((supplier) => (
        <li key={supplier.id} className="card p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="font-bold">{supplier.businessName}</p>
              <p className="mt-0.5 text-[0.85rem] text-ink-soft">
                {supplier.ownerName} · {supplier.city}
                {supplier.marketName ? ` · ${supplier.marketName}` : ''}
              </p>
              <p dir="ltr" className="numeric mt-1 text-[0.8rem] text-ink-faint">
                {supplier.phone} · {supplier.productCount} products ·{' '}
                {(supplier.feeRateBps / 100).toFixed(1)}% fee
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`badge ${
                  supplier.status === 'VERIFIED'
                    ? 'bg-accent-50 text-accent-700'
                    : supplier.status === 'SUSPENDED'
                      ? 'bg-coal-900 text-white'
                      : 'bg-brand-50 text-brand-800'
                }`}
              >
                {supplier.status}
              </span>
              {supplier.listedOnBazaar && (
                <span className="badge bg-paper-sunken text-ink-soft">On bazaar</span>
              )}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {supplier.status !== 'VERIFIED' && (
              <AdminRowAction
                endpoint={`/api/v1/admin/suppliers/${supplier.id}`}
                body={{ status: 'VERIFIED' }}
                label="Verify"
                tone="primary"
              />
            )}

            <AdminRowAction
              endpoint={`/api/v1/admin/suppliers/${supplier.id}`}
              body={{ listed: !supplier.listedOnBazaar }}
              label={supplier.listedOnBazaar ? 'Remove from bazaar' : 'List on bazaar'}
            />

            {supplier.status !== 'SUSPENDED' ? (
              <AdminRowAction
                endpoint={`/api/v1/admin/suppliers/${supplier.id}`}
                body={{ status: 'SUSPENDED' }}
                label="Suspend"
                tone="danger"
                confirmText={`Suspend ${supplier.businessName}? They will also come off the bazaar.`}
              />
            ) : (
              <AdminRowAction
                endpoint={`/api/v1/admin/suppliers/${supplier.id}`}
                body={{ status: 'VERIFIED' }}
                label="Reinstate"
              />
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}
