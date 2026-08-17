'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { translator, type Locale } from '@/lib/i18n'

/**
 * 🔴 Confirmation — is button ke baghair order wholesaler ko nahi jata.
 *
 * Do qadam jaan boojh kar: pehla tap sawal poochta hai ("customer se baat ho gayi?"),
 * doosra confirm karta hai. Ghalat confirmation ka anjaam wapsi (RTO) hai, jo
 * har baar ~PKR 300 khata hai — isliye yahan ek extra tap theek hai.
 */
export function OrderConfirmButton({ orderNo, locale }: { orderNo: string; locale: Locale }) {
  const t = translator(locale)
  const router = useRouter()
  const [asking, setAsking] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function confirm() {
    setPending(true)
    setError(null)

    const res = await fetch(`/api/v1/orders/${orderNo}/confirm`, { method: 'POST' })
    if (!res.ok) {
      const payload = (await res.json().catch(() => null)) as { error?: { message?: string } } | null
      setError(payload?.error?.message ?? t('confirmFailed'))
      setPending(false)
      return
    }

    router.refresh()
  }

  if (!asking) {
    return (
      <button
        type="button"
        onClick={() => setAsking(true)}
        className="btn-primary w-full !py-2 text-sm"
      >
        {t('confirm')}
      </button>
    )
  }

  return (
    <div className="rounded-lg bg-amber-50 p-3">
      <p className="text-sm text-amber-900">{t('confirmQuestion')}</p>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => void confirm()}
          disabled={pending}
          className="btn-primary flex-1 !py-2 text-sm"
        >
          {pending ? '…' : t('confirmYes')}
        </button>
        <button
          type="button"
          onClick={() => setAsking(false)}
          className="btn-secondary flex-1 !py-2 text-sm"
        >
          {t('notNow')}
        </button>
      </div>
    </div>
  )
}
