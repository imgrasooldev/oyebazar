'use client'

import { useState } from 'react'
import { UsersIcon, WhatsAppIcon } from '@/components/icons'

/**
 * "Kisi behen ko bulayen" — reseller ka apna link.
 *
 * 🔴 `Reseller.referredById` mahinon tak mara hua para tha: khaana banaya gaya, kabhi
 * likha nahi gaya, kabhi parha nahi gaya. Ye us khaane ka doosra sira hai — pehla sira
 * register ke waqt hai, jahan `?ref=` se wo bharta hai.
 *
 * 🔴 Ye ek WAADA nahi karta. Koi commission, koi inaam, koi "5 behnen bulao aur ye
 * milega" — kuch nahi. Aisa waada karna aasan hota aur us ka bhugtaan baad mein karna
 * parta: jis din wo inaam dena hota us din ya to paisa jata, ya wo behen dhoka khati
 * jise waada kiya gaya tha. Jab tak wo faisla malik na kare, ye sirf ek link hai.
 *
 * Aur ginti isi liye dikhti hai: jo bulati hai usay ye dikhna chahiye ke us ka bulana
 * KAAM kar raha hai. Bina ginti ke wo link ek dafa bhejti hai aur phir bhool jati hai.
 */
export function InviteCard({
  resellerId,
  referred,
  labels,
}: {
  resellerId: string
  /** Kitni behnen is ke link se aayin */
  referred: number
  labels: {
    title: string
    body: string
    share: string
    copied: string
    /** "{n} behnen aa chukin" */
    count: string
  }
}) {
  const [copied, setCopied] = useState(false)

  /*
   * 🔴 Link CLIENT par banta hai (`window.location.origin`), server par nahi.
   *
   * Server par banane ka matlab hota ke us ka pata `APP_URL` par khara hota — aur wo
   * ek aur jagah hai jo galat ho sakti hai (staging par production ka pata, ya ulta).
   * Yahan wo hamesha wohi pata hota hai jahan wo abhi khari hai, yani hamesha durust.
   */
  const link = typeof window === 'undefined' ? '' : `${window.location.origin}/?ref=${resellerId}`

  const text = `${labels.body}\n${link}`

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      // Do second baad wapas — warna "copy ho gaya" hamesha ke liye chipka reh jata hai
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /*
       * Clipboard mana kar de to KUCH nahi hota, koi ghalti ka paighaam nahi.
       *
       * Ye aksar us waqt hota hai jab safha kisi aur app ke andar khula ho, aur us
       * surat mein WhatsApp wala button waise bhi saath khara hai — yani rasta band
       * nahi hua. "Copy nahi hua" likhna sirf ghabrahat deta hai.
       */
    }
  }

  return (
    <section className="card overflow-hidden">
      <div className="flex items-start gap-3 bg-coal-900 px-5 py-4 text-white">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-card bg-white/10 text-brand-300"
          aria-hidden="true"
        >
          <UsersIcon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-[1.05rem] font-bold leading-tight">{labels.title}</h2>
          <p className="mt-1 text-[0.85rem] text-white/70">{labels.body}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 p-5">
        <a
          href={`https://wa.me/?text=${encodeURIComponent(text)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-tap items-center gap-2 rounded-pill bg-accent-500 px-4 text-[0.82rem] font-semibold text-white transition hover:bg-accent-700"
        >
          <WhatsAppIcon className="h-4 w-4" />
          {labels.share}
        </a>

        <button
          type="button"
          onClick={() => void copy()}
          className="inline-flex min-h-tap items-center rounded-pill bg-paper-sunken px-4 text-[0.82rem] font-semibold text-ink-soft transition hover:text-ink"
        >
          {copied ? labels.copied : link.replace(/^https?:\/\//, '')}
        </button>

        {/*
          Ginti — sirf jab koi aa chuki ho.

          🔴 "0 behnen aayin" likhna us ke bare mein kuch nahi kehta (har nayi reseller
          par wo sach hai) magar parhne wali usay nakaami ki tarah parhti hai — aur
          uske baad wo link dobara nahi bhejti.
        */}
        {referred > 0 && (
          <span className="text-[0.82rem] font-semibold text-accent-700">
            {labels.count.replace('{n}', String(referred))}
          </span>
        )}
      </div>
    </section>
  )
}
