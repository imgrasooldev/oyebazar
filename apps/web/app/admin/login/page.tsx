import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { BRAND } from '@oyebazar/shared'
import { AdminLoginForm } from '@/components/admin-login-form'
import { getOpsUserOrNull } from '@/lib/api/admin-session'

export const metadata: Metadata = {
  title: 'Admin',
  // Admin ka darwaza search mein nahi aana chahiye
  robots: { index: false, follow: false },
}
export const dynamic = 'force-dynamic'

export default async function AdminLoginPage() {
  const session = await getOpsUserOrNull()
  if (session) redirect('/admin')

  return (
    <div dir="ltr" className="mx-auto max-w-md px-5 py-14 font-sans">
      <div className="text-center">
        <p className="text-3xl font-bold text-brand-600">{BRAND.name}</p>
        <p className="mt-1 text-sm font-semibold text-ink-soft">Admin</p>
      </div>

      <div className="card mt-7 p-6">
        <h1 className="text-xl font-bold">Sign in</h1>
        <p className="mt-1 text-sm leading-relaxed text-ink-soft">
          Enter the WhatsApp number registered for your ops account. The code arrives on
          WhatsApp — there is no password.
        </p>
        <div className="mt-5">
          <AdminLoginForm />
        </div>
      </div>
    </div>
  )
}
