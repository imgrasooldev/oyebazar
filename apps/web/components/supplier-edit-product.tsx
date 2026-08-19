'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { formatPkr } from '@oyebazar/shared'
import { CategorySelect, type CategoryGroup } from '@/components/category-select'
import { translator, type Locale } from '@/lib/i18n'

export interface EditableProduct {
  id: string
  titleUr: string
  titleEn: string
  descriptionUr: string | null
  categorySlug: string
  supplierPrice: number
  stockQty: number
}

/**
 * DRAFT maal ki tafseel theek karna.
 *
 * 🔴 Ye button SIRF DRAFT par aata hai. Wajah kaarobari hai, technical nahi: DRAFT ko
 * na ops ne dekha hai na kisi reseller ne, is liye naam ya rate badalne se kisi ka kuch
 * nahi bigarta. LIVE hone ke baad wohi cheez badalna alag maslaa hai — reseller apna
 * retail rate save kar chuki hoti hai aur us ke status pack WhatsApp par ja chuke hote
 * hain; rate barh jaye to us ka laga hua pack ab us ki apni lagat se neeche ka rate
 * dikha raha hota hai aur usay khabar tak nahi hoti.
 *
 * Hisab yahan bhi dikhta hai (jaise naya maal daalte waqt) — dukan wala rate badalte
 * hi dekh leta hai ke reseller ko kya nazar aayega. Faisla phir bhi server ka hai.
 */
export function SupplierEditProduct({
  product,
  categories,
  feeRateBps,
  locale,
}: {
  product: EditableProduct
  categories: CategoryGroup[]
  feeRateBps: number
  locale: Locale
}) {
  const t = translator(locale)
  const router = useRouter()

  const [open, setOpen] = useState(false)
  const [price, setPrice] = useState(product.supplierPrice)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const fee = Math.round((price * feeRateBps) / 10_000)
  const resellerSees = price + fee

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    const data = new FormData(event.currentTarget)

    startTransition(async () => {
      const res = await fetch(`/api/v1/supplier/products/${product.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titleUr: String(data.get('titleUr') ?? ''),
          titleEn: String(data.get('titleEn') ?? ''),
          categorySlug: String(data.get('categorySlug') ?? ''),
          supplierPrice: Number(data.get('supplierPrice') ?? 0),
          stockQty: Number(data.get('stockQty') ?? 0),
          ...(data.get('descriptionUr') ? { descriptionUr: String(data.get('descriptionUr')) } : {}),
        }),
      })

      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as
          | { error?: { message?: string } }
          | null
        setError(payload?.error?.message ?? t('somethingWrong'))
        return
      }

      setOpen(false)
      router.refresh()
    })
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn-secondary text-sm">
        {t('editProduct')}
      </button>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-card bg-paper-sunken p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-semibold">{t('productNameUr')}</span>
          <input
            name="titleUr"
            required
            maxLength={80}
            defaultValue={product.titleUr}
            className="field mt-2"
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold">{t('productNameEn')}</span>
          <input
            name="titleEn"
            required
            maxLength={80}
            dir="ltr"
            defaultValue={product.titleEn}
            className="field mt-2"
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold">{t('category')}</span>
          <CategorySelect
            name="categorySlug"
            groups={categories}
            value={product.categorySlug}
            locale={locale}
            required
          />
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

      {/* Hisab saaf — bilkul waise jaise naya maal daalte waqt */}
      {price > 0 && (
        <div className="grid grid-cols-3 gap-3 rounded-card bg-paper p-4 text-center">
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
          required
          dir="ltr"
          defaultValue={product.stockQty}
          className="field mt-2"
        />
      </label>

      <label className="block">
        <span className="text-sm font-semibold">{t('detailsOptional')}</span>
        <input
          name="descriptionUr"
          maxLength={300}
          defaultValue={product.descriptionUr ?? ''}
          className="field mt-2"
        />
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? t('sending') : t('save')}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="btn-secondary">
          {t('notNow')}
        </button>
      </div>
    </form>
  )
}
