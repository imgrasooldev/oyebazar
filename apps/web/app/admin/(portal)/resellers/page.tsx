import type { Metadata } from 'next'
import { AdminRowAction } from '@/components/admin-row-action'
import { requireOpsUser } from '@/lib/api/admin-session'
import { container } from '@/lib/container'

export const metadata: Metadata = {
  title: 'Resellers · Admin',
  robots: { index: false, follow: false },
}
export const dynamic = 'force-dynamic'

/**
 * Resellers.
 *
 * 🔴 Suspend karte hi us ki saari sessions bhi khatam hoti hain (repository mein, ek
 * hi transaction ke andar). Sirf status badalne se khula hua phone agle 7 din tak
 * chalta rehta — aur suspend aksar isi liye hota hai ke account ghalat haathon mein hai.
 */
export default async function AdminResellersPage() {
  const { user } = await requireOpsUser()
  const resellers = await container.admin.listResellers(user)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[1.4rem] font-bold tracking-tight">Resellers</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Suspending also ends every open session on that account.
        </p>
      </div>

      {resellers.length === 0 ? (
        <p className="card p-6 text-center text-sm text-ink-soft">No resellers yet.</p>
      ) : (
        <ul className="space-y-3">
          {resellers.map((reseller) => (
            <li key={reseller.id} className="card flex flex-wrap items-center gap-4 p-4">
              <div className="min-w-[12rem] flex-1">
                <p className="font-bold">{reseller.name}</p>
                <p dir="ltr" className="numeric mt-0.5 text-[0.82rem] text-ink-soft">
                  {reseller.whatsappPhone} · {reseller.city}
                </p>
              </div>

              <dl dir="ltr" className="numeric flex shrink-0 gap-5 text-[0.8rem]">
                <div>
                  <dt className="text-ink-faint">Orders</dt>
                  <dd className="font-bold">{reseller.orderCount}</dd>
                </div>
                {/*
                  Kis ne bulaya — `Tier` ki jagah.

                  Wo khaana har qatar par 'NEW' chhapta tha, kyunke usay koi badalta hi
                  nahi tha. Ye us ki jagah wo cheez hai jo har qatar par ALAG hoti hai
                  aur jis se ops ko waqai kuch pata chalta hai.
                */}
                {reseller.referredByName && (
                  <div dir="auto">
                    <dt className="text-ink-faint">Invited by</dt>
                    <dd className="font-bold">{reseller.referredByName}</dd>
                  </div>
                )}
              </dl>

              <div className="flex shrink-0 items-center gap-2">
                <span
                  className={`badge ${
                    reseller.status === 'ACTIVE'
                      ? 'bg-accent-50 text-accent-700'
                      : reseller.status === 'SUSPENDED'
                        ? 'bg-coal-900 text-white'
                        : 'bg-brand-50 text-brand-800'
                  }`}
                >
                  {reseller.status}
                </span>

                {reseller.status === 'SUSPENDED' ? (
                  <AdminRowAction
                    endpoint={`/api/v1/admin/resellers/${reseller.id}`}
                    body={{ status: 'ACTIVE' }}
                    label="Reinstate"
                  />
                ) : (
                  <AdminRowAction
                    endpoint={`/api/v1/admin/resellers/${reseller.id}`}
                    body={{ status: 'SUSPENDED' }}
                    label="Suspend"
                    tone="danger"
                    confirmText={`Suspend ${reseller.name}? They are logged out everywhere.`}
                  />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
