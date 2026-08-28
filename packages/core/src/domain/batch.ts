/**
 * Khep aur maddat — "ye maal kab tak theek hai".
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔴 Khep ginti ka TEESRA paimana NAHI hai — aur ye is poore feature ka sab se ahem
 * faisla hai.
 *
 * Bechne ka rasta pehle se do jagah par khara hai: `ProductVariant.stockQty` (jo atomic
 * shart deta hai aur do resellers ko ek hi aakhri piece bechne se rokta hai) aur
 * `VariantStock` (kis godown mein kitna). Khep ko teesri shart bana dene ka matlab hota
 * ke order lagte waqt ek aur taala lagana pare — aur us raste par har naya taala wo
 * jagah hai jahan ginti manfi mein ja sakti hai.
 *
 * Is liye khep ek NIGRANI ki cheez hai, shart ki nahi:
 *
 *  · Khep kabhi bikri nahi ROKTI. `stockQty` hi wahid darwaza hai.
 *  · Khep ki ginti KAM ho sakti hai (dukan ne har cheez khep ke saath na daali ho) —
 *    aur us soorat mein bhi sab kuch theek chalta hai, bas maddat ka ishara us hissay
 *    par nahi milta.
 *  · Jo faida chahiye tha wo ye hai: "kya cheez maddat khatam hone wali hai", aur wo
 *    isi se mil jata hai.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * 🔴 Aur ye kapre wali dukan par nazar bhi nahi aana chahiye. Lawn ke suit ki koi maddat
 * nahi hoti; wahan maddat ka khana rakhna har dafa ek fazool qadam hai. Jo dukan khep
 * likhti hi nahi, us ke liye ye poora hissa ghayab rehta hai.
 */

/**
 * Itne din pehle se ishara — platform ka apna default.
 *
 * 🔴 Ye `reorderLevel` ki tarah dukan ka apna faisla NAHI hai, aur wo farq soch kar hai:
 * "kitna maal kam hai" har dukan ka apna pemana hota hai, magar "maddat khatam hone wali
 * hai" waqt ka pemana hai — aur customer ke liye wo har dukan par ek jaisa hota hai.
 *
 * Tees din is liye ke Pakistani thok bazaar mein maal reseller se customer tak aksar
 * ek do hafte leta hai. Us se kam waqt ka ishara us waqt aata jab kuch kiya hi na ja
 * sakta ho.
 */
export const EXPIRING_DAYS = 30

const MS_PER_DAY = 86_400_000

export type BatchState =
  /** Maddat guzar chuki — ye maal bikna nahi chahiye */
  | 'expired'
  /** Maddat qareeb hai — pehle ye nikalna chahiye */
  | 'expiring'
  /** Theek hai */
  | 'ok'
  /** Maddat likhi hi nahi gayi — kapra, bartan, waghera */
  | 'noExpiry'

/**
 * Is khep ka kya haal hai.
 *
 * 🔴 Maddat na ho to `noExpiry` — `ok` NAHI. Do alag baatein hain: "dekh liya, theek
 * hai" aur "is cheez par ye sawal banta hi nahi". Dono ko ek keh dene se kapre wali
 * dukan ke saamne bhi maddat ka khana aa jata, jahan us ka koi matlab nahi.
 */
export function batchState(expiryAt: Date | null, now: Date): BatchState {
  if (!expiryAt) return 'noExpiry'

  const days = Math.floor((expiryAt.getTime() - now.getTime()) / MS_PER_DAY)
  if (days < 0) return 'expired'
  return days <= EXPIRING_DAYS ? 'expiring' : 'ok'
}

/** Maddat mein kitne din baqi — guzar chuki ho to manfi. `null` = maddat hai hi nahi. */
export function daysLeft(expiryAt: Date | null, now: Date): number | null {
  if (!expiryAt) return null
  return Math.floor((expiryAt.getTime() - now.getTime()) / MS_PER_DAY)
}

export interface FefoLine {
  readonly id: string
  readonly expiryAt: Date | null
  readonly receivedAt: Date
  readonly qtyLeft: number
}

/**
 * Kaunsi khep pehle nikle — FEFO (First Expired, First Out).
 *
 * 🔴 FIFO (jo pehle aya wo pehle nikle) NAHI. Do khep ho sakti hain jahan baad wali
 * pehle kharab ho — mukhtalif supplier, mukhtalif banane ki tareekh. FIFO us soorat
 * mein wo khep aakhir tak rakhta hai jo pehle mar jati hai, aur wo maal zaya hota hai.
 *
 * Jis khep par maddat likhi hi na ho wo AAKHIR mein — us ka koi waqt nahi guzar raha,
 * aur us se pehle wo nikalna chahiye jis ka guzar raha hai. Barabar hone par purani
 * khep pehle.
 */
export function sortFefo<T extends FefoLine>(batches: readonly T[]): T[] {
  return [...batches]
    .filter((batch) => batch.qtyLeft > 0)
    .sort((a, b) => {
      if (a.expiryAt && b.expiryAt) {
        const byExpiry = a.expiryAt.getTime() - b.expiryAt.getTime()
        if (byExpiry !== 0) return byExpiry
      } else if (a.expiryAt) return -1
      else if (b.expiryAt) return 1

      return a.receivedAt.getTime() - b.receivedAt.getTime()
    })
}

/**
 * Itna maal khepon se nikalna — FEFO tarteeb mein.
 *
 * 🔴 Khep ki ginti kam par jitna mil jaye utna hi. `left` bacha reh jana KHARABI nahi
 * hai: dukan ne shayad sirf kuch maal khep ke saath daala ho, ya purana maal khep banne
 * se pehle ka ho. Bikri phir bhi hoti hai (`stockQty` us ka faisla karta hai) — bas us
 * hissay par maddat ka ishara nahi milta.
 */
export function takeFefo<T extends FefoLine>(
  batches: readonly T[],
  qty: number,
): { readonly taken: { batch: T; qty: number }[]; readonly short: number } {
  const taken: { batch: T; qty: number }[] = []
  let left = qty

  for (const batch of sortFefo(batches)) {
    if (left <= 0) break
    const take = Math.min(batch.qtyLeft, left)
    taken.push({ batch, qty: take })
    left -= take
  }

  return { taken, short: left }
}
