/**
 * Ek number ka record — poore platform par.
 *
 * 🔴 Ye is karobar ki sab se qeemti cheez hai, aur wajah ye hai ke isay koi aur bana hi
 * nahi sakta.
 *
 * Pakistan mein COD ka sab se bara qatil RTO hai. Ek akeli reseller kabhi nahi jaan
 * sakti ke jis number par wo maal bhej rahi hai, us par pehle bhi teen parcel wapas aa
 * chuke hain — kyunke wo teen parcel KISI AUR reseller ne bheje the. Magar platform ke
 * paas sab ke order hain.
 *
 * Bhejne se pehle ek jumla — "is number ka record acha nahi, advance lein" — seedha RTO
 * girata hai. Aur RTO girna sirf reseller ka faida nahi: fee sirf POHANCHE hue order par
 * banti hai (`FeeLedger.earnedAt`), yani hamari apni aamdani bhi wahin barhti hai.
 */

/**
 * Itne mukammal order ke baad hi kuch kaha jata hai.
 *
 * 🔴 Ek wapsi kisi ka record nahi banati. Parcel courier ki ghalti se bhi wapas aata
 * hai, ghalat pate se bhi, aur us din se bhi jab customer ghar par na mile. Us ek wapsi
 * par kisi ko "bura" keh dena us shakhs ka aage ka har order marna hai — aur wo faisla
 * hum ne us ke baare mein diya hoga jo kabhi hamare saamne aaya hi nahi.
 *
 * Teen ki hadd wohi hai jo dukan ke sitaron par hai (`MIN_REVIEWS_FOR_STARS`). Do jagah
 * do alag hadd rakhne ka matlab hota ke ek jagah "kaafi" ka matlab doosri jagah kuch aur
 * ho.
 */
export const MIN_ORDERS_FOR_PHONE_SIGNAL = 3

/**
 * Is se upar RTO ho to reseller ko batana chahiye.
 *
 * 🔴 40% — aur ye jaan boojh kar OONCHA hai. Pakistan mein COD ka aam RTO 25–35% hai;
 * agar hum us par bhi warning dete to wo har doosre order par chamakti aur reseller usay
 * dekhna hi chhor deti. Jo ishara har waqt jalta ho wo ishara nahi rehta.
 */
export const PHONE_RISK_THRESHOLD = 40

export interface PhoneOutcome {
  readonly delivered: number
  readonly returned: number
}

export interface PhoneRecord {
  /** Kitne parcel pohanche */
  readonly delivered: number
  /** Kitne wapas aaye */
  readonly returned: number
  /**
   * Wapsi ka feesad — ya `null` jab tak kaafi order na hon.
   *
   * 🔴 `null` ka matlab "hum nahi jaante" hai, "acha hai" nahi. UI ko dono ko alag
   * dikhana chahiye: khamoshi tasalli nahi hoti.
   */
  readonly rtoRate: number | null
  /** Reseller ko batana chahiye ya nahi */
  readonly risky: boolean
}

export function phoneRecord(outcome: PhoneOutcome): PhoneRecord {
  const total = outcome.delivered + outcome.returned

  if (total < MIN_ORDERS_FOR_PHONE_SIGNAL) {
    return { delivered: outcome.delivered, returned: outcome.returned, rtoRate: null, risky: false }
  }

  const rtoRate = Math.round((outcome.returned / total) * 100)

  return {
    delivered: outcome.delivered,
    returned: outcome.returned,
    rtoRate,
    risky: rtoRate >= PHONE_RISK_THRESHOLD,
  }
}

/**
 * Number ko ek hi shakl mein — record isi par jama hota hai.
 *
 * 🔴 Bina is ke `03001234567` aur `+923001234567` do alag log ban jate hain, aur record
 * kabhi jama hi nahi hota — yani feature bana rehta hai aur kuch batata kabhi nahi.
 */
export function phoneKey(raw: string): string {
  const digits = raw.replace(/\D/g, '')

  if (digits.startsWith('92') && digits.length === 12) return digits
  if (digits.startsWith('0') && digits.length === 11) return `92${digits.slice(1)}`
  if (digits.startsWith('3') && digits.length === 10) return `92${digits}`

  return digits
}
