'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { formatPkr } from '@oyebazar/shared'
import { translator, type Locale } from '@/lib/i18n'

/**
 * LIVE maal ka naya rate maangna.
 *
 * 🔴 Yahan rate BADALTA NAHI — sirf darkhwast jati hai. UI ka har lafz yehi kehta hai
 * ("ریٹ کی درخواست", "ٹیم دیکھے گی"), kyunke sab se bura anjaam ye hota ke dukan wala
 * samajhta rahe ke rate lag chuka hai aur maal purane rate par bikta rahe.
 *
 * Approval ki wajah dukan wale ko bhi dikhai jati hai — chhupane se shak hota hai, aur
 * mandi mein bharosa hi asli sarmaya hai.
 */
export function SupplierPriceRequest({
  productId,
  currentPrice,
  feeRateBps,
  pending: alreadyPending,
  locale,
}: {
  productId: string
  currentPrice: number
  feeRateBps: number
  /** Is maal par pehle se koi khuli darkhwast? Tab dobara bhejne ka koi faida nahi. */
  pending: { requestedSupplierPrice: number } | null
  locale: Locale
}) {
  const t = translator(locale)
  const router = useRouter()

  const [open, setOpen] = useState(false)
  const [price, setPrice] = useState(currentPrice)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [busy, startTransition] = useTransition()

  const fee = Math.round((price * feeRateBps) / 10_000)
  const resellerWouldSee = price + fee

  if (alreadyPending) {
    return (
      <p className="text-sm font-semibold text-brand-700">
        {t('priceRequestPending')}{' '}
        <span dir="ltr" className="numeric">
          {formatPkr(alreadyPending.requestedSupplierPrice)}
        </span>
      </p>
    )
  }

  if (sent) {
    return <p className="text-sm font-semibold text-accent-700">{t('priceRequestSent')}</p>
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn-secondary text-sm">
        {t('askPriceChange')}
      </button>
    )
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    const data = new FormData(event.currentTarget)

    startTransition(async () => {
      const res = await fetch(`/api/v1/supplier/products/${productId}/price-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierPrice: Number(data.get('supplierPrice') ?? 0),
          ...(data.get('reason') ? { reason: String(data.get('reason')) } : {}),
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
      setSent(true)
      router.refresh()
    })
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-card bg-paper-sunken p-4">
      <label className="block">
        <span className="text-sm font-semibold">{t('newRate')}</span>
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

      {/* Manzoori mile to kya hoga — dukan wale ko abhi dikh jana chahiye */}
      {price > 0 && price !== currentPrice && (
        <p className="text-sm text-ink-soft">
          {t('resellerWouldSee')}{' '}
          <span dir="ltr" className="numeric font-bold text-accent-700">
            {formatPkr(resellerWouldSee)}
          </span>
          {' · '}
          {t('nowItIs')}{' '}
          <span dir="ltr" className="numeric">
            {formatPkr(currentPrice + Math.round((currentPrice * feeRateBps) / 10_000))}
          </span>
        </p>
      )}

      <label className="block">
        <span className="text-sm font-semibold">{t('reasonOptional')}</span>
        <input name="reason" maxLength={200} className="field mt-2" />
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={busy} className="btn-primary">
          {busy ? t('sending') : t('sendPriceRequest')}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="btn-secondary">
          {t('notNow')}
        </button>
      </div>

      <p className="text-[0.78rem] leading-relaxed text-ink-faint">{t('priceApprovalNote')}</p>
    </form>
  )
}
