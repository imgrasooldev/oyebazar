/**
 * Jumlon se RAQAM nikalna — model ke jawab par akhri taala.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔴 Ye ehtiyat ki cheez nahi, is poore adapter ki shart hai.
 *
 * Rate `buildCaption` likhta hai — reseller ke apne save shuda rate ke SNAPSHOT se.
 * Agar jumlon mein bhi koi raqam aa jaye to ek hi tasveer par DO alag number chhap
 * sakte hain, aur us ka farq reseller apne customer ke saamne bhugatti hai: wo "1,800"
 * keh chuki hoti hai aur tasveer par "1,650" likha hota hai. Us ke baad wo customer
 * dobara nahi aata, aur reseller hum par dobara bharosa nahi karti.
 *
 * Prompt mein bhi likha hai ke raqam na likhe, magar prompt ek DARKHWAST hai. Ye jaanch
 * ek SHART hai — aur jahan nuqsan kisi aur ka ho, wahan darkhwast par bharosa nahi kiya
 * jata.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * Hindse — angrezi (0-9), Urdu/Arabi (۰-۹ / ٠-٩), sab.
 *
 * Sirf `\d` par bharosa nahi kiya ja sakta: model Urdu jawab mein aksar Urdu hindse
 * likhta hai, aur `\d` unhen pakarta hi nahi — yani taala khula reh jata.
 */
const DIGITS = /[0-9٠-٩۰-۹]/

/** Raqam ke lafz — hindson ke baghair bhi qeemat likhi ja sakti hai. */
const MONEY_WORDS = [
  'rs',
  'rupee',
  'rupay',
  'pkr',
  'price',
  'rate',
  'روپے',
  'روپیہ',
  'قیمت',
  'ریٹ',
]

/**
 * Kya is jumle mein raqam hai.
 *
 * 🔴 Jaan boojh kar SAKHT: koi bhi hindsa jumle ko girate ke liye kaafi hai. Is se
 * "3 پیس" jaisa be-zarar jumla bhi gir jata hai — aur ye qeemat qubool hai. Do mein se
 * ek ghalti chunni thi: ek achha jumla kho dena, ya ek ghalat raqam chhap jana. Pehli
 * ka nuqsan hamara hai, doosri ka reseller ka.
 */
export function hasAmount(line: string): boolean {
  if (DIGITS.test(line)) return true

  const lower = line.toLowerCase()
  return MONEY_WORDS.some((word) => lower.includes(word))
}

/** Sirf wo jumle jin mein koi raqam nahi. */
export function withoutAmounts(lines: readonly string[]): string[] {
  return lines.filter((line) => !hasAmount(line))
}
