'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

/**
 * Dukan ka apna waada — delivery ke kitne din baad paise deta hoon.
 *
 * Chuni hui list hai, khaali khaana nahi: "jaldi de deta hoon" jaisa jawab na napa ja
 * sakta hai na moqabla. Aur reseller ke safhe par yehi waada us ke ASAL record ke saath
 * lagta hai — waada akela sasti baat hai.
 */
const CHOICES = [0, 1, 2, 3, 5, 7] as const

export function SupplierPaymentTerm({
  current,
  labels,
}: {
  current: number
  labels: { title: string; sameDay: string; days: string; saved: string; note: string }
}) {
  const router = useRouter()
  const [days, setDays] = useState(current)
  const [saved, setSaved] = useState(false)
  const [pending, setPending] = useState(false)

  async function save(value: number) {
    setDays(value)
    setPending(true)
    setSaved(false)

    const res = await fetch('/api/v1/supplier/payment-term', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ days: value }),
    })

    setPending(false)
    if (!res.ok) {
      setDays(current)
      return
    }

    setSaved(true)
    router.refresh()
  }

  return (
    <div className="card p-5">
      <p className="text-[0.78rem] text-ink-faint">{labels.title}</p>

      <div className="mt-2 flex flex-wrap gap-2">
        {CHOICES.map((choice) => (
          <button
            key={choice}
            type="button"
            disabled={pending}
            onClick={() => void save(choice)}
            className={`inline-flex min-h-tap items-center rounded-pill px-4 text-[0.8rem] font-semibold transition ${
              days === choice
                ? 'bg-brand-500 text-white'
                : 'bg-paper-sunken text-ink-soft hover:text-ink'
            }`}
          >
            {choice === 0 ? (
              labels.sameDay
            ) : (
              <>
                <span dir="ltr" className="numeric">
                  {choice}
                </span>{' '}
                {labels.days}
              </>
            )}
          </button>
        ))}
      </div>

      <p className="mt-2 text-[0.74rem] text-ink-faint">
        {saved ? labels.saved : labels.note}
      </p>
    </div>
  )
}
