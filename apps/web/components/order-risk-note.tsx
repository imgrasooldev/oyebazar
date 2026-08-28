import type { RiskReason, RtoRisk } from '@oyebazar/core'
import { formatPkr } from '@oyebazar/shared'
import type { Locale } from '@/lib/i18n'

/**
 * Wapsi ka ishara — order qubool karne se PEHLE.
 *
 * 🔴 Ye button nahi rokta, sirf batata hai. Faisla dukan ka hai — hum sirf wo likhte
 * hain jo hamare paas pehle se mojood hai, aur us ki WAJAH saath likhte hain. Bina
 * wajah ke "khatra: zyada" likhna sab se bura shakl hai: dukan wala usay maan bhi nahi
 * sakta aur jhutla bhi nahi sakta, is liye kuch arse baad dekhna hi chhor deta hai.
 *
 * Hisab yahan nahi hai — `assessRtoRisk` mein hai (packages/core/domain/rto-risk.ts),
 * jahan us ka test bhi hai. Yahan sirf lafz aur rang hain.
 *
 * `quiet` par ye kuch bhi nahi lautata. Ye jaan boojh kar hai: har order par nishan
 * lagane se nishan bemani ho jata hai, aur jis din wo waqai kaam ka hota us din bhi
 * koi nahi dekhta.
 */
export function OrderRiskNote({
  risk,
  locale,
}: {
  risk: RtoRisk | undefined
  locale: Locale
}) {
  if (!risk || risk.band === 'quiet') return null

  const t = LABELS[locale]

  /*
   * Achhi khabar ki apni shakl — ek satar, sabz, bas.
   *
   * Ye utna hi zaroori hai jitna laal nishan: jo safha sirf mana karne ke ishare dikhata
   * hai, us par dukan wala bharosa nahi karta — wo usay "ye to hamesha daraata rehta
   * hai" samajh kar band kar deta hai. Aazmaya hua customer HAAN kehne ki wajah hai.
   */
  if (risk.band === 'known') {
    return (
      <p className="flex items-start gap-1.5 rounded-card bg-accent-50 px-3 py-2 text-[0.8rem] font-semibold text-accent-700">
        <span aria-hidden>✓</span>
        {reasonText(t, risk.reasons.find((row) => row.code === 'customerKnown'))}
      </p>
    )
  }

  const high = risk.band === 'high'

  return (
    <div
      className={`rounded-card px-3.5 py-3 ${
        // Wohi teen rang jo `ResellerRtoRecord` par pehle se chal rahe hain — dukan
        // wale ko ek hi safhe par do alag rang-nizam nahi seekhne chahiyen
        high ? 'bg-red-50 text-red-700' : 'bg-brand-50 text-brand-800'
      }`}
    >
      <p className="flex items-center gap-1.5 text-[0.85rem] font-bold">
        <span aria-hidden>{high ? '⚠' : '👀'}</span>
        {high ? t.headHigh : t.headWatch}
      </p>

      {/*
        Wajah — sirf wo jinhon ne khatra BARHAYA. Achhi wajah (aazmaya hua customer)
        yahan bhi shamil hoti to satar apne aap se ulti baat karti: "khatra hai… aur
        gaahak achha hai". Us ka asar number mein pehle hi lag chuka hai.
      */}
      <ul className="mt-1.5 space-y-1 text-[0.82rem] leading-relaxed">
        {risk.reasons
          .filter((reason) => reason.points > 0)
          .map((reason) => (
            <li key={reason.code} className="flex items-start gap-1.5">
              <span aria-hidden className="mt-[0.45em] h-1 w-1 shrink-0 rounded-full bg-current" />
              {reasonText(t, reason)}
            </li>
          ))}
      </ul>

      {/*
        Nuqsan ka number — kyunke "khatra" ek raye hai aur "Rs 350" ek haqiqat. Dukan
        wala doosri cheez par faisla karta hai.
      */}
      <p className="mt-2 border-t border-current/15 pt-2 text-[0.78rem]">
        {t.cost} <span className="numeric font-bold">{formatPkr(risk.costIfReturned)}</span>
      </p>

      {/* Sirf `high` par mashwara — har jagah likha hua mashwara mashwara nahi rehta */}
      {high && <p className="mt-1.5 text-[0.8rem] font-semibold">{t.advice}</p>}
    </div>
  )
}

