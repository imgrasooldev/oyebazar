/**
 * Beykar pari hui template tasveerein — kaun si mit sakti hai, kaun si nahi.
 *
 * 🔴 Ye faisla khalis mantiq hai aur JAAN BOOJH KAR alag rakha gaya hai.
 *
 * Yahan ghalti ka anjaam wapas nahi aata: ek dafa file mit gayi to reseller ka logo
 * hamesha ke liye gaya, aur us ke saath har wo template jo us par khara tha. Is liye
 * "kya mitana hai" ka faisla storage aur DB se alag hai, aur us ke apne test hain.
 *
 * Do shartein hain, aur DONO lazmi hain:
 *
 *  1. Us file ka pata kisi bhi template ke spec mein na ho. "Kisi bhi" — sirf mojooda
 *     reseller ke nahi. Do reseller ek hi file par nahi hote (key mein reseller ki id
 *     hoti hai), magar ye shart us par khari nahi honi chahiye: kal key ki shakl badli
 *     to ye jaanch khamoshi se ghalat ho jati.
 *
 *  2. File ko bane hue ek muddat guzar chuki ho. Ye sab se ahem hai aur sab se aasani
 *     se bhula di jane wali: editor tasveer FORAN upload karta hai, magar template
 *     baad mein mehfooz hota hai. In do lamhon ke darmiyan wo file kisi spec mein hai
 *     hi nahi — yani us waqt chalne wali safai reseller ki abhi abhi lagayi hui tasveer
 *     mita degi, us ke saamne. Muddat ke baghair ye safai bug hai, feature nahi.
 */

/** Storage se aane wali ek file — jitna is faisle ko chahiye, us se zyada kuch nahi. */
export type StoredAsset = {
  readonly key: string
  readonly url: string
  readonly createdAt: Date
}

/**
 * Kitni purani file par haath dala ja sakta hai.
 *
 * Saat din: ek editing session ghanton ka ho sakta hai, aur reseller tasveer daal kar
 * "baad mein mukammal karti hoon" par safha chhor sakti hai. Sasta faisla ye hai ke
 * intezar lamba rakhen — ek hafte ki chand kilobytes ka kharcha ek reseller ka logo
 * kho dene se hamesha kam hai.
 */
export const ASSET_GRACE_DAYS = 7

export type SweepInput = {
  readonly assets: readonly StoredAsset[]
  /** Har template ke spec mein mojood tasveeron ke pate. */
  readonly referencedUrls: ReadonlySet<string>
  readonly now: Date
  readonly graceDays?: number
}

/**
 * Kaun si files mitayi ja sakti hain.
 *
 * Wapas aane wali list HAMESHA un dono shartein par poori utarti hai. Caller ko is se
 * aage koi jaanch nahi karni — aur na hi karni chahiye, warna asli shart do jagah
 * bant jati hai.
 */
export function orphanedAssets(input: SweepInput): StoredAsset[] {
  const graceMs = (input.graceDays ?? ASSET_GRACE_DAYS) * 24 * 60 * 60 * 1000
  const cutoff = input.now.getTime() - graceMs

  return input.assets.filter((asset) => {
    if (input.referencedUrls.has(asset.url)) return false
    // `getTime()` NaN de sakta hai agar tareekh mashkook ho — us soorat mein haath na lagayen
    const created = asset.createdAt.getTime()
    if (!Number.isFinite(created)) return false
    return created < cutoff
  })
}
