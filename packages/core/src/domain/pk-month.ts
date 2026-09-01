/**
 * Mahine ki hadd — PAKISTAN ke waqt se, UTC se nahi.
 *
 * 🔴 Ye ek asli, dekhi hui kharabi ka hal hai. 1 September ki subah ops ka Money safha
 * kholne par "Ready to invoice · 2026-07" likha aata tha — do mahine peechay. Wajah ye
 * thi ke mahina `getUTCMonth()` se nikalta tha: Pakistan mein 1 September ki subah 4
 * baje UTC par abhi 31 August hi hota hai, is liye "pichhla mahina" July ban jata tha.
 *
 * Nateeja sirf ek ghalat unwan nahi tha: `generateMonthlyInvoices()` usi hadd par
 * chalta hai. Job agar us paanch ghanton ki khirki mein chal jaye to wo GHALAT mahine
 * ka bill banata — aur us par kisi ko shak bhi na hota, kyunke jawab hamesha "kuch
 * pending nahi" hota.
 *
 * Poora karobar Pakistan mein hai. "Is mahine ki kamai" ka matlab wohi hai jo dukan
 * wale ke calendar par hai.
 */

/**
 * Pakistan UTC+5 par hai — saara saal.
 *
 * 🔴 DST ki koi guinjaish nahi rakhi gayi aur ye jaan boojh kar hai: Pakistan ne 2009
 * mein DST khatam kar diya tha. `Intl` ke zariye timezone hal karna zyada "sahi" lagta
 * hai magar wo har hisab ko us data par khara kar deta jo runtime ke saath badalta hai
 * — aur paison ke hisab ke liye ek sada, na badalne wala adad behtar hai.
 */
export const PK_OFFSET_MS = 5 * 60 * 60 * 1000

/** Pakistan ke calendar ka mahina — `2026-08`. */
export function pkMonthKey(at: Date): string {
  const shifted = new Date(at.getTime() + PK_OFFSET_MS)
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, '0')}`
}

/**
 * Pakistan ke mahine ki shuruaat — magar wapas UTC ke lamhe ke tor par.
 *
 * `offset` se aage peechay ka mahina milta hai: `0` = mojooda, `-1` = pichhla.
 *
 * 🔴 Jo wapas aata hai wo ek LAMHA hai, tareekh nahi: 1 August ki raat 12 baje
 * Pakistan mein = 31 July 19:00 UTC. DB mein har waqt UTC mein hai, is liye chhanni
 * bhi usi lamhe par lagni chahiye — warna har mahine ke doosre kinare par paanch
 * ghante ke order ghalat mahine mein gin liye jate hain.
 */
export function pkMonthStart(at: Date, offset = 0): Date {
  const shifted = new Date(at.getTime() + PK_OFFSET_MS)
  const utcMidnight = Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth() + offset, 1)
  return new Date(utcMidnight - PK_OFFSET_MS)
}
