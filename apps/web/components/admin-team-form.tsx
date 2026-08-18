'use client'

import { useRouter } from 'next/navigation'
import { OPS_ROLES, OPS_ROLE_PURPOSE } from '@oyebazar/core'
import { useState, useTransition } from 'react'

/**
 * Naya ops user.
 *
 * Role ka default REVIEWER hai — sirf dekhna. Naya banda pehle dekhe, aur zaroorat
 * pare to role barha diya jaye; ulta karna (pehle sab kuch dena, phir kam karna) us
 * waqt yaad hi nahi rehta.
 */
export function AdminTeamForm() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    const form = event.currentTarget
    const data = new FormData(form)

    startTransition(async () => {
      const res = await fetch('/api/v1/admin/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: String(data.get('name') ?? ''),
          email: String(data.get('email') ?? ''),
          phone: String(data.get('phone') ?? ''),
          role: String(data.get('role') ?? 'REVIEWER'),
        }),
      })

      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as
          | { error?: { message?: string } }
          | null
        setError(payload?.error?.message ?? 'Could not add')
        return
      }

      form.reset()
      setOpen(false)
      router.refresh()
    })
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn-primary">
        Add team member
      </button>
    )
  }

  return (
    <form onSubmit={submit} className="card space-y-4 p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-semibold">Name</span>
          <input name="name" required maxLength={60} className="field mt-2" />
        </label>

        <label className="block">
          <span className="text-sm font-semibold">Email</span>
          <input name="email" type="email" required maxLength={80} className="field mt-2" />
        </label>

        <label className="block">
          <span className="text-sm font-semibold">WhatsApp number</span>
          {/* Login isi number se hota hai — email sirf pehchan ke liye hai */}
          <input
            name="phone"
            type="tel"
            required
            dir="ltr"
            placeholder="03001234567"
            className="field mt-2"
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold">Role</span>
          {/* Default sab se KAM ikhtiyar — barhana aasan hai, wapas lena yaad nahi rehta */}
          <select name="role" defaultValue="REVIEWER" className="field mt-2">
            {OPS_ROLES.map((role) => (
              <option key={role} value={role}>
                {role.replace('_', ' ')} — {OPS_ROLE_PURPOSE[role]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? 'Adding…' : 'Add'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="btn-secondary">
          Cancel
        </button>
      </div>
    </form>
  )
}
