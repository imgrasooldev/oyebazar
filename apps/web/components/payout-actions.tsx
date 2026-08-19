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
  labels: { send: string; reference: string; saving: string }
}) {
  const router = useRouter()
  const [reference, setReference] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    setPending(true)
    const message = await patch(`/api/v1/supplier/payouts/${payoutId}`, {
      action: 'SENT',
      reference,
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
        className="min-w-[10rem] flex-1 rounded-card bg-paper-sunken px-3 py-1.5 text-sm"
      />
      <button
        type="button"
        // Reference chhota ho to button chalta hi nahi — server bhi rokta hai,
        // magar wahan tak jane se pehle rok dena behtar tajurba hai
        disabled={pending || reference.trim().length < 4}
        onClick={() => void submit()}
        className="rounded-pill bg-brand-500 px-4 py-1.5 text-[0.78rem] font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
      >
        {pending ? labels.saving : labels.send}
      </button>
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
          className="min-w-[11rem] flex-1 rounded-card bg-paper-sunken px-3 py-1.5 text-sm"
        />
        <button
          type="button"
          disabled={pending || note.trim().length < 3}
          onClick={() => void run({ action: 'NOT_RECEIVED', note })}
          className="rounded-pill bg-red-600 px-4 py-1.5 text-[0.78rem] font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
        >
          {pending ? labels.saving : labels.send}
        </button>
        <button
          type="button"
          onClick={() => setMode('idle')}
          className="rounded-pill px-3 py-1.5 text-[0.78rem] text-ink-soft hover:text-ink"
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
        className="rounded-pill bg-accent-500 px-4 py-1.5 text-[0.78rem] font-semibold text-white transition hover:bg-accent-700 disabled:opacity-50"
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
        className="rounded-pill px-3 py-1.5 text-[0.78rem] font-semibold text-ink-soft underline-offset-4 hover:text-ink hover:underline"
      >
        {labels.notReceived}
      </button>
      {error && <span className="w-full text-[0.75rem] text-red-600">{error}</span>}
    </div>
  )
}
