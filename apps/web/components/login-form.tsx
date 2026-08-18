'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { translator, type Locale } from '@/lib/i18n'

type Step = 'phone' | 'code' | 'register'

/**
 * OTP login — do qadam, dono par ek hi bara input.
 *
 * Sadia ke liye design: bara font, numeric keypad (inputMode), koi password nahi,
 * aur ghalti par saaf Urdu message (technical code nahi).
 *
 * Register bhi yahin hai, alag safha nahi. Nayi user ko pehle se pata nahi hota ke wo
 * "nayi" hai — wo bas apna number daalti hai. Server NOT_REGISTERED kehta hai to hum
 * usi jagah naam aur sheher poochh lete hain. Us ke liye ye ghalti nahi, agla sawal hai.
 */
export function LoginForm({ locale }: { locale: Locale }) {
  const t = translator(locale)
  const router = useRouter()
  const [step, setStep] = useState<Step>('phone')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [city, setCity] = useState('')
  const [error, setError] = useState<string | null>(null)
  // Dev par server code wapas bhejta hai — safhe par dikhane ke liye (production mein null)
  const [devCode, setDevCode] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  async function post(
    path: string,
    body: unknown,
  ): Promise<{ ok: boolean; message?: string; code?: string; devCode?: string }> {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const payload = (await res.json().catch(() => null)) as
      | { devCode?: string; error?: { code?: string; message?: string } }
      | null

    if (res.ok) return { ok: true, ...(payload?.devCode ? { devCode: payload.devCode } : {}) }
    return {
      ok: false,
      message: payload?.error?.message ?? t('somethingWrong'),
      ...(payload?.error?.code ? { code: payload.error.code } : {}),
    }
  }

  function requestCode(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await post('/api/v1/auth/otp/request', { phone })
      if (result.ok) {
        setStep('code')
        if (result.devCode) {
          setDevCode(result.devCode)
          setCode(result.devCode) // dev par pehle se bhara hua — seedha "andar aayen" daba den
        }
      } else setError(result.message ?? null)
    })
  }

  function verifyCode(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await post('/api/v1/auth/otp/verify', { phone, code })
      if (result.ok) {
        router.replace('/dashboard')
        return
      }

      // Ghalti nahi — ye number pehli bar aaya hai. Naam aur sheher poochh kar bana dete hain.
      if (result.code === 'NOT_REGISTERED') {
        setStep('register')
        return
      }
      setError(result.message ?? null)
    })
  }

  function register(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await post('/api/v1/auth/register', { phone, code, name, city })
      if (result.ok) router.replace('/dashboard')
      else setError(result.message ?? null)
    })
  }

  if (step === 'register') {
    return (
      <form onSubmit={register} className="space-y-4">
        <div className="rounded-card bg-accent-50 px-4 py-3">
          <p className="font-bold text-accent-700">{t('registerTitle')}</p>
          <p className="mt-1 text-[0.88rem] leading-relaxed text-accent-700/85">
            {t('registerBody')}
          </p>
        </div>

        <label className="block">
          <span className="text-sm font-semibold">{t('yourName')}</span>
          <input
            required
            autoComplete="name"
            maxLength={40}
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="field mt-2 text-lg"
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold">{t('yourCity')}</span>
          <input
            required
            autoComplete="address-level2"
            maxLength={40}
            value={city}
            onChange={(event) => setCity(event.target.value)}
            className="field mt-2 text-lg"
          />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={pending || name.trim().length < 2 || city.trim().length < 2}
          className="btn-primary w-full"
        >
          {pending ? t('checking') : t('createAccount')}
        </button>
      </form>
    )
  }

  return step === 'phone' ? (
    <form onSubmit={requestCode} className="space-y-4">
      <label className="block">
        <span className="text-sm font-semibold">{t('whatsappNumber')}</span>
        <input
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          dir="ltr"
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="03001234567"
          className="field mt-2 text-lg"
        />
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? t('sending') : t('sendCode')}
      </button>
    </form>
  ) : (
    <form onSubmit={verifyCode} className="space-y-4">

      {devCode && (
        /*
          Sirf dev par: server ne code tab hi bheja hai jab provider console wala hai.
          Production build mein ye kabhi nahi aata, is liye yahan koi extra shart nahi.
        */
        <div className="rounded-card bg-coal-900 px-4 py-3 text-center text-white">
          <p className="text-[0.7rem] uppercase tracking-[0.14em] text-white/50">
            ٹیسٹ کوڈ (صرف ڈیویلپمنٹ)
          </p>
          <p dir="ltr" className="numeric mt-1 text-2xl font-bold tracking-[0.35em] text-brand-300">
            {devCode}
          </p>
        </div>
      )}
      <p className="text-sm text-ink-soft">
        {t('codeSentTo')} <span dir="ltr">{phone}</span>
      </p>

      <label className="block">
        <span className="text-sm font-semibold">{t('sixDigitCode')}</span>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          dir="ltr"
          required
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          className="field mt-2 text-center text-2xl tracking-[0.5em]"
        />
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button type="submit" disabled={pending || code.length !== 6} className="btn-primary w-full">
        {pending ? t('checking') : t('enter')}
      </button>

      <button
        type="button"
        onClick={() => {
          setStep('phone')
          setCode('')
          setError(null)
        }}
        className="w-full text-sm text-ink-soft underline"
      >
        {t('changeNumber')}
      </button>
    </form>
  )
}
