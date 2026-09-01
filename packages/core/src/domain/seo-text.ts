/**
 * Google par kya likha aaye — us matn ke qawaid.
 *
 * 🔴 Ye module SEO ki "chalaki" nahi hai. Yahan sirf do cheezein hain jo waqai naapi ja
 * sakti hain: matn ki LAMBAI, aur us mein fazool safai. Baqi jo kuch SEO ke naam par
 * bika jata hai (keyword ki ginti, "density", lafzon ka jama karna) us ka koi asar
 * nahi, aur us ka khaana banane ka matlab sirf ye hota ke dukandar us mein waqt lagaye.
 *
 * Lambai par zor is liye hai ke wo asli hai: Google unwan ko taqreeban 60 huroof par
 * aur tafseel ko 155 par KAAT deta hai. Kata hua jumla adhoora nazar aata hai
 * ("ملتان ڈرائی فروٹ — تھوک ریٹ پر خشک میوہ جات، بادام، اخر…") aur wo adhoora jumla wohi
 * ek line hai jo dekh kar banda click karta hai ya nahi karta.
 */

/**
 * Jahan Google kaatna shuru karta hai.
 *
 * 🔴 Ye hadd NAHI hai, nishani hai. Asal mein Google pixel naapta hai, huroof nahi —
 * chaure huroof pehle kat jate hain. Us ka theek hisab browser ke baghair mumkin nahi,
 * aur ek taqreebi ginti us se kahin behtar hai jo yahan lag sakti thi: kuch bhi nahi.
 */
export const SEO_TITLE_IDEAL = 60
export const SEO_DESCRIPTION_IDEAL = 155

/**
 * Jahan hum khud rok dete hain.
 *
 * Nishani se thora upar, taake jo banda jaan boojh kar lamba likhna chahe wo likh sake
 * (kabhi kabhi wo theek bhi hota hai — kata hua unwan bhi apna kaam kar jata hai) magar
 * poora paragraph is khaane mein na aa jaye.
 */
export const SEO_TITLE_MAX = 70
export const SEO_DESCRIPTION_MAX = 200

/** Matn kaisa hai — UI safhe par isi se rang badalta hai. */
export type SeoLength = 'empty' | 'short' | 'good' | 'long' | 'tooLong'

/**
 * Ek khaane ka haal.
 *
 * `short` bhi ek haal hai aur wo `good` nahi hai: teen lafz ka unwan Google ko us
 * safhe ke bare mein kuch nahi batata, aur natije mein wo khali khali lagta hai.
 */
export function seoLength(text: string, ideal: number): SeoLength {
  const length = text.trim().length

  if (length === 0) return 'empty'
  if (length < ideal * 0.4) return 'short'
  if (length <= ideal) return 'good'
  if (length <= ideal * 1.2) return 'long'
  return 'tooLong'
}

/**
 * Khaane ka matn saaf karta hai — ya `null`.
 *
 * 🔴 Khali matn `null` banta hai, khali string NAHI. Farq asli hai: `null` ka matlab
 * hai "dukandar ne kuch nahi likha, safha khud apna unwan banaye", aur khali string ka
 * matlab hota "us ne KHALI unwan chuna hai" — jis par safha bilkul be-naam chhap jata.
 *
 * Nayi lines bhi hata di jati hain: ye matn `<title>` aur `<meta>` mein jata hai jahan
 * un ka koi maani nahi, aur paste karte waqt wo har dafa saath aa jati hain.
 */
export function cleanSeoText(raw: string | null | undefined, max: number): string | null {
  if (!raw) return null

  const cleaned = raw.replace(/\s+/g, ' ').trim()
  if (!cleaned) return null

  return cleaned.slice(0, max)
}

/**
 * Wo unwan jo waqai chhapega — dukandar ka apna, warna jo hum bana dete hain.
 *
 * 🔴 Ye faisla ek hi jagah rehna chahiye. Do jagah likhne ka anjaam ye hota ke dukan ka
 * safha us ka apna unwan dikhaye aur maal ka safha hamara bana hua — aur jo dukandar
 * apna unwan likh chuka ho, wo samajhta ke feature chalta hi nahi.
 */
export function resolveSeoText(own: string | null, fallback: string): string {
  const cleaned = own?.trim()
  return cleaned && cleaned.length > 0 ? cleaned : fallback
}
