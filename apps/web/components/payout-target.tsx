'use client'

import { useState } from 'react'
import { formatPayoutNumber, type PayoutAccount, type PayoutMethod } from '@oyebazar/core'

/**
 * "Paisa kahan bhejna hai" — dukan wale ke saamne, usi qatar par jahan wo bhejta hai.
 *
 * 🔴 Is se pehle ye qatar par likha hota tha: "BJ-1003 · Rs 750" aur bas. Khata app
 * mein KAHIN nahi tha — na yahan, na kisi paighaam mein. Har payout WhatsApp par
 * "apna easypaisa number bhejo" se chalta tha, yani hamara sab se ahem waada app ke
 * BAHAR poora hota tha, aur jhagre mein hamare paas dikhane ko kuch nahi hota tha.
 *
 * Ye TID wale khaane ke UPAR hai aur wo tarteeb bhi jaan boojh kar: pehle bhejna
 * padta hai, phir TID likhna. Neeche hota to dukan wala TID ka khaana bharne baith
 * jata us khate ko dekhe baghair jis par bhejna tha.
 */
export function PayoutTarget({
  name,
  account,
  updatedAt,
  labels,
}: {
  name: string
  account: PayoutAccount | null
  /** ISO string — server par Date, yahan sirf dikhane ke liye */
  updatedAt: string | null
  labels: {
    missing: string
    name: string
    copy: string
    copied: string
    changed: string
    methodNames: Record<PayoutMethod, string>
  }
}) {
  const [copied, setCopied] = useState(false)

  if (!account) {
    /*
     * Khata na hone par KHAMOSHI sab se bura jawab hai.
     *
     * Bina is jumle ke dukan wala samajhta hai ke khata kahin aur hoga, ya us se koi
     * ghalti hui hai — aur wo purani WhatsApp chat mein dhoondne lagta hai, jahan se
     * aksar KISI AUR reseller ka number nikal aata hai.
     */
    return (
      <div className="mt-3 rounded-card bg-amber-50 px-3 py-2 text-[0.8rem] text-amber-800">
        <span className="font-semibold">{name}</span> — {labels.missing}
      </div>
    )
  }

  async function copy() {
    /*
     * Jo cheez copy hoti hai wo `number` hai — bina space ke, bina bank ke naam ke.
     *
     * 🔴 Yehi wo matn hai jo seedha wallet/bank ki app mein paste hoga, aur wahan
     * space wala number aksar qabool nahi hota. Jo dikhta hai wo parhne ke liye hai
     * (`formatPayoutNumber`), jo copy hota hai wo chalne ke liye — dono ka ek hona
     * zaroori nahi, aur yahan nuqsaan-deh hai.
     */
    await navigator.clipboard.writeText(account!.number)
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  return (
    <div className="mt-3 rounded-card bg-paper-sunken p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[0.74rem] font-semibold text-ink-faint">
            {name} · {labels.methodNames[account.method]}
            {account.bankName && <span> · {account.bankName}</span>}
          </p>
          <p dir="ltr" className="numeric mt-0.5 text-[0.95rem] font-bold">
            {formatPayoutNumber(account)}
          </p>
          <p className="mt-0.5 truncate text-[0.8rem] text-ink-soft">
            {labels.name}: <span className="font-semibold">{account.title}</span>
          </p>
        </div>

        <button
          type="button"
          onClick={() => void copy()}
          className="tap shrink-0 rounded-pill bg-paper-raised px-4 py-2 text-[0.78rem] font-semibold text-brand-700 ring-1 ring-line"
        >
          {copied ? labels.copied : labels.copy}
        </button>
      </div>

      {updatedAt && (
        /*
         * 🔴 Khata kab badla — dukan wale ko bhi.
         *
         * Jhagra hamesha "maine to bhej diya tha" par phansta hai. Agar khata pichhle
         * hafte badla hai to dono ke paas wo baat likhi hui honi chahiye — warna dukan
         * wala apni purani chat ka number sahi maanta rehta hai aur paisa har dafa usi
         * band ho chuke wallet mein jata hai.
         */
        <p dir="ltr" className="numeric mt-2 text-[0.72rem] text-ink-faint">
          {labels.changed} {updatedAt.slice(0, 10)}
        </p>
      )}
    </div>
  )
}
