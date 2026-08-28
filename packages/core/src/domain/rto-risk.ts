/**
 * Wapsi (RTO) ka andaza — order QUBOOL karne se PEHLE.
 *
 * 🔴 Ye ilzam nahi, ginti hai. Har number wo hai jo hamare paas pehle se likha hai:
 * kisi ka andaza, koi model, koi "AI" is file mein nahi — aur zaroorat bhi nahi.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Masla kya hai
 *
 * Har wapas aya parcel dukan ka Rs 300+ kha jata hai: courier dono taraf ka kirchaya
 * leta hai aur maal bhi wapas darwaze par aa jata hai. Wo nuqsan reseller nahi uthati,
 * hum nahi uthate — dukan uthati hai. Aur jis lamhe wo faisla karta hai (order qubool
 * karun ya nahi), us waqt us ke paas is ke bare mein kuch bhi nahi hota.
 *
 * `ResellerRiskRecord` ne aadha kaam pehle hi kar diya: "is reseller ka mere saath kya
 * chalan raha". Magar wo POORE reseller ki baat hai — is EK order ki nahi. Do order ek
 * hi reseller ke ho sakte hain aur un mein se ek mehfooz ho aur doosra khatre wala:
 * ek pehle se aazmaye hue customer ka, doosra ek naye number se, aise ilaqe mein
 * jahan se maal wapas aata rehta hai, bina map ke pin ke.
 *
 * Ye file wohi farq nikalti hai.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * 🔴 Faisla phir bhi DUKAN ka hai. Hum order rokte nahi — hum sirf wo dikhate hain jo
 * hamare paas likha hai. Rokna shuru kar dena us din bura sabit hota jis din hisab
 * ghalat hota, aur us din nuqsan reseller ka hota, hamara nahi.
 */

/** Ilaqe ka chalan itne mukammal orders se kam par nahi ginte. */
export const MIN_AREA_SAMPLE = 8

/** Reseller ka chalan itne mukammal orders se kam par nahi ginte. */
export const MIN_RESELLER_SAMPLE = 4

/** `watch` yahan se shuru — is se neeche safhe par kuch nahi dikhta. */
export const WATCH_AT = 20

/** `high` yahan se — yahan dukan ko poochh lene ka mashwara diya jata hai. */
export const HIGH_AT = 45

/**
 * Har order ka apna kachcha maal — ye sab DB mein pehle se mojood hai.
 *
 * Yahan koi "score" nahi aata; sirf ginti. Score is file ke andar banta hai taake us
 * ki wajah ek hi jagah likhi ho aur us ka test ho sake.
 */
export interface OrderRiskInput {
  /** Is order par delivery ka rate — nuqsan ka asal number jo dukan ne khud lagaya hai */
  readonly deliveryFee: number
  /** Order ka kul — bara COD zyada wapas aata hai (banda darwaze par soch badal leta hai) */
  readonly total: number
  /**
   * Map ka pin.
   *
   * 🔴 Schema mein isi khane ke saath likha hai: "RTO ka sab se bara lever". Bina pin
   * ke courier pata dhoondta phirta hai, phone band milta hai, aur parcel wapas.
   */
  readonly hasLocationPin: boolean
  /** ISI customer ke number par pehle kya hua — sab dukanon par milakar */
  readonly customer: { readonly delivered: number; readonly rto: number }
  /** Is ilaqe (`area`) ka chalan — sab dukanon par milakar */
  readonly area: { readonly delivered: number; readonly rto: number }
  /** Is reseller ka chalan ISI dukan ke saath */
  readonly reseller: { readonly delivered: number; readonly rto: number }
  /** Isi dukan ke pichhle orders ka darmiyana total — "bara order" isi se napa jata hai */
  readonly supplierMedianOrder: number
}

export type RiskBand =
  /** Ye customer pehle maal le chuka hai — dukan ko ye batana bhi utna hi kaam ka hai */
  | 'known'
  /** Kuch khaas nahi — safhe par kuch NAHI dikhta */
  | 'quiet'
  /** Dekh lena chahiye */
  | 'watch'
  /** Poochh lena behtar hai */
  | 'high'

/** Wajah — safhe par isi ki bunyad par Urdu/Roman/English lafz chunay jate hain. */
export type RiskReasonCode =
  | 'customerReturned'
  | 'customerKnown'
  | 'areaReturns'
  | 'resellerReturns'
  | 'noPin'
  | 'bigOrder'

export interface RiskReason {
  readonly code: RiskReasonCode
  /** Kitne points is wajah se — manfi ka matlab "ye achhi khabar hai" */
  readonly points: number
  /** Lafzon mein bharne ke liye — faisad, ginti, ya guna */
  readonly value?: number | undefined
}

export interface RtoRisk {
  readonly band: RiskBand
  readonly points: number
  readonly reasons: readonly RiskReason[]
  /** Agar wapas aya to dukan ka seedha nuqsan — sirf wo jo hum WAQAI jante hain */
  readonly costIfReturned: number
}

function rate(row: { delivered: number; rto: number }): { finished: number; pct: number } {
  const finished = row.delivered + row.rto
  return { finished, pct: finished === 0 ? 0 : Math.round((row.rto / finished) * 100) }
}

