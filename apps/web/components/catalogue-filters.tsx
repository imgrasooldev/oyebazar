'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import type { Route } from 'next'

/**
 * Catalogue ke filter — rate ki hadd aur "sirf mojood maal".
 *
 * 🔴 Server pehle se ye teenon jaanta tha (`minPrice`, `maxPrice`, `inStockOnly`) magar
 * safha kabhi bhejta hi nahi tha — yani suvidha likhi hui thi aur kisi ke kaam nahi
 * aa rahi thi.
 *
 * Filter URL mein jate hain, kisi andaruni state mein nahi. Wajah amli hai: reseller
 * apni chuni hui list ka link WhatsApp par doosri reseller ko bhejti hai, aur peeche
 * jane ka button bhi wahi list wapas laata hai jo wo dekh rahi thi.
 */
export function CatalogueFilters({
  labels,
}: {
  labels: {
    price: string
    from: string
    to: string
    inStockOnly: string
    apply: string
    clear: string
  }
}) {
  const router = useRouter()
  const params = useSearchParams()

  const [minPrice, setMinPrice] = useState(params.get('minPrice') ?? '')
  const [maxPrice, setMaxPrice] = useState(params.get('maxPrice') ?? '')
  const inStockOnly = params.get('inStockOnly') === 'true'

  function go(next: URLSearchParams) {
    const query = next.toString()
    router.push((query ? `/catalogue?${query}` : '/catalogue') as Route)
  }

  function apply() {
    const next = new URLSearchParams(params.toString())

    // Khali khaana = "koi hadd nahi", is liye us ka param hi nahi jata — warna URL
    // mein `minPrice=` jaisa khali kachra jama hota rehta hai
    if (minPrice.trim()) next.set('minPrice', String(Math.max(0, Number(minPrice))))
    else next.delete('minPrice')

    if (maxPrice.trim()) next.set('maxPrice', String(Math.max(0, Number(maxPrice))))
    else next.delete('maxPrice')

    go(next)
  }

  function toggleStock() {
    const next = new URLSearchParams(params.toString())
    if (inStockOnly) next.delete('inStockOnly')
    else next.set('inStockOnly', 'true')
    go(next)
  }

  const dirty = minPrice.trim() !== '' || maxPrice.trim() !== '' || inStockOnly

  return (
    <div className="card flex flex-wrap items-center gap-x-4 gap-y-3 p-4">
      <span className="text-[0.8rem] font-semibold text-ink-soft">{labels.price}</span>

      <div className="flex items-center gap-2">
        <input
          type="number"
          min={0}
          value={minPrice}
          onChange={(event) => setMinPrice(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && apply()}
          placeholder={labels.from}
          dir="ltr"
          className="numeric min-h-tap w-24 rounded-card bg-paper-sunken px-3 text-center text-sm"
        />
        <span className="text-ink-faint">—</span>
        <input
          type="number"
          min={0}
          value={maxPrice}
          onChange={(event) => setMaxPrice(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && apply()}
          placeholder={labels.to}
          dir="ltr"
          className="numeric min-h-tap w-24 rounded-card bg-paper-sunken px-3 text-center text-sm"
        />
      </div>

      <button
        type="button"
        onClick={apply}
        className="inline-flex min-h-tap items-center rounded-pill bg-brand-500 px-5 text-[0.78rem] font-semibold text-white transition hover:bg-brand-700"
      >
        {labels.apply}
      </button>

      {/*
        "Sirf mojood maal" ek tap par chalta hai, Apply ka intezar nahi karta — ye
        haan/na wala sawal hai aur us par do qadam lena bekar hai. Lakeer is liye ke
        ye rate ki hadd se alag sawal hai.
      */}
      <span aria-hidden="true" className="hidden h-6 w-px bg-black/[0.08] sm:block" />

      <button
        type="button"
        onClick={toggleStock}
        className={`inline-flex min-h-tap items-center rounded-pill px-4 text-[0.78rem] font-semibold transition ${
          inStockOnly
            ? 'bg-accent-500 text-white'
            : 'bg-paper-sunken text-ink-soft hover:text-ink'
        }`}
      >
        {labels.inStockOnly}
      </button>

      {dirty && (
        <button
          type="button"
          onClick={() => {
            setMinPrice('')
            setMaxPrice('')
            const next = new URLSearchParams(params.toString())
            next.delete('minPrice')
            next.delete('maxPrice')
            next.delete('inStockOnly')
            go(next)
          }}
          className="ms-auto inline-flex min-h-tap items-center rounded-card px-3 text-[0.78rem] font-semibold text-ink-faint transition hover:text-ink"
        >
          {labels.clear}
        </button>
      )}
    </div>
  )
}
