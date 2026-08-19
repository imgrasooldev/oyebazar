'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { formatPkr } from '@oyebazar/shared'
import { translator, type Locale } from '@/lib/i18n'

interface Props {
  productId: string
  /**
   * Rang/size ke jorhe. Khali ho to picker aata hi nahi — jis maal par variants nahi
   * hain wahan ek fazool sawal poochhna reseller ka waqt khana hai.
   */
  variants?: readonly { id: string; size: string | null; colour: string | null; inStock: boolean }[]
  title: string
  bajiPrice: number
  defaultRetailPrice: number
  locale: Locale
}

/**
 * Order form — reseller customer se WhatsApp par baat kar chuki hai, ab tafseel yahan daalti hai.
 *
 * Design faisle:
 *  · Location pin par zor — 🔴 RTO ka sab se bara lever. Ek tap, koi map nahi
 *    (map sasta phone par bhari hai aur Sadia ko address wahan dhoondhna nahi aata).
 *  · Idempotency-Key har form load par ek — do baar submit se do order na banen.
 *  · Munafa live dikhta hai, taake price likhte waqt hi pata chale ke kya bach raha hai.
 */
export function OrderForm({
  productId,
  variants = [],
  title,
  bajiPrice,
  defaultRetailPrice,
  locale,
}: Props) {
  const t = translator(locale)
  const router = useRouter()

  const [idempotencyKey] = useState(() => crypto.randomUUID())
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [area, setArea] = useState('')
  const [qty, setQty] = useState(1)
  /*
   * Pehle se chuna hua: pehla wo jorha jis mein maal ho. Reseller aksar customer se
   * baat kar chuki hoti hai aur usay sirf tasdeeq karni hoti hai — khali picker use
   * ek fazool qadam deta.
   */
  const [variantId, setVariantId] = useState<string | undefined>(
    () => variants.find((variant) => variant.inStock)?.id,
  )
  const [retailPrice, setRetailPrice] = useState(defaultRetailPrice)
  const [deliveryFee, setDeliveryFee] = useState(200)
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locationState, setLocationState] = useState<'idle' | 'getting' | 'failed'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const total = retailPrice * qty + deliveryFee
  const earnings = (retailPrice - bajiPrice) * qty

  function captureLocation() {
    setLocationState('getting')
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({ lat: position.coords.latitude, lng: position.coords.longitude })
        setLocationState('idle')
      },
      () => setLocationState('failed'),
      { enableHighAccuracy: true, timeout: 10_000 },
    )
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(null)

    const res = await fetch('/api/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({
        customer: {
          name,
          phone,
          address,
          area,
          ...(location ? { locationLat: location.lat, locationLng: location.lng } : {}),
        },
        lines: [
          {
            productId,
            // 🔴 Chuna hua variant order ke saath jata hai: ginti usi se ghatti hai.
            // Na bhejen to system "jis mein maal ho" us se ghata deta hai — yani
            // customer laal mangwati aur dukan par neela kam ho jata.
            ...(variantId ? { variantId } : {}),
            qty,
            retailPrice,
          },
        ],
        deliveryFee,
        paymentMethod: 'COD',
      }),
    })

    if (!res.ok) {
      const payload = (await res.json().catch(() => null)) as { error?: { message?: string } } | null
      setError(payload?.error?.message ?? t('orderFailed'))
      setPending(false)
      return
    }

    const order = (await res.json()) as { orderNo: string }
    router.replace(`/orders?highlight=${order.orderNo}`)
  }

  return (
    <form onSubmit={submit} className="card space-y-5 p-4">
      <div>
        <h2 className="text-lg font-bold">{t('placeOrder')}</h2>
        <p className="mt-1 text-sm text-ink-soft">{title}</p>
      </div>

      <label className="block">
        <span className="text-sm font-semibold">{t('customerName')}</span>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-2 w-full rounded-lg ring-1 ring-black/10 px-4 py-3"
        />
      </label>

      <label className="block">
        <span className="text-sm font-semibold">{t('whatsappNumber')}</span>
        <input
          required
          type="tel"
          inputMode="numeric"
          dir="ltr"
          placeholder="03001234567"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="mt-2 w-full rounded-lg ring-1 ring-black/10 px-4 py-3"
        />
      </label>

      <label className="block">
        <span className="text-sm font-semibold">{t('fullAddress')}</span>
        <textarea
          required
          rows={3}
          placeholder={t('addressHint')}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="mt-2 w-full rounded-lg ring-1 ring-black/10 px-4 py-3"
        />
      </label>

      <label className="block">
        <span className="text-sm font-semibold">{t('area')}</span>
        <input
          required
          value={area}
          onChange={(e) => setArea(e.target.value)}
          className="mt-2 w-full rounded-lg ring-1 ring-black/10 px-4 py-3"
        />
      </label>

      {/* 🔴 RTO ka sab se bara lever */}
      <div className="rounded-lg bg-amber-50 p-4">
        <p className="text-sm font-semibold text-amber-900">{t('locationPin')}</p>
        <p className="mt-1 text-xs text-amber-800">{t('locationPinBody')}</p>
        <button type="button" onClick={captureLocation} className="btn-secondary mt-3 w-full">
          {location
            ? t('locationGot')
            : locationState === 'getting'
              ? t('locationGetting')
              : locationState === 'failed'
                ? t('locationRetry')
                : t('locationCapture')}
        </button>
      </div>

      {/* Rang/size — sirf jab waqai jorhe hon */}
      {variants.length > 0 && (
        <div>
          <span className="text-sm font-semibold">{t('variantPick')}</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {variants.map((variant) => {
              const label =
                [variant.colour, variant.size].filter(Boolean).join(' · ') || t('variantPick')

              return (
                <button
                  key={variant.id}
                  type="button"
                  // Khatam ho chuka jorha dikhta hai magar chuna nahi jata: chhupa dete
                  // to reseller customer se wo rang waada kar baithti jo hai hi nahi
                  disabled={!variant.inStock}
                  onClick={() => setVariantId(variant.id)}
                  className={`rounded-pill px-4 py-2 text-sm font-semibold transition ${
                    variantId === variant.id
                      ? 'bg-brand-500 text-white'
                      : variant.inStock
                        ? 'bg-paper-sunken text-ink-soft hover:text-ink'
                        : 'bg-paper-sunken text-ink-faint line-through opacity-60'
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <label className="block">
          <span className="text-sm font-semibold">{t('quantity')}</span>
          <input
            type="number"
            min={1}
            max={50}
            value={qty}
            onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
            className="mt-2 w-full rounded-lg ring-1 ring-black/10 px-3 py-3"
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold">{t('yourPrice')}</span>
          <input
            type="number"
            min={bajiPrice}
            step={50}
            dir="ltr"
            value={retailPrice}
            onChange={(e) => setRetailPrice(Number(e.target.value))}
            className="mt-2 w-full rounded-lg ring-1 ring-black/10 px-3 py-3"
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold">{t('delivery')}</span>
          <input
            type="number"
            min={0}
            step={50}
            dir="ltr"
            value={deliveryFee}
            onChange={(e) => setDeliveryFee(Number(e.target.value))}
            className="mt-2 w-full rounded-lg ring-1 ring-black/10 px-3 py-3"
          />
        </label>
      </div>

      <div className="rounded-lg bg-paper-sunken p-4 text-sm">
        <div className="flex justify-between">
          <span>{t('customerPays')}</span>
          <span dir="ltr" className="font-bold">
            {formatPkr(total)}
          </span>
        </div>
        <div className="mt-2 flex justify-between">
          <span>{t('yourProfit')}</span>
          <span dir="ltr" className={earnings > 0 ? 'font-bold text-accent-700' : 'text-red-600'}>
            {formatPkr(Math.max(earnings, 0))}
          </span>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? t('placing') : t('placeOrder')}
      </button>

      <p className="text-xs text-ink-faint">{t('confirmNote')}</p>
    </form>
  )
}
