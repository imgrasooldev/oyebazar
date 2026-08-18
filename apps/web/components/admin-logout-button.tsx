'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { LogoutIcon } from '@/components/icons'

export function AdminLogoutButton() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await fetch('/api/v1/admin/auth/logout', { method: 'POST' })
          router.replace('/admin/login')
          router.refresh()
        })
      }
      aria-label="Log out"
      className="inline-flex min-h-tap min-w-tap items-center justify-center gap-2 rounded-pill bg-white/10 px-4 text-sm font-semibold text-white/80 transition hover:bg-white/20 hover:text-white disabled:opacity-50"
    >
      <LogoutIcon className="h-4 w-4" />
      <span className="hidden sm:inline">{pending ? '…' : 'Log out'}</span>
    </button>
  )
}
