'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

/**
 * Admin ka ek button jo ek row par kaam karta hai (verify, approve, suspend…).
 *
 * Ek hi component sab jagah: har list ke liye alag button likhne par ghalti ki
 * gunjaish barhti hai, aur asli faisla waise bhi server par hota hai.
 *
 * `confirmText` diya ho to pehle poochha jata hai — suspend/archive jaise kaam wapas
 * lena mushkil hota hai, aur ops thake hue haath se list scroll kar rahi hoti hai.
 */
export function AdminRowAction({
  endpoint,
  body,
  label,
  tone = 'plain',
  confirmText,
}: {
  endpoint: string
  body: Record<string, unknown>
  label: string
  tone?: 'plain' | 'primary' | 'danger'
  confirmText?: string
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function run() {
    if (confirmText && !window.confirm(confirmText)) return

    setPending(true)
    setError(null)

    const res = await fetch(endpoint, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    setPending(false)

    if (!res.ok) {
      const payload = (await res.json().catch(() => null)) as { error?: { message?: string } } | null
      // 403 ka matlab role kam hai — ye ghalti nahi, ijazat ka masla hai
      setError(payload?.error?.message ?? 'Could not apply')
      return
    }

    router.refresh()
  }

  const styles = {
    plain: 'bg-paper-sunken text-ink-soft hover:text-ink',
    primary: 'bg-brand-500 text-white hover:bg-brand-700',
    danger: 'bg-coal-900 text-white hover:bg-coal-700',
  }[tone]

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => void run()}
        className={`inline-flex min-h-[2.25rem] items-center rounded-pill px-3 text-[0.8rem] font-semibold transition disabled:opacity-60 ${styles}`}
      >
        {pending ? '…' : label}
      </button>
      {error && <span className="text-[0.7rem] text-red-600">{error}</span>}
    </span>
  )
}
