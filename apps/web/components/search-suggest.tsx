'use client'

import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import { useEffect, useId, useRef, useState } from 'react'
import { SearchIcon } from '@/components/icons'
import { pickName, translator, type Locale } from '@/lib/i18n'

interface Suggestion {
  readonly type: 'category' | 'supplier' | 'product'
  readonly label: string
  readonly hint?: string
  readonly imageUrl?: string | null
  readonly href: string
}

type Source = 'public' | 'catalogue'

/**
 * Search ki tajweez wali patti (Amazon jaisi).
 *
 * Kis liye: reseller ko maal ka poora naam yaad nahi hota — wo "lawn" likhti hai aur
 * chahti hai ke list wahin khul jaye. Har baar poora safha load karna sasta phone par
 * kai second le leta hai.
 *
 * Faisle:
 *  · 250ms ka intezar (debounce) — har harf par request bhejna data bhi khata hai aur
 *    server bhi. Sadia ka data mehnga hai.
 *  · Purani request ka jawab naye se pehle aa jaye to usay phenk dete hain (AbortController),
 *    warna patti mein purane alfaz ke nataij chipak jate hain.
 *  · Keyboard se bhi chalta hai (↑ ↓ Enter Esc) — dukan par log keyboard hi use karte hain.
 *  · Do min ke baad hi chalta hai: ek harf par poori list dena bekar hai.
 *
 * 🔴 Public patti public endpoint se chalti hai jahan qeemat hai hi nahi; login ke baad
 * wali alag endpoint se, jahan reseller ka apna rate aur munafa aata hai.
 */
export function SearchSuggest({
  locale,
  source,
  defaultValue = '',
  action,
  className = '',
  autoFocus = false,
  placeholder,
}: {
  locale: Locale
  source: Source
  defaultValue?: string
  /** Enter dabane par kis safhe par jana hai (form ka action) */
  action: string
  className?: string
  autoFocus?: boolean
  /** Na den to public wala jumla — catalogue par "apne maal mein talash karen" behtar hai */
  placeholder?: string
}) {
  const t = translator(locale)
  const router = useRouter()
  const listId = useId()

  const [query, setQuery] = useState(defaultValue)
  const [items, setItems] = useState<Suggestion[]>([])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)

  const boxRef = useRef<HTMLDivElement>(null)

  // Bahar click karne par patti band — warna wo safhe par latki rehti hai
  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  useEffect(() => {
    const needle = query.trim()
    if (needle.length < 2) {
      setItems([])
      return
    }

    const controller = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const endpoint =
          source === 'catalogue' ? '/api/v1/catalogue/suggest' : '/api/v1/search/suggest'
        const res = await fetch(`${endpoint}?q=${encodeURIComponent(needle)}`, {
          signal: controller.signal,
        })
        if (!res.ok) return

        const data = (await res.json()) as SuggestResponse
        setItems(toSuggestions(data, locale, source))
        setActive(-1)
        setOpen(true)
      } catch {
        // Abort ya network — patti khamosh rehti hai, ghalti dikhane ki koi wajah nahi
      }
    }, 250)

    return () => {
      controller.abort()
      clearTimeout(timer)
    }
  }, [query, locale, source])

  function go(item: Suggestion) {
    setOpen(false)
    // typedRoutes yahan sahi nahi bata sakta: href niche `toSuggestions` mein banta hai
    // aur teen mein se ek maloom shakl hota hai (/bazaar, /bazaar/<slug>, /catalogue/<id>).
    router.push(item.href as Route)
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || items.length === 0) return

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive((index) => (index + 1) % items.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((index) => (index <= 0 ? items.length - 1 : index - 1))
    } else if (event.key === 'Enter' && active >= 0) {
      // Patti mein se koi chuna hua ho to form submit na ho — seedha wahin jayen
      event.preventDefault()
      go(items[active]!)
    } else if (event.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={boxRef} className={`relative ${className}`}>
      <form action={action} className="relative">
        <span className="pointer-events-none absolute inset-y-0 start-5 flex items-center text-ink-faint">
          <SearchIcon />
        </span>

        <input
          type="search"
          name="q"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => items.length > 0 && setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder ?? t('searchPlaceholder')}
          aria-label={t('search')}
          /*
           * `role="combobox"` — sirf lint chup karane ke liye nahi.
           *
           * `aria-expanded` sada input (textbox) par bemani hota hai: screen reader use
           * karne wali ko ye pata hi nahi chalta ke neeche mashware khul chuke hain.
           * Combobox wo role hai jo "khaana + neeche list" ke liye bana hai, aur wohi
           * `aria-expanded` ko maani deta hai.
           */
          role="combobox"
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={open}
          autoComplete="off"
          autoFocus={autoFocus}
          className="search-input ps-14"
        />

        <button
          type="submit"
          className="absolute inset-y-1 end-1 rounded-pill bg-brand-700 px-6 text-sm font-semibold text-white transition hover:bg-brand-800"
        >
          {t('search')}
        </button>
      </form>

      {open && items.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-card bg-paper-raised py-1 shadow-lift ring-1 ring-black/[0.06]"
        >
          {items.map((item, index) => (
            <li key={`${item.type}-${item.href}`} role="option" aria-selected={index === active}>
              <button
                type="button"
                onMouseEnter={() => setActive(index)}
                onClick={() => go(item)}
                className={`flex w-full items-center gap-3 px-4 py-2.5 text-start transition ${
                  index === active ? 'bg-brand-50' : ''
                }`}
              >
                <span className="h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-paper-sunken">
                  {item.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element -- storage URLs; next/image Phase 2
                    <img
                      src={item.imageUrl}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  )}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.92rem]">{item.label}</span>
                  {item.hint && (
                    <span className="block truncate text-[0.75rem] text-ink-faint">
                      {item.hint}
                    </span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

interface SuggestResponse {
  categories?: { slug: string; nameUr: string; nameEn: string }[]
  suppliers?: { slug: string; nameUr: string; nameEn: string; city?: string }[]
  products?: {
    id?: string
    slug?: string
    nameUr: string
    nameEn: string
    imageUrl?: string | null
    hint?: string
    profit?: number
  }[]
}

/** Server ka jawab patti ki qatar mein — tarteeb wohi jo server ne di. */
function toSuggestions(data: SuggestResponse, locale: Locale, source: Source): Suggestion[] {
  const name = (row: { nameUr: string; nameEn: string }) =>
    pickName(locale, { nameUr: row.nameUr, nameEn: row.nameEn })

  const categories = (data.categories ?? []).map((row) => ({
    type: 'category' as const,
    label: name(row),
    href: `/bazaar?category=${encodeURIComponent(row.slug)}`,
  }))

  const suppliers = (data.suppliers ?? []).map((row) => ({
    type: 'supplier' as const,
    label: name(row),
    ...(row.city ? { hint: row.city } : {}),
    href: `/bazaar/${encodeURIComponent(row.slug)}`,
  }))

  const products = (data.products ?? []).map((row) => ({
    type: 'product' as const,
    label: name(row),
    imageUrl: row.imageUrl ?? null,
    // Login ke baad munafa yahin dikh jata hai — wohi faisla karne wala number hai.
    // Public par dukan ka naam, kyunke rate wahin se poochha jata hai.
    ...(row.profit !== undefined
      ? { hint: `+${row.profit}` }
      : row.hint
        ? { hint: row.hint }
        : {}),
    href:
      source === 'catalogue'
        ? `/catalogue/${encodeURIComponent(row.id ?? '')}`
        : `/bazaar/${encodeURIComponent(row.slug ?? '')}`,
  }))

  return [...categories, ...suppliers, ...products]
}
