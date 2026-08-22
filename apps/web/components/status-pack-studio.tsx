'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { formatPkr, type PackKit, type PackKitAsset, type PackOptions } from '@oyebazar/shared'
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
  minimal: { ur: 'سادہ سفید', rm: 'Safed', en: 'White card' },
  bold: { ur: 'نمایاں', rm: 'Numaya', en: 'Bold price' },
  dark: { ur: 'گہرا', rm: 'Gehra', en: 'Dark' },
  frame: { ur: 'فریم', rm: 'Frame', en: 'Framed' },
}

export interface StudioImage {
  id: string
  url: string
}

/**
 * Ek switch — bara nishana, poori qatar dabai ja sakti hai.
 *
 * `<input type="checkbox">` ka apna chhota murabba 44px ke usool (docs/CONVENTIONS.md)
 * par poora nahi utarta, aur ye safha phone par chalta hai.
 */
function PackToggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="link-tap flex w-full items-center justify-between gap-3 py-1 text-right"
    >
      <span className="text-[0.9rem] font-semibold">{label}</span>
      <span
        className={
          checked
            ? 'flex h-7 w-12 shrink-0 items-center rounded-pill bg-accent-700 px-1'
            : 'flex h-7 w-12 shrink-0 items-center rounded-pill bg-line px-1'
        }
      >
        <span
          className={
            checked
              ? 'h-5 w-5 translate-x-0 rounded-pill bg-white transition-transform'
              : 'h-5 w-5 translate-x-5 rounded-pill bg-white transition-transform'
          }
        />
      </span>
    </button>
  )
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
  /** Reseller ke apne default — Studio har naye pack par yahin se shuru hota hai. */
  packDefaults: PackOptions
  /** Us ke apne banaye hue template — built-in walon ke saath usi patti mein. */
  customTemplates: { key: string; name: string }[]
  /** Kaun sa default hai (built-in ya apna) — patti yahin se shuru hoti hai. */
  defaultTemplateKey: string | null
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
  packDefaults,
  customTemplates,
  defaultTemplateKey,
  locale,
}: Props) {
  const t = translator(locale)
  const [price, setPrice] = useState<number>(myRetailPrice ?? suggestedRetail)
  /*
   * Shuruaat reseller ke apne default se — jis ne apna template banaya aur usay default
   * bana diya, usay har maal par dobara wo chunna nahi parta. Wohi is button ka matlab hai.
   */
  const [templateKey, setTemplateKey] = useState<string>(
    defaultTemplateKey ?? templates[0] ?? 'simple',
  )
  // Pehli tasveer wohi hai jo wholesaler ne sarwarq banayi — sab se aam soorat mein
  // reseller ko kuch chunna hi nahi parta
  const [mediaId, setMediaId] = useState<string | undefined>(images[0]?.id)
  const [phase, setPhase] = useState<Phase>('idle')
  const [kit, setKit] = useState<PackKit | null>(null)
  const [platform, setPlatform] = useState<string>('whatsapp')
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /*
   * Pack ke apne faislay. Shuruaat reseller ke profile wale default se — jis ne ek dafa
   * "ہمیشہ کے لیے" daba diya, usay har pack par dobara wohi switch nahi dabane parte.
   */
  const [options, setOptions] = useState<PackOptions>(packDefaults)
  const [savingDefaults, setSavingDefaults] = useState(false)
  const [defaultsSaved, setDefaultsSaved] = useState(false)

  function setOption<K extends keyof PackOptions>(field: K, value: PackOptions[K]) {
    setOptions((current) => ({ ...current, [field]: value }))
    // Faisla badal gaya to purani kit ab is se mel nahi khati — usay hata dete hain,
    // warna screen par purani tasveer aur naye switch ek saath dikhte hain
    setKit(null)
    setPhase('idle')
    setDefaultsSaved(false)
  }

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
        options,
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
      await pollUntilReady(data.priceUsed, mediaId, data.optionsKey)
    }
  }

  /** Har 800ms — jaise jaise naap tayyar hote hain, wahin ke wahin nazar aane lagte hain. */
  async function pollUntilReady(
    priceUsed: number,
    forMediaId: string | undefined,
    optionsKey: string,
  ) {
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
        // 🔴 mediaId ki tarah ye bhi lazmi hai — warna hum purani (mukhtalif faislon
        // wali) kit poll karte rehte hain jo pehle se READY hai
        optionsKey,
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

  /** "ہمیشہ کے لیے" — mojooda faislay profile par, taake har agla pack inhi se shuru ho. */
  async function saveAsDefault() {
    setSavingDefaults(true)
    const res = await fetch('/api/v1/status-pack/defaults', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options),
    }).catch(() => null)

    setSavingDefaults(false)
    if (res?.ok) setDefaultsSaved(true)
    else setError(t('somethingWrong'))
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
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm font-semibold">{t('design')}</p>
            {/* Apna banane ka rasta yahin se — wahan jahan reseller design ke baare mein soch rahi hai */}
            <Link href="/templates" className="text-[0.78rem] text-accent-700 underline">
              {t('makeYourOwn')}
            </Link>
          </div>
          <div className="rail mt-3">
            {/* Apne banaye hue pehle — mehnat un par lagi hai, wo peechay nahi hone chahiyen */}
            {customTemplates.map((template) => (
              <button
                key={template.key}
                type="button"
                onClick={() => setTemplateKey(template.key)}
                className={template.key === templateKey ? 'chip chip-active' : 'chip'}
              >
                ★ {template.name}
              </button>
            ))}
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

        {/*
          3 — tasveer par kya kya jaye

          Teen switch aur do khaane. Ye patti template ke NEECHE hai, banane ke button se
          UPAR — kyunke ye faislay tasveer ka hissa hain, us ke baad ki cheez nahi.
        */}
        <div>
          <p className="text-sm font-semibold">{t('whatShowsOnPack')}</p>

          {/* Zaban — pack ki, reseller ke UI ki nahi */}
          <div className="rail mt-3">
            {(['ur', 'en'] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setOption('lang', key)}
                className={options.lang === key ? 'chip chip-active' : 'chip'}
              >
                {key === 'ur' ? t('packUrdu') : t('packEnglish')}
              </button>
            ))}
          </div>

          <div className="mt-3 space-y-3 rounded-2xl bg-paper-sunken p-4">
            <PackToggle
              label={t('showPriceOnPack')}
              checked={options.showPrice}
              onChange={(value) => setOption('showPrice', value)}
            />

            <PackToggle
              label={t('showNameOnPack')}
              checked={options.showName}
              onChange={(value) => setOption('showName', value)}
            />

            {options.showName && (
              <input
                type="text"
                maxLength={30}
                value={options.name ?? ''}
                onChange={(e) => setOption('name', e.target.value)}
                placeholder={t('nameOnPackHint')}
                className="field w-full text-[0.95rem]"
              />
            )}

            <PackToggle
              label={t('showPhoneOnPack')}
              checked={options.showPhone}
              onChange={(value) => setOption('showPhone', value)}
            />

            {options.showPhone && (
              <input
                type="tel"
                inputMode="numeric"
                dir="ltr"
                maxLength={20}
                value={options.phone ?? ''}
                onChange={(e) => setOption('phone', e.target.value)}
                placeholder={t('phoneOnPackHint')}
                className="field w-full text-[0.95rem]"
              />
            )}

            <button
              type="button"
              onClick={saveAsDefault}
              disabled={savingDefaults}
              className="w-full text-[0.82rem] text-ink-soft underline"
            >
              {defaultsSaved ? t('savedAsDefault') : t('saveAsDefault')}
            </button>
          </div>
        </div>

        {/* 4 — بنائیں */}
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
