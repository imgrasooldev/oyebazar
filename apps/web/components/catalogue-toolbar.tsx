'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import type { Route } from 'next'

/**
 * Tarteeb aur shakl — dono URL mein.
 *
 * Shakl (grid ya qatar) bhi URL mein hai, browser ki yaadasht mein nahi: jo reseller
 * qatar wali shakl pasand karti hai wo apna link bhej sakti hai, aur do device par ek
 * jaisa safha khulta hai. Cookie mein rakhte to safha har banday ko alag dikhta aur
 * "mere yahan aisa nahi dikh raha" wali baat shuru ho jati.
 */
const SORTS = ['newest', 'priceLow', 'priceHigh', 'profitHigh'] as const

export function CatalogueToolbar({
  count,
  labels,
}: {
  count: number
  labels: {
    results: string
    sortNewest: string
    sortPriceLow: string
    sortPriceHigh: string
    sortProfit: string
    viewGrid: string
    viewList: string
  }
}) {
  const router = useRouter()
  const params = useSearchParams()

  const sort = (params.get('sort') ?? 'newest') as (typeof SORTS)[number]
  const view = params.get('view') === 'list' ? 'list' : 'grid'

  function set(key: string, value: string | null) {
    const next = new URLSearchParams(params.toString())
    // Default qadar URL se nikal jati hai — pata saaf rehta hai aur bhejne laiq
    if (value === null) next.delete(key)
    else next.set(key, value)

    const query = next.toString()
    router.push((query ? `/catalogue?${query}` : '/catalogue') as Route, { scroll: false })
  }

  const sortLabel = {
    newest: labels.sortNewest,
    priceLow: labels.sortPriceLow,
    priceHigh: labels.sortPriceHigh,
    profitHigh: labels.sortProfit,
  }

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
      <span className="numeric text-[0.82rem] text-ink-faint">
        {count} {labels.results}
      </span>

      <div className="ms-auto flex flex-wrap items-center gap-2">
        {SORTS.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => set('sort', option === 'newest' ? null : option)}
            className={`inline-flex min-h-tap items-center rounded-pill px-3.5 text-[0.78rem] font-semibold transition ${
              sort === option
                ? 'bg-coal-900 text-white'
                : 'bg-paper-sunken text-ink-soft hover:text-ink'
            }`}
          >
            {sortLabel[option]}
          </button>
        ))}

        {/*
          Shakl ka switch — do halat, is liye do button, koi menu nahi. Tarteeb se alag
          cheez hai, is liye beech mein lakeer.
        */}
        <span aria-hidden="true" className="mx-1 hidden h-5 w-px bg-black/[0.08] sm:block" />

        <span className="flex overflow-hidden rounded-pill bg-paper-sunken">
          <button
            type="button"
            onClick={() => set('view', null)}
            className={`inline-flex min-h-tap items-center px-4 text-[0.78rem] font-semibold transition ${
              view === 'grid' ? 'bg-brand-500 text-white' : 'text-ink-soft hover:text-ink'
            }`}
          >
            {labels.viewGrid}
          </button>
          <button
            type="button"
            onClick={() => set('view', 'list')}
            className={`inline-flex min-h-tap items-center px-4 text-[0.78rem] font-semibold transition ${
              view === 'list' ? 'bg-brand-500 text-white' : 'text-ink-soft hover:text-ink'
            }`}
          >
            {labels.viewList}
          </button>
        </span>
      </div>
    </div>
  )
}
