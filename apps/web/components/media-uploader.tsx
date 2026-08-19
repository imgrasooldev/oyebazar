'use client'

import { useRef, useState } from 'react'
import {
  MAX_MEDIA_PER_PRODUCT,
  MEDIA_ACCEPT_ATTRIBUTE,
  formatBytes,
  maxBytesFor,
  isSupportedMime,
  type MediaKind,
} from '@oyebazar/shared'
import { translator, type Locale } from '@/lib/i18n'

export interface UploadedMedia {
  readonly url: string
  readonly type: MediaKind
  readonly isStatusSource: boolean
}

/**
 * Cover hamesha theek EK tasveer par.
 *
 * Koi cover na ho to pehli tasveer le leti hai. Video kabhi cover nahi banta — server
 * bhi yehi rokta hai, magar UI ko wahan tak jane hi nahi dena chahiye.
 */
function withCover(media: UploadedMedia[]): UploadedMedia[] {
  if (media.some((item) => item.isStatusSource)) return media

  const first = media.find((item) => item.type === 'IMAGE')
  if (!first) return media

  return media.map((item) => ({ ...item, isStatusSource: item === first }))
}

/**
 * Tasveerein aur video upload karne wala hissa — add-product form aur mojooda maal
 * ke media manager, dono isay istemal karte hain.
 *
 * Design ke do faisle jo dukan par test kar ke aaye hain:
 *
 * 1. **Har file apni alag request mein jati hai.** 3G par chaar tasveerein ek saath
 *    bhejne se sab ek saath girti hain aur dukan wala dobara sab chunta hai. Alag alag
 *    bhejne se jo chali gayi wo chali gayi, aur har ek ka apna anjaam saaf dikhta hai.
 *
 * 2. **Cover chunna radio hai, drag nahi.** Drag-to-reorder mobile par sab se zyada
 *    ghalti karwane wala patterns mein se hai — ungli phisalti hai aur tarteeb kharab
 *    ho jati hai, aur "undo" hai hi nahi. Ek tap se "سرورق بنائیں" saaf hai.
 */
export function MediaUploader({
  media,
  onChange,
  locale,
  disabled,
}: {
  media: UploadedMedia[]
  onChange: (media: UploadedMedia[]) => void
  locale: Locale
  disabled?: boolean
}) {
  const t = translator(locale)
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const full = media.length >= MAX_MEDIA_PER_PRODUCT

  async function pick(event: React.ChangeEvent<HTMLInputElement>) {
    const files = [...(event.target.files ?? [])]
    // Input ko foran khali — warna wohi file dobara chunne par change event nahi chalta
    event.target.value = ''
    if (files.length === 0) return

    setError(null)
    const room = MAX_MEDIA_PER_PRODUCT - media.length
    const accepted: UploadedMedia[] = []

    for (const file of files.slice(0, room)) {
      // Client wali jaanch sirf mehrbani hai — asli faisla server par hota hai. Faida
      // ye ke 40MB ki file mobile data par bhejne se pehle hi mana ho jata hai.
      if (!isSupportedMime(file.type)) {
        setError(t('unsupportedFile'))
        continue
      }
      if (file.size > maxBytesFor(file.type)) {
        setError(`${file.name} — ${formatBytes(maxBytesFor(file.type))} se bari hai`)
        continue
      }

      setBusy((count) => count + 1)
      try {
        const form = new FormData()
        form.append('file', file)
        const res = await fetch('/api/v1/supplier/media', { method: 'POST', body: form })

        if (!res.ok) {
          const payload = (await res.json().catch(() => null)) as
            | { error?: { message?: string } }
            | null
          setError(payload?.error?.message ?? t('somethingWrong'))
          continue
        }

        const uploaded = (await res.json()) as { url: string; type: MediaKind }
        accepted.push({ ...uploaded, isStatusSource: false })
      } finally {
        setBusy((count) => count - 1)
      }
    }

    if (accepted.length === 0) return

    // Pehli tasveer khud-ba-khud cover — dukan wale ko ek tap kam
    onChange(withCover([...media, ...accepted]))
  }

  function makeCover(index: number) {
    onChange(media.map((item, i) => ({ ...item, isStatusSource: i === index })))
  }

  function remove(index: number) {
    // Cover hata diya to agli tasveer us ki jagah — warna catalogue par khali dabba
    onChange(withCover(media.filter((_, i) => i !== index)))
  }

  return (
    <div className="space-y-3">
      <span className="text-sm font-semibold">{t('photosAndVideos')}</span>

      {media.length > 0 && (
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {media.map((item, index) => (
            <li
              key={item.url}
              className="relative overflow-hidden rounded-card border border-line bg-paper-sunken"
            >
              <div className="aspect-square w-full">
                {item.type === 'VIDEO' ? (
                  // muted + playsInline: iOS warna poori screen le leta hai
                  <video src={item.url} muted playsInline className="h-full w-full object-cover" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element -- storage URLs; next/image Phase 2
                  <img src={item.url} alt="" className="h-full w-full object-cover" />
                )}
              </div>

              {item.type === 'VIDEO' && (
                <span className="absolute top-1 start-1 rounded-full bg-ink/70 px-2 py-0.5 text-[0.62rem] font-semibold text-white">
                  {t('videoLabel')}
                </span>
              )}

              {item.isStatusSource && (
                <span className="absolute top-1 end-1 rounded-full bg-accent-700 px-2 py-0.5 text-[0.62rem] font-semibold text-white">
                  {t('coverPhoto')}
                </span>
              )}

              <div className="flex divide-x divide-line border-t border-line rtl:divide-x-reverse">
                {item.type === 'IMAGE' && !item.isStatusSource && (
                  <button
                    type="button"
                    onClick={() => makeCover(index)}
                    disabled={disabled}
                    className="link-tap flex-1 py-2 text-[0.68rem] font-semibold text-ink-soft hover:text-brand-700"
                  >
                    {t('makeCover')}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => remove(index)}
                  disabled={disabled}
                  className="link-tap flex-1 py-2 text-[0.68rem] font-semibold text-red-600"
                >
                  {t('removeMedia')}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={MEDIA_ACCEPT_ATTRIBUTE}
        onChange={pick}
        className="hidden"
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || full || busy > 0}
        className="btn-secondary"
      >
        {busy > 0 ? t('uploading') : media.length > 0 ? t('addMore') : t('choosePhotos')}
      </button>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <p className="text-[0.78rem] leading-relaxed text-ink-faint">{t('mediaHelp')}</p>
    </div>
  )
}
