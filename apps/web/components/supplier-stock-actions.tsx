'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { WarehouseStockLine, WarehouseView } from '@oyebazar/core'

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
 *
 * 🔴 Godown ka chunao SIRF tab nazar aata hai jab dukan ke paas ek se zyada ho. Aksar
 * dukanon ka ek hi hota hai, aur un ke saamne ek aisa khana rakhna jis mein hamesha ek
 * hi jawab ho — wo har dafa ek fazool qadam hai. Wahi soch chaaron jagah chalti hai:
 * naya maal, zaya hona, muntaqili (jo ek godown par mojood hi nahi hoti), aur tafseel.
 */
export function SupplierStockActions({
  variantId,
  reorderLevel,
  warehouses,
  places,
  labels,
}: {
  variantId: string
  reorderLevel: number
  /** Dukan ke chalu godown — ek se kam ho to godown ka koi khana nahi dikhta */
  warehouses: readonly WarehouseView[]
  /** Is cheez ka maal kis godown mein kitna — muntaqili ka pehla khana isi se bharta hai */
  places: readonly WarehouseStockLine[]
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
    transfer: string
    transferFrom: string
    transferTo: string
    warehouse: string
    batchNo: string
    batchExpiry: string
    batchExpiryNote: string
    save: string
    saving: string
  }
}) {
  const router = useRouter()
  const [open, setOpen] = useState<'in' | 'off' | 'move' | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Naya maal
  const [inQty, setInQty] = useState('')
  const [inCost, setInCost] = useState('')
  /*
   * Khep ka number aur maddat — dono khali rehte hain jab tak dukan khud na bhare.
   * Lawn ke suit ki koi maddat nahi hoti; wahan ye do khaane bhare hi nahi jate.
   */
  const [inBatch, setInBatch] = useState('')
  const [inExpiry, setInExpiry] = useState('')

  // Zaya hua
  const [offQty, setOffQty] = useState('')
  const [offNote, setOffNote] = useState('')

  // Hadd
  const [level, setLevel] = useState(String(reorderLevel))

  /*
   * Godown ka chunao. Ek hi godown ho to ye poora hissa ghayab rehta hai aur server
   * khud default par daal deta hai — yani saada dukan ke liye kuch badla hi nahi.
   */
  const many = warehouses.length > 1
  const held = places.filter((place) => place.qty > 0)
  const [house, setHouse] = useState(warehouses[0]?.id ?? '')
  const [fromHouse, setFromHouse] = useState(held[0]?.warehouseId ?? '')
  const [toHouse, setToHouse] = useState(
    warehouses.find((row) => row.id !== held[0]?.warehouseId)?.id ?? '',
  )
  const [moveQty, setMoveQty] = useState('')

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
      ...(many && house ? { warehouseId: house } : {}),
      ...(inBatch.trim() ? { batchNo: inBatch.trim() } : {}),
      /*
       * `<input type="date">` sirf "2026-08-29" deta hai. Usay seedha bhejne se server
       * par wo aadhi raat UTC ban jata — aur Pakistan mein wo PICHHLA din hai. Din ke
       * aakhir par le jate hain: maddat us din ke KHATAM hone tak chalti hai.
       */
      ...(inExpiry ? { expiryAt: new Date(`${inExpiry}T23:59:59.000Z`).toISOString() } : {}),
    })
    if (ok) {
      setInQty('')
      setInCost('')
      setInBatch('')
      setInExpiry('')
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
      ...(many && house ? { warehouseId: house } : {}),
    })
    if (ok) {
      setOffQty('')
      setOffNote('')
      setOpen(null)
    }
  }

  async function move(): Promise<void> {
    const qty = Number(moveQty)
    if (!Number.isInteger(qty) || qty <= 0 || !fromHouse || !toHouse || fromHouse === toHouse) return

    const ok = await send('/api/v1/supplier/stock/transfer', 'POST', {
      variantId,
      fromWarehouseId: fromHouse,
      toWarehouseId: toHouse,
      qty,
    })
    if (ok) {
      setMoveQty('')
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

        {/* Muntaqili ek godown wali dukan par hoti hi nahi — is liye button bhi nahi */}
        {many && held.length > 0 && (
          <button
            type="button"
            onClick={() => setOpen(open === 'move' ? null : 'move')}
            className="inline-flex min-h-tap items-center rounded-pill px-3 text-[0.76rem] font-semibold text-ink-faint transition hover:bg-paper-sunken hover:text-ink"
          >
            {labels.transfer}
          </button>
        )}

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

            {many && (
              <Field label={labels.warehouse}>
                <select
                  value={house}
                  onChange={(event) => setHouse(event.target.value)}
                  className="min-h-tap rounded-card bg-paper px-3 text-[0.85rem]"
                >
                  {warehouses.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.name}
                    </option>
                  ))}
                </select>
              </Field>
            )}

            <button
              type="button"
              disabled={pending || Number(inQty) <= 0}
              onClick={() => void stockIn()}
              className="inline-flex min-h-tap items-center rounded-pill bg-brand-500 px-5 text-[0.8rem] font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
            >
              {pending ? labels.saving : labels.save}
            </button>
          </div>

          {/*
            Khep aur maddat — form ke AAKHIR mein, aur khali.

            🔴 Ye do khaane rozana ke kaam ka hissa nahi hain: aksar dukanen inhen kabhi
            nahi bharti (kapra, bartan), aur jo bharti hain wo un ke liye khud dhoondti
            hain. Inhen upar rakhne ka matlab hai ke har dukan har dafa do fazool khaanon
            se guzre — aur wohi cheez form ko chhorne ki wajah banti hai.
          */}
          <div className="flex flex-wrap items-end gap-2">
            <Field label={labels.batchNo}>
              <input
                type="text"
                maxLength={60}
                value={inBatch}
                onChange={(event) => setInBatch(event.target.value)}
                className="min-h-tap w-32 rounded-card bg-paper px-3 text-[0.85rem]"
              />
            </Field>

            <Field label={labels.batchExpiry}>
              <input
                type="date"
                value={inExpiry}
                onChange={(event) => setInExpiry(event.target.value)}
                className="min-h-tap rounded-card bg-paper px-3 text-[0.85rem]"
              />
            </Field>
          </div>

          <p className="text-[0.72rem] leading-relaxed text-ink-faint">
            {labels.batchExpiryNote}
          </p>

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

          {many && (
            <Field label={labels.warehouse}>
              <select
                value={house}
                onChange={(event) => setHouse(event.target.value)}
                className="min-h-tap rounded-card bg-paper px-3 text-[0.85rem]"
              >
                {warehouses.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </select>
            </Field>
          )}

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

      {open === 'move' && (
        <div className="flex flex-wrap items-end gap-2 rounded-card bg-paper-sunken p-3">
          {/*
            "Kahan se" wale khane mein sirf wo godown jin mein maal WAQAI para hai. Khali
            godown se muntaqili ka koi matlab nahi, aur usay list mein rakhne ka anjaam
            sirf ek nakaam koshish hai.
          */}
          <Field label={labels.transferFrom}>
            <select
              value={fromHouse}
              onChange={(event) => setFromHouse(event.target.value)}
              className="min-h-tap rounded-card bg-paper px-3 text-[0.85rem]"
            >
              {held.map((place) => (
                <option key={place.warehouseId} value={place.warehouseId}>
                  {place.warehouseName} ({place.qty})
                </option>
              ))}
            </select>
          </Field>

          <Field label={labels.transferTo}>
            <select
              value={toHouse}
              onChange={(event) => setToHouse(event.target.value)}
              className="min-h-tap rounded-card bg-paper px-3 text-[0.85rem]"
            >
              {warehouses
                .filter((row) => row.id !== fromHouse)
                .map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
            </select>
          </Field>

          <Field label={labels.stockInQty}>
            <input
              type="number"
              min={1}
              dir="ltr"
              value={moveQty}
              onChange={(event) => setMoveQty(event.target.value)}
              className="numeric min-h-tap w-20 rounded-card bg-paper px-3 text-center font-bold"
            />
          </Field>

          <button
            type="button"
            disabled={pending || Number(moveQty) <= 0 || !fromHouse || !toHouse}
            onClick={() => void move()}
            className="inline-flex min-h-tap items-center rounded-pill bg-coal-900 px-5 text-[0.8rem] font-semibold text-white disabled:opacity-50"
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
