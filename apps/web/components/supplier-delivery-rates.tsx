'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

/**
 * Delivery ka rate — do khaane, dukan ke apne.
 *
 * 🔴 Rate wohi likhta hai jo courier ka bill bharta hai. Pehle reseller order lagate
 * waqt jo marzi likh deti thi (0 bhi), aur nuqsan chup chaap dukan ke zimme aa jata —
 * pata bhi delivery ke baad chalta.
 *
 * Do khaane is liye ke courier ka bill bhi do tarah ka hota hai: sheher ke andar, aur
 * sheher se bahar.
 */
export function SupplierDeliveryRates({
  city,
  other,
  labels,
}: {
  city: number
  other: number
  labels: { title: string; inCity: string; outCity: string; save: string; saved: string; note: string }
}) {
  const router = useRouter()
  const [cityRate, setCityRate] = useState(city)
  const [otherRate, setOtherRate] = useState(other)
  const [pending, setPending] = useState(false)
  const [saved, setSaved] = useState(false)

  const changed = cityRate !== city || otherRate !== other

  async function save() {
    setPending(true)
    setSaved(false)

    const res = await fetch('/api/v1/supplier/delivery-rates', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ city: cityRate, other: otherRate }),
    })

    setPending(false)
    if (!res.ok) return

    setSaved(true)
    router.refresh()
  }

  return (
    <div className="card p-5">
      <p className="text-[0.78rem] text-ink-faint">{labels.title}</p>

      <div className="mt-3 flex flex-wrap items-end gap-4">
        <label className="block">
          <span className="text-[0.8rem] font-semibold">{labels.inCity}</span>
          <input
            type="number"
            min={0}
            max={5000}
            value={cityRate}
            onChange={(event) => setCityRate(Math.max(0, Number(event.target.value)))}
            dir="ltr"
            className="numeric mt-1 block w-28 rounded-card bg-paper-sunken px-3 py-2 text-center font-bold"
          />
        </label>

        <label className="block">
          <span className="text-[0.8rem] font-semibold">{labels.outCity}</span>
          <input
            type="number"
            min={0}
            max={5000}
            value={otherRate}
            onChange={(event) => setOtherRate(Math.max(0, Number(event.target.value)))}
            dir="ltr"
            className="numeric mt-1 block w-28 rounded-card bg-paper-sunken px-3 py-2 text-center font-bold"
          />
        </label>

        {/* Button sirf tab jab qadar waqai badli ho — warna har safhe par ek bekar button */}
        {changed && (
          <button
            type="button"
            disabled={pending}
            onClick={() => void save()}
            className="rounded-pill bg-brand-500 px-5 py-2 text-[0.8rem] font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
          >
            {pending ? '…' : labels.save}
          </button>
        )}
      </div>

      <p className="mt-2 text-[0.74rem] text-ink-faint">{saved ? labels.saved : labels.note}</p>
    </div>
  )
}
