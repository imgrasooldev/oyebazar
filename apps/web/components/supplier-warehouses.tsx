'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { WarehouseView } from '@oyebazar/core'

/**
 * Godown — dukan ki jagahen jahan maal para hai.
 *
 * 🔴 Mitane ka koi button yahan nahi hai, aur ye kami nahi hai. Godown mit jaye to us ke
 * register ki har qatar bemani ho jati hai — "kahan se nikla tha?" ka jawab hamesha ke
 * liye gum — aur wohi qataren jhagre ke din kaam aati hain. "Band karna" wo sab kuch de
 * deta hai jo mitane se chahiye tha: naya maal us mein nahi jata aur wo liston se hat
 * jata hai, magar tareekh qaim rehti hai. Yehi soch `removeVariant` par bhi hai.
 *
 * Ek godown wali dukan (yani aksar dukanen) ke liye ye poora khana ek qatar reh jata hai
 * — na koi button, na koi faisla. Jise doosri jagah chahiye wo khud daal leta hai.
 */
export function SupplierWarehouses({
  warehouses,
  labels,
}: {
  warehouses: readonly WarehouseView[]
  labels: {
    add: string
    name: string
    isDefault: string
    close: string
    open: string
    closed: string
    noDelete: string
    pieces: string
    save: string
    saving: string
  }
}) {
  const router = useRouter()
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      const data = (await res.json().catch(() => null)) as { error?: { message?: string } } | null
      setError(data?.error?.message ?? '✕')
      return false
    }
    router.refresh()
    return true
  }

  async function add(): Promise<void> {
    if (name.trim().length < 2) return
    if (await send('/api/v1/supplier/warehouses', 'POST', { name: name.trim() })) {
      setName('')
      setAdding(false)
    }
  }

  async function rename(id: string): Promise<void> {
    if (editName.trim().length < 2) return
    if (await send(`/api/v1/supplier/warehouses/${id}`, 'PATCH', { name: editName.trim() })) {
      setEditing(null)
    }
  }

  return (
    /*
      🔴 `max-w-2xl` — portal 1680px chaura hai, aur ye fehrist us ka poora arz
      le rahi thi: godown ka naam bilkul baayen, "365 pieces" bilkul daayen, beech
      mein taqreeban 1400px khali. Aur ye khaali jagah kisi kaam ki nahi thi —
      aksar dukan ke paas do ya teen godown hote hain, koi fehrist hi nahi hoti.

      Chauri jagah ka faida sirf wahan hai jahan khaane ziyada hon (maal ki
      qatarein, order ki fehrist). Ye un mein se nahi.
    */
    <div className="max-w-2xl space-y-2">
      <ul className="divide-y divide-paper-sunken">
        {warehouses.map((house) => (
          <li key={house.id} className="flex flex-wrap items-center gap-2 py-2 first:pt-0">
            {editing === house.id ? (
              <>
                <input
                  value={editName}
                  maxLength={40}
                  autoFocus
                  onChange={(event) => setEditName(event.target.value)}
                  className="min-h-tap flex-1 rounded-card bg-paper-sunken px-3 text-[0.9rem]"
                />
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => void rename(house.id)}
                  className="rounded-pill bg-brand-500 px-4 py-1.5 text-[0.76rem] font-semibold text-white disabled:opacity-60"
                >
                  {pending ? labels.saving : labels.save}
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="px-2 text-[0.8rem] text-ink-faint"
                >
                  ✕
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(house.id)
                    setEditName(house.name)
                  }}
                  className={`min-w-0 flex-1 truncate text-start font-semibold ${
                    house.isActive ? '' : 'text-ink-faint line-through'
                  }`}
                >
                  {house.name}
                </button>

                {house.isDefault && (
                  <span className="badge bg-accent-50 text-accent-700">{labels.isDefault}</span>
                )}
                {!house.isActive && (
                  <span className="badge bg-paper-sunken text-ink-faint">{labels.closed}</span>
                )}

                <span dir="ltr" className="numeric text-[0.82rem] text-ink-soft">
                  {house.pieces} {labels.pieces}
                </span>

                {/* 🔴 Default godown band nahi hota — server bhi mana karta hai */}
                {!house.isDefault && (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      void send(`/api/v1/supplier/warehouses/${house.id}`, 'PATCH', {
                        isActive: !house.isActive,
                      })
                    }
                    className="rounded-pill px-3 py-1 text-[0.74rem] font-semibold text-ink-faint transition hover:bg-paper-sunken hover:text-ink"
                  >
                    {house.isActive ? labels.close : labels.open}
                  </button>
                )}
              </>
            )}
          </li>
        ))}
      </ul>

      {adding ? (
        <div className="flex flex-wrap items-center gap-2 rounded-card bg-paper-sunken p-3">
          <input
            value={name}
            maxLength={40}
            autoFocus
            placeholder={labels.name}
            onChange={(event) => setName(event.target.value)}
            className="min-h-tap flex-1 rounded-card bg-paper px-3 text-[0.9rem]"
          />
          <button
            type="button"
            disabled={pending || name.trim().length < 2}
            onClick={() => void add()}
            className="inline-flex min-h-tap items-center rounded-pill bg-brand-500 px-5 text-[0.8rem] font-semibold text-white disabled:opacity-50"
          >
            {pending ? labels.saving : labels.save}
          </button>
          <button
            type="button"
            onClick={() => setAdding(false)}
            className="px-2 text-[0.85rem] text-ink-faint"
          >
            ✕
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="inline-flex min-h-tap items-center rounded-pill bg-paper-sunken px-4 text-[0.78rem] font-semibold text-ink-soft transition hover:bg-brand-50 hover:text-brand-800"
        >
          + {labels.add}
        </button>
      )}

      {error && <p className="text-[0.78rem] font-semibold text-red-600">{error}</p>}

      {/* Mitane ka button kyun nahi hai — poochhne se pehle jawab */}
      <p className="text-[0.74rem] leading-relaxed text-ink-faint">{labels.noDelete}</p>
    </div>
  )
}
