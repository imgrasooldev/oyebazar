'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { GridIcon, ListIcon } from '@/components/icons'
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
  hasMore,
  labels,
}: {
  count: number
  /**
   * Kya is se aage bhi maal hai.
   *
   * 🔴 Pehle yahan sirf `count` tha, aur wo `items.length` se aata tha — yani "48
   * نتائج" har dafa chhapta chahe catalogue mein 274 cheezein hon. Ye ginti reseller
   * ke liye ek jhoot thi: wo samajhti thi ke poora catalogue dekh chuki hai.
   */
  hasMore: boolean
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
        {count}
        {hasMore ? '+' : ''} {labels.results}
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

        {/*
          🔴 Shakl ka chunao LAFZ se nahi, NISHAN se.

          Baqi tamam button us patti par ek FAISLA hain — "sasta pehle", "behtar
          munafa" — aur wo lafzon ke baghair samajh nahi aate. Ye do us se alag hain:
          ye faisla nahi, sirf yehi ke wohi cheez kis shakl mein dikhe. Un ke saath
          "Grid" aur "List" likhna do baatein karta tha: patti ka aakhri hissa baqi ke
          barabar bhaari lagta tha, aur "Grid" wo angrezi lafz hai jo hamari reseller ke
          liye tasveer se ziyada kuch nahi kehta.

          Nishan khud apni shakl bata deta hai — chaar khaane, ya qatarein.

          🔴 `aria-label` aur `title` ab bhi wohi lafz rakhte hain. Nishan
          dekhne wale ke liye hai; jo screen reader se parhta hai us ke liye "button"
          ka koi matlab nahi banta, aur jo maus rok kar poochhna chahe usay bhi jawab
          milna chahiye.
        */}
        <span className="flex overflow-hidden rounded-pill bg-paper-sunken">
          <button
            type="button"
            onClick={() => set('view', null)}
            aria-label={labels.viewGrid}
            aria-pressed={view === 'grid'}
            title={labels.viewGrid}
            className={`inline-flex min-h-tap items-center px-3.5 transition ${
              view === 'grid' ? 'bg-brand-500 text-white' : 'text-ink-soft hover:text-ink'
            }`}
          >
            <GridIcon className="h-[1.05rem] w-[1.05rem]" />
          </button>
          <button
            type="button"
            onClick={() => set('view', 'list')}
            aria-label={labels.viewList}
            aria-pressed={view === 'list'}
            title={labels.viewList}
            className={`inline-flex min-h-tap items-center px-3.5 transition ${
              view === 'list' ? 'bg-brand-500 text-white' : 'text-ink-soft hover:text-ink'
            }`}
          >
            <ListIcon className="h-[1.05rem] w-[1.05rem]" />
          </button>
        </span>
      </div>
    </div>
  )
}
