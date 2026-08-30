'use client'

import { useRouter } from 'next/navigation'
import { AskAddressButton } from '@/components/ask-address-button'
import { KnownCustomer } from '@/components/known-customer'
import { PhoneRecordNote } from '@/components/phone-record-note'
import { useState } from 'react'
import { formatPkr, parseOrderText } from '@oyebazar/shared'
import { translator, type Locale } from '@/lib/i18n'

interface Props {
  productId: string
  /**
   * Dukan ke apne delivery rate. Reseller in mein se chunti hai — likhti nahi.
   *
   * 🔴 Pehle ye khaana khula tha aur wo kuch bhi likh sakti thi (0 bhi). Courier ka bill
   * dukan bharti hai; us ka rate kisi aur ke likhne par nuqsan chup chaap us ke zimme
   * aa jata tha. Server bhi ab sirf inhi do qadar qubool karta hai.
   */
  delivery: { city: number; other: number }
  /**
   * Rang/size ke jorhe. Khali ho to picker aata hi nahi — jis maal par variants nahi
   * hain wahan ek fazool sawal poochhna reseller ka waqt khana hai.
   */
  variants?: readonly {
    id: string
    size: string | null
    colour: string | null
    inStock: boolean
    imageUrl: string | null
  }[]
  title: string
  bajiPrice: number
  defaultRetailPrice: number
  locale: Locale
  /**
   * Customer ne khud apna pata bheja hai — us link se.
   *
   * 🔴 Ye khaane bhare hue aate hain aur reseller unhein badal SAKTI hai. Taala lagane
   * ka koi faida nahi: agar customer ne kuch ghalat likha ho to theek karne ka rasta
   * band karna sirf reseller ko phone uthane par majboor karta hai.
   */
  prefill?: {
    token: string
    customerName: string
    customerPhone: string
    customerAddress: string
    area: string
    locationLat: number | null
    locationLng: number | null
  }
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
  prefill,
  delivery,
  variants = [],
  title,
  bajiPrice,
  defaultRetailPrice,
  locale,
}: Props) {
  const t = translator(locale)
  const router = useRouter()

  /*
   * 🔴 Jab pata us link se aaya ho, idempotency ki chabi TOKEN se banti hai — nayi
   * random se nahi.
   *
   * Wajah: safha dobara khulne par (back button, do tab, ya reseller ka phone reload
   * hone par) nayi random chabi banti aur wohi order DOBARA ban jata — customer ko do
   * parcel aur do dafa COD. Token us link ke saath bandha hua hai, is liye har koshish
   * ek hi chabi par girti hai aur server pehla wala order wapas de deta hai.
   */
  const [idempotencyKey] = useState(() =>
    prefill ? `pata:${prefill.token}` : crypto.randomUUID(),
  )
  const [name, setName] = useState(prefill?.customerName ?? '')
  const [phone, setPhone] = useState(prefill?.customerPhone ?? '')
  const [address, setAddress] = useState(prefill?.customerAddress ?? '')
  const [area, setArea] = useState(prefill?.area ?? '')
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
  // Pehle se "isi sheher mein" — aksar order isi sheher ke hote hain
  const [outOfCity, setOutOfCity] = useState(false)
  const deliveryFee = outOfCity ? delivery.other : delivery.city
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(
    prefill?.locationLat != null && prefill.locationLng != null
      ? { lat: prefill.locationLat, lng: prefill.locationLng }
      : null,
  )
  const [locationState, setLocationState] = useState<'idle' | 'getting' | 'failed'>('idle')
  const [pasted, setPasted] = useState('')
  // Kitne khaane paste se bhare — reseller ko dikhna chahiye ke kaam waqai hua
  const [filled, setFilled] = useState(0)
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
        // Order banne ke baad wo link band ho jata hai — ek link, ek order
        ...(prefill ? { pataToken: prefill.token } : {}),
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

  /**
   * Paste hote hi khaane bharna.
   *
   * Sirf KHALI khaane bharte hain: reseller ne agar khud kuch likh diya hai, to us ka
   * likha hua kisi andaze se nahi mit-na chahiye.
   */
  function fillFromText(text: string) {
    setPasted(text)

    const parsed = parseOrderText(text)
    let count = 0

    if (parsed.name && !name.trim()) {
      setName(parsed.name)
      count += 1
    }
    if (parsed.phone && !phone.trim()) {
      setPhone(parsed.phone)
      count += 1
    }
    if (parsed.address && !address.trim()) {
      setAddress(parsed.address)
      count += 1
    }
    if (parsed.area && !area.trim()) {
      setArea(parsed.area)
      count += 1
    }

    setFilled(count)
  }

  return (
    <form onSubmit={submit} className="card space-y-5 p-4">
      <div>
        <h2 className="text-lg font-bold">{t('placeOrder')}</h2>
        <p className="mt-1 text-sm text-ink-soft">{title}</p>
      </div>

      {/*
        Customer khud apna pata likh de — sab se saaf rasta.

        🔴 Ye paste wale khaane se UPAR hai, aur ye tarteeb jaan boojh kar hai. Paste
        behtar hai haath se type karne se, magar dono soorton mein pata WAHI rehta hai
        jo customer ne WhatsApp par likha tha — us ki apni ghaltiyon samet, aur us ke
        GPS pin ke baghair. Link us se ek darja aage hai: pata seedha us ke phone se
        aata hai. Jo behtar hai wo pehle dikhna chahiye.

        Neeche paste aur haath se likhna dono mojood rehte hain — customer link na khole
        to kaam phir bhi ruk nahi sakta.
      */}
      {!prefill && (
        <AskAddressButton
          productId={productId}
          {...(variantId ? { variantId } : {})}
          qty={qty}
          retailPrice={retailPrice}
          labels={{
            ask: t('askAddress'),
            hint: t('askAddressHint'),
            making: t('askAddressMaking'),
            ready: t('askAddressReady'),
            share: t('askAddressShare'),
            copy: t('parcelCopy'),
            copied: t('parcelCopied'),
            failed: t('orderFailed'),
          }}
        />
      )}

      {/*
        Customer ne khud pata bhej diya — reseller ko sirf dekh kar aage barhna hai.
      */}
      {prefill && (
        <p className="rounded-card bg-accent-50 px-3 py-2.5 text-[0.82rem] font-semibold text-accent-700 ring-1 ring-accent-600/40">
          {t('pataFromCustomer')}
        </p>
      )}

      {/*
        🔴 Sab se bhaari qadam yehi tha: reseller ke paas ye maloomat PEHLE SE hoti hai
        (customer ne WhatsApp par likh bheji), aur usay phone ki chhoti screen par wohi
        cheez dobara type karni parti thi.

        Ab wo message yahan paste karti hai aur neeche wale khaane bhar jate hain — magar
        order khud ba khud NAHI banta. Wo khaane us ke saamne rehte hain aur wo unhen
        theek kar sakti hai: ye kisi asli bande ka pata hai aur us par parcel jayega.
      */}
      {/*
        Paste ka khaana tab chhup jata hai jab customer khud pata bhej chuki ho.

        🔴 Do raste ek saath dikhana reseller ko rok deta hai: wo sochti hai ke shayad
        yahan bhi kuch daalna hai. Jab kaam ho chuka ho to us ka auzaar hata dena chahiye
        — warna wo auzaar ek sawal ban jata hai.
      */}
      {!prefill && (
      <label className="block rounded-card bg-paper-sunken p-3">
        <span className="text-sm font-semibold">{t('pasteMessage')}</span>
        <textarea
          rows={3}
          value={pasted}
          onChange={(event) => fillFromText(event.target.value)}
          placeholder={t('pasteMessageHint')}
          className="mt-2 w-full rounded-lg bg-paper-raised px-4 py-3 ring-1 ring-black/10"
        />
        {filled > 0 && (
          <span className="mt-2 block text-[0.78rem] font-semibold text-accent-700">
            <span dir="ltr" className="numeric">
              {filled}
            </span>{' '}
            {t('pasteFilled')}
          </span>
        )}
      </label>
      )}

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

        {/*
          Is number ka record — poore platform par.

          🔴 Ye theek YAHAN hai, kisi alag safhe par nahi. Reseller ko ye baat us
          lamhe chahiye jab wo number likh rahi hai aur order abhi laga nahi — us ke baad
          batane ka matlab hai maal ja chuka aur khabar bekar.

          Ye rokta nahi, sirf batata hai. Faisla us ka hai: advance mangwa le, call kar
          le, ya bhej de.
        */}
        <PhoneRecordNote
          phone={phone}
          labels={{
            risky: t('phoneRisky'),
            riskyHint: t('phoneRiskyHint'),
            clean: t('phoneClean'),
          }}
        />

        {/*
          Meri purani customer — record wale jumle ke NEECHE.

          🔴 Tarteeb soch kar hai. Upar wala jumla KHATRE ka hai (is number par kitne
          parcel wapas aaye), aur wo pehle parhna chahiye: agar wo laal hai to reseller
          shayad order lagaye hi na, aur us surat mein pata bharne ka koi maani nahi.
          Ulta rakhne ka matlab hota ke wo pata bhar chuki hoti aur phir usay rokna
          parta — aur us waqt log aksar ruk nahi'te.
        */}
        <KnownCustomer
          phone={phone}
          onFill={(customer) => {
            setName(customer.name)
            setAddress(customer.address)
            setArea(customer.area)
          }}
          labels={{ repeat: t('customerRepeat'), fill: t('customerFill') }}
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
                  className={`flex min-h-tap items-center gap-2 rounded-pill pe-4 ps-1.5 text-sm font-semibold transition ${
                    variantId === variant.id
                      ? 'bg-brand-500 text-white'
                      : variant.inStock
                        ? 'bg-paper-sunken text-ink-soft hover:text-ink'
                        : 'bg-paper-sunken text-ink-faint line-through opacity-60'
                  }`}
                >
                  {/*
                    Jorhe ki apni tasveer — lafz "Red" se zyada khud laal rang batata
                    hai. Na ho to sirf naam, taake qatar ka dhaancha na tootay.
                  */}
                  {variant.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- storage URLs
                    <img
                      src={variant.imageUrl}
                      alt=""
                      loading="lazy"
                      className="h-7 w-7 rounded-full object-cover"
                    />
                  ) : (
                    <span className="w-1.5" />
                  )}
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

        {/*
          Delivery ka rate likha nahi jata, chuna jata hai — dono qadar dukan ki hain.
          Reseller sirf ye batati hai ke customer isi sheher mein hai ya doosre mein;
          wo ye baat jaanti hai, aur rate ka faisla us ka hai hi nahi.
        */}
        <div className="block">
          <span className="text-sm font-semibold">{t('delivery')}</span>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => setOutOfCity(false)}
              className={`flex-1 rounded-lg px-2 py-3 text-sm font-semibold transition ${
                outOfCity ? 'bg-paper-sunken text-ink-soft' : 'bg-brand-500 text-white'
              }`}
            >
              {t('deliveryInCity')}
              <span dir="ltr" className="numeric ms-1.5">
                {delivery.city}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setOutOfCity(true)}
              className={`flex-1 rounded-lg px-2 py-3 text-sm font-semibold transition ${
                outOfCity ? 'bg-brand-500 text-white' : 'bg-paper-sunken text-ink-soft'
              }`}
            >
              {t('deliveryOutCity')}
              <span dir="ltr" className="numeric ms-1.5">
                {delivery.other}
              </span>
            </button>
          </div>
        </div>
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
