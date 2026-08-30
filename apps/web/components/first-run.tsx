import Link from 'next/link'
import { SparkIcon } from '@/components/icons'

/**
 * Nayi reseller ka pehla safha.
 *
 * 🔴 Is ke baghair wo login kar ke ek KHALI dashboard par girti thi: `Rs 0`, `0 orders`,
 * `0 delivered` — aur upar likha hua "pehle wo jo ruka hua hai", jabke us ka kuch ruka
 * hua tha hi nahi. Wo us se bura hai jo kaha hi na jaye: safha ek waada karta hai aur
 * usi lamhe torh deta hai.
 *
 * Aur ye faisla PAANCH MINUTE mein hota hai. Jo reseller pehle din ek pack bana kar apne
 * status par laga deti hai, wo reh jati hai; jo pehle din samajh na sake, wo dobara nahi
 * aati. Us paanch minute mein hum abhi kuch keh hi nahi rahe the.
 *
 * 🔴 Teesra qadam sab se ahem hai aur wohi aksar chhoot jata hai: pack BANA lena kaafi
 * nahi, usay status par LAGANA parta hai. Bina us ke koi order nahi aata — aur naya banda
 * samajhta hai ke "app kaam nahi kar rahi", jabke us ne aakhri qadam uthaya hi nahi.
 * Isi liye wo qadam yahan likha hua hai, farz nahi kiya gaya.
 */
export function FirstRun({
  labels,
}: {
  labels: {
    title: string
    body: string
    step1: string
    step2: string
    step3: string
    step3Why: string
    cta: string
  }
}) {
  const steps = [labels.step1, labels.step2, labels.step3]

  return (
    <section className="card overflow-hidden">
      <div className="flex items-start gap-3 bg-coal-900 px-5 py-4 text-white">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-card bg-white/10 text-brand-300"
          aria-hidden="true"
        >
          <SparkIcon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-[1.05rem] font-bold leading-tight">{labels.title}</h2>
          <p className="mt-1 text-[0.85rem] text-white/70">{labels.body}</p>
        </div>
      </div>

      <ol className="space-y-3 p-5">
        {steps.map((step, index) => (
          <li key={index} className="flex items-start gap-3">
            <span
              dir="ltr"
              className="numeric flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-paper-sunken text-[0.8rem] font-bold text-ink-soft"
              aria-hidden="true"
            >
              {index + 1}
            </span>
            <span className="min-w-0 pt-0.5">
              <span className="block text-[0.92rem] font-semibold">{step}</span>
              {/*
                Sirf teesre qadam par wajah likhi hai — kyunke sirf wohi wo qadam hai jo
                log chhor dete hain. Har qadam par wajah likhna teenon ko bhaari kar deta
                aur asal baat us shor mein doob jati.
              */}
              {index === 2 && (
                <span className="mt-0.5 block text-[0.8rem] text-ink-faint">
                  {labels.step3Why}
                </span>
              )}
            </span>
          </li>
        ))}
      </ol>

      <div className="px-5 pb-5">
        <Link href="/catalogue" className="btn-primary flex min-h-tap w-full items-center justify-center">
          {labels.cta}
        </Link>
      </div>
    </section>
  )
}
