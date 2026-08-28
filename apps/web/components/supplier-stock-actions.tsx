'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

/**
 * Maal ki teen harkatein — ek hi jagah.
 *
 * 🔴 Teenon ek component mein is liye hain ke dukan wale ke liye ye EK kaam hai ("is
 * cheez ki ginti theek karni hai"), teen nahi. Teen alag button teen alag jagah rakhne
 * se wo har dafa yaad karta ke kaunsa kahan tha — aur aakhir mein wohi ek istemal karta
 * jo sab se upar hota, chahe wo sahi wala na ho.
 *
 * 🔴 Aur teenon ALAG hain (ek "ginti" wale khaane mein sameta nahi gaya) kyunke register
 * mein teenon alag likhi jati hain:
 *
 *   · naya maal aaya  → jorna, aur us ka apna rate hota hai
 *   · zaya hua        → ghatana, aur us ki wajah lazmi hai
 *   · itna reh jaye   → koi harkat nahi, sirf ek hadd
 *
 * Ek hi khaana teenon ke liye rakhne se register mein sab "ginti badli" ban jata, aur
 * "is mahine kitna maal aaya" ya "kitna zaya hua" ka jawab kabhi nikaala hi na ja sakta.
 */
export function SupplierStockActions({
  variantId,
  reorderLevel,
  labels,
}: {
  variantId: string
  reorderLevel: number
  labels: {
    stockIn: string
    stockInQty: string
    stockInCost: string
    stockInCostNote: string
    writeOff: string
    writeOffQty: string
    writeOffReason: string
    reorderLabel: string
    reorderOff: string
    save: string
    saving: string
  }
}) {
  const router = useRouter()
  const [open, setOpen] = useState<'in' | 'off' | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Naya maal
  const [inQty, setInQty] = useState('')
  const [inCost, setInCost] = useState('')

  // Zaya hua
  const [offQty, setOffQty] = useState('')
  const [offNote, setOffNote] = useState('')

  // Hadd
  const [level, setLevel] = useState(String(reorderLevel))

  async function send(url: string, method: 'POST' | 'PATCH', body: unknown): Promise<boolean> {
    setPending(true)
    setError(null)

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setPending(false)

    if (!res.ok) {
      /*
       * Server ka apna jumla dikhate hain jab wo mojood ho ("itna maal hai hi nahi") —
       * wo hamesha us se zyada kaam ka hota hai jo hum yahan andaze se likh sakte hain.
       */
      const data = (await res.json().catch(() => null)) as { error?: { message?: string } } | null
      setError(data?.error?.message ?? '✕')
      return false
    }

    router.refresh()
    return true
  }

  async function stockIn(): Promise<void> {
    const qty = Number(inQty)
    if (!Number.isInteger(qty) || qty <= 0) return

    const cost = inCost.trim() === '' ? undefined : Number(inCost)
    const ok = await send('/api/v1/supplier/stock/in', 'POST', {
      variantId,
      qty,
      ...(cost !== undefined && Number.isInteger(cost) && cost >= 0 ? { unitCost: cost } : {}),
    })
    if (ok) {
      setInQty('')
      setInCost('')
      setOpen(null)
    }
  }

  async function writeOff(): Promise<void> {
    const qty = Number(offQty)
    if (!Number.isInteger(qty) || qty <= 0 || offNote.trim().length < 3) return

    const ok = await send('/api/v1/supplier/stock/write-off', 'POST', {
      variantId,
      qty,
      note: offNote.trim(),
    })
    if (ok) {
      setOffQty('')
      setOffNote('')
      setOpen(null)
    }
  }

  async function saveLevel(): Promise<void> {
    const value = Number(level)
    if (!Number.isInteger(value) || value < 0) return
    await send('/api/v1/supplier/stock/reorder-level', 'PATCH', { variantId, level: value })
  }

  const levelChanged = Number(level) !== reorderLevel

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen(open === 'in' ? null : 'in')}
          className="inline-flex min-h-tap items-center rounded-pill bg-accent-50 px-3.5 text-[0.76rem] font-semibold text-accent-700 transition hover:bg-accent-100"
        >
          + {labels.stockIn}
        </button>

        {/*
          Dabi hui shakl — jaan boojh kar. Zaya hona rozana ka kaam nahi hai, aur jo
          button "naya maal aaya" jitna numaya ho wo ghalti se bhi dab jata hai.
        */}
        <button
          type="button"
          onClick={() => setOpen(open === 'off' ? null : 'off')}
          className="inline-flex min-h-tap items-center rounded-pill px-3 text-[0.76rem] font-semibold text-ink-faint transition hover:bg-paper-sunken hover:text-ink"
        >
          {labels.writeOff}
        </button>

        <span className="flex items-center gap-1.5 text-[0.74rem] text-ink-faint">
          {labels.reorderLabel}
          <input
            type="number"
            min={0}
            dir="ltr"
            value={level}
            onChange={(event) => setLevel(event.target.value)}
            className="numeric min-h-tap w-16 rounded-card bg-paper-sunken px-2 text-center text-[0.8rem] font-bold text-ink"
          />
          {levelChanged ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => void saveLevel()}
              className="rounded-pill bg-brand-500 px-3 py-1 text-[0.72rem] font-semibold text-white disabled:opacity-60"
            >
              {pending ? labels.saving : labels.save}
            </button>
          ) : (
            <span className="text-[0.7rem]">{labels.reorderOff}</span>
          )}
        </span>
      </div>

      {open === 'in' && (
        <div className="space-y-2 rounded-card bg-paper-sunken p-3">
          <div className="flex flex-wrap items-end gap-2">
            <Field label={labels.stockInQty}>
              <input
                type="number"
                min={1}
                dir="ltr"
                value={inQty}
                autoFocus
                onChange={(event) => setInQty(event.target.value)}
                className="numeric min-h-tap w-24 rounded-card bg-paper px-3 text-center font-bold"
              />
            </Field>

            <Field label={labels.stockInCost}>
              <input
                type="number"
                min={0}
                dir="ltr"
                value={inCost}
                onChange={(event) => setInCost(event.target.value)}
                className="numeric min-h-tap w-28 rounded-card bg-paper px-3 text-center font-bold"
              />
            </Field>

            <button
              type="button"
              disabled={pending || Number(inQty) <= 0}
              onClick={() => void stockIn()}
              className="inline-flex min-h-tap items-center rounded-pill bg-brand-500 px-5 text-[0.8rem] font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
            >
              {pending ? labels.saving : labels.save}
            </button>
          </div>

          {/* 🔴 Lagat ke saath ye jumla hamesha — bina is ke bohat si dukanen ye khana
              khali chhor deti hain, aur wo un ka haq bhi hai magar aksar ghalat-fehmi hoti hai */}
          <p className="text-[0.72rem] leading-relaxed text-ink-faint">{labels.stockInCostNote}</p>
        </div>
      )}

      {open === 'off' && (
        <div className="flex flex-wrap items-end gap-2 rounded-card bg-red-50 p-3">
          <Field label={labels.writeOffQty}>
            <input
              type="number"
              min={1}
              dir="ltr"
              value={offQty}
              autoFocus
              onChange={(event) => setOffQty(event.target.value)}
              className="numeric min-h-tap w-20 rounded-card bg-paper px-3 text-center font-bold"
            />
          </Field>

          <Field label={labels.writeOffReason}>
            <input
              type="text"
              value={offNote}
              maxLength={200}
              onChange={(event) => setOffNote(event.target.value)}
              className="min-h-tap w-56 rounded-card bg-paper px-3 text-[0.85rem]"
            />
          </Field>

          <button
            type="button"
            disabled={pending || Number(offQty) <= 0 || offNote.trim().length < 3}
            onClick={() => void writeOff()}
            className="inline-flex min-h-tap items-center rounded-pill bg-red-600 px-5 text-[0.8rem] font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
          >
            {pending ? labels.saving : labels.save}
          </button>
        </div>
      )}

      {error && <p className="text-[0.76rem] font-semibold text-red-600">{error}</p>}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[0.72rem] text-ink-faint">{label}</span>
      {children}
    </label>
  )
}
