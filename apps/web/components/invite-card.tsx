'use client'

import Link from 'next/link'
import { useState } from 'react'
import { UsersIcon, WhatsAppIcon } from '@/components/icons'

/**
 * "Kisi behen ko bulayen" — reseller ka apna link.
 *
 * 🔴 `Reseller.referredById` mahinon tak mara hua para tha: khaana banaya gaya, kabhi
 * likha nahi gaya, kabhi parha nahi gaya. Ye us khaane ka doosra sira hai — pehla sira
 * register ke waqt hai, jahan `?ref=` se wo bharta hai.
 *
 * 🔴 Ye ab ek WAADA karta hai — magar wo waada teen shartein rakhta hai, aur
 * teenon safhe par likhi hui hain kyunke un mein se koi bhi chhupana bharosa torta hai:
 *
 *   · Rs 100 TAK — poora sau nahi. Bonus us order par hamari apni fee se nikalta hai,
 *     aur us se zyada dena bonus nahi, nuqsan hai.
 *   · Sirf SHURU ke logon ke liye — kul teen sau bonus, phir scheme band.
 *   · Aur us ke apne pehle das orderon par Rs 50 fi order (ye wala sab ke liye khula hai).
 *
 * Qaide `domain/bonus.ts` mein hain aur wahan un ka test bhi hai — raqam aur hadd dono
 * us test mein likhi hui hain, taake badalne par wo girein aur tabdeeli nazar mein aaye.
 *
 * 🔴 Aur wo waada POHANCHE hue order par hai, lagaye hue par nahi. Ye shart is
 * poore feature ki jaan hai: lagaye hue order par dena ye rasta khol deta hai — account
 * banao, apne hi number par das order lagao, cancel kar do, paanch sau le lo. Qaide
 * `domain/bonus.ts` mein hain aur wahan un ka test bhi hai.
 *
 * Ginti isi liye dikhti hai: jo bulati hai usay ye dikhna chahiye ke us ka bulana KAAM
 * kar raha hai. Bina ginti ke wo link ek dafa bhejti hai aur phir bhool jati hai.
 */
export function InviteCard({
  resellerId,
  referred,
  bonusEarned,
  bonusPending,
  showAll = false,
  labels,
}: {
  resellerId: string
  /** Kitni behnen is ke link se aayin */
  referred: number
  /** Kul bonus jo ab tak bana (mila hua + baqi) */
  bonusEarned: number
  /** Us mein se jo abhi milna baqi hai */
  bonusPending: number
  /**
   * Poori fehrist ka rasta — dashboard par HAAN, invite ke apne safhe par NAHI.
   *
   * 🔴 Wahi card dono jagah chalta hai, aur us safhe par ye link khud us safhe
   * ki taraf jata — yani banda dabata aur wahin khara rehta. Aisa link ek dafa dabaya
   * jata hai aur us ke baad poore safhe par bharosa kam ho jata hai.
   */
  showAll?: boolean
  labels: {
    title: string
    body: string
    share: string
    copied: string
    /** "{n} behnen aa chukin" */
    count: string
    /** "Aap ka bonus: Rs {n}" */
    bonus: string
    /** "Rs {n} abhi milna baqi" */
    bonusPending: string
    /** Waada — kitna aur kaise */
    promise: string
    /** "Sab dekhen" — poori fehrist ka rasta */
    seeAll?: string
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

      {/*
        Bonus — link ke NEECHE, alag patti mein.

        🔴 Ye upar wale hisse se alag hai kyunke ye alag baat hai: upar wala
        kaam hai (link bhejo), ye us ka aur us ke apne kaam ka natija hai. Ek saath
        milaa dene se dono dab jate — aur bonus wo cheez hai jise reseller roz dekhna
        chahti hai, chahe wo us din kisi ko na bulaye.

        🔴 Bonus SIRF tab dikhta hai jab kuch bana ho. Sifar par "Rs 0" likhna
        us ke bare mein kuch nahi kehta (har nayi reseller par wo sach hai) magar
        parhne wali usay nakaami ki tarah parhti hai — aur uske baad wo us patti par
        dobara nazar nahi daalti. Us jagah waada likha hai: kitna, aur kis par.
      */}
      <div className="border-t border-paper-sunken px-5 py-3">
        {bonusEarned > 0 ? (
          <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[0.85rem]">
            <span className="font-semibold text-accent-700">
              {labels.bonus.replace('{n}', String(bonusEarned))}
            </span>
            {bonusPending > 0 && (
              <span className="text-[0.78rem] text-ink-faint">
                {labels.bonusPending.replace('{n}', String(bonusPending))}
              </span>
            )}
          </p>
        ) : (
          <p className="text-[0.8rem] leading-relaxed text-ink-faint">{labels.promise}</p>
        )}

        {/*
          Poori fehrist ka rasta — sirf tab jab koi aa chuki ho.

          🔴 Sifar par ye link ek khali safhe par le jata hai, aur khali safha wo
          cheez hai jis ke baad banda dobara nahi aata. Jab tak koi na aaye, upar wala
          link hi wahid kaam hai — aur usi par nazar rehni chahiye.
        */}
        {showAll && referred > 0 && labels.seeAll && (
          <Link
            href="/invites"
            className="mt-1 inline-block text-[0.8rem] font-semibold text-brand-700 underline decoration-dotted underline-offset-2"
          >
            {labels.seeAll}
          </Link>
        )}
      </div>
    </section>
  )
}
