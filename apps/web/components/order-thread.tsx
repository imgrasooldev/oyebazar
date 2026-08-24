'use client'

import { useState } from 'react'

/**
 * Order ke gird ki guftagu — reseller aur dukan, dono ke liye ek hi component.
 *
 * 🔴 Do alag component banane ka matlab hota ke ek taraf ka bartao kal badal jaye aur
 * doosri ka purana reh jaye — aur guftagu mein wo farq sab se bura hota hai, kyunke
 * dono ko lagta hai ke unhon ne wohi dekha jo doosre ne dekha. Farq sirf `endpoint` aur
 * `canRaiseIssue` ka hai.
 *
 * 🔴 Ye WhatsApp ki jagah NAHI le raha, aur is ka matn bhi yehi kehta hai. WhatsApp
 * hamesha tez rahega. Ye us cheez ke liye hai jo baad mein kaam aati hai: jab dono ki
 * baat alag ho aur kisi ko faisla karna ho, to platform ke paas kuch to ho.
 */
/**
 * 🔴 Yahan sirf wo khaane hain jo ye component WAQAI dikhata hai.
 *
 * `createdAt` jaan boojh kar nahi: server par wo `Date` hai aur client component ki hadd
 * par usay string banana parta. Jo cheez dikhai hi nahi jati, us ke liye do shakl
 * sanbhalna ek aisi ghalti ki jagah banata hai jis ka koi faida nahi.
 */
export type ThreadMessage = {
  id: string
  kind: 'NOTE' | 'ISSUE'
  authorType: 'reseller' | 'supplier' | 'ops'
  body: string
}

export function OrderThread({
  endpoint,
  initial,
  canRaiseIssue,
  labels,
}: {
  endpoint: string
  initial: ThreadMessage[]
  /** Sirf reseller masla utha sakti hai — nuqsan usi ka hota hai. */
  canRaiseIssue: boolean
  labels: {
    title: string
    hint: string
    placeholder: string
    send: string
    raiseIssue: string
    issueBadge: string
    empty: string
    failed: string
    /*
     * 🔴 Naam LIKHNE WALE ke hisaab se hain, "aap/doosra" ke hisaab se nahi.
     *
     * Pehle ye `you`/`shop` the, aur us se main khud phisla: dukan wale safhe par unhen
     * ulta lagaya to reseller ka paighaam "Dukan" ke naam se dikhne laga. `reseller` aur
     * `supplier` par ye ghalti mumkin hi nahi — har safha apni jagah "Aap" likh deta hai.
     */
    reseller: string
    supplier: string
    ops: string
  }
}) {
  const [messages, setMessages] = useState(initial)
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)

  async function send(kind: 'NOTE' | 'ISSUE') {
    const text = body.trim()
    if (!text || busy) return

    setBusy(true)
    setError(false)

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind, body: text }),
    }).catch(() => null)

    setBusy(false)

    if (!res?.ok) {
      setError(true)
      return
    }

    const data = (await res.json()) as { message: ThreadMessage }
    /*
     * Server ka diya hua paighaam hi lagate hain, apna banaya hua nahi — waqt aur id
     * wahin se aate hain. Apna banane par safha dobara khulte hi tarteeb badal jati.
     */
    setMessages((current) => [...current, data.message])
    setBody('')
  }

  const who = (type: ThreadMessage['authorType']) =>
    type === 'reseller' ? labels.reseller : type === 'supplier' ? labels.supplier : labels.ops

  return (
    <section className="mt-6 rounded-card bg-paper-raised p-4 shadow-soft">
      <h2 className="text-[0.95rem] font-bold">{labels.title}</h2>
      <p className="mt-1 text-[0.78rem] leading-relaxed text-ink-soft">{labels.hint}</p>

      {messages.length === 0 ? (
        <p className="mt-3 text-[0.85rem] text-ink-faint">{labels.empty}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {messages.map((message) => (
            <li
              key={message.id}
              className={
                message.kind === 'ISSUE'
                  ? 'rounded-2xl bg-red-50 px-3 py-2 ring-1 ring-red-200'
                  : 'rounded-2xl bg-paper-sunken px-3 py-2'
              }
            >
              <p className="text-[0.7rem] font-semibold text-ink-soft">
                {who(message.authorType)}
                {message.kind === 'ISSUE' && (
                  <span className="ms-1.5 text-red-700">· {labels.issueBadge}</span>
                )}
              </p>
              <p className="mt-0.5 whitespace-pre-line text-[0.88rem] leading-relaxed">
                {message.body}
              </p>
            </li>
          ))}
        </ul>
      )}

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={1000}
        rows={2}
        placeholder={labels.placeholder}
        className="field mt-3 w-full text-[0.9rem]"
      />

      {error && <p className="mt-1.5 text-[0.8rem] text-red-700">{labels.failed}</p>}

      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void send('NOTE')}
          disabled={busy || body.trim().length === 0}
          className="btn-primary !py-1.5 text-[0.85rem] disabled:opacity-50"
        >
          {labels.send}
        </button>

        {/*
          "Masla hua" alag button hai, checkbox nahi.

          🔴 Checkbox par nishan lagana bhoola ja sakta hai, aur phir wo shikayat aam
          baat ban kar ops ki nazar se nikal jati hai. Do button ka matlab hai ke faisla
          usi lamhe hota hai jab wo likh rahi hoti hai.
        */}
        {canRaiseIssue && (
          <button
            type="button"
            onClick={() => void send('ISSUE')}
            disabled={busy || body.trim().length === 0}
            className="rounded-pill bg-red-50 px-4 py-1.5 text-[0.85rem] font-semibold text-red-700 ring-1 ring-red-200 disabled:opacity-50"
          >
            {labels.raiseIssue}
          </button>
        )}
      </div>
    </section>
  )
}
