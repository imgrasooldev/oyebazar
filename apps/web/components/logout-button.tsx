'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { LogoutIcon } from '@/components/icons'

/** 🔴 Logout se us reseller ki saari sessions khatam hoti hain — har device se. */
export function LogoutButton({ label }: { label: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await fetch('/api/v1/auth/logout', { method: 'POST' })
          router.replace('/')
          router.refresh()
        })
      }
      aria-label={label}
      className="inline-flex min-h-tap min-w-tap items-center justify-center gap-2 rounded-pill bg-paper-raised px-4 text-sm font-semibold text-ink-soft shadow-soft ring-1 ring-black/[0.06] transition hover:text-brand-700 hover:shadow-lift disabled:opacity-50"
    >
      <LogoutIcon className="h-4 w-4" />
      <span className="hidden sm:inline">{pending ? '…' : label}</span>
    </button>
  )
}
