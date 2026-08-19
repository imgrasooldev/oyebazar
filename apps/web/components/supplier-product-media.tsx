'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState, useTransition } from 'react'
import {
  MAX_MEDIA_PER_PRODUCT,
  MEDIA_ACCEPT_ATTRIBUTE,
  formatBytes,
  isSupportedMime,
  maxBytesFor,
  type MediaKind,
} from '@oyebazar/shared'
import { ChevronIcon } from '@/components/icons'
import { translator, type Locale } from '@/lib/i18n'

export interface ExistingMedia {
  readonly id: string
  readonly url: string
  readonly type: MediaKind
  readonly isStatusSource: boolean
}

/**
 * Mojooda maal ki tasveerein — lagana, hatana, sarwarq badalna.
 *
 * 🔴 Ye add-product wale uploader se alag component hai aur jaan boojh kar: wahan media
 * abhi sirf browser ki memory mein hoti hai (product abhi bana hi nahi), yahan har tap
 * seedha server par jata hai aur us ka apna anjaam hota hai. Ek hi component se dono
 * karne ki koshish ka matlab har jagah `if (productId)` — aur wahi jagah hai jahan se
 * "cover badla magar save nahi hua" jaisi kharabiyan nikalti hain.
 *
 * 🔴 BINA TASVEER WALA MAAL kabhi chhupaya nahi jata.
 *
 * Pehle ye poora hissa ek `<details>` ke andar band tha. Wo `<summary>` safhe par ek
 * saade se lafz ("تصویریں · 0") jaisa lagta tha — dukan wale ko pata hi nahi chalta ke
 * ye dabaya ja sakta hai, aur jis maal par ghalti se tasveer reh gayi wo hamesha ke liye
 * bina tasveer ka reh jata. Ab: tasveer na ho to hissa khula hota hai aur saaf batata
 * hai ke kaam adhoora hai; tasveerein hon to ek asli button se khulta hai.
 *
 * Bina tasveer ka maal sirf adhoora nahi — bekaar hai: reseller us par status pack bana
 * hi nahi sakti, aur status pack hi hamara asal product hai.
 */
export function SupplierProductMedia({
  productId,
  media,
  locale,
}: {
  productId: string
  media: ExistingMedia[]
  locale: Locale
}) {
  const t = translator(locale)
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [pending, startTransition] = useTransition()
  // Tasveer na ho to khula — wohi soorat hai jise theek karna hai
  const [open, setOpen] = useState(media.length === 0)

  const working = busy || pending
  const full = media.length >= MAX_MEDIA_PER_PRODUCT
  const empty = media.length === 0

  async function call(input: RequestInfo, init: RequestInit): Promise<boolean> {
    const res = await fetch(input, init)
    if (res.ok) return true

    const payload = (await res.json().catch(() => null)) as
      | { error?: { message?: string } }
      | null
    setError(payload?.error?.message ?? t('somethingWrong'))
    return false
  }

  async function upload(event: React.ChangeEvent<HTMLInputElement>) {
    const files = [...(event.target.files ?? [])]
    event.target.value = ''
    if (files.length === 0) return

    setError(null)
    setBusy(true)
    const uploaded: { url: string; type: MediaKind }[] = []

    try {
      for (const file of files.slice(0, MAX_MEDIA_PER_PRODUCT - media.length)) {
        if (!isSupportedMime(file.type)) {
          setError(t('unsupportedFile'))
          continue
        }
        if (file.size > maxBytesFor(file.type)) {
          setError(`${file.name} — ${formatBytes(maxBytesFor(file.type))} se bari hai`)
          continue
        }

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
        uploaded.push((await res.json()) as { url: string; type: MediaKind })
      }

      if (uploaded.length === 0) return

      const ok = await call(`/api/v1/supplier/products/${productId}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ media: uploaded }),
      })
      if (ok) startTransition(() => router.refresh())
    } finally {
      setBusy(false)
    }
  }

  function makeCover(mediaId: string) {
    setError(null)
    startTransition(async () => {
      const ok = await call(`/api/v1/supplier/products/${productId}/media`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statusSourceId: mediaId }),
      })
      if (ok) router.refresh()
    })
  }

  function remove(mediaId: string) {
    setError(null)
    startTransition(async () => {
      const ok = await call(`/api/v1/supplier/products/${productId}/media`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mediaId }),
      })
      if (ok) router.refresh()
    })
  }

  return (
    <div className="space-y-3 border-t border-line pt-3">
      {/* Sarnama hamesha nazar aata hai. Tasveer na ho to ye tanbeeh hai, patti nahi. */}
      {empty ? (
        <p className="text-sm font-semibold text-red-600">{t('noPhotosYet')}</p>
      ) : (
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="link-tap flex items-center gap-2 text-sm font-semibold text-ink-soft hover:text-brand-700"
        >
          {/* Band: parhne ki simt mein (Urdu par baen). Khula: neeche. */}
          <ChevronIcon className={open ? 'h-4 w-4 rotate-90' : 'h-4 w-4 rtl:rotate-180'} />
          {t('managePhotos')}
          {' · '}
          <span dir="ltr" className="numeric">
            {media.length}
          </span>
        </button>
      )}

      {open && media.length > 0 && (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {media.map((item) => (
            <li
              key={item.id}
              className="relative overflow-hidden rounded-card border border-line bg-paper-sunken"
            >
              <div className="aspect-square w-full">
                {item.type === 'VIDEO' ? (
                  <video src={item.url} muted playsInline className="h-full w-full object-cover" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element -- storage URLs; next/image Phase 2
                  <img src={item.url} alt="" className="h-full w-full object-cover" />
                )}
              </div>

              {item.type === 'VIDEO' && (
                <span className="absolute top-1 start-1 rounded-full bg-ink/70 px-1.5 py-0.5 text-[0.6rem] font-semibold text-white">
                  {t('videoLabel')}
                </span>
              )}
              {item.isStatusSource && (
                <span className="absolute top-1 end-1 rounded-full bg-accent-700 px-1.5 py-0.5 text-[0.6rem] font-semibold text-white">
                  {t('coverPhoto')}
                </span>
              )}

              <div className="flex divide-x divide-line border-t border-line rtl:divide-x-reverse">
                {item.type === 'IMAGE' && !item.isStatusSource && (
                  <button
                    type="button"
                    onClick={() => makeCover(item.id)}
                    disabled={working}
                    className="link-tap flex-1 py-1.5 text-[0.64rem] font-semibold text-ink-soft hover:text-brand-700"
                  >
                    {t('makeCover')}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => remove(item.id)}
                  disabled={working}
                  className="link-tap flex-1 py-1.5 text-[0.64rem] font-semibold text-red-600"
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
        onChange={upload}
        className="hidden"
      />

      {(open || empty) && (
        <>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={working || full}
            /* Bina tasveer wale maal par ye asal kaam hai — is liye bhara hua button */
            className={empty ? 'btn-primary text-sm' : 'btn-secondary text-sm'}
          >
            {busy ? t('uploading') : empty ? t('choosePhotos') : t('addMore')}
          </button>

          {empty && (
            <p className="text-[0.78rem] leading-relaxed text-ink-faint">{t('mediaHelp')}</p>
          )}
        </>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
