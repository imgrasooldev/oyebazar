/**
 * Reseller ke paise — wholesaler ke haath mein aaye COD ka us ka hissa.
 *
 * 🔴 Hum paise ke beech mein nahi hain, is liye hum "bhej diya" ko dekh nahi sakte.
 * Ye port isi haqiqat par bana hai: har row ke do alag khaane hain — ek wholesaler ka
 * dawa, ek reseller ki tasdeeq — aur hisab tabhi band hota hai jab dono milen.
 */
import type { PayoutAccount } from '../domain/payout-account'
import type { Pkr } from '@oyebazar/shared'

export type PayoutStatus = 'PENDING' | 'SENT' | 'SETTLED' | 'DISPUTED'

export interface PayoutView {
  readonly id: string
  readonly orderId: string
  readonly orderNo: string
  readonly resellerId: string
  readonly supplierId: string
  readonly amount: Pkr
  /** Us waqt ki shart ka snapshot — der isi se napi jati hai */
  readonly termDays: number
  readonly status: PayoutStatus
  readonly sentAt: Date | null
  readonly sentReference: string | null
  /** Bhejne ki tasveer — marzi ka; hamari apni storage ka URL, ya null */
  readonly sentProofUrl: string | null
  readonly confirmedAt: Date | null
  readonly disputedAt: Date | null
  readonly disputeNote: string | null
  readonly createdAt: Date
}

/**
 * Jis reseller ko paisa bhejna hai — naam aur khata, ek jagah.
 *
 * 🔴 Ye poora khata hai, masked nahi. Masked number se paisa bhejna mumkin nahi, aur
 * yehi is safhe ka wahid maqsad hai. Hifazat masking se nahi, QUERY se aati hai
 * (`payoutTargets`): dukan wo khata dekhti hai jis par us ka apna payout khara hai,
 * aur koi doosra nahi.
 */
export interface ResellerPayoutTarget {
  readonly resellerId: string
  readonly name: string
  /** `null` = reseller ne abhi khata diya hi nahi — aur ye dukan ko SAAF dikhna chahiye */
  readonly account: PayoutAccount | null
  /**
   * Khata kab badla.
   *
   * 🔴 Ye dukan ko bhi dikhta hai aur jaan boojh kar: jis khate mein pichhle mahine
   * paisa gaya tha wo agar KAL badla hai, to dukan wale ko ye jaanna chahiye — chahe
   * wajah jaiz hi kyun na ho. Jhagra "maine to bhej diya tha" par hota hai, aur us ka
   * jawab yehi tareekh hoti hai.
   */
  readonly accountUpdatedAt: Date | null
}

/** Admin ki screen — kis dukan ne kitna rok rakha hai aur kitne din se. */
export interface SupplierPayoutSummary {
  readonly supplierId: string
  readonly businessName: string
  readonly supplierPhone: string
  readonly pendingCount: number
  readonly pendingAmount: Pkr
  readonly disputedCount: number
  /** Sab se purani baqi row kitne din purani hai — asal khatray ka pemana */
  readonly oldestPendingDays: number
}

export interface PayoutRepository {
  create(input: {
    orderId: string
    resellerId: string
    supplierId: string
    amount: Pkr
    termDays: number
  }): Promise<void>

  /**
   * Dukan ka apna waada — parhna aur likhna.
   *
   * Ye Supplier ki row par hai magar port yahan hai: is ka wahid maqsad payout ki der
   * napna hai, aur us ke saath rehne se ye baat sab ko nazar aati hai.
   */
  supplierTerm(supplierId: string): Promise<number>
  setSupplierTerm(supplierId: string, days: number): Promise<void>

  findByOrderId(orderId: string): Promise<PayoutView | null>

