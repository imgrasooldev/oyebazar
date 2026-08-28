/**
 * Ops ki chhanni ke liye kachcha maal — DB se.
 *
 * Har method ek sawal ka jawab deta hai, aur har jawab mein wo GINTI hoti hai jis par
 * `domain/ops-flags.ts` darja lagata hai. Darja yahan nahi lagta: haddein hafte mein kai
 * baar badlengi, aur us ke liye query chhoona nahi chahiye.
 *
 * 🔴 Har query ki apni HADD hai (`limit`). Ops ki list ka maqsad "sab kuch dikhana" nahi,
 * "ab kya karna hai" batana hai — aur teen hazar qataron wali list wohi cheez hai jise
 * koi nahi kholta. Jo cheez hadd se bahar reh jaye wo apne apne safhe par mojood rehti
 * hai (Money, Products, Orders); ye safha un ki jagah nahi leta.
 */

export interface DisputedPayoutFlag {
  readonly payoutId: string
  readonly orderNo: string
  readonly amount: number
  readonly supplierName: string
  readonly supplierPhone: string
  readonly resellerName: string
  readonly resellerPhone: string
  readonly note: string | null
  readonly disputedAt: Date
}

export interface OverduePayoutFlag {
  readonly payoutId: string
  readonly orderNo: string
  readonly amount: number
  readonly supplierName: string
  /** Paisa dukan ke paas hai — chase bhi usi ko karna hai */
  readonly supplierPhone: string
  readonly resellerName: string
  /** Shart se kitne din aage — `termDays` ke SNAPSHOT par napa gaya */
  readonly daysLate: number
  readonly since: Date
}

export interface UnansweredOrderFlag {
  readonly orderId: string
  readonly orderNo: string
  readonly supplierName: string
  /** Jawab isi se maangna hai */
  readonly supplierPhone: string
  readonly resellerName: string
  readonly hoursWaiting: number
  readonly since: Date
}

export interface ProductFlagRow {
  readonly productId: string
  readonly slug: string
  readonly titleUr: string
  readonly titleEn: string
  readonly supplierName: string
  readonly createdAt: Date
}

export interface OddPriceRow extends ProductFlagRow {
  readonly supplierPrice: number
  readonly categoryName: string
  /** Isi category ke baqi maal ka darmiyana — moqabla isi se hota hai */
  readonly categoryMedian: number
}

export interface DuplicateProductRow extends ProductFlagRow {
  /** Isi dukan par isi naam ka maal kitni dafa hai (khud milakar) */
  readonly copies: number
}

export interface StockChurnRow {
  readonly variantId: string
  readonly productId: string
  readonly titleUr: string
  readonly titleEn: string
  readonly supplierName: string
  /** Pichhle 30 din mein haath se ginti badalne ki ginti */
  readonly fixes: number
  readonly since: Date
}

export interface OpsTriageRepository {
  /** Reseller keh rahi hai paise nahi mile. */
  disputedPayouts(limit: number): Promise<DisputedPayoutFlag[]>

  /**
   * Shart guzar chuki aur paisa abhi tak nahi gaya.
   *
   * 🔴 Der `termDays` ke SNAPSHOT par napi jati hai, dukan ki MOJOODA shart par nahi —
   * warna 10 din ka baqaya khara hone par dukan apni shart 15 din kar ke apna record
   * saaf kar leti, aur der ka poora pemana bekar ho jata.
   */
  overduePayouts(now: Date, limit: number): Promise<OverduePayoutFlag[]>

  /** Dukan ne order ka jawab hi nahi diya — customer intezar mein hai. */
  unansweredOrders(now: Date, minHours: number, limit: number): Promise<UnansweredOrderFlag[]>

  /**
   * Rate jo apni category ke darmiyane se bohat door hai.
   *
   * Darmiyana (median) hi chalta hai, aosat nahi: ek ghalat rate (jis mein sifar reh
   * gaya) aosat ko itna kheench leta hai ke wo khud us ghalti ko chhupa deta — yani
   * pemana usi cheez se kharab hota jise wo naapne ke liye bana tha.
   */
  oddPricedProducts(minTimes: number, limit: number): Promise<OddPriceRow[]>

  /** Ek hi dukan par wohi naam do dafa. */
  duplicateProducts(limit: number): Promise<DuplicateProductRow[]>

  /** Maal jo abhi tak kisi khaane mein nahi (fallback category mein para hai). */
  uncategorisedProducts(fallbackSlug: string, limit: number): Promise<ProductFlagRow[]>

  /** LIVE maal ke naam — naam ki jaanch domain mein hoti hai, yahan sirf qataren. */
  liveProductTitles(limit: number): Promise<ProductFlagRow[]>

  /**
   * LIVE hai magar bik nahi sakta — koi variant hi nahi, ya sab ki ginti sifar.
   *
   * 🔴 Ye khamosh kharabi hai aur us ka bhugtaan RESELLER karti hai: maal Bazaar par
   * mojood dikhta hai, wo us par apna status lagati hai, customer order karta hai, aur
   * `reserve()` mana kar deta hai. Us lamhe wo apne customer ke saamne jhooti banti hai
   * — aur wo customer dobara nahi aata.
   *
   * `syncProductStatus` ginti sifar hone par khud `OUT_OF_STOCK` kar deta hai, magar wo
   * sirf UN raston par chalta hai jo repository se guzarte hain. Jo maal us se pehle ka
   * hai, ya seedha DB mein daala gaya (seed, import), wo LIVE hi para reh jata hai.
   */
  unsellableProducts(limit: number): Promise<ProductFlagRow[]>

  /** Jis cheez ki ginti baar baar haath se badli ja rahi hai. */
  stockChurn(now: Date, days: number, minFixes: number, limit: number): Promise<StockChurnRow[]>
}
