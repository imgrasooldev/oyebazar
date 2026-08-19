'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

/**
 * Maal ki ginti.
 *
 * Switch (band/chalu) apni jagah rehta hai — jaldi mein wohi kaam ka hai. Ye us ke
 * saath hai, us ki jagah nahi: "kitna bacha hai" alag sawal hai "abhi bech sakte hain
 * ya nahi" se.
 *
 * Ginti sifar karte hi listing khud band ho jati hai (server par) — do jagah alag alag
 * batana hi wo soorat banata hai jahan reseller ko "mojood" dikhta hai aur dukan par
 * kuch nahi hota.
 */
export function SupplierStockQuantity({
  productId,
  stockQty,
  label,
  saveLabel,
}: {
  productId: string
  stockQty: number
  label: string
  saveLabel: string
}) {
  const router = useRouter()
  const [qty, setQty] = useState(stockQty)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(false)

  const changed = qty !== stockQty

  async function save() {
    setPending(true)
    setError(false)

    const res = await fetch(`/api/v1/supplier/products/${productId}/stock`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qty }),
    })

    setPending(false)
    if (!res.ok) {
      setError(true)
      return
    }
    router.refresh()
  }

  return (
    <div className="flex items-center gap-2">
      <label className="text-[0.72rem] text-ink-faint">{label}</label>
      <input
        type="number"
        min={0}
        value={qty}
        onChange={(event) => setQty(Math.max(0, Number(event.target.value)))}
        dir="ltr"
        className="numeric w-20 rounded-card bg-paper-sunken px-3 py-1.5 text-center text-sm font-bold"
      />

      {/* Button sirf tab jab ginti waqai badli ho — warna har row par ek bekar button */}
      {changed && (
        <button
          type="button"
          disabled={pending}
          onClick={() => void save()}
          className="rounded-pill bg-brand-500 px-3 py-1.5 text-[0.75rem] font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
        >
          {pending ? '…' : saveLabel}
        </button>
      )}

      {error && <span className="text-[0.72rem] text-red-600">✕</span>}
    </div>
  )
}
