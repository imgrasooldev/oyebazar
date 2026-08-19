'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

/**
 * Wholesaler ka agla qadam — "maal تیار" ya "بھیج دیا".
 *
 * Bhejne wala button dobara na dabaya jaye is ki fikr nahi ki gayi: state machine
 * peechay jane hi nahi deti, aur dobara wohi qadam bhejne par server saaf ghalti
 * deta hai. Yahan sirf wo ghalti dikhani hai — chhupani nahi, warna dukan wala
 * samajhta hai kaam ho gaya jabke hua nahi.
 */
export function SupplierStatusButton({
  orderNo,
  toStatus,
  label,
  tone = 'plain',
}: {
  orderNo: string
  toStatus: 'PACKED' | 'DISPATCHED'
  label: string
  tone?: 'plain' | 'primary'
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function run() {
    setPending(true)
    setError(null)

    const res = await fetch(`/api/v1/supplier/orders/${orderNo}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toStatus }),
    })

    setPending(false)

    if (!res.ok) {
      const payload = (await res.json().catch(() => null)) as { error?: { message?: string } } | null
      setError(payload?.error?.message ?? 'Dobara koshish karen')
      return
    }

    router.refresh()
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => void run()}
        className={
          tone === 'primary'
            ? 'btn-primary !py-2.5 !text-[0.9rem]'
            : 'btn-secondary !py-2.5 !text-[0.9rem]'
        }
      >
        {pending ? '…' : label}
      </button>
      {error && <span className="text-[0.75rem] text-red-600">{error}</span>}
    </span>
  )
}
