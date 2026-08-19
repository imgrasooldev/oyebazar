/**
 * Paison ki poori tafseel — dono taraf, ek hi shakl mein.
 *
 * `PayoutRepository` ek row ka hisab rakhti hai (ek order, ek raqam, ek halat). Ye us
 * se alag sawal ka jawab deti hai: **"falan ke saath mera kul kya hisab hai?"**
 *
 * Reseller poochhti hai: kis dukan se kitne order kiye, kitna kamaya, kitna mila,
 * kitna baqi hai. Wholesaler wohi sawal ulta poochhta hai: kis reseller ke kitne order
 * aaye, us ka kitna dena hai, kitna de chuka.
 *
 * 🔴 Order ki ginti aur paison ki ginti ALAG hain aur dono chahiyen. Payout ki row sirf
 * pohanche hue order par banti hai — sirf usi se ginen to reseller ko lagta hai ke us ke
 * aadhe order gum ho gaye (jo raste mein hain ya wapas aa gaye, wo kahin dikhte hi nahi).
 */
import type { Pkr } from '@oyebazar/shared'

/** Ek jorhe ka poora hisab — chahe wo dukan ho ya reseller. */
export interface CounterpartyLedgerRow {
  readonly id: string
  /** Dukan ka naam ya reseller ka naam */
  readonly name: string
  /** Sheher — do ek jaise naam alag karne ke liye */
  readonly city: string

  // ---- order ki ginti
  readonly ordersTotal: number
  readonly ordersDelivered: number
  /** Abhi chal rahe hain — na pohanche, na mare */
  readonly ordersRunning: number
  /** Mansookh, mana kiya gaya, ya wapas aa gaya — in par kisi ka kuch nahi banta */
  readonly ordersLost: number

  // ---- paise
  /** Pohanche hue orders par bana hua kul hissa (SETTLED + baqi) */
  readonly earned: Pkr
  readonly received: Pkr
  /** Jo abhi aana hai — dawa ho chuka ho ya na hua ho */
  readonly awaiting: Pkr
  readonly disputedCount: number
  /** Sab se purani baqi row kitne din purani hai — 0 agar kuch baqi nahi */
  readonly oldestAwaitingDays: number
  /** Aakhri order kab hua — khamosh ho chuke rishte pehchanne ke liye */
  readonly lastOrderAt: Date | null
}

export interface MoneyLedgerRepository {
  /** Reseller ka hisab — har wholesaler ke saath alag. */
  bySupplierForReseller(resellerId: string): Promise<CounterpartyLedgerRow[]>

  /** Wholesaler ka hisab — har reseller ke saath alag. */
  byResellerForSupplier(supplierId: string): Promise<CounterpartyLedgerRow[]>

  /**
   * Wholesaler ke zimme HAMARI fee ka hisab.
   *
   * Ye reseller wale paison se bilkul alag cheez hai aur dukan wale ki screen par dono
   * ka farq saaf hona chahiye: ek reseller ko dena hai, doosra humein.
   */
  platformFeeForSupplier(supplierId: string): Promise<{
    readonly earned: Pkr
    readonly invoiced: Pkr
    readonly collected: Pkr
  }>
}