  /**
   * 🔴 supplierId/resellerId shart mein hai, sirf id kaafi nahi — warna kisi doosre
   * ka payout us ki id jaan kar band kiya ja sakta hai.
   */
  /**
   * Un resellers ke khate jin par IS dukan ka koi payout hai.
   *
   * 🔴 `supplierId` shart mein hai aur wohi is method ki poori hifazat hai. Reseller
   * ka khata us ka apna maal hai; dukan usay is liye dekhti hai ke us par paisa bhejna
   * hai — aur bas usi hadd tak. Koi "sab resellers ke khate" wali query nahi hai, aur
   * na honi chahiye.
   */
  payoutTargets(supplierId: string): Promise<readonly ResellerPayoutTarget[]>

  findForSupplier(supplierId: string, payoutId: string): Promise<PayoutView | null>
  findForReseller(resellerId: string, payoutId: string): Promise<PayoutView | null>

  /*
   * 🔴 Teenon `boolean` lautati hain: kya row WAQAI badli.
   *
   * Pehle ye `void` thin aur service apna farz kiya hua natija wapas kar deti thi.
   * Nateeja: reseller ne aisi row par "mil gaye" dabaya jise repository ne chhua tak
   * nahi (halat ijazat nahi deti thi), aur API ne phir bhi "SETTLED" keh diya — jab ke
   * DB mein wo abhi tak baqi thi. Ab jhoot bolna type-level par mushkil hai.
   */

  /** Wholesaler ka dawa: bhej diye. */
  markSent(payoutId: string, reference: string, at: Date, proofUrl?: string | undefined): Promise<boolean>
  /** Reseller ki tasdeeq: mil gaye. */
  markConfirmed(payoutId: string, at: Date): Promise<boolean>
  /** Reseller: nahi mile. */
  markDisputed(payoutId: string, note: string, at: Date): Promise<boolean>
  /** Ops ka faisla — dono ke beech phansne par. */
  resolve(input: {
    payoutId: string
    status: Extract<PayoutStatus, 'SETTLED' | 'PENDING'>
    opsUserId: string
    note: string
    at: Date
  }): Promise<void>

  /**
   * Ek mahine ka hisab — statement ke liye.
   *
   * Scope mein ya reseller hai ya supplier: dono ek hi query se aate hain taake ek hi
   * mahine ka statement dono taraf BILKUL ek jaise numbers dikhaye. Do alag query hotin
   * to ek din un mein farq aa jata — aur us din statement ka poora maqsad khatam.
   */
  listForPeriod(
    scope: { resellerId?: string; supplierId?: string },
    from: Date,
    to: Date,
  ): Promise<PayoutView[]>

  listForSupplier(supplierId: string, status?: PayoutStatus): Promise<PayoutView[]>
  listForReseller(resellerId: string, status?: PayoutStatus): Promise<PayoutView[]>

  /** Reseller ke dashboard ka jama: kitna mil chuka, kitna aana baqi hai. */
  totalsForReseller(resellerId: string): Promise<{ settled: Pkr; awaiting: Pkr }>

  summariseBySupplier(): Promise<SupplierPayoutSummary[]>

  /**
   * Wo rows jin par dukan ne kuch nahi kiya aur US KA APNA waada guzar chuka hai.
   *
   * 🔴 Ek tay-shuda tareekh se nahi chhanti ja saktin: har row ki apni shart hai, is
   * liye hadd har row ke apne `termDays` se banti hai.
   */
  listOverduePending(now: Date): Promise<PayoutView[]>

  /**
   * Wo raqmein jin par dukan keh chuki hai "bhej diye" — magar reseller ne tasdeeq nahi ki.
   *
   * 🔴 Ye baqaya se ALAG soorat hai, aur zyada khatarnak. Baqaya par dono jante hain ke
   * paisa aana baqi hai. Yahan dukan samajhti hai ke hisab band ho gaya, aur reseller ke
   * khaate mein wo raqam abhi tak khuli pari hai. Beech ka farq jitna barhta jata hai,
   * jhagra utna hi mushkil hota jata hai — aur `sentReference` (TID) bhi utna hi purana.
   *
   * @param before is tareekh se pehle "bheja gaya" — us se nayi qataren abhi intezar ke qabil hain
   */
  listUnconfirmedSent(before: Date): Promise<PayoutView[]>
}
