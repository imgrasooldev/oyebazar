'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

/**
 * Ek POST button (invoice banana jaise kaam ke liye).
 *
 * `AdminRowAction` PATCH karta hai kisi ek row par; ye poore safhe ka kaam karta hai
 * aur nateeja dikhata hai — "12 invoice bane" jaisa jawab dekhe baghair ops ko pata
 * nahi chalta ke kuch hua bhi ya nahi.
 */
export function AdminPostAction({
  endpoint,
  label,
  confirmText,
}: {
  endpoint: string
  label: string
  confirmText?: string
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function run() {
    if (confirmText && !window.confirm(confirmText)) return

    setPending(true)
    setError(null)
    setResult(null)

    const res = await fetch(endpoint, { method: 'POST' })
    const payload = (await res.json().catch(() => null)) as
      | { count?: number; total?: number; error?: { message?: string } }
      | null

    setPending(false)

    if (!res.ok) {
      setError(payload?.error?.message ?? 'Could not run')
      return
    }

    // Sifar bhi ek jawab hai: "kuch nahi bana" chhupana ops ko dobara dabane par majboor karta hai
    setResult(`${payload?.count ?? 0} invoices`)
    router.refresh()
  }

  return (
    <span className="inline-flex items-center gap-3">
      <button
        type="button"
        disabled={pending}
        onClick={() => void run()}
        className="inline-flex min-h-[2.25rem] items-center rounded-pill bg-brand-500 px-4 text-[0.8rem] font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
      >
        {pending ? '…' : label}
      </button>

      {result && <span className="text-[0.78rem] font-semibold text-accent-700">{result}</span>}
      {error && <span className="text-[0.78rem] text-red-600">{error}</span>}
    </span>
  )
}
