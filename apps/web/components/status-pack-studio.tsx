'use client'

import { useMemo, useState } from 'react'
import { formatPkr } from '@oyebazar/shared'
import { CopyIcon, DownloadIcon, SparkIcon } from '@/components/icons'
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
    <section className="card overflow-hidden">
      {/* Sar — kaam ka naam, aur teen qadam ka ishara */}
      <div className="flex items-center gap-3 bg-coal-900 px-6 py-5 text-white">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-pill bg-brand-500/20 text-brand-300">
          <SparkIcon />
        </span>
        <div>
          <h2 className="text-[1.1rem] font-bold">{t('studioTitle')}</h2>
          <p className="text-[0.8rem] text-white/60">{t('studioSteps')}</p>
        </div>
      </div>

      <div className="space-y-7 p-6">
        {/* 1 — ریٹ */}
        <div>
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor="price" className="text-sm font-semibold">
              {t('yourPrice')}
            </label>
            <span className="numeric text-[1.6rem] font-bold leading-none" dir="ltr">
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
            className="mt-4 h-2 w-full cursor-pointer appearance-none rounded-pill bg-paper-sunken accent-brand-500"
          />

          {/* Lagat aur munafa — do alag dabbe, taake nazar foran munafe par jaye */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-paper-sunken px-4 py-3">
              <p className="text-[0.72rem] text-ink-faint">{t('yourCost')}</p>
              <p dir="ltr" className="numeric mt-1 font-bold">
                {formatPkr(bajiPrice)}
              </p>
            </div>
            <div
              className={
                margin > 0
                  ? 'rounded-2xl bg-accent-50 px-4 py-3'
                  : 'rounded-2xl bg-paper-sunken px-4 py-3'
              }
            >
              <p className="text-[0.72rem] text-ink-faint">{t('yourProfit')}</p>
              <p
                dir="ltr"
                className={
                  margin > 0 ? 'numeric mt-1 font-bold text-accent-700' : 'numeric mt-1 font-bold'
                }
              >
                {formatPkr(Math.max(margin, 0))}
              </p>
            </div>
          </div>
        </div>

        {/* 2 — ٹیمپلیٹ */}
        <div>
          <p className="text-sm font-semibold">{t('design')}</p>
          <div className="rail mt-3">
            {templates.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setTemplateKey(key)}
                className={key === templateKey ? 'chip chip-active' : 'chip'}
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
          className="btn-primary w-full !py-4 text-base"
        >
          {phase === 'working' ? t('building') : t('studioTitle')}
        </button>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {phase === 'working' && pack?.status === 'RENDERING' && (
          <p className="rounded-2xl bg-brand-50 p-4 text-sm text-brand-800">{t('imageBuilding')}</p>
        )}

        {pack?.imageUrl && (
          <div className="space-y-4">
            <div className="mx-auto w-full max-w-[16rem] overflow-hidden rounded-2xl shadow-lift">
              {/* eslint-disable-next-line @next/next/no-img-element -- generated pack from storage */}
              <img
                src={pack.imageUrl}
                alt={t('studioTitle')}
                className="aspect-[9/16] w-full object-cover"
              />
            </div>

            <a
              href={pack.imageUrl}
              download
              onClick={() => void markDownloaded(pack.id)}
              className="btn-primary w-full !py-4 text-base"
            >
              <DownloadIcon className="h-5 w-5" />
              {t('download')}
            </a>

            <button
              type="button"
              onClick={() => void navigator.clipboard.writeText(pack.caption)}
              className="btn-secondary w-full"
            >
              <CopyIcon className="h-4 w-4" />
              {t('copyCaption')}
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
