'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

/**
 * Stock on/off — ek tap.
 *
 * Button foran badalta hai (optimistic), server ka intezar nahi karwata: dukan par
 * net sust hota hai aur ye button din mein kai bar dabta hai. Server na maane to
 * wapas apni purani halat par le jate hain aur ghalti dikhate hain — chup nahi rehte,
 * warna wholesaler samjhega maal band ho gaya aur order aate rahenge.
 */
export function SupplierStockToggle({
  productId,
  inStock,
  labels,
}: {
  productId: string
  inStock: boolean
  labels: { inStock: string; outOfStock: string }
}) {
  const router = useRouter()
  const [on, setOn] = useState(inStock)
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)

  async function toggle() {
    const next = !on
    setOn(next)
    setPending(true)
    setFailed(false)

    const res = await fetch(`/api/v1/supplier/products/${productId}/stock`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inStock: next }),
    })

    setPending(false)
    if (!res.ok) {
      setOn(!next)
      setFailed(true)
      return
    }
    router.refresh()
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={on ? labels.inStock : labels.outOfStock}
        disabled={pending}
        onClick={() => void toggle()}
        className={`inline-flex min-h-tap items-center gap-2 rounded-pill px-4 text-sm font-bold transition disabled:opacity-60 ${
          on
            ? 'bg-accent-50 text-accent-700 ring-1 ring-accent-300'
            : 'bg-coal-900 text-white/90'
        }`}
      >
        <span
          aria-hidden
          className={`h-2.5 w-2.5 rounded-full ${on ? 'bg-accent-500' : 'bg-brand-500'}`}
        />
        {on ? labels.inStock : labels.outOfStock}
      </button>

      {failed && <span className="text-[0.75rem] text-red-600">دوبارہ کوشش کریں</span>}
    </div>
  )
}
