'use client'

import { useState } from 'react'

/**
 * Customer apna pata khud likhti hai.
 *
 * 🔴 Ye safha CUSTOMER ke phone par khulta hai — reseller ke nahi. Poora feature isi ek
 * baat par khara hai: jo pata likh raha hai, wo wohi hai jo wahan rehta hai.
 *
 * Ab tak reseller WhatsApp par aayi hui baat parh kar pata KHUD type karti thi, aur har
 * ghalat harf ek wapas aane wala parcel tha.
 *
 * 🔴 Location ka button LAZMI nahi hai, aur ye jaan boojh kar hai. Bohat se log ijazat
 * nahi dete. Usay lazmi karne ka natija ye hota ke wo form chhor kar chale jate — aur
 * phir un ka pata phir se reseller ko haath se likhna parta, yani hum wahin wapas
 * pohanch jate jahan se chale the. Aadha faida poore faide ke intezar se behtar hai.
 */
export function AddressForm({
  token,
  labels,
}: {
  token: string
  labels: {
    name: string
    phone: string
    phoneHint: string
    address: string
    addressHint: string
    area: string
    pin: string
    pinBody: string
    pinGot: string
    pinGetting: string
    pinFailed: string
    submit: string
    sending: string
    done: string
    doneBody: string
    failed: string
  }
}) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [area, setArea] = useState('')
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null)
  const [pinState, setPinState] = useState<'idle' | 'getting' | 'failed'>('idle')
  const [state, setState] = useState<'open' | 'busy' | 'done'>('open')
  const [error, setError] = useState<string | null>(null)

  function capturePin() {
    setPinState('getting')
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setPin({ lat: position.coords.latitude, lng: position.coords.longitude })
        setPinState('idle')
      },
      () => setPinState('failed'),
      { enableHighAccuracy: true, timeout: 10_000 },
    )
  }

  const ready =
    name.trim().length >= 2 &&
    phone.trim().length >= 11 &&
    address.trim().length >= 10 &&
    area.trim().length >= 2

  async function submit() {
    if (!ready || state === 'busy') return
    setState('busy')
    setError(null)

    const res = await fetch(`/api/v1/pata/${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: name.trim(),
        customerPhone: phone.trim(),
        customerAddress: address.trim(),
        area: area.trim(),
        ...(pin ? { locationLat: pin.lat, locationLng: pin.lng } : {}),
      }),
    }).catch(() => null)

    if (!res?.ok) {
      const payload = (await res?.json().catch(() => null)) as
        | { error?: { message?: string } }
        | null
      setState('open')
      setError(payload?.error?.message ?? labels.failed)
      return
    }

    setState('done')
  }

  if (state === 'done') {
    return (
      <section className="rounded-card bg-accent-50 p-5 text-center ring-1 ring-accent-600">
        <p className="text-[1.05rem] font-bold text-accent-700">{labels.done}</p>
        <p className="mt-1 text-[0.88rem] text-accent-700/80">{labels.doneBody}</p>
      </section>
    )
  }

  return (
    <section className="space-y-4">
      <div>
        <label className="text-[0.85rem] font-semibold text-ink-soft">{labels.name}</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          autoComplete="name"
          className="field w-full"
        />
      </div>

      <div>
        <label className="text-[0.85rem] font-semibold text-ink-soft">{labels.phone}</label>
        <input
          dir="ltr"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          maxLength={20}
          inputMode="tel"
          autoComplete="tel"
          placeholder="03001234567"
          className="field numeric w-full"
        />
        <p className="mt-1 text-[0.75rem] text-ink-faint">{labels.phoneHint}</p>
      </div>

      <div>
        <label className="text-[0.85rem] font-semibold text-ink-soft">{labels.address}</label>
        <textarea
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          maxLength={300}
          rows={3}
          autoComplete="street-address"
          className="field w-full"
        />
        <p className="mt-1 text-[0.75rem] text-ink-faint">{labels.addressHint}</p>
      </div>

      <div>
        <label className="text-[0.85rem] font-semibold text-ink-soft">{labels.area}</label>
        <input
          value={area}
          onChange={(e) => setArea(e.target.value)}
          maxLength={60}
          autoComplete="address-level2"
          className="field w-full"
        />
      </div>

      {/*
        Pin — safhe par saaf nazar aata hai magar rokta kisi ko nahi.
        Jo de de us ka parcel dhoondhna aasan; jo na de us ka kaam phir bhi ho jata hai.
      */}
      <div className="rounded-card bg-amber-50 p-4 ring-1 ring-amber-200">
        <p className="text-[0.88rem] font-semibold text-amber-900">{labels.pin}</p>
        <p className="mt-1 text-[0.78rem] text-amber-800">{labels.pinBody}</p>
        <button
          type="button"
          onClick={capturePin}
          className="btn-secondary mt-3 w-full min-h-tap"
        >
          {pin
            ? labels.pinGot
            : pinState === 'getting'
              ? labels.pinGetting
              : pinState === 'failed'
                ? labels.pinFailed
                : labels.pin}
        </button>
      </div>

      {error && <p className="text-[0.82rem] text-red-700">{error}</p>}

      <button
        type="button"
        onClick={() => void submit()}
        disabled={!ready || state === 'busy'}
        className="btn-primary min-h-tap w-full disabled:opacity-50"
      >
        {state === 'busy' ? labels.sending : labels.submit}
      </button>
    </section>
  )
}
