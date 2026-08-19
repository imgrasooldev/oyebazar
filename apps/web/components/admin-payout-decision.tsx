'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

/**
 * Jhagre ka faisla — ops ka aakhri qadam.
 *
 * Do hi rukh hain: hisab band kar dena (reseller ki baat maan lena), ya wapas wholesaler
 * ke zimme daal dena. Beech ka koi khaana nahi rakha — "dekh rahe hain" wali halat wo
 * jagah banati hai jahan cheezein mahinon parri rehti hain.
 *
 * 🔴 Wajah lazmi hai, aur ye rok server par bhi hai. Teen mahine baad jab koi poochhega
 * ke ye hisab kis bina par band hua tha, to jawab hona chahiye — "kisi ne button daba
 * diya tha" jawab nahi hai.
 */
export function AdminPayoutDecision({ payoutId }: { payoutId: string }) {
  const router = useRouter()
  const [note, setNote] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function decide(decision: 'SETTLED' | 'PENDING') {
    setPending(true)
    setError(null)

    const res = await fetch(`/api/v1/admin/payouts/${payoutId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision, note }),
    })

    setPending(false)

    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: { message?: string } } | null
      setError(data?.error?.message ?? 'Could not save — try again')
      return
    }
    router.refresh()
  }

  const ready = note.trim().length >= 3

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-paper-sunken pt-3">
      <input
        value={note}
        onChange={(event) => {
          setNote(event.target.value)
          setError(null)
        }}
        placeholder="Why — what did you verify?"
        className="min-w-[14rem] flex-1 rounded-card bg-paper-sunken px-3 py-1.5 text-sm"
      />

      <button
        type="button"
        disabled={pending || !ready}
        onClick={() => void decide('SETTLED')}
        className="rounded-pill bg-accent-500 px-4 py-1.5 text-[0.78rem] font-semibold text-white transition hover:bg-accent-700 disabled:opacity-50"
      >
        {pending ? '…' : 'Close as paid'}
      </button>

      {/* Wapas wholesaler ke zimme — yani reseller ki baat maani gayi ke paisa nahi aaya */}
      <button
        type="button"
        disabled={pending || !ready}
        onClick={() => void decide('PENDING')}
        className="rounded-pill px-4 py-1.5 text-[0.78rem] font-semibold text-ink-soft ring-1 ring-black/[0.08] transition hover:text-ink disabled:opacity-50"
      >
        Back to wholesaler
      </button>

      {error && <span className="w-full text-[0.75rem] text-red-600">{error}</span>}
    </div>
  )
}
