'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

/**
 * "Bonus de diya" — ops ki taraf se, TID ke saath.
 *
 * 🔴 Reference lazmi hai, bilkul waise jaise payout par. Jhagre mein "de diya tha" dono
 * taraf se aata hai; TID ek taraf se aata hai. Aur ye raqam chhoti hone ki wajah se
 * KAM ahem nahi hoti — chhoti raqmen wohi hain jin par record rakhna sab se pehle chhora
 * jata hai, aur teen mahine baad wohi jhagra sab se mushkil hota hai.
 */
export function AdminBonusPay({ bonusId }: { bonusId: string }) {
  const router = useRouter()
  const [reference, setReference] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function pay() {
    setPending(true)
    setError(null)

    const response = await fetch(`/api/v1/admin/bonuses/${bonusId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ reference: reference.trim() }),
    }).catch(() => null)

    setPending(false)

    if (!response?.ok) {
      const data = (await response?.json().catch(() => null)) as
        | { error?: { message?: string } }
        | null
      setError(data?.error?.message ?? 'Nahi ho saka')
      return
    }
    router.refresh()
  }

  return (
    <span className="flex flex-wrap items-center gap-2">
      <input
        value={reference}
        onChange={(event) => {
          setReference(event.target.value)
          setError(null)
        }}
        dir="ltr"
        placeholder="TID"
        className="min-h-tap w-28 rounded-card bg-paper-sunken px-3 text-sm"
      />
      <button
        type="button"
        // Chhote reference par server bhi mana karta hai — yahan rokna ek chakkar bachata hai
        disabled={pending || reference.trim().length < 4}
        onClick={() => void pay()}
        className="inline-flex min-h-tap items-center rounded-pill bg-brand-500 px-4 text-[0.76rem] font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
      >
        {pending ? '…' : 'Paid'}
      </button>
      {error && <span className="text-[0.74rem] font-semibold text-red-600">{error}</span>}
    </span>
  )
}
