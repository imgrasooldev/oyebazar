'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { formatPkr } from '@oyebazar/shared'
import { CategorySelect, type CategoryGroup } from '@/components/category-select'
import { MediaUploader, type UploadedMedia } from '@/components/media-uploader'
import { translator, type Locale } from '@/lib/i18n'



/**
 * Wholesaler apna maal daalta hai.
 *
 * Sab se ahem cheez yahan **hisab dikhana** hai: wo 1000 likhta hai aur usay usi waqt
 * nazar aata hai ke "aap ko 1000 milenge, reseller ko 1050 dikhega". Ye number chhupana
 * bad-niyati lagti hai — aur mandi mein bharosa hi asli sarmaya hai.
 *
 * Hisab sirf dikhane ke liye yahan bhi lagaya gaya hai; asli faisla server par hota hai
 * (client se rate bhejte to koi bhi apni marzi ka bhej kar fee ura leta).
 */
export function SupplierAddProduct({
  categories,
  feeRateBps,
  locale,
}: {
  categories: CategoryGroup[]
  feeRateBps: number
  locale: Locale
}) {
  const t = translator(locale)
  const router = useRouter()

  const [open, setOpen] = useState(false)
  const [price, setPrice] = useState(0)
  const [media, setMedia] = useState<UploadedMedia[]>([])
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const fee = Math.round((price * feeRateBps) / 10_000)
  const resellerSees = price + fee

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    const form = event.currentTarget
    const data = new FormData(form)

    startTransition(async () => {
      const res = await fetch('/api/v1/supplier/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titleUr: String(data.get('titleUr') ?? ''),
          titleEn: String(data.get('titleEn') ?? ''),
          categorySlug: String(data.get('categorySlug') ?? ''),
          supplierPrice: Number(data.get('supplierPrice') ?? 0),
          stockQty: Number(data.get('stockQty') ?? 0),
          ...(data.get('descriptionUr') ? { descriptionUr: String(data.get('descriptionUr')) } : {}),
          ...(media.length > 0 ? { media } : {}),
        }),
      })

      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as
          | { error?: { message?: string } }
          | null
        setError(payload?.error?.message ?? t('somethingWrong'))
        return
      }

      form.reset()
      setPrice(0)
      setMedia([])
      setOpen(false)
      setDone(t('productAddedDraft'))
      router.refresh()
    })
  }

  if (!open) {
    return (
      <div className="space-y-3">
        <button type="button" onClick={() => setOpen(true)} className="btn-primary">
          {t('addProduct')}
        </button>
        {done && <p className="text-sm font-semibold text-accent-700">{done}</p>}
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="card space-y-4 p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-semibold">{t('productNameUr')}</span>
          <input name="titleUr" required maxLength={80} className="field mt-2" />
        </label>

        <label className="block">
          <span className="text-sm font-semibold">{t('productNameEn')}</span>
          <input name="titleEn" required maxLength={80} dir="ltr" className="field mt-2" />
        </label>

        <label className="block">
          <span className="text-sm font-semibold">{t('category')}</span>
          <CategorySelect name="categorySlug" groups={categories} locale={locale} required />
        </label>

        <label className="block">
          <span className="text-sm font-semibold">{t('yourRate')}</span>
          <input
            name="supplierPrice"
            type="number"
            min={1}
            required
            dir="ltr"
            value={price || ''}
            onChange={(event) => setPrice(Number(event.target.value))}
            className="field mt-2 text-lg"
          />
        </label>
      </div>

      {/* Hisab saaf — is se bharosa banta hai, chhupane se shak */}
      {price > 0 && (
        <div className="grid grid-cols-3 gap-3 rounded-card bg-paper-sunken p-4 text-center">
          <div>
            <p className="text-[0.72rem] text-ink-faint">{t('youGet')}</p>
            <p dir="ltr" className="numeric mt-1 font-bold">
              {formatPkr(price)}
            </p>
          </div>
          <div>
            <p className="text-[0.72rem] text-ink-faint">{t('ourFee')}</p>
            <p dir="ltr" className="numeric mt-1 font-bold text-ink-soft">
              {formatPkr(fee)}
            </p>
          </div>
          <div>
            <p className="text-[0.72rem] text-ink-faint">{t('resellerSees')}</p>
            <p dir="ltr" className="numeric mt-1 font-bold text-accent-700">
              {formatPkr(resellerSees)}
            </p>
          </div>
        </div>
      )}

      <label className="block">
        <span className="text-sm font-semibold">{t('stockQty')}</span>
        <input
          name="stockQty"
          type="number"
          min={1}
          defaultValue={10}
          required
          dir="ltr"
          className="field mt-2"
        />
      </label>

      <MediaUploader media={media} onChange={setMedia} locale={locale} disabled={pending} />

      <label className="block">
        <span className="text-sm font-semibold">{t('detailsOptional')}</span>
        <input name="descriptionUr" maxLength={300} className="field mt-2" />
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? t('sending') : t('addProduct')}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="btn-secondary">
          {t('notNow')}
        </button>
      </div>

      <p className="text-[0.78rem] leading-relaxed text-ink-faint">{t('productDraftNote')}</p>
    </form>
  )
}
