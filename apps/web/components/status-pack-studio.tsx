'use client'

import { useMemo, useState } from 'react'
import { formatPkr } from '@oyebazar/shared'
import { translator, type Locale } from '@/lib/i18n'

const TEMPLATE_NAMES: Record<string, { ur: string; en: string }> = {
  simple: { ur: 'سادہ', en: 'Simple' },
  sale: { ur: 'سیل', en: 'Sale' },
  eid: { ur: 'عید', en: 'Eid' },
  ramadan: { ur: 'رمضان', en: 'Ramadan' },
  'new-arrival': { ur: 'نیا مال', en: 'New arrival' },
  wedding: { ur: 'شادی', en: 'Wedding' },
  winter: { ur: 'سردی', en: 'Winter' },
  summer: { ur: 'گرمی', en: 'Summer' },
}

interface Props {
  productId: string
  bajiPrice: number
  suggestedRetail: number
  myRetailPrice: number | null
  templates: string[]
  locale: Locale
}

type Phase = 'idle' | 'working' | 'ready' | 'error'

interface PackState {
  id: string
  imageUrl: string | null
  caption: string
  status: 'READY' | 'RENDERING'
}

/**
 * ⭐ Content Studio ka UI.
 *
 * Design qawaid (docs/BUSINESS-RULES.md — persona):
 *  · 3 tap: ریٹ → ٹیمپلیٹ → بنائیں
 *  · ریٹ Baji price se kam nahi ho sakta (server bhi yehi rokta hai)
 *  · Render mein waqt lage to saaf batayen — jhoothi progress bar nahi
 */
export function StatusPackStudio({
  productId,
  bajiPrice,
  suggestedRetail,
  myRetailPrice,
  templates,
  locale,
}: Props) {
  const t = translator(locale)
  const [price, setPrice] = useState<number>(myRetailPrice ?? suggestedRetail)
  const [templateKey, setTemplateKey] = useState<string>(templates[0] ?? 'simple')
  const [phase, setPhase] = useState<Phase>('idle')
  const [pack, setPack] = useState<PackState | null>(null)
  const [error, setError] = useState<string | null>(null)

  const maxPrice = useMemo(() => Math.max(suggestedRetail * 2, bajiPrice * 2), [suggestedRetail, bajiPrice])
  const margin = price - bajiPrice

  async function generate() {
    setPhase('working')
    setError(null)
    setPack(null)

    const res = await fetch('/api/v1/status-pack', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, templateKey, retailPrice: price }),
    })

    if (!res.ok) {
      const payload = (await res.json().catch(() => null)) as { error?: { message?: string } } | null
      setError(payload?.error?.message ?? t('packFailed'))
      setPhase('error')
      return
    }

    const data = (await res.json()) as PackState
    setPack(data)

    if (data.status === 'READY') {
      setPhase('ready')
      return
    }

    // Cache miss — worker render kar raha hai. Har 800ms poll (p95 target <2s).
    await pollUntilReady(price)
  }

  async function pollUntilReady(priceUsed: number) {
    const deadline = Date.now() + 45_000

    while (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 800))

      const params = new URLSearchParams({
        productId,
        templateKey,
        priceUsed: String(priceUsed),
      })
      const res = await fetch(`/api/v1/status-pack?${params.toString()}`)
      if (!res.ok) continue

      const data = (await res.json()) as PackState | { status: 'NOT_FOUND' }
      if (data.status === 'READY') {
        setPack(data as PackState)
        setPhase('ready')
        return
      }
    }

    // Jhoothi progress bar nahi — saaf batayen ke der ho gayi
    setError(t('packSlow'))
    setPhase('error')
  }

  async function markDownloaded(packId: string) {
    // metric: north star = weekly active resellers jo ≥3 packs share karti hain
    await fetch(`/api/v1/status-pack/${packId}/downloaded`, { method: 'POST' }).catch(() => undefined)
  }

  return (
    <section className="card space-y-5 p-4">
      <h2 className="text-lg font-bold">{t('studioTitle')}</h2>

      {/* 1 — ریٹ */}
      <div>
        <div className="flex items-baseline justify-between">
          <label htmlFor="price" className="text-sm font-semibold">
            {t('yourPrice')}
          </label>
          <span className="text-lg font-bold" dir="ltr">
            {formatPkr(price)}
          </span>
        </div>

        <input
          id="price"
          type="range"
          min={bajiPrice}
          max={maxPrice}
          step={50}
          value={price}
          onChange={(e) => setPrice(Number(e.target.value))}
          className="mt-3 w-full accent-brand-600"
        />

        <p className="mt-2 text-sm text-ink-soft">
          {t('yourCost')} <span dir="ltr">{formatPkr(bajiPrice)}</span> · {t('yourProfit')}{' '}
          <span dir="ltr" className={margin > 0 ? 'font-semibold text-accent-700' : 'text-ink-faint'}>
            {formatPkr(margin)}
          </span>
        </p>
      </div>

      {/* 2 — ٹیمپلیٹ */}
      <div>
        <p className="text-sm font-semibold">{t('design')}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {templates.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setTemplateKey(key)}
              className={
                key === templateKey
                  ? 'rounded-2xl border-2 border-brand-600 bg-brand-50 px-4 py-2 text-sm font-semibold'
                  : 'rounded-2xl ring-1 ring-black/10 px-4 py-2 text-sm'
              }
            >
              {TEMPLATE_NAMES[key]?.[locale] ?? key}
            </button>
          ))}
        </div>
      </div>

      {/* 3 — بنائیں */}
      <button
        type="button"
        onClick={generate}
        disabled={phase === 'working'}
        className="btn-primary w-full"
      >
        {phase === 'working' ? t('building') : t('studioTitle')}
      </button>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {phase === 'working' && pack?.status === 'RENDERING' && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{t('imageBuilding')}</p>
      )}

      {pack?.imageUrl && (
        <div className="space-y-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- generated pack from storage */}
          <img
            src={pack.imageUrl}
            alt={t('studioTitle')}
            className="mx-auto aspect-[9/16] w-full max-w-xs rounded-2xl border border-black/[0.06] object-cover"
          />

          <a
            href={pack.imageUrl}
            download
            onClick={() => void markDownloaded(pack.id)}
            className="btn-primary w-full"
          >
            {t('download')}
          </a>

          <button
            type="button"
            onClick={() => void navigator.clipboard.writeText(pack.caption)}
            className="btn-secondary w-full"
          >
            {t('copyCaption')}
          </button>
        </div>
      )}
    </section>
  )
}
