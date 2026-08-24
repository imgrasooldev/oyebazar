'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { LogoutIcon } from '@/components/icons'

/** 🔴 Logout se dukan ki saari sessions khatam — har device se (dukan ka phone kai haathon mein hota hai). */
export function SupplierLogoutButton({ label }: { label: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await fetch('/api/v1/supplier/auth/logout', { method: 'POST' })
          router.replace('/supplier/login')
          router.refresh()
        })
      }
      aria-label={label}
      className="inline-flex min-h-tap min-w-tap items-center justify-center gap-2 rounded-pill bg-white/10 px-3 text-sm font-semibold text-white/80 transition hover:bg-white/20 hover:text-white disabled:opacity-50 lg:min-h-0 lg:min-w-0 lg:py-1.5 lg:text-[0.82rem]"
    >
      <LogoutIcon className="h-4 w-4" />
      <span className="hidden sm:inline">{pending ? '…' : label}</span>
    </button>
  )
}
