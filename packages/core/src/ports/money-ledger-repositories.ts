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

/**
 * Dukan ka payment record — "ye paise waqt par deti hai ya nahi".
 *
 * 🔴 Ye reseller ko ORDER LAGANE SE PEHLE dikhta hai. Baqi sab hisab us waqt kaam aata
 * hai jab paisa atak chuka hota hai; ye us se pehle wali jagah hai — wahi jagah jahan
 * faisla hota hai. Ek dukan ko waqt par paise dene par yehi cheez majboor karti hai,
 * kyunke us ka seedha asar us ke order par parta hai.
 */
export interface SupplierPaymentRecord {
  readonly supplierId: string
  /** Kul kitne hisab bane (pohanche hue order) */
  readonly total: number
  /** Kitne band ho chuke — reseller ki tasdeeq ke saath */
  readonly settled: number
  /** Abhi baqi */
  readonly open: number
  /**
   * Band hone mein aosat kitne din lage — sirf settled rows par.
   * null jab tak ek bhi hisab band na hua ho (naya banda, koi record nahi).
   */
  readonly avgDaysToSettle: number | null
  /** Sab se purana baqaya kitne din ka hai */
  readonly oldestOpenDays: number
  readonly disputed: number
  /**
   * Dukan ka apna waada — delivery ke kitne din baad.
   *
   * Ye record ke SAATH dikhta hai, us ki jagah nahi: waada akela sasti baat hai, aur
   * record akela bina pemane ke. "Waada 3 din · asal aosat 2.4" ek jumle mein sab keh
   * deta hai — aur "waada 3 din · asal 11 din" bhi.
   */
  readonly promisedDays: number
}

/**
 * Jhagre ki poori tasveer — sirf ops ke liye.
 *
 * 🔴 Yahan dono ke ASLI naam hain. Ops ko faisla karna hai, aur wo bina ye jaane nahi
 * ho sakta ke kaun kis ke saath uljha hua hai. Yehi wajah hai ke ye method reseller ya
 * supplier ki kisi service se nahi bulai jati.
 */
export interface DisputedPayoutRow {
  readonly id: string
  readonly orderNo: string
  readonly amount: Pkr
  readonly supplierName: string
  readonly supplierPhone: string
  readonly resellerName: string
  readonly resellerPhone: string
  /** Wholesaler ka dawa — TID */
  readonly sentReference: string | null
  readonly sentAt: Date | null
  /** Reseller ki baat */
  readonly disputeNote: string | null
  readonly disputedAt: Date | null
  readonly createdAt: Date
}

/**
 * Reseller ka RTO record — wholesaler ko order QUBOOL karne se pehle.
 *
 * 🔴 RTO ka nuqsan dukan uthati hai: courier dono taraf ka paisa leta hai aur maal wapas
 * aa jata hai. Abhi wo nuqsan kisi ke hisab mein nahi tha, aur dukan wale ke paas order
 * qubool karte waqt koi ishara bhi nahi hota tha.
 *
 * Ye ilzam nahi, ginti hai — aur wahi jagah hai jahan us ka faida hai: order aane par.
 */
export interface ResellerRiskRecord {
  readonly resellerId: string
  /** Is dukan ke saath kul order (chal rahe milakar) */
  readonly orders: number
  readonly delivered: number
  readonly rto: number
  /** Pohanche + wapas aaye mein se kitne wapas aaye — 0 jab tak koi mukammal na ho */
  readonly rtoRate: number | null
  /**
   * Un wapas aaye orders par likha hua delivery ka rate — yani wo raqam jo dukan ne
   * bhijwane par lagai aur wapas nahi mili. Asal nuqsan is se zyada hai (wapsi ka
   * kirchaya alag), magar ye wo number hai jo hamare paas WAQAI mojood hai — andaza
   * lagane se behtar hai ke jo sach maloom hai wohi dikhaya jaye.
   */
  readonly rtoDeliveryCost: Pkr
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

  /**
   * Kai dukanon ka payment record ek saath.
   *
   * List ke liye ek hi query — warna catalogue ke har card par alag query chalti aur
   * bees card ka safha bees query maangta.
   */
  paymentRecords(supplierIds: readonly string[]): Promise<SupplierPaymentRecord[]>

  /**
   * Ek maal ki dukan ka payment record — reseller ke safhe ke liye.
   *
   * 🔴 `supplierId` jaan boojh kar wapas NAHI aati. Reseller-facing safhe par supplier ki
   * id bhi utni hi mamnu hai jitna naam (dekhen dto/supplier.ts) — aur jo cheez laut kar
   * aati hi nahi, wo kisi agli tabdeeli mein galti se safhe par bhi nahi chali jati.
   */
  paymentRecordForProduct(productId: string): Promise<Omit<SupplierPaymentRecord, 'supplierId'> | null>

  /** Ops ki screen — wo hisab jahan dono apni baat par qaim hain. */
  listDisputed(): Promise<DisputedPayoutRow[]>

  /**
   * Kai resellers ka RTO record ek saath — wholesaler ke order wale safhe ke liye.
   *
   * `supplierId` de den to sirf USI dukan ke saath ka record; na den to poore platform ka.
   * Pehli soorat rozana ke faisle ke liye hai ("mere saath is ka kya chalan raha"),
   * doosri ops ke liye.
   */
  resellerRisk(
    resellerIds: readonly string[],
    supplierId?: string,
  ): Promise<ResellerRiskRecord[]>
}
