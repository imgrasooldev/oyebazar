/**
 * Dukan ke sitare — reseller ki raye se.
 *
 * 🔴 Ye hisaab JAAN BOOJH KAR alag rakha gaya hai, taake us ke apne test ho saken.
 *
 * Yahan ka har number kisi ki rozi par asar daalta hai: sitare kam honge to us dukan se
 * order kam aayenge. Aisi cheez kisi query ke andar chhupi hui nahi honi chahiye — wo
 * saamne honi chahiye, us ki wajah ke saath.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Teen sawal — aur teenon ka wazan BARABAR hai:
 *
 *   1. Maal kaisa nikla        (quality)
 *   2. Baat karne mein kaisa   (communication)
 *   3. Commission waqt par     (payoutOnTime)
 *
 * Barabar wazan is liye ke teenon reseller ke liye alag alag tarah se faisla-kun hain,
 * aur un mein se kisi ko halka kehna hamara faisla nahi hona chahiye. Jis reseller ke
 * liye paisa waqt par milna sab se ahem hai, wo khud "commission" ka number dekh legi —
 * teenon alag alag bhi dikhte hain, sirf un ka jorh nahi.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * Itni raye se kam par sitare NAHI dikhte.
 *
 * 🔴 Teen — aur ye sab se ahem qadar hai is poori file mein.
 *
 * Ek naraz reseller ki ek raye par "1 sitara" chhaap dena us dukan ka karobar khatam
 * kar dena hai, aur wo bhi ek shakhs ki ek raat ki baat par. Isi tarah ek dost ki ek
 * raye par "5 sitare" dikhana un sab reseller ke saath dhoka hai jo us par bharosa kar
 * ke order karengi.
 *
 * Us waqt tak "abhi kaafi raye nahi" likhna sach bhi hai aur insaaf bhi — aur reseller
 * ke liye zyada kaam ka bhi, kyunke wo jaan leti hai ke usay khud parakhna paregi.
 */
export const MIN_REVIEWS_FOR_STARS = 3

/** Har sawal ka jawab 1 se 5 — is se bahar kuch qubool nahi. */
export const RATING_MIN = 1
export const RATING_MAX = 5

export type ReviewScores = {
  readonly quality: number
  readonly communication: number
  readonly payoutOnTime: number
}

export type SupplierRating = {
  readonly count: number
  /** 1–5, ek dashmalav tak. `null` = abhi kaafi raye nahi. */
  readonly stars: number | null
  /** Har sawal alag — jorh se zyada kaam ki cheez. `null` jab tak kaafi raye na hon. */
  readonly quality: number | null
  readonly communication: number | null
  readonly payoutOnTime: number | null
}

function average(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

/** Ek dashmalav — "4.3" parha jata hai, "4.2857142857" nahi. */
function round1(value: number): number {
  return Math.round(value * 10) / 10
}

export function supplierRating(reviews: readonly ReviewScores[]): SupplierRating {
  if (reviews.length < MIN_REVIEWS_FOR_STARS) {
    return {
      count: reviews.length,
      stars: null,
      quality: null,
      communication: null,
      payoutOnTime: null,
    }
  }

  const quality = average(reviews.map((r) => r.quality))
  const communication = average(reviews.map((r) => r.communication))
  const payoutOnTime = average(reviews.map((r) => r.payoutOnTime))

  return {
    count: reviews.length,
    stars: round1(average([quality, communication, payoutOnTime])),
    quality: round1(quality),
    communication: round1(communication),
    payoutOnTime: round1(payoutOnTime),
  }
}

/**
 * Kis mahine ki raye hai — `YYYY-MM`.
 *
 * 🔴 Ye qadar DB ke unique index mein jati hai, is liye us ka banna har jagah bilkul ek
 * jaisa hona chahiye. Isi liye ye ek hi jagah likha hai aur `getUTCMonth` par khara hai,
 * server ke waqt par nahi: server ka waqt badal sakta hai (region, DST), aur us soorat
 * mein ek hi mahine ki do alag qadrein ban jatin — yani hadd chupke se toot jati.
 */
export function reviewPeriod(at: Date): string {
  const month = String(at.getUTCMonth() + 1).padStart(2, '0')
  return `${at.getUTCFullYear()}-${month}`
}
