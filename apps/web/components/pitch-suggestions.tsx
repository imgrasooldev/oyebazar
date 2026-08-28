'use client'

import { useState } from 'react'

/**
 * "Kya likhoon?" — us khali khane ka jawab jahan reseller ruk jati hai.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Tasveer hum bana dete hain, rate hum likh dete hain — aur phir ek khali khana aata
 * hai jahan us ki apni baat likhni hoti hai. Bohat si resellers wahin ruk jati hain aur
 * status lagaye baghair chali jati hain. Ye teen jumle usi ek qadam ke liye hain.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * 🔴 TEEN jumle, ek nahi. Ek jumla dene ka matlab hai "yehi likho", aur wo har reseller
 * ke har maal par ek jaisa status bana deta hai — jo us ke customers ko foran mashini
 * lagta hai. Teen mein se chunna us ki apni awaz baqi rakhta hai.
 *
 * 🔴 Aur ye khud kuch nahi bharta. Jumla tabhi khane mein jata hai jab wo usay CHUNTI
 * hai. Khud bhar dene wala safha us ki apni baat mita deta — aur wo baat us ki sab se
 * qeemti cheez hai, kyunke us ke customer usi ko pehchante hain.
 */
export function PitchSuggestions({
  productId,
  onPick,
  labels,
}: {
  productId: string
  /** Chuna hua jumla — safha khud tay karta hai ke wo kahan jaye */
  onPick: (line: string) => void
  labels: {
    ask: string
    asking: string
    again: string
    failed: string
  }
}) {
  const [lines, setLines] = useState<readonly string[] | null>(null)
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)

  async function ask(): Promise<void> {
    setPending(true)
    setFailed(false)

    /*
     * Server par ye kabhi khali nahi lautta (model band ho to hamare apne khanon se
     * jumle aate hain — dekhen `createPitchWriter`). `failed` sirf us soorat ke liye
     * hai jahan network hi na ho.
     */
    const res = await fetch('/api/v1/status-pack/pitch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId }),
    }).catch(() => null)

    setPending(false)

    if (!res?.ok) {
      setFailed(true)
      return
    }

    const data = (await res.json().catch(() => null)) as { lines?: string[] } | null
    if (!data?.lines?.length) {
      setFailed(true)
      return
    }
    setLines(data.lines)
  }

  return (
    <div className="mt-2">
      {lines === null ? (
        <button
          type="button"
          onClick={() => void ask()}
          disabled={pending}
          className="text-[0.8rem] font-semibold text-brand-700 underline disabled:opacity-60"
        >
          {pending ? labels.asking : labels.ask}
        </button>
      ) : (
        <div className="space-y-1.5">
          <ul className="space-y-1.5">
            {lines.map((line) => (
              <li key={line}>
                {/*
                  Poora jumla dabne wala — sirf ek chhota "+" nahi. Phone par ungli
                  choti nishani par nahi girti, aur ye qatar wahin hai jahan wo pehle se
                  parh rahi hai.
                */}
                <button
                  type="button"
                  onClick={() => onPick(line)}
                  className="w-full rounded-card bg-paper-sunken px-3 py-2 text-start text-[0.85rem] leading-relaxed transition hover:bg-brand-50"
                >
                  {line}
                </button>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={() => void ask()}
            disabled={pending}
            className="text-[0.78rem] text-ink-faint underline disabled:opacity-60"
          >
            {pending ? labels.asking : labels.again}
          </button>
        </div>
      )}

      {failed && <p className="mt-1 text-[0.78rem] text-red-600">{labels.failed}</p>}
    </div>
  )
}
