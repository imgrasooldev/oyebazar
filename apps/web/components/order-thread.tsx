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
  /**
   * Maal ki tasveer — "aisa aaya hai".
   *
   * 🔴 Ye khaana DB mein pehle se tha aur usay koi API leti hi nahi thi: mara
   * hua code jo zinda dikhta tha. Ab reseller apne paighaam ke saath tasveer bhej sakti
   * hai, kyunke jhagre ke din lafz kaam nahi aate — "rang ghalat hai" ke muqable mein
   * "wohi bheja tha" khara ho jata hai aur ops ke paas faisle ka koi zariya nahi hota.
   */
  photoUrl?: string | null
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
    /** "Tasveer lagayen" — sirf us taraf jahan masla utha sakta hai */
    photoAdd: string
    photoAdded: string
    photoView: string
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
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  /*
   * Tasveer PEHLE chadhti hai, "bhejo" dabane par nahi.
   *
   * 🔴 Dono ek saath karne ka matlab hota ke 3G par reseller button daba kar
   * pandrah second khari rahe aur usay pata na chale ke kya ho raha hai — aur upload
   * nakaam hone par us ka LIKHA HUA matn bhi zaya ho jata. Alag karne se nakaami sirf
   * tasveer ki hoti hai, poore paighaam ki nahi. Wohi tareeqa payout ki rasid par bhi
   * chal raha hai.
   */
  async function upload(file: File) {
    setUploading(true)
    setError(false)

    const form = new FormData()
    form.append('file', file)
    const res = await fetch('/api/v1/media', { method: 'POST', body: form }).catch(() => null)

    setUploading(false)
    if (!res?.ok) {
      setError(true)
      return
    }
    const data = (await res.json()) as { url?: string }
    if (data.url) setPhotoUrl(data.url)
  }

  async function send(kind: 'NOTE' | 'ISSUE') {
    const text = body.trim()
    if (!text || busy) return

    setBusy(true)
    setError(false)

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind, body: text, ...(photoUrl ? { photoUrl } : {}) }),
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
    setPhotoUrl(null)
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

              {/*
                Tasveer ka LINK, chipki hui tasveer nahi.

                🔴 Ye faisla soch kar hai. Order ke safhe par bees paighaam ho
                sakte hain, aur har ek ke saath poori tasveer laadne ka matlab ye hota
                ke 3G par safha khulta hi na — us bande ke liye bhi jo sirf ek jumla
                parhne aaya hai. Jise tasveer dekhni hai wo ek click kar leta hai.

                `rel` ke dono hisse lazmi: `noopener` ke baghair khula hua safha
                `window.opener` se hamare safhe ka pata badal sakta hai, aur ye pata
                storage ka hai — hamesha hamara nahi rehne wala.
              */}
              {message.photoUrl && (
                <a
                  href={message.photoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-block text-[0.8rem] font-semibold text-brand-700 underline decoration-dotted underline-offset-2"
                >
                  {labels.photoView}
                </a>
              )}
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

      <div className="mt-2 flex flex-wrap items-center gap-2">
        {/*
          Tasveer lagana — SIRF us taraf jahan masla utha sakta hai.

          🔴 Ye wohi hadd hai jo `canRaiseIssue` par hai, aur us ki wajah bhi
          wohi: masla wo uthata hai jis ka nuqsan hota hai (us ka customer, us ka
          paisa), aur tasveer us masle ka SABOOOT hai. Dukan sirf jawab deti hai.

          Aur ek amali wajah bhi hai: dukan ke DO darwaze hain (portal, aur WhatsApp ka
          magic link jahan koi login hi nahi hota). Sirf portal ko tasveer dena do
          raston par do alag qaide bana deta — aur phir qaida wo ban jata jo raste ne
          ittefaqan banaya, na ke jo hum ne socha.
        */}
        {canRaiseIssue && (
          <label className="inline-flex min-h-tap cursor-pointer items-center rounded-pill px-3 text-[0.78rem] font-semibold text-brand-700 underline decoration-dotted underline-offset-2 transition hover:bg-brand-50">
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) void upload(file)
              }}
            />
            {uploading ? '…' : photoUrl ? labels.photoAdded : labels.photoAdd}
          </label>
        )}

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
