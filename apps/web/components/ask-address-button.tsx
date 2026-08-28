'use client'

import { useState } from 'react'

/**
 * "Customer se pata mangwayen" — link banata hai aur seedha WhatsApp khol deta hai.
 *
 * 🔴 Link banane ke baad ka QADAM hi asal cheez hai.
 *
 * Agar hum sirf link dikha dete aur "copy karen" kehte, to reseller ko chaar kaam karne
 * parte: copy, WhatsApp kholna, chat dhoondhna, paste. Har qadam par log girte hain —
 * aur jo gir gaya wo wapas usi purane tareeqe par chala jata hai, yani customer ki baat
 * parh kar pata KHUD type karna. Feature bana rehta hai aur istemal koi nahi karta.
 *
 * Is liye link banta hai aur usi lamhe WhatsApp us paighaam ke saath khulta hai.
 * "Copy" ka rasta neeche mojood hai — un ke liye jo computer par kaam kar rahi hain.
 */
export function AskAddressButton({
  productId,
  variantId,
  qty,
  retailPrice,
  labels,
}: {
  productId: string
  variantId?: string | undefined
  qty: number
  retailPrice: number
  labels: {
    ask: string
    hint: string
    making: string
    ready: string
    share: string
    copy: string
    copied: string
    failed: string
  }
}) {
  const [link, setLink] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function make() {
    setBusy(true)
    setError(null)

    const res = await fetch('/api/v1/address-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId,
        ...(variantId ? { variantId } : {}),
        qty,
        retailPrice,
      }),
    }).catch(() => null)

    setBusy(false)

    if (!res?.ok) {
      setError(labels.failed)
      return
    }

    const data = (await res.json()) as { url: string }
    setLink(data.url)
  }

  async function copy() {
    if (!link) return
    await navigator.clipboard.writeText(link).catch(() => null)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!link) {
    return (
      <div className="rounded-card bg-brand-50 p-4 ring-1 ring-brand-200">
        <p className="text-[0.88rem] font-semibold text-brand-800">{labels.ask}</p>
        <p className="mt-1 text-[0.78rem] text-brand-800/80">{labels.hint}</p>
        <button
          type="button"
          onClick={() => void make()}
          disabled={busy}
          className="btn-secondary mt-3 min-h-tap w-full disabled:opacity-50"
        >
          {busy ? labels.making : labels.ask}
        </button>
        {error && <p className="mt-1.5 text-[0.78rem] text-red-700">{error}</p>}
      </div>
    )
  }

  return (
    <div className="rounded-card bg-brand-50 p-4 ring-1 ring-brand-200">
      <p className="text-[0.88rem] font-semibold text-brand-800">{labels.ready}</p>

      <a
        href={`https://wa.me/?text=${encodeURIComponent(`${labels.share}\n${link}`)}`}
        target="_blank"
        rel="noreferrer noopener"
        className="btn-primary mt-3 flex min-h-tap w-full items-center justify-center"
      >
        WhatsApp
      </a>

      <div className="mt-2 flex items-center gap-2">
        <span
          dir="ltr"
          className="min-w-0 flex-1 truncate rounded-card bg-paper-raised px-3 py-2 text-[0.75rem] text-ink-faint"
        >
          {link}
        </span>
        <button
          type="button"
          onClick={() => void copy()}
          className="tap shrink-0 rounded-pill bg-paper-raised px-3 py-2 text-[0.75rem] font-semibold text-ink-soft ring-1 ring-line"
        >
          {copied ? labels.copied : labels.copy}
        </button>
      </div>
    </div>
  )
}
