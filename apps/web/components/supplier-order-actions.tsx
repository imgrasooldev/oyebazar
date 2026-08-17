'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

const REJECT_REASONS = [
  'مال ختم ہے',
  'یہ سائز/رنگ نہیں ہے',
  'اس علاقے میں ڈیلیوری نہیں کرتے',
  'ریٹ بدل گیا ہے',
]

/**
 * Wholesaler ke do button.
 *
 * "Qubool" ek tap. "Mana" do tap — wajah poochhi jati hai, kyunke wohi wajah
 * reseller ko dikhti hai (aur wohi hamein batati hai ke kaunsa supplier bar bar
 * mana karta hai).
 */
export function SupplierOrderActions({ token }: { token: string }) {
  const router = useRouter()
  const [mode, setMode] = useState<'idle' | 'rejecting'>('idle')
  const [reason, setReason] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function send(path: string, body?: unknown) {
    setPending(true)
    setError(null)

    const res = await fetch(`/api/v1/supplier/orders/${token}/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!res.ok) {
      const payload = (await res.json().catch(() => null)) as { error?: { message?: string } } | null
      setError(payload?.error?.message ?? 'کچھ مسئلہ ہو گیا۔ دوبارہ کوشش کریں')
      setPending(false)
      return
    }

    router.refresh()
  }

  if (mode === 'rejecting') {
    return (
      <div className="card space-y-4 p-5">
        <p className="font-bold">مان کرنے کی وجہ؟</p>

        <div className="flex flex-wrap gap-2">
          {REJECT_REASONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setReason(option)}
              className={reason === option ? 'chip chip-active' : 'chip'}
            >
              {option}
            </button>
          ))}
        </div>

        <input
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="یا اپنی وجہ لکھیں"
          className="field"
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-3">
          <button
            type="button"
            disabled={pending || reason.trim().length < 3}
            onClick={() => void send('reject', { reason })}
            className="btn-primary flex-1"
          >
            {pending ? '…' : 'بھیج دیں'}
          </button>
          <button type="button" onClick={() => setMode('idle')} className="btn-secondary flex-1">
            واپس
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="button"
        disabled={pending}
        onClick={() => void send('accept')}
        className="btn-primary w-full !py-4 text-base"
      >
        {pending ? '…' : '✓ آرڈر قبول ہے — بھیج رہا ہوں'}
      </button>

      <button
        type="button"
        onClick={() => setMode('rejecting')}
        className="btn-secondary w-full"
      >
        معذرت، یہ آرڈر نہیں بھیج سکتا
      </button>
    </div>
  )
}