function reasonText(t: (typeof LABELS)[Locale], reason: RiskReason | undefined): string {
  if (!reason) return ''
  return t.reasons[reason.code](reason.value ?? 0)
}

/**
 * Lafz yahan hain, `lib/i18n` mein nahi — ye sirf isi ek jagah chalte hain aur har lafz
 * mein ek number bharna hota hai. Aam dictionary mein daalne se wahan aisi satarein
 * chali jatin jinhen kabhi koi aur safha istemal nahi karta.
 */
const LABELS = {
  ur: {
    headHigh: 'واپسی کا خطرہ زیادہ ہے',
    headWatch: 'ایک بار دیکھ لیں',
    cost: 'واپس آیا تو نقصان:',
    advice: 'بھیجنے سے پہلے گاہک کو ایک فون کر لیں — یا ریسیلر سے کہیں کہ تصدیق کروا دے۔',
    reasons: {
      customerReturned: (n: number) => `یہ گاہک پہلے بھی مال واپس کر چکا ہے (${n} بار)`,
      customerKnown: (n: number) => `یہ گاہک پہلے ${n} بار مال لے چکا ہے`,
      areaReturns: (n: number) => `اس علاقے سے ${n}٪ مال واپس آتا ہے`,
      resellerReturns: (n: number) => `اس ریسیلر کے ${n}٪ آرڈر واپس آئے ہیں`,
      noPin: () => 'نقشے پر پن نہیں — ریسیلر سے منگوا لیں',
      bigOrder: (n: number) => `آپ کے عام آرڈر سے ${n} گنا بڑا`,
    },
  },
  rm: {
    headHigh: 'Wapsi ka khatra zyada hai',
    headWatch: 'Ek baar dekh lein',
    cost: 'Wapas aya to nuqsan:',
    advice: 'Bhejne se pehle gaahak ko ek phone kar lein — ya reseller se kahen ke tasdeeq karwa de.',
    reasons: {
      customerReturned: (n: number) => `Ye gaahak pehle bhi maal wapas kar chuka hai (${n} baar)`,
      customerKnown: (n: number) => `Ye gaahak pehle ${n} baar maal le chuka hai`,
      areaReturns: (n: number) => `Is ilaqe se ${n}% maal wapas aata hai`,
      resellerReturns: (n: number) => `Is reseller ke ${n}% order wapas aaye hain`,
      noPin: () => 'Naqshe par pin nahi — reseller se mangwa lein',
      bigOrder: (n: number) => `Aap ke aam order se ${n} guna bara`,
    },
  },
  en: {
    headHigh: 'High chance this comes back',
    headWatch: 'Worth a look',
    cost: 'If it returns, you lose:',
    advice: 'Call the customer before you dispatch — or ask the reseller to confirm again.',
    reasons: {
      customerReturned: (n: number) => `This customer has returned parcels before (${n})`,
      customerKnown: (n: number) => `This customer has taken delivery ${n} time(s) before`,
      areaReturns: (n: number) => `${n}% of parcels to this area come back`,
      resellerReturns: (n: number) => `${n}% of this reseller's orders came back`,
      noPin: () => 'No map pin — ask the reseller for one',
      bigOrder: (n: number) => `${n}× bigger than your usual order`,
    },
  },
} as const satisfies Record<
  Locale,
  {
    headHigh: string
    headWatch: string
    cost: string
    advice: string
    reasons: Record<RiskReason['code'], (n: number) => string>
  }
>
