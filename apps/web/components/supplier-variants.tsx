'use client'

import { variantLabel } from '@oyebazar/shared'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
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
  images,
  locale,
  labels,
}: {
  productId: string
  variants: readonly VariantView[]
  /** Rang ka naam isi zaban mein chhapta hai — dekhen `shared/colour.ts` */
  locale: 'ur' | 'en' | 'rm'
  /** Kis variant par kaunsi tasveer — variantId se URL */
  images: Readonly<Record<string, string>>
  labels: {
    photo: string
    photoAdd: string
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
              {/*
                Har jorhe ki apni tasveer — "Red" apne aap mein alag maal jaisa lagta
                hai. Ek hi tasveer sab rangon par lagti to reseller ka status pack neela
                dikhata aur customer ko laal milta; farq milne par hi pata chalta.
              */}
              <VariantPhoto
                productId={productId}
                variantId={variant.id}
                url={images[variant.id]}
                labels={{ photo: labels.photo, add: labels.photoAdd }}
                onDone={() => router.refresh()}
              />

              <span className="min-w-[7rem] text-[0.82rem]">
                {variantLabel(variant, locale) || '—'}
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
                className="numeric min-h-tap w-20 rounded-card bg-paper-raised px-3 text-center text-sm font-bold"
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
                className="ms-auto inline-flex min-h-tap items-center rounded-card px-3 text-[0.72rem] font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
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
          className="min-h-tap w-28 rounded-card bg-paper-raised px-3 text-sm"
        />
        <input
          value={size}
          onChange={(event) => setSize(event.target.value)}
          placeholder={labels.size}
          className="min-h-tap w-24 rounded-card bg-paper-raised px-3 text-sm"
        />
        <input
          type="number"
          min={0}
          value={qty}
          onChange={(event) => setQty(Math.max(0, Number(event.target.value)))}
          dir="ltr"
          placeholder={labels.qty}
          className="numeric min-h-tap w-20 rounded-card bg-paper-raised px-3 text-center text-sm"
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
          className="inline-flex min-h-tap items-center rounded-pill bg-brand-500 px-5 text-[0.78rem] font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
        >
          {busy ? labels.saving : labels.add}
        </button>
      </div>

      {error && <p className="mt-2 text-[0.75rem] text-red-600">{error}</p>}
    </div>
  )
}

/**
 * Ek jorhe ki tasveer — chhota sa chowkhta, seedha qatar mein.
 *
 * Alag safha ya modal jaan boojh kar nahi: dukan wala paanch rang ek saath lagata hai,
 * aur har rang par safha khulna aur band hona paanch guna kaam hai.
 */
function VariantPhoto({
  productId,
  variantId,
  url,
  labels,
  onDone,
}: {
  productId: string
  variantId: string
  url: string | undefined
  labels: { photo: string; add: string }
  onDone: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  async function pick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    // Input foran khali — warna wohi file dobara chunne par change event nahi chalta
    event.target.value = ''
    if (!file) return

    setBusy(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const uploaded = await fetch('/api/v1/supplier/media', { method: 'POST', body: form })
      if (!uploaded.ok) return

      const media = (await uploaded.json()) as { url: string; type: 'IMAGE' | 'VIDEO' }

      // Video variant par nahi — status pack tasveer par banta hai
      if (media.type !== 'IMAGE') return

      await fetch(`/api/v1/supplier/products/${productId}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ media: [{ url: media.url, type: 'IMAGE', variantId }] }),
      })
      onDone()
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={(event) => void pick(event)}
        className="hidden"
      />
      <button
        type="button"
        disabled={busy}
        title={url ? labels.photo : labels.add}
        onClick={() => inputRef.current?.click()}
        className="h-10 w-10 shrink-0 overflow-hidden rounded-card bg-paper-raised ring-1 ring-black/[0.06] transition hover:ring-brand-400 disabled:opacity-50"
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element -- storage URLs
          <img src={url} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="text-[1.1rem] text-ink-faint">+</span>
        )}
      </button>
    </>
  )
}
