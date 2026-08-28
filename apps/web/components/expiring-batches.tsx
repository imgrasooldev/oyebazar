'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { BatchLineView } from '@oyebazar/core'

/**
 * Maddat — jis maal ka waqt guzar raha hai.
 *
 * 🔴 Ye poora khana un dukanon ke liye hai jo khep likhti hain: kirana, cosmetics,
 * dawai. Kapre, bartan aur jewellery wali dukan par ye kabhi nazar hi nahi aata —
 * safha khud dekh kar tay karta hai (khali list = khana ghayab).
 *
 * 🔴 Guzar chuki khep par "zaya likhen" ka rasta usi qatar par hai. Wajah tarteeb ki
 * hai: jis lamhe dukan wale ko pata chalta hai ke maal mar chuka, usi lamhe wo usay
 * nikaal bhi sakta hai. Us kaam ko doosre safhe par bhejne ka matlab hai ke wo maal
 * wahin para rehta hai — aur bikta rehta hai.
 */
export function ExpiringBatches({
  batches,
  labels,
}: {
  batches: readonly BatchLineView[]
  labels: {
    expired: string
    daysLeft: string
    daysAgo: string
    left: string
    writeOff: string
    reason: string
    save: string
    saving: string
  }
}) {
  const router = useRouter()
  const [open, setOpen] = useState<string | null>(null)
  const [qty, setQty] = useState('')
  const [note, setNote] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function writeOff(batchId: string): Promise<void> {
    const amount = Number(qty)
    if (!Number.isInteger(amount) || amount <= 0 || note.trim().length < 3) return

    setPending(true)
    setError(null)

    const res = await fetch('/api/v1/supplier/stock/batch-write-off', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ batchId, qty: amount, note: note.trim() }),
    })
    setPending(false)

    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: { message?: string } } | null
      setError(data?.error?.message ?? '✕')
      return
    }

    setQty('')
    setNote('')
    setOpen(null)
    router.refresh()
  }

  return (
    <ul className="divide-y divide-paper-sunken">
      {batches.map((batch) => {
        const expired = batch.state === 'expired'

        return (
          <li key={batch.id} className="space-y-2 py-3 first:pt-0 last:pb-0">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-semibold">
                  {batch.titleUr}
                  {batch.batchNo && (
                    <span dir="ltr" className="ms-2 text-[0.78rem] font-normal text-ink-faint">
                      {batch.batchNo}
                    </span>
                  )}
                </p>
                <p className="mt-0.5 text-[0.78rem] text-ink-faint">
                  <span dir="ltr" className="numeric font-semibold text-ink">
                    {batch.qtyLeft}
                  </span>{' '}
                  {labels.left}
                  {batch.warehouseName && <> · {batch.warehouseName}</>}
                </p>
              </div>

              {/*
                Din ki ginti — "maddat: 12 اگست" nahi. Tareekh parh kar banda khud hisab
                lagata hai ke kitne din baqi hain, aur wahi ek qadam hai jise ye safha
                bacha sakta hai.
              */}
              <span
                dir="ltr"
                className={`badge shrink-0 ${
                  expired ? 'bg-red-50 text-red-700' : 'bg-brand-50 text-brand-800'
                }`}
              >
                {batch.daysLeft === null
                  ? ''
                  : expired
                    ? `${Math.abs(batch.daysLeft)} ${labels.daysAgo}`
                    : `${batch.daysLeft} ${labels.daysLeft}`}
              </span>
            </div>

            {open === batch.id ? (
              <div className="flex flex-wrap items-end gap-2 rounded-card bg-red-50 p-3">
                <label className="flex flex-col gap-1">
                  <span className="text-[0.72rem] text-ink-faint">{labels.left}</span>
                  <input
                    type="number"
                    min={1}
                    max={batch.qtyLeft}
                    dir="ltr"
                    autoFocus
                    value={qty}
                    onChange={(event) => setQty(event.target.value)}
                    className="numeric min-h-tap w-20 rounded-card bg-paper px-3 text-center font-bold"
                  />
                </label>

                <label className="flex flex-col gap-1">
                  <span className="text-[0.72rem] text-ink-faint">{labels.reason}</span>
                  <input
                    type="text"
                    maxLength={200}
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    className="min-h-tap w-56 rounded-card bg-paper px-3 text-[0.85rem]"
                  />
                </label>

                <button
                  type="button"
                  disabled={pending || Number(qty) <= 0 || note.trim().length < 3}
                  onClick={() => void writeOff(batch.id)}
                  className="inline-flex min-h-tap items-center rounded-pill bg-red-600 px-5 text-[0.8rem] font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
                >
                  {pending ? labels.saving : labels.save}
                </button>

                <button
                  type="button"
                  onClick={() => setOpen(null)}
                  className="px-2 text-[0.85rem] text-ink-faint"
                >
                  ✕
                </button>
              </div>
            ) : (
              /*
                Zaya likhne ka button SIRF guzar chuki khep par. Jis maal ki maddat abhi
                baqi hai us par ye button rakhna ulta mashwara hai — wo maal bikna
                chahiye, phenkna nahi.
              */
              expired && (
                <button
                  type="button"
                  onClick={() => {
                    setOpen(batch.id)
                    setQty(String(batch.qtyLeft))
                    setNote('')
                  }}
                  className="inline-flex min-h-tap items-center rounded-pill px-3 text-[0.76rem] font-semibold text-red-700 transition hover:bg-red-50"
                >
                  {labels.writeOff}
                </button>
              )
            )}
          </li>
        )
      })}

      {error && <p className="pt-2 text-[0.78rem] font-semibold text-red-600">{error}</p>}
    </ul>
  )
}
