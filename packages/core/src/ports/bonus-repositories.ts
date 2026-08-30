/**
 * Bonus ka daftar — platform ka apna kharcha.
 *
 * 🔴 `PayoutRepository` se ALAG, aur dono ka alag rehna lazmi hai. Payout dukan ka paisa
 * hai jo us ne wasool kiya aur reseller ko dena hai; bonus hamara kharcha hai. Ek hi
 * jagah rakhne ka matlab ye hota ke koi din "reseller ko kitna dena hai" ka jawab do
 * alag jeb milaa kar deta — aur jis din wo hisab bigarta, us din pata hi na chalta ke
 * paisa kis ka tha.
 */
export type BonusKind = 'SIGNUP' | 'REFERRAL'
export type BonusStatus = 'PENDING' | 'PAID'

export interface BonusView {
  readonly id: string
  readonly resellerId: string
  readonly kind: BonusKind
  readonly amount: number
  readonly orderNo: string
  readonly status: BonusStatus
  readonly createdAt: Date
}

/** Ops ki screen — kis ko kitna dena hai, aur kis number par. */
export interface PendingBonusRow extends BonusView {
  readonly resellerName: string
  readonly resellerPhone: string
}

export interface BonusRepository {
  /**
   * Bonus kholo — aur DOBARA chalne par kuch na ho.
   *
   * 🔴 `false` ka matlab "pehle se mojood tha", ghalti nahi. Ye rasta `afterDelivered`
   * se chalta hai, aur wo dobara chal sakta hai (ops ne halat wapas ki, koi qadam
   * dobara hua). Us par doosra bonus khol dena hamara paisa do dafa dene ke barabar
   * hai — aur wo ghalti kisi ko nazar nahi aati, kyunke dono qatarein bilkul theek
   * dikhti hain.
   *
   * Rukawat DB par hai (unique index), yahan ki jaanch par nahi: do request ek saath
   * aa jayen to sirf DB hi unhen rok sakta hai.
   */
  open(input: {
    resellerId: string
    kind: BonusKind
    amount: number
    orderId: string
    /** Sirf REFERRAL par — kis nayi behen ki wajah se */
    fromResellerId?: string | undefined
  }): Promise<boolean>

  /** Is reseller ka kitna bana, aur kitna abhi baqi hai. */
  totalsFor(resellerId: string): Promise<{ earned: number; pending: number }>

  /** Ops: jo dena baqi hai — sab se purana pehle. */
  listPending(limit: number): Promise<readonly PendingBonusRow[]>

  /**
   * "De diya" — TID ke saath.
   *
   * 🔴 Reference lazmi hai, bilkul waise jaise payout par. Jhagre mein "de diya tha"
   * dono taraf se aata hai; TID ek taraf se aata hai.
   */
  markPaid(bonusId: string, reference: string, at: Date): Promise<boolean>
}
