'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { COURIERS, SELF_COURIER, TRACKING_MIN, normaliseTracking } from '@oyebazar/shared'

type Next = 'PACKED' | 'DISPATCHED' | 'DELIVERED' | 'RTO' | 'CANCELLED'

/**
 * Wholesaler ka agla qadam — "maal tayyar" se le kar "pohanch gaya" tak.
 *
 * Bhejne wala button dobara na dabaya jaye is ki fikr nahi ki gayi: state machine
 * peechay jane hi nahi deti, aur dobara wohi qadam bhejne par server saaf ghalti
 * deta hai. Yahan sirf wo ghalti dikhani hai — chhupani nahi, warna dukan wala
 * samajhta hai kaam ho gaya jabke hua nahi.
 *
 * 🔴 Jo qadam order ko MAAR deta hai (wapsi, mansookhi) wo ek dabane par nahi hota:
 * pehle wajah maangi jati hai. Do wajahen — wajah reseller ke customer tak jati hai
 * ("kya hua?" ka jawab usi ke paas hona chahiye), aur ek extra qadam wo bhool rok deta
 * hai jo terminal hai aur jise wapas nahi kiya ja sakta.
 */
export function SupplierStatusButton({
  orderNo,
  endpoint,
  toStatus,
  label,
  tone = 'plain',
  note,
  labels,
}: {
  orderNo: string
  /**
   * Kahan bhejna hai.
   *
   * Do raste hain aur dono zaroori hain: portal ka (login ke baad) aur WhatsApp wale
   * link ka (bilkul bina login). Button dono par ek jaisa hai — dukan wale ke liye wo
   * ek hi cheez hai, chahe wo kisi bhi darwaze se aaya ho.
   */
  endpoint?: string
  toStatus: Next
  label: string
  tone?: 'plain' | 'primary' | 'quiet' | 'danger'
  /** Chhoti si tanbeeh button ke neeche — jaise "is se paisa aap ke zimme likha jaye ga" */
  note?: string
  labels: {
    reasonAsk: string
    confirm: string
    back: string
    courierAsk: string
    cnAsk: string
    cnHint: string
  }
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Wajah maangne wale qadam do halat mein rehte hain: band, aur khula hua
  const needsReason = toStatus === 'RTO' || toStatus === 'CANCELLED'

  /*
   * Courier bhi ab poochha jata hai — aur ye "ek aur khaana" nahi hai.
   *
   * 🔴 Pehle DISPATCHED ek tap tha, aur us ka natija ye tha ke maal courier ke paas
   * chala jata aur uska koi nishan kahin likha hi na jata. Reseller apni customer ko
   * kuch nahi bata sakti thi, aur jab parcel gum hota to dhoondhne ka koi sira hi na
   * hota.
   *
   * Ek extra tap ki qeemat dukan deti hai, magar us ka faida usi ko milta hai: gum shuda
   * parcel ka jhagra bhi usi ke sar aata hai.
   */
  const needsParcel = toStatus === 'DISPATCHED'
  const [asking, setAsking] = useState(false)
  const [reason, setReason] = useState('')
  const [courier, setCourier] = useState<string | null>(null)
  const [tracking, setTracking] = useState('')

  const parcelReady =
    courier !== null &&
    (courier === SELF_COURIER || normaliseTracking(tracking).length >= TRACKING_MIN)

  async function run() {
    setPending(true)
    setError(null)

    const res = await fetch(endpoint ?? `/api/v1/supplier/orders/${orderNo}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        toStatus,
        ...(needsReason ? { reason: reason.trim() } : {}),
        ...(needsParcel && courier
          ? {
              courier,
              ...(courier === SELF_COURIER ? {} : { trackingNo: normaliseTracking(tracking) }),
            }
          : {}),
      }),
    })

    setPending(false)

    if (!res.ok) {
      const payload = (await res.json().catch(() => null)) as { error?: { message?: string } } | null
      setError(payload?.error?.message ?? 'Dobara koshish karen')
      return
    }

    setAsking(false)
    router.refresh()
  }

  const className =
    tone === 'primary'
      ? 'btn-primary !py-2.5 !text-[0.9rem]'
      : tone === 'danger'
        ? 'rounded-card border border-red-200 bg-red-50 px-4 py-2.5 text-[0.9rem] font-semibold text-red-700 transition hover:bg-red-100'
        : tone === 'quiet'
          ? 'rounded-card px-3 py-2.5 text-[0.85rem] font-semibold text-ink-faint transition hover:text-ink'
          : 'btn-secondary !py-2.5 !text-[0.9rem]'

  if (needsParcel && asking) {
    return (
      <span className="flex w-full flex-col gap-2 rounded-card bg-paper-sunken p-3">
        <label className="text-[0.8rem] font-semibold text-ink-soft">{labels.courierAsk}</label>

        <span className="flex flex-wrap gap-1.5">
          {COURIERS.map((option) => (
            <button
              key={option.slug}
              type="button"
              onClick={() => {
                setCourier(option.slug)
                setError(null)
              }}
              className={
                courier === option.slug
                  ? 'rounded-pill bg-coal-900 px-3 py-1.5 text-[0.8rem] font-semibold text-white'
                  : 'tap rounded-pill bg-paper-raised px-3 py-1.5 text-[0.8rem] font-semibold text-ink-soft ring-1 ring-line'
              }
            >
              {option.name}
            </button>
          ))}
        </span>

        {/*
          CN ka khaana sirf tab jab courier koi kampani ho.
          Apna rider chuna ho to number maangna jhoot likhwana hai — aur phir har number
          par shak karna parta.
        */}
        {courier !== null && courier !== SELF_COURIER && (
          <>
            <label className="mt-1 text-[0.8rem] font-semibold text-ink-soft">{labels.cnAsk}</label>
            <input
              autoFocus
              dir="ltr"
              value={tracking}
              onChange={(event) => setTracking(event.target.value)}
              maxLength={60}
              inputMode="text"
              autoCapitalize="characters"
              className="field numeric !mt-0"
            />
            <span className="text-[0.72rem] text-ink-faint">{labels.cnHint}</span>
          </>
        )}

        <span className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={pending || !parcelReady}
            onClick={() => void run()}
            className="btn-primary !py-2 !text-[0.85rem] disabled:opacity-40"
          >
            {pending ? '…' : labels.confirm}
          </button>
          <button
            type="button"
            onClick={() => {
              setAsking(false)
              setError(null)
            }}
            className="rounded-card px-3 py-2 text-[0.85rem] font-semibold text-ink-faint transition hover:text-ink"
          >
            {labels.back}
          </button>
        </span>
        {error && <span className="text-[0.75rem] text-red-600">{error}</span>}
      </span>
    )
  }

  if (needsReason && asking) {
    return (
      <span className="flex w-full flex-col gap-2 rounded-card bg-paper-sunken p-3">
        <label className="text-[0.8rem] font-semibold text-ink-soft">{labels.reasonAsk}</label>
        <input
          autoFocus
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          maxLength={200}
          className="field !mt-0"
        />
        <span className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            // Khali wajah par server bhi mana karta hai; yahan rokne se ek ghair-zaroori
            // chakkar bach jata hai
            disabled={pending || reason.trim().length < 3}
            onClick={() => void run()}
            className="rounded-card bg-red-600 px-4 py-2 text-[0.85rem] font-semibold text-white transition hover:bg-red-700 disabled:opacity-40"
          >
            {pending ? '…' : labels.confirm}
          </button>
          <button
            type="button"
            onClick={() => {
              setAsking(false)
              setError(null)
            }}
            className="rounded-card px-3 py-2 text-[0.85rem] font-semibold text-ink-faint transition hover:text-ink"
          >
            {labels.back}
          </button>
        </span>
        {error && <span className="text-[0.75rem] text-red-600">{error}</span>}
      </span>
    )
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => (needsReason || needsParcel ? setAsking(true) : void run())}
        className={className}
      >
        {pending ? '…' : label}
      </button>
      {note && <span className="text-[0.72rem] text-ink-faint">{note}</span>}
      {error && <span className="text-[0.75rem] text-red-600">{error}</span>}
    </span>
  )
}
