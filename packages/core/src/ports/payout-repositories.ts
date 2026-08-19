/**
 * Reseller ke paise — wholesaler ke haath mein aaye COD ka us ka hissa.
 *
 * 🔴 Hum paise ke beech mein nahi hain, is liye hum "bhej diya" ko dekh nahi sakte.
 * Ye port isi haqiqat par bana hai: har row ke do alag khaane hain — ek wholesaler ka
 * dawa, ek reseller ki tasdeeq — aur hisab tabhi band hota hai jab dono milen.
 */
import type { Pkr } from '@oyebazar/shared'

export type PayoutStatus = 'PENDING' | 'SENT' | 'SETTLED' | 'DISPUTED'

export interface PayoutView {
  readonly id: string
  readonly orderId: string
  readonly orderNo: string
  readonly resellerId: string
  readonly supplierId: string
  readonly amount: Pkr
  readonly status: PayoutStatus
  readonly sentAt: Date | null
  readonly sentReference: string | null
  readonly confirmedAt: Date | null
  readonly disputedAt: Date | null
  readonly disputeNote: string | null
  readonly createdAt: Date
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
  }): Promise<void>

  findByOrderId(orderId: string): Promise<PayoutView | null>

  /**
   * 🔴 supplierId/resellerId shart mein hai, sirf id kaafi nahi — warna kisi doosre
   * ka payout us ki id jaan kar band kiya ja sakta hai.
   */
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
  markSent(payoutId: string, reference: string, at: Date): Promise<boolean>
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
   * Wo rows jin par wholesaler ne abhi tak kuch nahi kiya aur din guzar chuke hain —
   * inhi par yaad-dihani jati hai.
   */
  listOverduePending(olderThan: Date): Promise<PayoutView[]>
}
