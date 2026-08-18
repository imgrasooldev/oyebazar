import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BRAND } from '@oyebazar/shared'
import { AdminLogoutButton } from '@/components/admin-logout-button'
import { getOpsUserOrNull } from '@/lib/api/admin-session'

export const dynamic = 'force-dynamic'

/**
 * Admin portal.
 *
 * 🔴 Angrezi mein — jaan boojh kar. Ye andaruni auzaar hai jo ops team chalati hai;
 * customer-facing safhay teen zubanon mein hain kyunke wahan zaban rukawat banti hai.
 * Yahan har jumla teen jagah likhne ka matlab hai har nayi screen teen guna mehngi —
 * aur ops team ki apni zaban angrezi hai.
 *
 * Role har screen par likha hai: ops ka banda jaanta ho ke us ke paas kitna ikhtiyar
 * hai, warna wo aisa button dhoondta rehta hai jo us ke liye hai hi nahi.
 */
const TABS = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/orders', label: 'Orders' },
  { href: '/admin/suppliers', label: 'Wholesalers' },
  { href: '/admin/products', label: 'Products' },
  { href: '/admin/resellers', label: 'Resellers' },
  { href: '/admin/money', label: 'Money' },
] as const

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getOpsUserOrNull()
  if (!session) redirect('/admin/login')

  return (
    <div dir="ltr" className="min-h-screen bg-paper font-sans">
      <header className="bg-coal-950 text-white">
        <div className="mx-auto flex max-w-shell items-center justify-between gap-3 px-5 py-3 lg:px-8">
          <div className="flex min-h-tap flex-col justify-center leading-none">
            <span className="text-[1.05rem] font-bold text-brand-300">{BRAND.name}</span>
            <span className="mt-1 text-[0.7rem] text-white/50">Admin</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden text-right sm:block">
              <span className="block text-sm text-white/85">{session.user.name}</span>
              <span className="block text-[0.7rem] uppercase tracking-wider text-brand-300">
                {session.user.role}
              </span>
            </span>
            <AdminLogoutButton />
          </div>
        </div>

        <nav className="mx-auto flex max-w-shell gap-1 overflow-x-auto px-5 lg:px-8">
          {TABS.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className="inline-flex min-h-tap shrink-0 items-center rounded-t-card px-4 text-sm font-semibold text-white/70 transition hover:bg-white/10 hover:text-white"
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-shell px-5 py-6 lg:px-8">{children}</main>
    </div>
  )
}
