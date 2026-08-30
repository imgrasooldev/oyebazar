'use client'

import { useEffect, useState } from 'react'

type Known = {
  name: string
  address: string
  area: string
  orderCount: number
}

/**
 * "Ye to aap ki purani customer hai" — number likhte hi.
 *
 * 🔴 Do cheezein ek saath karta hai, aur dono ka yahin hona hi in ka faida hai:
 *
 *  1. DOBARA AANE WALI ki pehchan. Reseller ke liye us se qeemti koi cheez nahi — naya
 *     customer dhoondhne mein us ka poora din jata hai, aur purana wapas aane wala usay
 *     muft milta hai. Magar wo usay pehchan tabhi sakti hai jab hum yaad rakhen; us ke
 *     apne WhatsApp mein saikron chat hain aur wahan "ye teesri dafa hai" kahin likha
 *     hua nahi hota.
 *
 *  2. Pata BHARNA. Yehi wo qadam hai jahan RTO banta hai: pata haath se dobara likha
 *     jata hai, ek gali ka naam reh jata hai, aur parcel wapas aa jata hai. Jo pata
 *     pichhli dafa POHANCH chuka hai, wo sab se mehfooz pata hai jo hamare paas hai.
 *
 * 🔴 Bharna KHUD BA KHUD nahi hota — button par hota hai. Khud bhar dene ka matlab ye
 * hota ke reseller ka likha hua kuch chup chaap mit jaye (wo naya pata likh rahi ho aur
 * hum purana daal den), aur us ek dafa ka nuqsan un sau dafaon ke faide se bara hai.
 */
export function KnownCustomer({
  phone,
  onFill,
  labels,
}: {
  phone: string
  onFill: (customer: { name: string; address: string; area: string }) => void
  labels: {
    /** "{n} order pehle bhi" */
    repeat: string
    fill: string
  }
}) {
  const [known, setKnown] = useState<Known | null>(null)

  useEffect(() => {
    const digits = phone.replace(/\D/g, '')
    if (digits.length < 10) {
      setKnown(null)
      return
    }

    /*
     * Wohi aadha second jo `PhoneRecordNote` par hai — jaan boojh kar barabar.
     *
     * Do alag waqfe rakhne ka matlab ye hota ke ek jumla pehle aata aur doosra baad
     * mein, aur qatar apni jagah se hilti rehti jab reseller abhi likh hi rahi hoti.
     */
    const timer = setTimeout(() => {
      let cancelled = false

      void fetch(`/api/v1/customers?phone=${encodeURIComponent(digits)}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data: Known | null) => {
          if (!cancelled) setKnown(data)
        })
        .catch(() => undefined)

      return () => {
        cancelled = true
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [phone])

  /*
   * Pehli dafa wale customer par KUCH nahi dikhta.
   *
   * "Pehla order" likhna koi khabar nahi — wo har naye customer par sach hai. Aur us
   * jumle ko har dafa dikhane se wo jumla bhi bemani ho jata jo waqai kuch kehta hai.
   */
  if (!known || known.orderCount < 1) return null

  return (
    <span className="mt-2 flex flex-wrap items-center gap-2 rounded-card bg-accent-50 px-3 py-2 text-[0.82rem] text-accent-800">
      <span className="font-semibold">
        {labels.repeat.replace('{n}', String(known.orderCount))}
      </span>
      <span className="min-w-0 flex-1 truncate text-accent-800/75">{known.name}</span>
      <button
        type="button"
        /*
          🔴 `type="button"` lazmi hai. Form ke andar bina qism ke button `submit` hota
          hai — yani "pata bharo" dabane par order LAG jata, aur wo bhi purane pate ke
          baghair. Ye wo ghalti hai jo test mein kabhi nazar nahi aati aur asli customer
          par pehli dafa hoti hai.
        */
        onClick={() =>
          onFill({ name: known.name, address: known.address, area: known.area })
        }
        className="shrink-0 rounded-pill bg-accent-500 px-3 py-1 text-[0.76rem] font-semibold text-white transition hover:bg-accent-700"
      >
        {labels.fill}
      </button>
    </span>
  )
}
