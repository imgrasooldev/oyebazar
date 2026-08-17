'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { translator, type Locale } from '@/lib/i18n'

type Step = 'phone' | 'code'

/**
 * OTP login — do qadam, dono par ek hi bara input.
 *
 * Sadia ke liye design: bara font, numeric keypad (inputMode), koi password nahi,
 * aur ghalti par saaf Urdu message (technical code nahi).
 */
export function LoginForm({ locale }: { locale: Locale }) {
  const t = translator(locale)
  const router = useRouter()
  const [step, setStep] = useState<Step>('phone')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  async function post(path: string, body: unknown): Promise<{ ok: boolean; message?: string }> {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.ok) return { ok: true }
    const payload = (await res.json().catch(() => null)) as
      | { error?: { message?: string } }
      | null
    return { ok: false, message: payload?.error?.message ?? t('somethingWrong') }
  }

  function requestCode(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await post('/api/v1/auth/otp/request', { phone })
      if (result.ok) setStep('code')
      else setError(result.message ?? null)
    })
  }

  function verifyCode(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await post('/api/v1/auth/otp/verify', { phone, code })
      if (result.ok) router.replace('/catalogue')
      else setError(result.message ?? null)
    })
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
