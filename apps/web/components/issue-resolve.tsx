'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

/**
 * "Ye masla hal ho gaya" — ops ki taraf se.
 *
 * 🔴 Tasdeeq ka koi dabba nahi. Ye qadam ULTA ho sakta hai (row mitti nahi, sirf
 * `resolvedAt` lagta hai) aur ghalti se band kiya hua masla ops khud dobara khol sakti
 * hai. Har ulat-ne wale qadam par "kya aap waqai?" poochhna logon ko us sawal ka aadi
 * kar deta hai — aur phir wo us sawal par bhi haan dabate hain jo waqai khatarnak ho.
 */
export function IssueResolve({ messageId, label }: { messageId: string; label: string }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  async function resolve() {
    setPending(true)
    await fetch(`/api/v1/admin/order-messages/${messageId}/resolve`, { method: 'POST' })
    setPending(false)
    router.refresh()
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => void resolve()}
      className="shrink-0 rounded-pill bg-paper-sunken px-3 py-1 text-[0.72rem] font-semibold text-ink-soft transition hover:bg-accent-50 hover:text-accent-700 disabled:opacity-50"
    >
      {label}
    </button>
  )
}
