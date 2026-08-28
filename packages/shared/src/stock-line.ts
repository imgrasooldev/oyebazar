/**
 * "Maal kya mojood hai" — ek line jo pack par chhapti hai.
 *
 * 🔴 Ye khoobsurti ka khaana nahi, BIKRI ka hai.
 *
 * Rate ke baad customer ka agla sawal hamesha wohi do hote hain: "large hai?" aur "aur
 * rang?" — aur har sawal WhatsApp par ek chakkar hai jis mein reseller ko catalogue khol
 * kar dekhna parta hai. Har chakkar mein sauda tootne ka mauqa hai. Jo baat tasveer par
 * likhi ho, wo poochhi hi nahi jati.
 *
 * 🔴 Size, rang aur "kitna bacha" — teenon EK line par, teen alag khaane nahi.
 *
 * Teen alag cheezein banane ka matlab hota ke reseller ko teen jagah hilani parti aur
 * teen switch dabane parte. Karobari taur par ye teenon ek hi sawal ka jawab hain:
 * "mera size mojood hai?" Jo baat saath parhi jati hai, wo saath hi likhni chahiye.
 */

/**
 * Is se kam bache to ginti likhi jati hai.
 *
 * Wohi hadd jo catalogue ke card par hai — do jagah do alag hadd rakhne ka matlab hota
 * ke reseller ko card par "3 bache" dikhta aur pack par kuch na aata, ya ulta.
 */
export const PACK_LOW_STOCK = 5

/** Line par kitne size/rang tak likhe jayen — is se aage naam nahi, ginti chalti hai */
const MAX_NAMED = 4

export interface StockVariant {
  readonly size: string | null
  readonly colour: string | null
  readonly stockQty: number
}

const WORDS = {
  ur: { colours: 'رنگ', left: 'باقی', only: 'صرف' },
  en: { colours: 'colours', left: 'left', only: 'Only' },
} as const

/**
 * Line banata hai — ya `null`, jab likhne ko kuch bhi na ho.
 *
 * 🔴 `null` ka matlab hai "ye line pack par aani hi nahi chahiye". Khali line ka dabba
 * tasveer par ek be-maqsad khali jagah chhorta hai, aur reseller usay "kuch toota hua
 * hai" parhti hai.
 */
export function stockLine(
  variants: readonly StockVariant[],
  lang: 'ur' | 'en' = 'ur',
): string | null {
  const w = WORDS[lang]

  /*
   * 🔴 Sirf wo jorhe jin mein maal HAI.
   *
   * Khatam ho chuka size likhna sab se bura natija deta hai: customer wohi maangti hai
   * jo mojood nahi, aur phir reseller ko mana karna parta hai — jis se us ki apni sakh
   * jati hai, jo is kaam ki asal poonji hai.
   */
  const inStock = variants.filter((variant) => variant.stockQty > 0)
  if (inStock.length === 0) return null

  const parts: string[] = []

  const sizes = unique(inStock.map((variant) => variant.size))
  if (sizes.length > 0) {
    parts.push(sizes.length <= MAX_NAMED ? sizes.join(' · ') : `${sizes.length} size`)
  }

  const colours = unique(inStock.map((variant) => variant.colour))
  if (colours.length > 0) {
    // Rang ke naam lambe hote hain ("gehra neela") — chaar se aage sirf ginti
    parts.push(
      colours.length <= MAX_NAMED ? colours.join(' · ') : `${colours.length} ${w.colours}`,
    )
  }

  /*
   * Jaldi ka ehsaas — magar sirf jab wo SACH ho.
   *
   * 🔴 Har pack par "47 bache hain" likhna khabar nahi, shor hai — aur us shor mein wo
   * "2 bache hain" bhi doob jata hai jo asal khabar hai. Hadd wohi jahan customer ka
   * faisla waqai badalta hai.
   */
  const left = inStock.reduce((sum, variant) => sum + variant.stockQty, 0)
  if (left <= PACK_LOW_STOCK) parts.push(`${w.only} ${left} ${w.left}`)

  return parts.length > 0 ? parts.join(' · ') : null
}

/** Khali/space wale naam girata hai, aur tarteeb wohi rakhta hai jo aayi thi */
function unique(values: readonly (string | null)[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []

  for (const value of values) {
    const clean = value?.trim()
    if (!clean || seen.has(clean)) continue
    seen.add(clean)
    out.push(clean)
  }

  return out
}
