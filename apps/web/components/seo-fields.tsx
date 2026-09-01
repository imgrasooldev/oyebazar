'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  SEO_DESCRIPTION_IDEAL,
  SEO_DESCRIPTION_MAX,
  SEO_TITLE_IDEAL,
  SEO_TITLE_MAX,
  resolveSeoText,
  seoLength,
  type SeoLength,
} from '@oyebazar/core'

/**
 * "Google پر کیا لکھا آئے" — dukan ke safhe aur maal ke safhe, dono par wohi card.
 *
 * 🔴 Sab se ahem faisla yahan wo hai jo nazar aata hai, khaane nahi: **Google ka apna
 * preview**. Bina us ke ye do khaane "Meta Title" aur "Meta Description" ban jate hain
 * — yani angrezi ki wo istilaah jo Bolton Market ki dukan ka munshi na jaanta hai na
 * jaanne ki wajah rakhta hai. Wo khaane khali reh jate hain, ya "kapra kapra kapra" se
 * bhar diye jate hain.
 *
 * Preview us poore sawal ko badal deta hai: banda apna likha hua wahin dekhta hai jaisa
 * Google par chhapega, aur kaatne wali nuqta-teen (…) khud usay bata deti hai ke lamba
 * ho gaya. Kisi ko "60 huroof" samjhane ki zaroorat nahi rehti.
 *
 * 🔴 Aur dono khaane MARZI ke hain. Khali chhorne par safha khud apna unwan bana leta
 * hai (naam + sheher + ginti) aur wo aksar jaldi mein bhare hue khaane se behtar hota
 * hai. Lazmi karne ka anjaam ye hota ke maal list hi na ho.
 */

const TONE: Record<SeoLength, string> = {
  empty: 'text-ink-faint',
  short: 'text-amber-700',
  good: 'text-accent-700',
  long: 'text-amber-700',
  tooLong: 'text-red-700',
}

export function SeoFields({
  endpoint,
  method,
  seoTitle,
  seoDescription,
  fallbackTitle,
  fallbackDescription,
  previewUrl,
  labels,
}: {
  endpoint: string
  /** Dukan par `PUT`, maal par `PATCH` — dono ke apne route hain */
  method: 'PUT' | 'PATCH'
  seoTitle: string | null
  seoDescription: string | null
  /** Jo safha KHUD bana leta hai jab khaana khali ho — preview mein wohi dikhta hai */
  fallbackTitle: string
  fallbackDescription: string
  /** Google natije mein pata isi shakl mein chhapta hai */
  previewUrl: string
  labels: {
    title: string
    note: string
    fieldTitle: string
    fieldDescription: string
    hint: string
    autoHint: string
    preview: string
    save: string
    saving: string
    saved: string
  }
}) {
  const router = useRouter()
  const [title, setTitle] = useState(seoTitle ?? '')
  const [description, setDescription] = useState(seoDescription ?? '')
  const [pending, setPending] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const titleState = seoLength(title, SEO_TITLE_IDEAL)
  const descState = seoLength(description, SEO_DESCRIPTION_IDEAL)

  // Preview wohi dikhata hai jo WAQAI chhapega — khali khaane par safhe ka apna unwan
  const shownTitle = resolveSeoText(title, fallbackTitle)
  const shownDescription = resolveSeoText(description, fallbackDescription)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(null)

    const response = await fetch(endpoint, {
      method,
      headers: { 'Content-Type': 'application/json' },
      /*
       * 🔴 Khali khaana `null` ja raha hai, khali string nahi. Khali string ka matlab
       * hota "us ne KHALI unwan chuna hai" — jis par safha be-naam chhap jata. `null`
       * ka matlab hai "kuch nahi likha, tum khud bana lo".
       */
      body: JSON.stringify({
        seoTitle: title.trim() || null,
        seoDescription: description.trim() || null,
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

    setDone(true)
    setTimeout(() => setDone(false), 2200)
    router.refresh()
  }

  return (
    <section className="card p-4">
      <h2 className="text-[0.95rem] font-bold">{labels.title}</h2>
      <p className="mt-1 max-w-2xl text-[0.82rem] text-ink-soft">{labels.note}</p>

      {/*
        Google ka preview — khaanon se UPAR, aur ye tarteeb jaan boojh kar hai.

        🔴 Neeche hota to banda pehle khaana bharta aur preview kabhi dekhta hi nahi
        (mobile par wo screen se bahar hota). Upar hone ka matlab hai ke likhne se
        PEHLE wo dekh leta hai ke abhi kya chhap raha hai — aur aksar wohi lamha hota
        hai jab usay pata chalta hai ke kuch likhna bhi chahiye.
      */}
      <div className="mt-4 rounded-card bg-paper-sunken p-4">
        <p className="text-[0.7rem] font-semibold uppercase tracking-wider text-ink-faint">
          {labels.preview}
        </p>
        <div dir="ltr" className="mt-2 max-w-[36rem] text-start">
          <p className="truncate text-[0.78rem] text-accent-700">{previewUrl}</p>
          <p
            dir="auto"
            className="mt-0.5 truncate text-[1.05rem] leading-snug text-[#1a0dab] dark:text-[#8ab4f8]"
          >
            {shownTitle}
          </p>
          {/*
            Do line par kaat — Google bhi yahi karta hai. `line-clamp-2` wo nuqta-teen
            khud lagata hai, aur wohi teen nuqte banday ko "lamba ho gaya" bata dete
            hain — kisi ginti se behtar.
          */}
          <p dir="auto" className="mt-1 line-clamp-2 text-[0.86rem] leading-relaxed text-ink-soft">
            {shownDescription}
          </p>
        </div>
      </div>

      <form onSubmit={submit} className="mt-4 space-y-3">
        <label className="block">
          <span className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-[0.8rem] font-semibold">{labels.fieldTitle}</span>
            <span dir="ltr" className={`numeric text-[0.74rem] ${TONE[titleState]}`}>
              {title.trim().length}/{SEO_TITLE_IDEAL}
            </span>
          </span>
          <input
            value={title}
            maxLength={SEO_TITLE_MAX}
            onChange={(event) => {
              setTitle(event.target.value)
              setError(null)
            }}
            placeholder={fallbackTitle}
            className="mt-2 w-full rounded-lg bg-paper-sunken px-3 py-3 text-sm ring-1 ring-black/10"
          />
        </label>

        <label className="block">
          <span className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-[0.8rem] font-semibold">{labels.fieldDescription}</span>
            <span dir="ltr" className={`numeric text-[0.74rem] ${TONE[descState]}`}>
              {description.trim().length}/{SEO_DESCRIPTION_IDEAL}
            </span>
          </span>
          <textarea
            rows={3}
            value={description}
            maxLength={SEO_DESCRIPTION_MAX}
            onChange={(event) => {
              setDescription(event.target.value)
              setError(null)
            }}
            placeholder={fallbackDescription}
            className="mt-2 w-full rounded-lg bg-paper-sunken px-3 py-3 text-sm ring-1 ring-black/10"
          />
        </label>

        <p className="text-[0.76rem] text-ink-faint">{labels.hint}</p>
        <p className="text-[0.76rem] text-ink-faint">{labels.autoHint}</p>

        {error && (
          <p className="rounded-card bg-red-50 px-3 py-2 text-[0.8rem] text-red-700">{error}</p>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={pending} className="btn-primary disabled:opacity-50">
            {pending ? labels.saving : labels.save}
          </button>
          {done && <span className="text-[0.82rem] font-semibold text-accent-700">{labels.saved}</span>}
        </div>
      </form>
    </section>
  )
}
