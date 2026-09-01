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
  items,
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
  /**
   * Order ka maal — SIRF `DELIVERED` par kaam aata hai.
   *
   * 🔴 Ye is liye chahiye ke adhoori wapsi ka sawal maal ki fehrist ke baghair
   * poochha hi nahi ja sakta: "kya kuch wapas aaya" ka jawab ek haan/na nahi hai, wo
   * "kaunsa, kitna" hai. Na diya jaye to sawal poochha hi nahi jata aur button pehle
   * jaisa ek tap rehta hai — jo un raston par theek hai jahan fehrist mojood nahi
   * (magic link).
   */
  items?: readonly {
    productId: string
    variantId: string | null
    qty: number
    title: string
  }[]
  labels: {
    reasonAsk: string
    confirm: string
    back: string
    courierAsk: string
    courierOther: string
    courierOwn: string
    cnAsk: string
    cnHint: string
    /** "Kuch wapas aaya?" — sirf DELIVERED par */
    returnsAsk: string
    returnsNone: string
    returnsTotal: string
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

  /*
   * 🔴 Adhoori wapsi ka sawal SIRF tab poochha jata hai jab fehrist mojood ho.
   *
   * Is se pehle sirf do rukh the: sab pohancha (DELIVERED) ya sab wapas (RTO). Beech ki
   * soorat mein dukan wale ko dono mein se ek jhoot likhna parta tha — aur dono ka
   * bhugtaan kisi na kisi ne karna tha: DELIVERED likhne par reseller ko us maal ki
   * kamai milti jo wapas aa chuka, aur RTO likhne par wo poori kamai se mehroom hoti jo
   * us ne waqai kamai thi.
   */
  const canSplit = toStatus === 'DELIVERED' && (items?.length ?? 0) > 0
  const [asking, setAsking] = useState(false)
  const [reason, setReason] = useState('')
  const [courier, setCourier] = useState<string | null>(null)
  const [tracking, setTracking] = useState('')
  const [returned, setReturned] = useState<Record<string, number>>({})

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
        /*
         * Sirf wo qatarein jin par ginti WAQAI likhi gayi ho.
         *
         * 🔴 `qty: 0` bhejna khali fehrist bhejne ke barabar nahi hai — server
         * us par `returnedQty` ko 0 likh deta, jo aam soorat mein wohi hai magar us
         * lamhe ek fazool likhai hai. Jo baat kehni hi nahi, wo bheji bhi nahi jati.
         */
        ...(canSplit
          ? {
              returns: (items ?? [])
                .map((item) => ({
                  productId: item.productId,
                  variantId: item.variantId,
                  qty: returned[`${item.productId}:${item.variantId ?? ''}`] ?? 0,
                }))
                .filter((entry) => entry.qty > 0),
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
              {/* Brand ka naam jyun ka tyun; wazahat wale do naam zaban ke hisab se */}
              {option.slug === 'other'
                ? labels.courierOther
                : option.slug === SELF_COURIER
                  ? labels.courierOwn
                  : option.name}
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

  if (canSplit && asking) {
    const total = (items ?? []).reduce(
      (sum, item) => sum + (returned[`${item.productId}:${item.variantId ?? ''}`] ?? 0),
      0,
    )

    return (
      <span className="flex w-full flex-col gap-2 rounded-card bg-paper-sunken p-3">
        <label className="text-[0.8rem] font-semibold text-ink-soft">{labels.returnsAsk}</label>

        {(items ?? []).map((item) => {
          const key = `${item.productId}:${item.variantId ?? ''}`
          return (
            <span key={key} className="flex items-center gap-2">
              <span className="min-w-0 flex-1 truncate text-[0.85rem]">{item.title}</span>
              <span dir="ltr" className="numeric shrink-0 text-[0.78rem] text-ink-faint">
                × {item.qty}
              </span>
              {/*
                🔴 `max` bheje hue par bandha hai. Us se zyada wapas aana mumkin
                hi nahi, aur us par kamai MANFI ho jati — yani reseller ke zimme paisa
                nikal aata. Server par bhi wohi hadd lagi hui hai; ye sirf yahan tak
                pohanchne se pehle rok deti hai.
              */}
              <input
                type="number"
                min={0}
                max={item.qty}
                dir="ltr"
                value={returned[key] ?? 0}
                onChange={(event) =>
                  setReturned((current) => ({
                    ...current,
                    [key]: Math.max(0, Math.min(Number(event.target.value) || 0, item.qty)),
                  }))
                }
                className="numeric min-h-tap w-16 shrink-0 rounded-card bg-paper px-2 text-center text-sm"
              />
            </span>
          )
        })}

        {/*
          Jumla wapsi — ek nazar mein.

          Chaar qataron par alag alag number likhne ke baad banda bhool jata hai ke us
          ne kul kitna likha. Ye wohi ek number hai jis par wo "haan" keh raha hai.
        */}
        <span className="text-[0.78rem] text-ink-faint">
          {total > 0 ? labels.returnsTotal.replace('{n}', String(total)) : labels.returnsNone}
        </span>

        {error && <span className="text-[0.8rem] text-red-700">{error}</span>}

        <span className="flex gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => void run()}
            className="btn-primary !py-2 !text-[0.85rem] disabled:opacity-50"
          >
            {labels.confirm}
          </button>
          <button
            type="button"
            onClick={() => {
              setAsking(false)
              setReturned({})
            }}
            className="px-2 text-[0.85rem] text-ink-faint"
          >
            {labels.back}
          </button>
        </span>
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
        onClick={() => (needsReason || needsParcel || canSplit ? setAsking(true) : void run())}
        className={className}
      >
        {pending ? '…' : label}
      </button>
      {note && <span className="text-[0.72rem] text-ink-faint">{note}</span>}
      {error && <span className="text-[0.75rem] text-red-600">{error}</span>}
    </span>
  )
}
