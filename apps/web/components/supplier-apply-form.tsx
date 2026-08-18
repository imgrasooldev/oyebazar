'use client'

import { useState, useTransition } from 'react'
import { translator, type Locale } from '@/lib/i18n'

/**
 * "Apni dukan list karwayen" ka form.
 *
 * Sirf wo khaane jo ops ko FAISLA karne ke liye chahiyen. NTN marzi ka hai — bohat si
 * mandi ki dukanen registered nahi hotin, aur usay lazmi karne ka matlab hai aadhi
 * mandi ko darwaze par rok dena.
 *
 * Bhejne ke baad form ki jagah saaf jawab aata hai: "team rabta karegi". Jhoota "aap ki
 * dukan live ho gayi" nahi — kyunke wo hui nahi; manzoori insaan deta hai.
 */
export function SupplierApplyForm({ locale }: { locale: Locale }) {
  const t = translator(locale)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    const form = new FormData(event.currentTarget)
    const body = {
      businessName: String(form.get('businessName') ?? ''),
      ownerName: String(form.get('ownerName') ?? ''),
      phone: String(form.get('phone') ?? ''),
      city: String(form.get('city') ?? ''),
      address: String(form.get('address') ?? ''),
      ...(form.get('marketName') ? { marketName: String(form.get('marketName')) } : {}),
      ...(form.get('ntn') ? { ntn: String(form.get('ntn')) } : {}),
    }

    startTransition(async () => {
      const res = await fetch('/api/v1/supplier/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as
          | { error?: { message?: string } }
          | null
        setError(payload?.error?.message ?? t('somethingWrong'))
        return
      }

      setDone(true)
    })
  }

  if (done) {
    return (
      <div className="card p-6 text-center">
        <p className="text-[1.1rem] font-bold text-accent-700">{t('applyDoneTitle')}</p>
        <p className="mt-2 text-[0.92rem] leading-relaxed text-ink-soft">{t('applyDoneBody')}</p>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="card space-y-4 p-6">
      <Field name="businessName" label={t('shopName')} required />
      <Field name="ownerName" label={t('ownerName')} required autoComplete="name" />
      <Field
        name="phone"
        label={t('whatsappNumber')}
        required
        type="tel"
        dir="ltr"
        placeholder="03001234567"
        autoComplete="tel"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="city" label={t('city')} required autoComplete="address-level2" />
        <Field name="marketName" label={t('marketNameOptional')} />
      </div>

      <Field name="address" label={t('shopAddress')} required />
      <Field name="ntn" label={t('ntnOptional')} dir="ltr" />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button type="submit" disabled={pending} className="btn-primary w-full !py-3.5">
        {pending ? t('sending') : t('applySubmit')}
      </button>

      <p className="text-center text-[0.78rem] leading-relaxed text-ink-faint">
        {t('applyNote')}
      </p>
    </form>
  )
}

function Field({
  name,
  label,
  required = false,
  type = 'text',
  dir,
  placeholder,
  autoComplete,
}: {
  name: string
  label: string
  required?: boolean
  type?: string
  dir?: 'ltr'
  placeholder?: string
  autoComplete?: string
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        {...(dir ? { dir } : {})}
        {...(placeholder ? { placeholder } : {})}
        {...(autoComplete ? { autoComplete } : {})}
        className="field mt-2"
      />
    </label>
  )
}
