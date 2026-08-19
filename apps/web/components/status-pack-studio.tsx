'use client'

import { useMemo, useState } from 'react'
import { formatPkr, type PackKit, type PackKitAsset } from '@oyebazar/shared'
import { CopyIcon, DownloadIcon, SparkIcon } from '@/components/icons'
import { translator, type Locale } from '@/lib/i18n'

const TEMPLATE_NAMES: Record<string, Record<Locale, string>> = {
  simple: { ur: 'سادہ', rm: 'Sada', en: 'Simple' },
  sale: { ur: 'سیل', rm: 'Sale', en: 'Sale' },
  eid: { ur: 'عید', rm: 'Eid', en: 'Eid' },
  ramadan: { ur: 'رمضان', rm: 'Ramzan', en: 'Ramadan' },
  'new-arrival': { ur: 'نیا مال', rm: 'Naya maal', en: 'New arrival' },
  wedding: { ur: 'شادی', rm: 'Shadi', en: 'Wedding' },
  winter: { ur: 'سردی', rm: 'Sardi', en: 'Winter' },
  summer: { ur: 'گرمی', rm: 'Garmi', en: 'Summer' },
}

export interface StudioImage {
  id: string
  url: string
}

interface Props {
  productId: string
  /**
   * Maal ki saari tasveerein — har ek ka apna pack ban sakta hai.
   *
   * 🔴 Sirf tasveerein aati hain, video nahi: pack Playwright ke HTML screenshot se
   * banta hai aur video par template lagane ka raasta abhi hai hi nahi.
   */
  images: StudioImage[]
  bajiPrice: number
  suggestedRetail: number
  myRetailPrice: number | null
  templates: string[]
  locale: Locale
}

type Phase = 'idle' | 'working' | 'ready' | 'error'

/**
 * ⭐ Content Studio ka UI.
 *
 * Design qawaid (docs/BUSINESS-RULES.md — persona):
 *  · 3 tap: ریٹ → ٹیمپلیٹ → بنائیں
 *  · ریٹ Baji price se kam nahi ho sakta (server bhi yehi rokta hai)
 *  · Render mein waqt lage to saaf batayen — jhoothi progress bar nahi
 *
 * Ek dafa banao, har jagah chalo: ek hi tap se poori KIT banti hai (chaar naap) aur har
 * platform ka apna caption. Pehle sirf WhatsApp ka 9:16 banta tha, aur reseller wohi
 * lamba pack Instagram feed par lagati thi jahan kinare kat jate the.
 *
 * Platform pehle, naap baad mein — reseller "1080×1350" nahi sochti, wo "انسٹاگرام"
 * sochti hai. Naap sirf tafseel mein likha hai.
 */
