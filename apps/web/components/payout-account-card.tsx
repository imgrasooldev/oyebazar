'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  PAYOUT_METHODS,
  formatPayoutNumber,
  isWalletMethod,
  type PayoutAccount,
  type PayoutMethod,
} from '@oyebazar/core'

/**
 * "Paisa kahan bhejein" — reseller ka apna khata.
 *
 * 🔴 Ye card `/money` par hai, kisi alag settings safhe par nahi. Do wajahen:
 *
 * 1. Reseller ke portal mein settings ka koi safha hai hi nahi, aur neeche wali patti
 *    mein saat khaane pehle se hain — aathwan daalne par wo do qatar mein toot jati
 *    hai (layout.tsx ka `grid-cols-7` haath se likha hua hai).
 * 2. Aur ye behtar bhi hai: khata us safhe par hai jahan reseller ye sochti hai ke
 *    "mera paisa kahan hai". Settings ka safha wo jagah hoti hai jahan koi nahi jata.
 */
export function PayoutAccountCard({
  account,
  endpoint,
  labels,
}: {
  account: PayoutAccount | null
  /**
   * Kis darwaze par likhna hai — reseller ka apna, ya dukan ka apna.
   *
   * 🔴 Ek hi card dono taraf chalta hai aur ye jaan boojh kar: form ka har qaida
   * (wallet par bank ka naam mana, khali khate par cancel ka na hona, method badalne
   * par bank ka naam khali) dono taraf BILKUL wohi hai. Do naqlein rakhne ka anjaam
   * hamesha yehi hota hai ke ek taraf qaida badal jata hai aur doosri par nahi — aur
   * wo farq paison wale safhe par sab se mehnga hai.
   */
  endpoint: string
  labels: {
    title: string
    note: string
    missing: string
    method: string
    number: string
    name: string
    nameHint: string
    bank: string
    numberHintWallet: string
    numberHintBank: string
    save: string
    saving: string
    saved: string
    change: string
    cancel: string
    methodNames: Record<PayoutMethod, string>
  }
}) {
  const router = useRouter()

  /*
   * Khata pehle se ho to card BAND khulta hai.
   *
   * 🔴 Khula hua form us cheez ko dobara poochta hai jo pehle se theek hai, aur is
   * safhe ka asal maqsad (paisa kahan atka hai) neeche dhakel deta hai. Khali ho to
   * ulta: form khula hi rahe, kyunke wohi is safhe ka sab se zaroori kaam hai.
   */
  const [editing, setEditing] = useState(!account)
  const [method, setMethod] = useState<PayoutMethod>(account?.method ?? 'EASYPAISA')
  const [number, setNumber] = useState(account?.number ?? '')
  const [title, setTitle] = useState(account?.title ?? '')
  const [bankName, setBankName] = useState(account?.bankName ?? '')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const wallet = isWalletMethod(method)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(null)

    const response = await fetch(endpoint, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method,
        number,
        title,
        // Wallet par ye khaana bhejna hi nahi — server `.strict()` par khara hai
        ...(wallet ? {} : { bankName }),
      }),
    })
    setPending(false)

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as {
        error?: { message?: string }
      } | null
      setError(data?.error?.message ?? 'کچھ غلط ہو گیا — دوبارہ کوشش کریں')
      return
    }

    setEditing(false)
    router.refresh()
  }

  return (
    <section className="card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[0.95rem] font-bold">{labels.title}</h2>
          <p className="mt-1 max-w-xl text-[0.82rem] text-ink-soft">{labels.note}</p>
        </div>

        {account && !editing && (
          <button type="button" onClick={() => setEditing(true)} className="btn-ghost shrink-0">
            {labels.change}
          </button>
        )}
      </div>

      {/*
        Khali khata ek CHETAWNI hai, khali jagah nahi.

        🔴 Bina is ke reseller ko kabhi pata hi nahi chalta ke us ka paisa kis wajah se
        nahi aa raha — dukan ke safhe par "khata nahi diya" likha hota hai aur wo baat
        us tak kabhi nahi pohanchti.
      */}
      {!account && !editing && (
        <p className="mt-3 rounded-card bg-red-50 px-3 py-2 text-[0.82rem] font-semibold text-red-700">
          {labels.missing}
        </p>
      )}

      {account && !editing && (
        <dl className="mt-3 grid gap-2 sm:grid-cols-3">
          <div>
            <dt className="text-[0.74rem] text-ink-faint">{labels.method}</dt>
            <dd className="font-semibold">{labels.methodNames[account.method]}</dd>
          </div>
          <div>
            <dt className="text-[0.74rem] text-ink-faint">{labels.number}</dt>
            <dd dir="ltr" className="numeric font-bold">
              {formatPayoutNumber(account)}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-[0.74rem] text-ink-faint">{labels.name}</dt>
            <dd className="truncate font-semibold">{account.title}</dd>
            {account.bankName && (
              <dd className="truncate text-[0.78rem] text-ink-soft">{account.bankName}</dd>
            )}
          </div>
        </dl>
      )}

      {editing && (
        <form onSubmit={submit} className="mt-3 space-y-3">
          <div>
            <span className="text-[0.8rem] font-semibold">{labels.method}</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {PAYOUT_METHODS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    setMethod(option)
                    setError(null)
                    /*
                     * 🔴 Wallet par jate hi bank ka naam KHALI. Chhupa dena kaafi
                     * nahi tha: purani likhi hui qadar state mein reh jati thi aur
                     * server usay saaf ghalti keh kar mana kar deta — us khaane par
                     * jo ab screen par hai hi nahi.
                     */
                    if (isWalletMethod(option)) setBankName('')
                  }}
                  className={
                    method === option
                      ? 'rounded-pill bg-brand-500 px-4 py-2 text-[0.82rem] font-semibold text-white'
                      : 'tap rounded-pill bg-paper-sunken px-4 py-2 text-[0.82rem] font-semibold text-ink-soft'
                  }
                >
                  {labels.methodNames[option]}
                </button>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="text-[0.8rem] font-semibold">{labels.number}</span>
            <input
              required
              dir="ltr"
              // Wallet par number ka keyboard; bank par IBAN mein huroof bhi hote hain
              inputMode={wallet ? 'tel' : 'text'}
              value={number}
              onChange={(event) => {
                setNumber(event.target.value)
                setError(null)
              }}
              placeholder={wallet ? labels.numberHintWallet : labels.numberHintBank}
              className="mt-2 w-full rounded-lg bg-paper-sunken px-3 py-3 text-sm ring-1 ring-black/10"
            />
          </label>

          {!wallet && (
            <label className="block">
              <span className="text-[0.8rem] font-semibold">{labels.bank}</span>
              <input
                required
                value={bankName}
                onChange={(event) => {
                  setBankName(event.target.value)
                  setError(null)
                }}
                className="mt-2 w-full rounded-lg bg-paper-sunken px-3 py-3 text-sm ring-1 ring-black/10"
              />
            </label>
          )}

          <label className="block">
            <span className="text-[0.8rem] font-semibold">{labels.name}</span>
            <input
              required
              value={title}
              onChange={(event) => {
                setTitle(event.target.value)
                setError(null)
              }}
              className="mt-2 w-full rounded-lg bg-paper-sunken px-3 py-3 text-sm ring-1 ring-black/10"
            />
            <span className="mt-1 block text-[0.74rem] text-ink-faint">{labels.nameHint}</span>
          </label>

          {error && (
            <p className="rounded-card bg-red-50 px-3 py-2 text-[0.8rem] text-red-700">{error}</p>
          )}

          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={pending} className="btn-primary disabled:opacity-50">
              {pending ? labels.saving : labels.save}
            </button>
            {/* Cancel sirf tab jab peechay hatne ko kuch ho — khali khata "rehne den" ka mahal nahi */}
            {account && (
              <button
                type="button"
                onClick={() => {
                  setEditing(false)
                  setMethod(account.method)
                  setNumber(account.number)
                  setTitle(account.title)
                  setBankName(account.bankName ?? '')
                  setError(null)
                }}
                className="btn-ghost"
              >
                {labels.cancel}
              </button>
            )}
          </div>
        </form>
      )}
    </section>
  )
}
