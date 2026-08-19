'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { VariantView } from '@oyebazar/core'

/**
 * Rang aur size — har jorhe ki apni ginti.
 *
 * 🔴 Ye "ek maal, ek ginti" wale purane tareeqe ki jagah nahi leta, us ke ooper aata
 * hai. Jis maal par variants na hon wo waise hi chalta rehta hai; jis par hon, us ki
 * kul ginti in ke jama se banti hai.
 *
 * Ginti seedha qatar mein badalti hai — koi safha nahi khulta. Dukan par jaldi hoti hai
 * aur maal ginte waqt haath mein maal hota hai, phone par do safhe nahi khole jate.
 */
export function SupplierVariants({
  productId,
  variants,
  labels,
}: {
  productId: string
  variants: readonly VariantView[]
  labels: {
    title: string
    colour: string
    size: string
    qty: string
    add: string
    remove: string
    total: string
    empty: string
    saving: string
  }
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [colour, setColour] = useState('')
  const [size, setSize] = useState('')
  const [qty, setQty] = useState(0)

  async function call(url: string, method: string, body?: unknown) {
    setBusy(true)
    setError(null)

    const res = await fetch(url, {
      method,
      ...(body === undefined
        ? {}
        : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    })
    setBusy(false)

    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as {
        error?: { message?: string }
      } | null
      setError(data?.error?.message ?? 'Nahi ho saka — dobara koshish karen')
      return false
    }

    router.refresh()
    return true
  }

  const total = variants.reduce((sum, variant) => sum + variant.stockQty, 0)

  return (
    <div className="mt-3 rounded-card bg-paper-sunken p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[0.78rem] font-semibold text-ink-soft">{labels.title}</p>
        <p className="text-[0.75rem] text-ink-faint">
          {labels.total}{' '}
          <span dir="ltr" className="numeric font-bold text-ink">
            {total}
          </span>
        </p>
      </div>

      {variants.length === 0 ? (
        <p className="mt-2 text-[0.78rem] text-ink-faint">{labels.empty}</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {variants.map((variant) => (
            <li key={variant.id} className="flex flex-wrap items-center gap-2">
              <span className="min-w-[7rem] text-[0.82rem]">
                {[variant.colour, variant.size].filter(Boolean).join(' · ') || '—'}
              </span>

              <input
                type="number"
                min={0}
                defaultValue={variant.stockQty}
                dir="ltr"
                // Jab maal gin kar likha jaye, tabhi bheja jaye — har hindse par nahi
                onBlur={(event) => {
                  const value = Math.max(0, Number(event.target.value))
                  if (value === variant.stockQty) return
                  void call(
                    `/api/v1/supplier/products/${productId}/variants/${variant.id}`,
                    'PATCH',
                    { stockQty: value },
                  )
                }}
                className="numeric w-20 rounded-card bg-paper-raised px-3 py-1 text-center text-sm font-bold"
              />

              {variant.stockQty === 0 && (
                <span className="rounded-pill bg-coal-900/85 px-2 py-0.5 text-[0.68rem] font-semibold text-white">
                  0
                </span>
              )}

              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  void call(
                    `/api/v1/supplier/products/${productId}/variants/${variant.id}`,
                    'DELETE',
                  )
                }}
                className="ms-auto rounded-card px-2 py-1 text-[0.72rem] font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
              >
                {labels.remove}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-paper-raised pt-3">
        <input
          value={colour}
          onChange={(event) => setColour(event.target.value)}
          placeholder={labels.colour}
          className="w-28 rounded-card bg-paper-raised px-3 py-1.5 text-sm"
        />
        <input
          value={size}
          onChange={(event) => setSize(event.target.value)}
          placeholder={labels.size}
          className="w-24 rounded-card bg-paper-raised px-3 py-1.5 text-sm"
        />
        <input
          type="number"
          min={0}
          value={qty}
          onChange={(event) => setQty(Math.max(0, Number(event.target.value)))}
          dir="ltr"
          placeholder={labels.qty}
          className="numeric w-20 rounded-card bg-paper-raised px-3 py-1.5 text-center text-sm"
        />
        <button
          type="button"
          // Dono khali ho to wo "sada" variant hai — us ke liye alag qatar bekar hai
          disabled={busy || (!colour.trim() && !size.trim())}
          onClick={() => {
            void call(`/api/v1/supplier/products/${productId}/variants`, 'POST', {
              ...(colour.trim() ? { colour: colour.trim() } : {}),
              ...(size.trim() ? { size: size.trim() } : {}),
              stockQty: qty,
            }).then((ok) => {
              if (!ok) return
              setColour('')
              setSize('')
              setQty(0)
            })
          }}
          className="rounded-pill bg-brand-500 px-4 py-1.5 text-[0.78rem] font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
        >
          {busy ? labels.saving : labels.add}
        </button>
      </div>

      {error && <p className="mt-2 text-[0.75rem] text-red-600">{error}</p>}
    </div>
  )
}
