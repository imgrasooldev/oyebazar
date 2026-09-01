import Link from 'next/link'
import type { Metadata } from 'next'
import { formatPkr } from '@oyebazar/shared'
import { requireOpsUser } from '@/lib/api/admin-session'
import { container } from '@/lib/container'

export const metadata: Metadata = { title: 'Admin', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

/**
 * Dashboard.
 *
 * Sirf wo number jin par AAJ kisi ko kuch karna hai — "kul orders" jaisa number yahan
 * nahi, wo achha lagta hai magar us se koi kaam nahi nikalta. Har card ek kaam ki taraf
 * le jata hai, aur jo cheez ruki hui hai wo garam rang mein hai.
 */
export default async function AdminDashboard() {
  const { user } = await requireOpsUser()
  const stats = await container.admin.dashboard(user)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[1.4rem] font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-ink-soft">
          What needs attention right now — not vanity totals.
        </p>
      </div>

      {/* Ruke hue kaam — inhi par paisa aur customer ka intezar khara hai */}
      <section>
        <h2 className="mb-3 text-[0.72rem] font-bold uppercase tracking-[0.14em] text-ink-faint">
          Waiting on someone
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            href="/admin/orders"
            label="Awaiting reseller confirmation"
            value={stats.ordersAwaitingConfirmation}
            hint="These go nowhere until confirmed"
            warn={stats.ordersAwaitingConfirmation > 0}
          />
          <StatCard
            href="/admin/orders"
            label="With the wholesaler"
            value={stats.ordersWithSupplier}
            hint="Customer is waiting"
            warn={stats.ordersWithSupplier > 0}
          />
          <StatCard
            href="/admin/suppliers"
            label="Wholesalers to verify"
            value={stats.suppliersPending}
            hint="Their stock cannot sell yet"
            warn={stats.suppliersPending > 0}
          />
          <StatCard
            href="/admin/products"
            label="Products to approve"
            value={stats.productsDraft}
            hint="Draft — invisible to resellers"
            warn={stats.productsDraft > 0}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-[0.72rem] font-bold uppercase tracking-[0.14em] text-ink-faint">
          Running
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard href="/admin/orders" label="In transit" value={stats.ordersInTransit} />
          <StatCard href="/admin/orders" label="Orders today" value={stats.ordersToday} />
          <StatCard
            href="/admin/resellers"
            label="Active resellers"
            value={stats.resellersActive}
          />
          {/*
            Do alag number, jaan boojh kar: kamai wohi hai jis ka maal pohanch chuka.
            Raste ka order abhi kamai nahi — wo RTO bhi ho sakta hai.
          */}
          <div className="card p-5">
            <p className="text-[0.72rem] uppercase tracking-wider text-ink-faint">
              Fee earned this month
            </p>
            <p dir="ltr" className="numeric mt-2 text-[1.6rem] font-bold text-accent-700">
              {formatPkr(stats.feeEarnedThisMonth)}
            </p>
            {/*
              🔴 "In transit" yahan se HATA diya gaya. Us khaane ka matlab "abhi tak
              pohancha nahi" hai (qabool shuda aur tayyar order bhi shamil), jabke isi
              safhe par upar "In transit" ka apna tile hai jo SIRF courier ke haath wale
              order ginta hai. Do alag matlab, ek hi lafz — aur wo saaf takraate hue
              nazar aate the: tile par "0" aur yahan "Rs 68 still in transit".
            */}
            <p className="mt-1 text-[0.78rem] text-ink-faint">
              Delivered orders only ·{' '}
              <span dir="ltr" className="numeric">
                {formatPkr(stats.feeInFlight)}
              </span>{' '}
              still to be earned on open orders
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}

function StatCard({
  href,
  label,
  value,
  hint,
  warn = false,
}: {
  href: '/admin/orders' | '/admin/suppliers' | '/admin/products' | '/admin/resellers'
  label: string
  value: number
  hint?: string
  warn?: boolean
}) {
  // Garam rang sirf tab jab wakai kuch ruka ho — warna har cheez cheekhti hai aur
  // kuch nazar nahi aata
  const highlight = warn && value > 0

  return (
    <Link
      href={href}
      className={`card block p-5 transition hover:shadow-lift ${
        highlight ? 'ring-1 ring-brand-300' : ''
      }`}
    >
      <p className="text-[0.72rem] uppercase tracking-wider text-ink-faint">{label}</p>
      <p
        dir="ltr"
        className={`numeric mt-2 text-[1.6rem] font-bold ${highlight ? 'text-brand-700' : ''}`}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-[0.78rem] text-ink-faint">{hint}</p>}
    </Link>
  )
}
