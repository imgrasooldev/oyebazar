'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { SparkIcon } from '@/components/icons'

type Draft = {
  titleUr: string
  titleEn: string
  descriptionUr: string
  categorySlug: string | null
}

/**
 * Maal ka naam aur khaana theek karna — ops ki taraf se.
 *
 * 🔴 Ye is liye bana ke ops ki chhanni DO nishan lagati thi jin par wo kuch kar hi
 * nahi sakti thi: `oddTitle` (aisa naam jis se maal pehchana hi nahi ja sakta) aur
 * `uncategorised`. Admin API sirf halat badal sakti thi — LIVE, DRAFT, ARCHIVED.
 *
 * Jis nishan ka koi agla qadam na ho, wo teen hafte mein wo cheez ban jata hai jise koi
 * nahi dekhta — aur us ke saath wo nishan bhi mar jate hain jin par kaam ho sakta tha.
 *
 * 🔴 AI ka button yahan MADAD hai, faisla nahi. Wo khaane bhar deta hai aur ops unhen
 * dekh kar, badal kar bhejti hai. Seedha lagana us se buri surat hoti jo abhi hai:
 * abhi naam ghalat hai magar wo kisi INSAAN ka likha hua hai aur us ka koi zimmedar
 * hai. Model ka likha hua ghalat naam bina kisi zimmedar ke catalogue par chala jata.
 */
export function AdminFixNaming({
  productId,
  titleUr,
  titleEn,
  categories,
  canSuggest,
}: {
  productId: string
  titleUr: string
  titleEn: string
  /** Sab khaane — slug aur naam */
  categories: readonly { slug: string; nameEn: string }[]
  /**
   * Tasveer se tajweez mumkin hai ya nahi.
   *
   * 🔴 Server se aata hai (key lagi hai ya nahi) — aur `false` par button dikhta hi
   * nahi. Ek aisa button jo har dafa kuch na kare, us button se bura hai jo hai hi
   * nahi: banda usay teen dafa dabata hai aur phir baqi safhe par bhi bharosa chhor
   * deta hai.
   */
  canSuggest: boolean
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [ur, setUr] = useState(titleUr)
  const [en, setEn] = useState(titleEn)
  /*
   * `''` = "khaana waisa hi rehne do".
   *
   * 🔴 Ye "koi category nahi" se ALAG hai. Ops aksar sirf naam theek karti hai; us
   * surat mein category ko chhoona hi nahi chahiye, warna theek kiya hua maal chup
   * chaap us chhanni se nikal jata jis mein wo pehle se theek para tha.
   */
  const [slug, setSlug] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-pill px-3 py-1 text-[0.74rem] font-semibold text-ink-faint underline decoration-dotted underline-offset-2 transition hover:text-brand-700"
      >
        Fix name
      </button>
    )
  }

  async function suggest() {
    setBusy(true)
    setError(null)
    try {
      const response = await fetch(`/api/v1/admin/products/${productId}/describe`, {
        method: 'POST',
      })
      if (!response.ok) {
        setError('Tajweez nahi mili')
        return
      }
      const draft = (await response.json()) as Draft | null
      if (!draft?.titleEn) {
        setError('Tajweez nahi mili')
        return
      }
      setUr(draft.titleUr)
      setEn(draft.titleEn)
      if (draft.categorySlug) setSlug(draft.categorySlug)
    } catch {
      setError('Tajweez nahi mili')
    } finally {
      setBusy(false)
    }
  }

  async function save() {
    setBusy(true)
    setError(null)
    try {
      const response = await fetch(`/api/v1/admin/products/${productId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          titleUr: ur.trim(),
          titleEn: en.trim(),
          // Khaali chunao = "waisa hi rehne do" — dekhen upar
          categorySlug: slug ? slug : null,
        }),
      })
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as
          | { error?: { message?: string } }
          | null
        setError(data?.error?.message ?? 'Nahi ho saka')
        return
      }
      setOpen(false)
      router.refresh()
    } catch {
      setError('Nahi ho saka')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="w-full space-y-2 rounded-card bg-paper-sunken p-3">
      <div className="flex flex-wrap gap-2">
        <input
          value={en}
          onChange={(event) => setEn(event.target.value)}
          maxLength={80}
          dir="ltr"
          placeholder="English name"
          className="min-h-tap min-w-[10rem] flex-1 rounded-card bg-paper px-3 text-sm"
        />
        <input
          value={ur}
          onChange={(event) => setUr(event.target.value)}
          maxLength={80}
          placeholder="اردو نام"
          className="min-h-tap min-w-[10rem] flex-1 rounded-card bg-paper px-3 text-sm"
        />
        <select
          value={slug}
          onChange={(event) => setSlug(event.target.value)}
          className="min-h-tap rounded-card bg-paper px-3 text-sm"
        >
          <option value="">Category — leave as is</option>
          {categories.map((category) => (
            <option key={category.slug} value={category.slug}>
              {category.nameEn}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {canSuggest && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void suggest()}
            className="inline-flex min-h-tap items-center gap-2 rounded-pill bg-coal-900 px-3 text-[0.76rem] font-semibold text-white transition hover:bg-coal-900/85 disabled:opacity-60"
          >
            <SparkIcon className="h-3.5 w-3.5 text-brand-300" />
            Suggest from photo
          </button>
        )}

        <button
          type="button"
          disabled={busy || !en.trim()}
          onClick={() => void save()}
          className="inline-flex min-h-tap items-center rounded-pill bg-brand-500 px-4 text-[0.76rem] font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
        >
          {busy ? 'Saving…' : 'Save'}
        </button>

        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-2 text-[0.76rem] text-ink-faint"
        >
          Cancel
        </button>

        {error && <span className="text-[0.74rem] font-semibold text-red-600">{error}</span>}
      </div>
    </div>
  )
}
