'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

/**
 * Payout ke do taraf ke buttons — ek hi file mein jaan boojh kar.
 *
 * Dono ek hi row par kaam karte hain (wholesaler ka dawa, reseller ki tasdeeq) aur ek
 * hi API ke do rukh hain. Alag files mein hote to ek taraf ka lafz badal kar doosri
 * taraf badalna bhool jana bohot aasan hota.
 */

async function patch(url: string, body: unknown): Promise<string | null> {
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (res.ok) return null

  const data = (await res.json().catch(() => null)) as { error?: { message?: string } } | null
  return data?.error?.message ?? 'Kuch ghalat ho gaya — dobara koshish karen'
}

/** Wholesaler: "bhej diye" — reference ke saath. */
export function SupplierPayoutSend({
  payoutId,
  labels,
}: {
  payoutId: string
  labels: {
    send: string
    reference: string
    saving: string
    proof: string
    proofAdded: string
    proofFailed: string
  }
}) {
  const router = useRouter()
  const [reference, setReference] = useState('')
  const [proofUrl, setProofUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /*
   * Tasveer PEHLE upload hoti hai, "bhej diye" dabane par nahi.
   *
   * 🔴 Dono ek saath karne ka matlab hota ke 3G par button daba kar dukan wala
   * pandrah second khara rahe aur usay pata na chale ke kya ho raha hai — aur agar
   * upload nakaam ho jaye to us ka TID bhi zaya ho jata. Alag karne se jo chala gaya
   * wo chala gaya, aur nakaami sirf tasveer ki hoti hai, poore kaam ki nahi.
   */
  async function upload(file: File) {
    setUploading(true)
    setError(null)
    const form = new FormData()
    form.append('file', file)
    const response = await fetch('/api/v1/supplier/media', { method: 'POST', body: form })
    setUploading(false)

    if (!response.ok) {
      setError(labels.proofFailed)
      return
    }
    const data = (await response.json()) as { url?: string }
    if (data.url) setProofUrl(data.url)
  }

  async function submit() {
    setPending(true)
    const message = await patch(`/api/v1/supplier/payouts/${payoutId}`, {
      action: 'SENT',
      reference,
      // Khaana bhejna hi nahi jab tasveer na ho — server `.strict()` par khara hai
      ...(proofUrl ? { proofUrl } : {}),
    })
    setPending(false)

    if (message) {
      setError(message)
      return
    }
    router.refresh()
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        value={reference}
        onChange={(event) => {
          setReference(event.target.value)
          setError(null)
        }}
        placeholder={labels.reference}
        dir="ltr"
        className="min-h-tap min-w-[10rem] flex-1 rounded-card bg-paper-sunken px-3 text-sm"
      />
      <button
        type="button"
        // Reference chhota ho to button chalta hi nahi — server bhi rokta hai,
        // magar wahan tak jane se pehle rok dena behtar tajurba hai
        disabled={pending || reference.trim().length < 4}
        onClick={() => void submit()}
        className="inline-flex min-h-tap items-center rounded-pill bg-brand-500 px-5 text-[0.78rem] font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
      >
        {pending ? labels.saving : labels.send}
      </button>

      {/*
        Tasveer — marzi ka, aur us ka dikhna bhi marzi jaisa hi hai.

        🔴 Ye TID wale khaane ke BAAD hai aur chhota hai, jaan boojh kar. Lazmi
        kaam TID hai; agar screenshot pehle aur bara hota to dukan wala samajhta ke ye
        bhi lazmi hai, aur jis din phone mein screenshot na hota us din wo "bhej diye"
        likhta hi nahi.
      */}
      <label className="inline-flex min-h-tap cursor-pointer items-center rounded-pill px-3 text-[0.74rem] font-semibold text-brand-700 underline decoration-dotted underline-offset-2 transition hover:bg-brand-50">
        <input
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) void upload(file)
          }}
        />
        {uploading ? labels.saving : proofUrl ? labels.proofAdded : labels.proof}
      </label>

      {error && <span className="w-full text-[0.75rem] text-red-600">{error}</span>}
    </div>
  )
}

/** Reseller: "mil gaye" ya "nahi mile". */
export function ResellerPayoutReply({
  payoutId,
  labels,
}: {
  payoutId: string
  labels: {
    received: string
    notReceived: string
    reason: string
    send: string
    cancel: string
    saving: string
  }
}) {
  const router = useRouter()
  const [mode, setMode] = useState<'idle' | 'disputing'>('idle')
  const [note, setNote] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function run(body: unknown) {
    setPending(true)
    const message = await patch(`/api/v1/payouts/${payoutId}`, body)
    setPending(false)

    if (message) {
      setError(message)
      return
    }
    router.refresh()
  }

  if (mode === 'disputing') {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={note}
          onChange={(event) => {
            setNote(event.target.value)
            setError(null)
          }}
          placeholder={labels.reason}
          className="min-h-tap min-w-[11rem] flex-1 rounded-card bg-paper-sunken px-3 text-sm"
        />
        <button
          type="button"
          disabled={pending || note.trim().length < 3}
          onClick={() => void run({ action: 'NOT_RECEIVED', note })}
          className="inline-flex min-h-tap items-center rounded-pill bg-red-600 px-5 text-[0.78rem] font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
        >
          {pending ? labels.saving : labels.send}
        </button>
        <button
          type="button"
          onClick={() => setMode('idle')}
          className="inline-flex min-h-tap items-center rounded-pill px-4 text-[0.78rem] text-ink-soft hover:text-ink"
        >
          {labels.cancel}
        </button>
        {error && <span className="w-full text-[0.75rem] text-red-600">{error}</span>}
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => void run({ action: 'RECEIVED' })}
        className="inline-flex min-h-tap items-center rounded-pill bg-accent-500 px-5 text-[0.78rem] font-semibold text-white transition hover:bg-accent-700 disabled:opacity-50"
      >
        {pending ? labels.saving : labels.received}
      </button>
      {/*
        "Nahi mile" jaan boojh kar khamosh hai (sirf lakeer, bhara hua nahi). Ye ilzam
        hai — ek tap ki doori par nahi hona chahiye, magar chhupa hua bhi nahi.
      */}
      <button
        type="button"
        onClick={() => setMode('disputing')}
        className="inline-flex min-h-tap items-center rounded-pill px-4 text-[0.78rem] font-semibold text-ink-soft underline-offset-4 hover:text-ink hover:underline"
      >
        {labels.notReceived}
      </button>
      {error && <span className="w-full text-[0.75rem] text-red-600">{error}</span>}
    </div>
  )
}
