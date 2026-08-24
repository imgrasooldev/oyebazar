'use client'

import { useState } from 'react'

/**
 * Dukan ke bare mein reseller ki raye — teen sawal, sitaron par.
 *
 * 🔴 Ye form us jagah hai jahan reseller PEHLE SE hoti hai (dashboard), alag safhe par
 * nahi. Form banana aasan hai; log us tak pohanchte nahi. Alag safha banane ka matlab
 * hota ke raye sirf un se aaye jo usay dhoondh len — aur wo aksar naraz log hote hain,
 * jis se poora record ek taraf jhuk jata hai.
 *
 * 🔴 Sitare hi input hain, dropdown nahi. Teen sawal × paanch jawab = 15 tap, magar har
 * tap ek nazar mein saaf hai. Dropdown mein wohi kaam 6 tap mein hota hai jin mein se
 * teen "kholna" aur "band karna" par zaya jate hain, aur phone par wo list ungli ke
 * neeche khulti hai jahan wo saaf nazar bhi nahi aati.
 */
const SAWAL = ['quality', 'communication', 'payoutOnTime'] as const
type Sawal = (typeof SAWAL)[number]

export function SupplierReviewForm({
  orderId,
  supplierName,
  orderNo,
  reason,
  labels,
}: {
  orderId: string
  supplierName: string
  orderNo: string
  reason: 'first' | 'monthly'
  labels: {
    titleFirst: string
    titleMonthly: string
    hint: string
    quality: string
    communication: string
    payoutOnTime: string
    commentPlaceholder: string
    submit: string
    thanks: string
    failed: string
    skip: string
  }
}) {
  const [scores, setScores] = useState<Record<Sawal, number>>({
    quality: 0,
    communication: 0,
    payoutOnTime: 0,
  })
  const [comment, setComment] = useState('')
  const [state, setState] = useState<'open' | 'busy' | 'done' | 'hidden'>('open')
  const [failed, setFailed] = useState(false)

  if (state === 'hidden') return null

  if (state === 'done') {
    return (
      <section className="rounded-card bg-accent-50 px-4 py-3 text-[0.88rem] text-accent-700 ring-1 ring-accent-600">
        {labels.thanks}
      </section>
    )
  }

  /*
   * 🔴 Teenon sawal lazmi hain. Aadhi bhari hui raye ka matlab hai ke jo sawal chhora
   * gaya us ka number kahin se aayega hi nahi — aur agar usay 0 mana jaye to wo dukan ke
   * record ko be-wajah gira dega.
   */
  const ready = SAWAL.every((s) => scores[s] > 0)

  async function submit() {
    if (!ready || state === 'busy') return
    setState('busy')
    setFailed(false)

    const res = await fetch('/api/v1/supplier-reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId,
        quality: scores.quality,
        communication: scores.communication,
        payoutOnTime: scores.payoutOnTime,
        ...(comment.trim() ? { comment: comment.trim() } : {}),
      }),
    }).catch(() => null)

    if (!res?.ok) {
      setState('open')
      setFailed(true)
      return
    }
    setState('done')
  }

  return (
    <section className="rounded-card bg-paper-raised p-4 shadow-soft ring-1 ring-accent-600/30">
      <h2 className="text-[1rem] font-bold">
        {(reason === 'first' ? labels.titleFirst : labels.titleMonthly).replace(
          '{shop}',
          supplierName,
        )}
      </h2>
      <p className="mt-1 text-[0.8rem] text-ink-soft">
        {labels.hint} <span dir="ltr" className="numeric">{orderNo}</span>
      </p>

      <div className="mt-3 space-y-3">
        {SAWAL.map((sawal) => (
          <div key={sawal}>
            <p className="text-[0.85rem] font-semibold">{labels[sawal]}</p>
            <div className="mt-1.5 flex gap-1.5">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setScores((current) => ({ ...current, [sawal]: value }))}
                  aria-label={`${labels[sawal]}: ${value}`}
                  aria-pressed={scores[sawal] === value}
                  className={
                    scores[sawal] >= value
                      ? 'flex h-11 w-11 items-center justify-center rounded-xl bg-accent-50 text-[1.15rem] text-accent-700 ring-1 ring-accent-600'
                      : 'tap flex h-11 w-11 items-center justify-center rounded-xl text-[1.15rem] text-ink-faint ring-1 ring-line'
                  }
                >
                  ★
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={300}
        rows={2}
        placeholder={labels.commentPlaceholder}
        className="field mt-3 w-full text-[0.9rem]"
      />

      {failed && <p className="mt-1.5 text-[0.8rem] text-red-700">{labels.failed}</p>}

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void submit()}
          disabled={!ready || state === 'busy'}
          className="btn-primary min-h-tap disabled:opacity-50 lg:min-h-0"
        >
          {labels.submit}
        </button>
        {/*
          "Baad mein" ka rasta khula — aur ye zaroori hai.
          Majboor karne ka matlab hai ke reseller jaldi mein koi bhi sitare daba de taake
          safha aage barhe, aur us se record ganda hota hai, behtar nahi.
        */}
        <button
          type="button"
          onClick={() => setState('hidden')}
          className="text-[0.82rem] text-ink-faint underline"
        >
          {labels.skip}
        </button>
      </div>
    </section>
  )
}
