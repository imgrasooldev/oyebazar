'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

/**
 * Rate ki darkhwast ka faisla — haan ya na.
 *
 * 🔴 "Reject" par wajah LAZMI hai (server bhi yehi maangta hai). Bina wajah ke mana
 * karne ka natija hamesha ek hi hota hai: dukan wala wohi darkhwast dobara bhejta hai,
 * aur ops wohi kaam dobara karti hai.
 *
 * Approve par ek dafa poochha jata hai, kyunke ye wapas nahi hota: rate lag jata hai
 * aur mutasir resellers ka apna rate bhi usi lamhe badal diya jata hai.
 */
export function AdminPriceDecision({
  requestId,
  underWater,
}: {
  requestId: string
  /** Kitni resellers ka rate manzoori par badalna paregi — confirm mein yehi dikhta hai. */
  underWater: number
}) {
  const router = useRouter()
  const [rejecting, setRejecting] = useState(false)
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function decide(body: Record<string, unknown>) {
    setError(null)
    startTransition(async () => {
      const res = await fetch(`/api/v1/admin/price-requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as
          | { error?: { message?: string } }
          | null
        setError(payload?.error?.message ?? 'Something went wrong')
        return
      }

      setRejecting(false)
      router.refresh()
    })
  }

  function approve() {
    const warning =
      underWater > 0
        ? `Approve this price? ${underWater} reseller${underWater === 1 ? '' : 's'} priced below the new cost — their saved price will be raised too. This cannot be undone.`
        : 'Approve this price change? This cannot be undone.'
    if (!window.confirm(warning)) return
    decide({ decision: 'APPROVE' })
  }

  if (rejecting) {
    return (
      <div className="space-y-2">
        <input
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Why? The wholesaler sees this."
          maxLength={200}
          className="field text-sm"
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => decide({ decision: 'REJECT', note })}
            disabled={pending || note.trim().length < 3}
            className="btn-primary text-sm"
          >
            {pending ? 'Sending…' : 'Confirm reject'}
          </button>
          <button
            type="button"
            onClick={() => setRejecting(false)}
            className="btn-secondary text-sm"
          >
            Cancel
          </button>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={approve} disabled={pending} className="btn-primary text-sm">
          {pending ? 'Working…' : 'Approve'}
        </button>
        <button
          type="button"
          onClick={() => setRejecting(true)}
          disabled={pending}
          className="btn-secondary text-sm"
        >
          Reject
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
