import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BRAND } from '@oyebazar/shared'
import { OPS_ROLE_RANK } from '@oyebazar/core'
import { AdminLogoutButton } from '@/components/admin-logout-button'
import {
  BoxesIcon,
  GridIcon,
  ListIcon,
  MoneyIcon,
  ShieldIcon,
  StoreIcon,
  UsersIcon,
} from '@/components/icons'
import { getOpsUserOrNull } from '@/lib/api/admin-session'

export const dynamic = 'force-dynamic'

/**
 * Admin portal.
 *
 * 🔴 Angrezi mein — jaan boojh kar. Ye andaruni auzaar hai jo ops team chalati hai;
 * customer-facing safhay teen zubanon mein hain kyunke wahan zaban rukawat banti hai.
 *
 * Shakl wohi jo reseller portal ki hai: bari screen par side mein nav, chhoti par upar
 * sarakti hui patti. Teen portal, teen alag shaklen hoti to har nayi screen par sochna
 * parta ke "yahan nav kahan hai" — aur ops ka banda teenon mein kaam karta hai.
 *
 * `needs`: is tab ke liye kam se kam kaun sa darja chahiye. Tab chhupana hifazat nahi
 * hai (rok service mein hai) — ye sirf ghalat ummeed se bachata hai.
 */
const TABS = [
  { href: '/admin', label: 'Dashboard', needs: 'REVIEWER', Icon: GridIcon },
  { href: '/admin/orders', label: 'Orders', needs: 'REVIEWER', Icon: ListIcon },
  { href: '/admin/suppliers', label: 'Wholesalers', needs: 'REVIEWER', Icon: StoreIcon },
  { href: '/admin/products', label: 'Products', needs: 'REVIEWER', Icon: BoxesIcon },
  { href: '/admin/categories', label: 'Categories', needs: 'REVIEWER', Icon: GridIcon },
  { href: '/admin/resellers', label: 'Resellers', needs: 'REVIEWER', Icon: UsersIcon },
  { href: '/admin/money', label: 'Money', needs: 'REVIEWER', Icon: MoneyIcon },
  { href: '/admin/team', label: 'Team', needs: 'SUPER_ADMIN', Icon: ShieldIcon },
] as const

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getOpsUserOrNull()
  if (!session) redirect('/admin/login')

  const tabs = TABS.filter((tab) => OPS_ROLE_RANK[session.user.role] >= OPS_ROLE_RANK[tab.needs])

  return (
    <div dir="ltr" className="min-h-screen bg-paper font-sans">
      <header className="sticky top-0 z-30 bg-coal-950 text-white">
        <div className="mx-auto flex max-w-shell items-center justify-between gap-3 px-5 py-3 lg:px-8">
          <Link href="/admin" className="flex min-h-tap flex-col justify-center leading-none">
            <span className="text-[1.05rem] font-bold text-brand-300">{BRAND.name}</span>
            <span className="mt-1 text-[0.7rem] text-white/50">Admin</span>
          </Link>

          <div className="flex items-center gap-3">
            <span className="hidden text-right sm:block">
              <span className="block text-sm text-white/85">{session.user.name}</span>
              <span className="block text-[0.7rem] uppercase tracking-wider text-brand-300">
                {session.user.role.replace('_', ' ')}
              </span>
            </span>
            <AdminLogoutButton />
          </div>
        </div>

        {/* Chhoti screen par upar sarakti patti — wahan side nav aadhi jagah kha jata */}
        <nav className="mx-auto flex max-w-shell gap-1 overflow-x-auto px-5 lg:hidden">
          {tabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className="inline-flex min-h-tap shrink-0 items-center gap-2 rounded-t-card px-4 text-sm font-semibold text-white/70 transition hover:bg-white/10 hover:text-white"
            >
              <tab.Icon className="h-4 w-4" />
              {tab.label}
            </Link>
          ))}
        </nav>
      </header>

      <div className="mx-auto flex max-w-shell gap-8 px-5 py-6 lg:px-8">
        <aside className="hidden w-52 shrink-0 lg:block">
          <nav className="sticky top-24 space-y-1">
            {tabs.map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                className="flex min-h-tap items-center gap-3 rounded-card px-4 text-[0.95rem] font-semibold text-ink-soft transition hover:bg-paper-raised hover:text-brand-700 hover:shadow-soft"
              >
                <tab.Icon className="h-5 w-5" />
                {tab.label}
              </Link>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  )
}
