/**
 * Maal ka hisab — lagat, sehat, aur qeemat.
 *
 * 🔴 Ye teenon hisab jaan boojh kar query se BAHAR hain (jaise `supplier-rating.ts` aur
 * `rto-risk.ts`). Wajah ek hi hai: teenon dukan wale ke paison ke bare mein hain. "Aap
 * ke maal ki qeemat Rs 4,20,000 hai" par wo apna faisla karta hai — aur agar wo number
 * kisi SQL ke andar bana ho to na koi us ka test likh sakta hai, na koi ye bata sakta
 * hai ke wo aya kahan se.
 */

/**
 * Nayi aosat lagat — purana maal aur naya maal milane par.
 *
 * 🔴 Aosat (weighted average), FIFO nahi. Wajah ye hai ke thok bazaar mein maal bori
 * aur than ke hisab se milta hai, alag alag rate par, aur dukan wala unhen alag alag
 * nahi rakhta — sab ek hi dher mein chala jata hai. FIFO ka matlab hota ke hum har
 * khep ko alag ginte rahen, jab ke dukan par wo alag hai hi nahi. Jo hisab dukan ki
 * haqiqat se mel na khata ho, wo kaghaz par sahi aur zameen par ghalat hota hai.
 *
 * 🔴 Jis maal ki lagat pehle kabhi nahi batayi gayi (`currentAvg === 0`), us par purana
 * maal aosat mein BILKUL shamil nahi hota — warna 20 puraane piece "sifar rupay ke"
 * gine jate aur nayi lagat aadhi ho kar nikalti. Us soorat mein sirf nayi khep ki
 * lagat hi sach hai.
 */
export function nextAvgCost(input: {
  /** Abhi ki aosat lagat — 0 ka matlab "kabhi batayi hi nahi" */
  readonly currentAvg: number
  /** Abhi kitna maal para hai */
  readonly currentQty: number
  /** Nayi khep kitni */
  readonly incomingQty: number
  /** Nayi khep ka ek piece kitne ka — 0/undefined = dukan ne batayi hi nahi */
  readonly incomingUnitCost: number | null | undefined
}): number {
  const incoming = input.incomingUnitCost ?? 0

  // Nayi khep ki lagat na batayi ho to purani aosat jyun ki tyun rehti hai
  if (incoming <= 0 || input.incomingQty <= 0) return input.currentAvg

  // Purani lagat maloom hi nahi — sirf nayi khep par bharosa
  if (input.currentAvg <= 0 || input.currentQty <= 0) return incoming

  const total = input.currentAvg * input.currentQty + incoming * input.incomingQty
  return Math.round(total / (input.currentQty + input.incomingQty))
}

export type StockHealth =
  /** Khatam — reseller ko dikhna band ho jata hai */
  | 'out'
  /** Dukan ki apni hadd se neeche — "manga lein" */
  | 'low'
  /** Theek hai */
  | 'ok'

/**
 * Maal ki sehat — dukan ki APNI hadd par, hamare andaze par nahi.
 *
 * 🔴 `reorderLevel === 0` ka matlab "ishara band" hai, "hadd sifar hai" nahi. Kirane
 * wale ke liye 50 bori kam hai aur jeweller ke liye 2 set bohat; koi ek muqarrar number
 * aadhon ko rozana bekar ka ishara bhejta aur baqi aadhon ko kabhi kuch na batata — aur
 * jo ishara rozana bekar aata ho, us ka dekha jana usi din khatam ho jata hai.
 */
export function stockHealth(stockQty: number, reorderLevel: number): StockHealth {
  if (stockQty <= 0) return 'out'
  if (reorderLevel > 0 && stockQty <= reorderLevel) return 'low'
  return 'ok'
}

/**
 * Is cheez ka para hua maal kitne ka hai.
 *
 * 🔴 Lagat maloom na ho to `null` — sifar NAHI. "Rs 0" parhne wala samajhta hai ke us ka
 * maal bekaar hai; `null` par hum kuch kehte hi nahi, jo sach hai. Yehi faisla `stars`
 * par bhi hai: jo maloom nahi wo likhna nahi.
 */
export function stockValue(stockQty: number, avgCost: number): number | null {
  if (avgCost <= 0 || stockQty <= 0) return null
  return stockQty * avgCost
}

/**
 * Poori dukan ke maal ki qeemat — aur us ke saath ye ke kitne par bharosa kiya ja sakta.
 *
 * 🔴 `covered` isi liye hai. Bina us ke ek hi number nazar aata ("Rs 4,20,000") aur
 * dukan wala samajhta ke ye us ka POORA maal hai — halanke wo sirf us hissay ka hai
 * jis ki lagat us ne khud batayi. Jis din wo farq chhupa hua rahega, us din ye number
 * faisla karne ke qabil nahi rahega.
 */
export function stockValuation(
  lines: readonly { readonly stockQty: number; readonly avgCost: number }[],
): { value: number; covered: number; total: number } {
  let value = 0
  let covered = 0
  let total = 0

  for (const line of lines) {
    if (line.stockQty <= 0) continue
    total += line.stockQty
    if (line.avgCost > 0) {
      value += line.stockQty * line.avgCost
      covered += line.stockQty
    }
  }

  return { value, covered, total }
}
