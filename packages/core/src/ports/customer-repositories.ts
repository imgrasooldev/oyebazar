/**
 * Reseller ki apni customer fehrist.
 *
 * 🔴 Har method `resellerId` maangta hai, aur ye ek bhi jagah marzi ka nahi. Ye poori
 * fehrist reseller ki apni mehnat se banti hai; ek bhi rasta jo bina us ki shanakht ke
 * jawab de, wo doosri reseller ka customer bahar nikal deta hai — naam aur pate ke
 * saath. Us se bachne ka sab se pukhta tareeqa yehi hai ke sawal hi na poochha ja sake.
 */
export interface CustomerView {
  readonly id: string
  readonly phone: string
  readonly name: string
  readonly address: string
  readonly area: string
  readonly lastOrderAt: Date
  /**
   * Kitne order — abhi tak.
   *
   * 🔴 Ye khaana `Customer` par MEHFOOZ nahi kiya gaya, har dafa gina jata hai. Mehfooz
   * ginti wo cheez hai jo ek din asal se alag ho jati hai (order cancel hua, backfill
   * dobara chali, koi raasta ginti barhana bhool gaya) — aur us din wo "sattarwan order"
   * likh deti hai jo hua hi nahi. Ginti sasti hai; jhoot mehnga.
   */
  readonly orderCount: number
}

export interface CustomerRepository {
  /**
   * Number se — order ka form isi par khara hai.
   *
   * Na milne par `null`: naya customer hai, aur wo bilkul aam soorat hai.
   */
  findByPhone(resellerId: string, phone: string): Promise<CustomerView | null>

  /**
   * Order bante waqt — mojood ho to tazaa karo, warna banao.
   *
   * 🔴 Naam aur pata HAR DAFA tazaa hote hain, aur ye jaan boojh kar hai. Log ghar
   * badalte hain aur naam ki hijje theek karte hain; agli dafa bharne ke liye AAKHRI
   * shakl hi kaam ki hai. Jo baat mehfooz rehni chahiye wo `Order` par pehle se rehti
   * hai — us waqt ka snapshot, jhagre ke din ka wahid sach.
   */
  upsertForOrder(input: {
    resellerId: string
    phone: string
    name: string
    address: string
    area: string
    at: Date
  }): Promise<string>
}
