'use client'

import { useState } from 'react'
import { courierName, courierSite, SELF_COURIER } from '@oyebazar/shared'

/**
 * "Mera parcel kahan hai?" — is safhe ka sab se zyada poochha jane wala sawal.
 *
 * 🔴 Ab tak is ka jawab reseller ke paas tha hi nahi. Us ki customer WhatsApp par
 * poochti thi, reseller dukan ko WhatsApp karti thi, aur jawab ka intezar karti thi —
 * kabhi ghanton, kabhi agle din. Us poore intezar mein customer ka bharosa girta hai,
 * aur girta reseller par hai, dukan par nahi.
 *
 * 🔴 Number COPY hone wala hai, aur ye sab se ahem tafseel hai.
 *
 * Reseller ka agla kaam yehi number apni customer ko WhatsApp par bhejna hota hai. Agar
 * usay CN haath se type karna pare to wo phone par 12 hindson ko dekh dekh kar likhegi —
 * aur ek hindsa ghalat hone ka matlab hai ke customer ko "ye number to chalta hi nahi"
 * milta hai. Wo ghalti reseller ki lagti hai, aur wapas usi ke sar aati hai.
 */
export function ParcelLine({
  courier,
  trackingNo,
  labels,
}: {
  courier: string
  trackingNo: string | null
  labels: {
    title: string
    self: string
    copy: string
    copied: string
    track: string
  }
}) {
  const [copied, setCopied] = useState(false)
  const site = courierSite(courier)

  async function copy() {
    if (!trackingNo) return
    await navigator.clipboard.writeText(trackingNo).catch(() => null)
    setCopied(true)
    // Do second baad wapas — warna "copy ho gaya" hamesha ke liye chipka reh jata hai
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-card bg-paper-sunken px-3 py-2.5">
      <p className="text-[0.72rem] font-semibold uppercase tracking-wider text-ink-faint">
        {labels.title}
      </p>

      {/*
        Apna rider: number hai hi nahi, aur ye SAAF likha jata hai.
        Khali chhorne par reseller samajhti ke dukan ne likhna bhool gaya aur poochhne
        lagti — jabke jawab mojood hai, bas wo "number nahi hai" wala jawab hai.
      */}
      {courier === SELF_COURIER || !trackingNo ? (
        <p className="mt-1 text-[0.85rem] text-ink-soft">{labels.self}</p>
      ) : (
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <span className="text-[0.85rem] font-semibold text-ink">{courierName(courier)}</span>
          <span dir="ltr" className="numeric text-[0.95rem] font-bold tracking-wide text-ink">
            {trackingNo}
          </span>

          <button
            type="button"
            onClick={() => void copy()}
            className="tap rounded-pill bg-paper-raised px-3 py-1 text-[0.75rem] font-semibold text-ink-soft ring-1 ring-line"
          >
            {copied ? labels.copied : labels.copy}
          </button>

          {site && (
            <a
              href={site}
              target="_blank"
              rel="noreferrer noopener"
              className="text-[0.75rem] font-semibold text-brand-700 underline"
            >
              {labels.track}
            </a>
          )}
        </div>
      )}
    </div>
  )
}
