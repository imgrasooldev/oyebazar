'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

/**
 * "Aaj ka drop banao" — ops ke liye.
 *
 * Ye kaam roz raat ko cron karta hai. Ye button us ki jagah lene ke liye nahi hai, us
 * ke NA chalne ke liye hai: jis subah cron kisi wajah se na chale, ab ops ke paas ek
 * rasta hai — pehle worker ki CLI ke baghair koi rasta tha hi nahi, aur us subah poore
 * platform ki resellers ke paas lagane ko kuch naya nahi hota tha.
 *
 * Dobara dabana ghalti nahi: ek din ka ek hi drop banta hai (ye shart DB mein bhi hai),
 * is liye doosri dafa wohi drop wapas aata hai.
 */
export function BuildDropButton({
  label,
  working,
}: {
  label: string
  working: string
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function run() {
    setPending(true)
    setError(null)

    const res = await fetch('/api/v1/admin/drop', { method: 'POST' })
    setPending(false)

    if (!res.ok) {
      const payload = (await res.json().catch(() => null)) as { error?: { message?: string } } | null
      // Ghalti dikhai jati hai, chhupai nahi — warna ops samajhti hai drop ban gaya
      setError(payload?.error?.message ?? 'Dobara koshish karen')
      return
    }

    router.refresh()
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button type="button" disabled={pending} onClick={() => void run()} className="btn-primary">
        {pending ? working : label}
      </button>
      {error && <span className="text-[0.78rem] text-red-600">{error}</span>}
    </span>
  )
}