export function assessRtoRisk(input: OrderRiskInput): RtoRisk {
  const reasons: RiskReason[] = []
  const add = (code: RiskReasonCode, points: number, value?: number): void => {
    reasons.push({ code, points, value })
  }

  /*
   * 1 — CUSTOMER khud. Sab se bhaari, aur dono rukh se.
   *
   * Baqi har signal andaza hai ("aise orders par aksar ye hota hai"). Ye ek cheez isi
   * shakhs ke bare mein hai, is liye is ka wazan sab se zyada hai — dono taraf: jis ne
   * pehle maal wapas kiya us par nishan, aur jis ne pehle le liya us par bharosa.
   *
   * Doosri baat bhi utni hi zaroori hai: wo dukan ko HAAN kehne ki wajah deti hai. Jo
   * safha sirf mana karne ke ishare dikhaye, us par bharosa nahi banta — aur wo safha
   * dukan wala band kar deta hai.
   */
  const customer = rate(input.customer)
  if (input.customer.rto > 0 && input.customer.delivered === 0) {
    add('customerReturned', 45, input.customer.rto)
  } else if (input.customer.rto > 0) {
    add('customerReturned', 20, customer.pct)
  } else if (input.customer.delivered > 0) {
    add('customerKnown', -25, input.customer.delivered)
  }

  /*
   * 2 — ILAQA. Kuch mohalle waqai zyada wapas karte hain (pata adhoora, gali band,
   * courier andar nahi jata). Ye baat kisi ek shakhs ke khilaf nahi jati, is liye is ka
   * wazan customer se kam hai — aur `MIN_AREA_SAMPLE` se kam par bilkul nahi ginte,
   * warna do orders wale naye ilaqe par hamesha laal nishan lag jata.
   */
  const area = rate(input.area)
  if (area.finished >= MIN_AREA_SAMPLE) {
    if (area.pct >= 30) add('areaReturns', 20, area.pct)
    else if (area.pct >= 15) add('areaReturns', 10, area.pct)
  }

  /*
   * 3 — RESELLER ka chalan isi dukan ke saath. Ye safhe par alag se bhi dikhta hai
   * (`ResellerRtoRecord`), is liye yahan ka wazan halka hai — warna ek hi baat do dafa
   * gin li jati aur us reseller ka har order laal ho jata.
   */
  const reseller = rate(input.reseller)
  if (reseller.finished >= MIN_RESELLER_SAMPLE) {
    if (reseller.pct >= 30) add('resellerReturns', 15, reseller.pct)
    else if (reseller.pct >= 15) add('resellerReturns', 8, reseller.pct)
  }

  /*
   * 4 — PIN. Schema is khane ke saath khud likhta hai: "RTO ka sab se bara lever". Aur
   * ye wahid signal hai jo QABIL-E-ILAJ hai — dukan reseller se keh kar pin mangwa
   * sakti hai. Baqi sab par kuch kiya nahi ja sakta, sirf faisla badla ja sakta hai.
   */
  if (!input.hasLocationPin) add('noPin', 12)

  /*
   * 5 — BARA order. COD par bari raqam darwaze par zyada wapas hoti hai: paisa usi
   * waqt jeb se nikalna hota hai. "Bara" ka pemana isi dukan ka apna darmiyana hai,
   * koi mutlaq raqam nahi — kirane wale ka Rs 3,000 bara hai, jeweller ka nahi.
   */
  const median = input.supplierMedianOrder
  if (median > 0) {
    const times = input.total / median
    if (times >= 2.5) add('bigOrder', 15, Math.round(times * 10) / 10)
    else if (times >= 1.5) add('bigOrder', 8, Math.round(times * 10) / 10)
  }

  const points = reasons.reduce((sum, reason) => sum + reason.points, 0)

  /*
   * 🔴 `quiet` par safha kuch NAHI dikhata — aur yahi is poore feature ki sab se ahem
   * qadar hai. Agar har order par nishan lage to wo nishan bemani ho jata hai, aur jis
   * din wo waqai kaam ka hota us din bhi koi nahi dekhta. `ResellerRtoRecord` mein yahi
   * faisla pehle se likha hua hai; ye us se mel khata hai.
   */
  const band: RiskBand =
    points >= HIGH_AT
      ? 'high'
      : points >= WATCH_AT
        ? 'watch'
        : reasons.some((reason) => reason.code === 'customerKnown')
          ? 'known'
          : 'quiet'

  return {
    band,
    points,
    // Bare se chhote ki tarteeb — pehli satar sab se bhaari wajah honi chahiye
    reasons: [...reasons].sort((a, b) => b.points - a.points),
    /*
     * Nuqsan sirf wo jo SACH hai: jane wale parcel par likha hua kirchaya. Asal nuqsan
     * is se zyada hai (wapsi ka kirchaya alag, maal ka waqt alag), magar andaza lagane
     * se behtar hai ke jo maloom hai wohi likha jaye — apne bazaar ka rate dukan wala
     * hum se behtar jaanta hai.
     */
    costIfReturned: input.deliveryFee,
  }
}
