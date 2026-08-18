'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

/**
 * Admin ka OTP login — wohi tareeqa jo baqi system mein hai, koi password nahi.
 *
 * Dev par code safhe par dikh jata hai (server sirf dev mein bhejta hai), warna
 * har test par terminal kholna parta.
 */
export function AdminLoginForm() {
  const router = useRouter()
  const [step, setStep] = useState<'phone' | 'code'>('phone')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [devCode, setDevCode] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  async function post(path: string, body: unknown) {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const payload = (await res.json().catch(() => null)) as
      | { devCode?: string; error?: { message?: string } }
      | null

    if (res.ok) return { ok: true as const, devCode: payload?.devCode }
    return { ok: false as const, message: payload?.error?.message ?? 'Something went wrong' }
  }

  function requestCode(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await post('/api/v1/admin/auth/otp/request', { phone })
      if (!result.ok) {
        setError(result.message ?? null)
        return
      }
      setStep('code')
      if (result.devCode) {
        setDevCode(result.devCode)
        setCode(result.devCode)
      }
    })
  }

  function verify(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await post('/api/v1/admin/auth/otp/verify', { phone, code })
      if (result.ok) router.replace('/admin')
      else setError(result.message ?? null)
    })
  }

  return step === 'phone' ? (
    <form onSubmit={requestCode} className="space-y-4">
      <label className="block">
        <span className="text-sm font-semibold">WhatsApp number</span>
        <input
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          required
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="03001234567"
          className="field mt-2 text-lg"
        />
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? 'Sending…' : 'Send code'}
      </button>
    </form>
  ) : (
    <form onSubmit={verify} className="space-y-4">
      {devCode && (
        <div className="rounded-card bg-coal-900 px-4 py-3 text-center text-white">
          <p className="text-[0.7rem] uppercase tracking-[0.14em] text-white/50">
            Test code (development only)
          </p>
          <p className="numeric mt-1 text-2xl font-bold tracking-[0.35em] text-brand-300">
            {devCode}
          </p>
        </div>
      )}

      <label className="block">
        <span className="text-sm font-semibold">6-digit code</span>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          required
          maxLength={6}
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
          className="field mt-2 text-center text-2xl tracking-[0.5em]"
        />
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={pending || code.length !== 6}
        className="btn-primary w-full"
      >
        {pending ? 'Checking…' : 'Sign in'}
      </button>
    </form>
  )
}
