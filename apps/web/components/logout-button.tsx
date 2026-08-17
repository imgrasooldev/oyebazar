'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'

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
      className="rounded-lg ring-1 ring-black/10 px-3 py-2 text-sm"
    >
      {pending ? '…' : label}
    </button>
  )
}
