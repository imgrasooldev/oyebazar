'use client'

import { useEffect, useState } from 'react'

interface Record {
  delivered: number
  returned: number
  rtoRate: number | null
  risky: boolean
}

/**
 * "Is number ka record" — number likhte hi, order lagane se pehle.
 *
 * 🔴 Ye reseller ko ROKTA nahi, sirf batata hai. Faisla us ka hai.
 *
 * Rok lagane ka matlab hota ke hum ek aise shakhs ko black-list kar rahe hain jo kabhi
 * hamare saamne aaya hi nahi aur jis ke paas safai ka koi rasta nahi — aur pichli wapsi
 * kisi aur reseller ki ghalti se bhi ho sakti hai (ghalat pata, bura maal, courier).
 *
 * Reseller ko ijazat nahi chahiye, KHABAR chahiye: "is number par pehle bhi wapsi hui
 * hai". Phir wo khud tay karti hai — advance mangwaye, call kare, ya bhej de.
 */
export function PhoneRecordNote({
  phone,
  labels,
}: {
  phone: string
  labels: {
    risky: string
    riskyHint: string
    clean: string
  }
}) {
  const [record, setRecord] = useState<Record | null>(null)

  useEffect(() => {
    const digits = phone.replace(/\D/g, '')
    // Poora number likhne se pehle poochhna be-maqsad hai — aur har harf par ek request
    if (digits.length < 10) {
      setRecord(null)
      return
    }

    /*
     * 🔴 Har harf par nahi — likhna ruk jane ka intezar.
     *
     * Bina is ke gyarah hindson par gyarah request jatin, aur har ek poore `Order` table
     * par ginti chalati. Aadha second wo waqfa hai jis ke baad banda waqai ruk chuka
     * hota hai.
     */
    const timer = setTimeout(() => {
      const cancelled = { yes: false }

      void fetch(`/api/v1/phone-record?phone=${encodeURIComponent(digits)}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data: Record | null) => {
          if (!cancelled.yes) setRecord(data)
        })
        .catch(() => undefined)

      return () => {
        cancelled.yes = true
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [phone])

  /*
   * 🔴 `rtoRate === null` par KUCH nahi dikhta — aur ye jaan boojh kar hai.
   *
   * Us ka matlab "hum nahi jaante" hai, "acha hai" nahi. Do mukammal order se kam par
   * kuch keh dena ek aise shakhs ke bare mein faisla dena hai jis ke bare mein hum ne
   * abhi kuch dekha hi nahi — aur wo faisla us ka har agla order maar sakta hai.
   */
  if (!record || record.rtoRate === null) return null

  const total = record.delivered + record.returned

  if (!record.risky) {
    return (
      <p className="mt-2 text-[0.8rem] text-accent-700">
        ✓ {labels.clean.replace('{n}', String(record.delivered)).replace('{total}', String(total))}
      </p>
    )
  }

  return (
    <div className="mt-2 rounded-card bg-amber-50 px-3 py-2.5 ring-1 ring-amber-300">
      <p className="text-[0.85rem] font-semibold text-amber-900">
        {labels.risky
          .replace('{returned}', String(record.returned))
          .replace('{total}', String(total))}
      </p>
      <p className="mt-0.5 text-[0.78rem] text-amber-800">{labels.riskyHint}</p>
    </div>
  )
}