export function StatusPackStudio({
  productId,
  images,
  bajiPrice,
  suggestedRetail,
  myRetailPrice,
  templates,
  locale,
}: Props) {
  const t = translator(locale)
  const [price, setPrice] = useState<number>(myRetailPrice ?? suggestedRetail)
  const [templateKey, setTemplateKey] = useState<string>(templates[0] ?? 'simple')
  // Pehli tasveer wohi hai jo wholesaler ne sarwarq banayi — sab se aam soorat mein
  // reseller ko kuch chunna hi nahi parta
  const [mediaId, setMediaId] = useState<string | undefined>(images[0]?.id)
  const [phase, setPhase] = useState<Phase>('idle')
  const [kit, setKit] = useState<PackKit | null>(null)
  const [platform, setPlatform] = useState<string>('whatsapp')
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const maxPrice = useMemo(
    () => Math.max(suggestedRetail * 2, bajiPrice * 2),
    [suggestedRetail, bajiPrice],
  )
  const margin = price - bajiPrice

  const current = kit?.platforms.find((entry) => entry.key === platform) ?? kit?.platforms[0]
  const assets: PackKitAsset[] = current
    ? current.formats
        .map((format) => kit?.assets.find((asset) => asset.format === format))
        .filter((asset): asset is PackKitAsset => Boolean(asset))
    : []

  async function generate() {
    setPhase('working')
    setError(null)
    setKit(null)

    const res = await fetch('/api/v1/status-pack/kit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId,
        ...(mediaId ? { mediaId } : {}),
        templateKey,
        retailPrice: price,
      }),
    })

    if (!res.ok) {
      const payload = (await res.json().catch(() => null)) as { error?: { message?: string } } | null
      setError(payload?.error?.message ?? t('packFailed'))
      setPhase('error')
      return
    }

    const data = (await res.json()) as PackKit
    setKit(data)

    // Jo tayyar hai wo foran dikha dete hain — poore kit ka intezar nahi karwate
    setPhase('ready')
    if (data.assets.some((asset) => asset.status === 'RENDERING')) {
      await pollUntilReady(data.priceUsed, mediaId)
    }
  }

  /** Har 800ms — jaise jaise naap tayyar hote hain, wahin ke wahin nazar aane lagte hain. */
  async function pollUntilReady(priceUsed: number, forMediaId: string | undefined) {
    const deadline = Date.now() + 45_000

    while (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 800))

      // 🔴 mediaId polling mein bhi — warna reseller tasveer badal de aur hum purani
      // wali ka kit poll karte rahen, jo pehle se READY hai: naya pack banta rehta hai
      // aur screen par purana dikhta hai
      const params = new URLSearchParams({
        productId,
        ...(forMediaId ? { mediaId: forMediaId } : {}),
        templateKey,
        priceUsed: String(priceUsed),
      })
      const res = await fetch(`/api/v1/status-pack/kit?${params.toString()}`)
      if (!res.ok) continue

      const data = (await res.json()) as PackKit | { status: 'NOT_FOUND' }
      if ('status' in data) continue

      setKit(data)
      if (data.assets.every((asset) => asset.status === 'READY')) return
    }

    // Jhoothi progress bar nahi — saaf batayen ke der ho gayi
    setError(t('packSlow'))
  }

  async function markDownloaded(packId: string) {
    // metric: north star = weekly active resellers jo ≥3 packs share karti hain
    await fetch(`/api/v1/status-pack/${packId}/downloaded`, { method: 'POST' }).catch(
      () => undefined,
    )
  }

  function copyCaption(text: string) {
    void navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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
          <p className="text-[0.8rem] leading-relaxed text-white/60">{t('kitSubtitle')}</p>
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

        {/*
          Tasveer chunna — sirf tab jab waqai chunne ko kuch ho.
          Ek hi tasveer wale maal par ye patti sirf ek extra tap hai, aur 3-tap ka
          usool (docs/CONVENTIONS.md) usi jagah tootta hai jahan "sirf ek aur" lagta hai.
        */}
        {images.length > 1 && (
          <div>
            <p className="text-sm font-semibold">{t('choosePhotoForPack')}</p>
            <div className="rail mt-3">
              {images.map((image, index) => (
                <button
                  key={image.id}
                  type="button"
                  onClick={() => setMediaId(image.id)}
                  aria-label={`${t('photoNumber')} ${index + 1}`}
                  aria-pressed={image.id === mediaId}
                  className={
                    image.id === mediaId
                      ? 'h-16 w-16 shrink-0 overflow-hidden rounded-card ring-2 ring-accent-700'
                      : 'link-tap h-16 w-16 shrink-0 overflow-hidden rounded-card ring-1 ring-line'
                  }
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- storage URLs; next/image Phase 2 */}
                  <img src={image.url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        )}

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
          {phase === 'working' ? t('building') : t('makeKit')}
        </button>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {phase === 'working' && !kit && (
          <p className="rounded-2xl bg-brand-50 p-4 text-sm text-brand-800">{t('imageBuilding')}</p>
        )}

        {kit && current && (
          <div className="space-y-5">
            {/* Platform pehle — reseller naap nahi, jagah sochti hai */}
            <div className="rail">
              {kit.platforms.map((entry) => (
                <button
                  key={entry.key}
                  type="button"
                  onClick={() => setPlatform(entry.key)}
                  className={entry.key === platform ? 'chip chip-active' : 'chip'}
                >
                  {locale === 'ur' ? entry.labelUr : entry.labelEn}
                </button>
              ))}
            </div>

            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {assets.map((asset) => (
                <li key={asset.format} className="space-y-2">
                  <div className="overflow-hidden rounded-2xl bg-paper-sunken shadow-soft">
                    {asset.imageUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element -- generated pack from storage */
                      <img
                        src={asset.imageUrl}
                        alt={locale === 'ur' ? asset.labelUr : asset.labelEn}
                        className="w-full"
                        style={{ aspectRatio: `${asset.width} / ${asset.height}` }}
                      />
                    ) : (
                      <div
                        className="flex items-center justify-center text-[0.75rem] text-ink-faint"
                        style={{ aspectRatio: `${asset.width} / ${asset.height}` }}
                      >
                        {t('sizePreparing')}
                      </div>
                    )}
                  </div>

                  <p className="text-[0.8rem] font-semibold leading-snug">
                    {locale === 'ur' ? asset.labelUr : asset.labelEn}
                  </p>
                  <p dir="ltr" className="numeric text-[0.7rem] text-ink-faint">
                    {asset.width}×{asset.height}
                  </p>

                  {asset.imageUrl && (
                    <a
                      href={asset.imageUrl}
                      download={`oyebazar-${asset.format}.jpg`}
                      onClick={() => void markDownloaded(asset.packId)}
                      className="btn-secondary w-full !py-2 text-[0.8rem]"
                    >
                      <DownloadIcon className="h-4 w-4" />
                      {t('download')}
                    </a>
                  )}
                </li>
              ))}
            </ul>

            {/* Caption — tasveer se kam ahem nahi. Har platform ka apna. */}
            <div className="rounded-2xl bg-paper-sunken p-4">
              <p className="text-[0.78rem] font-semibold text-ink-soft">{t('captionLabel')}</p>
              <p className="mt-2 whitespace-pre-line text-[0.88rem] leading-relaxed">
                {current.caption}
              </p>
              <button
                type="button"
                onClick={() => copyCaption(current.caption)}
                className="btn-secondary mt-4 w-full"
              >
                <CopyIcon className="h-4 w-4" />
                {copied ? t('copied') : t('copyCaption')}
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
