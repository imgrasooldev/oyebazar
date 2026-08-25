/**
 * Pata mangwane wali darkhwast — reseller banati hai, customer bharti hai.
 */

/** Customer ko dikhne wala — 🔴 is mein dukan ka koi zikr nahi, aur na hi hamara rate. */
export interface PublicAddressRequestView {
  readonly token: string
  /** Reseller ka apna naam — customer usi ko jaanti hai, hamein nahi */
  readonly shopName: string
  readonly productTitleUr: string
  readonly productTitleEn: string
  readonly imageUrl: string | null
  readonly qty: number
  /** Customer isi raqam ka intezar kar rahi hai — delivery alag se */
  readonly retailPrice: number
  readonly expiresAt: Date
  readonly filledAt: Date | null
  readonly usedAt: Date | null
}

/** Reseller ko dikhne wala — bhara hua pata, order banane ke liye */
export interface FilledAddressRequestView {
  readonly token: string
  readonly productId: string
  readonly variantId: string | null
  readonly qty: number
  readonly retailPrice: number
  readonly customerName: string
  readonly customerPhone: string
  readonly customerAddress: string
  readonly area: string
  readonly locationLat: number | null
  readonly locationLng: number | null
  readonly filledAt: Date
  readonly productTitleUr: string
  readonly productTitleEn: string
  readonly imageUrl: string | null
}

export interface AddressRequestRepository {
  create(input: {
    token: string
    resellerId: string
    productId: string
    variantId: string | null
    qty: number
    retailPrice: number
    expiresAt: Date
  }): Promise<void>

  /** Public safhe ke liye — token hi chabi hai */
  findPublicByToken(token: string): Promise<PublicAddressRequestView | null>

  /**
   * Customer ka bhara hua pata rakhna.
   *
   * 🔴 Sirf tab jab abhi tak bhara na gaya ho (`filledAt IS NULL`) — aur ye shart DB
   * par hai, code mein nahi. Link WhatsApp par jata hai aur aage forward bhi ho jata
   * hai; do log ek saath kholen to code ki jaanch dono ko guzar deti, aur pehle wale ka
   * pata doosre ke pate se dab jata.
   *
   * `false` ka matlab: bhara ja chuka tha, kuch nahi badla.
   */
  fill(
    token: string,
    input: {
      customerName: string
      customerPhone: string
      customerAddress: string
      area: string
      locationLat: number | null
      locationLng: number | null
      at: Date
    },
  ): Promise<boolean>

  /** Reseller ke bhare hue — jin ka order abhi nahi bana */
  listFilledFor(resellerId: string, limit: number): Promise<FilledAddressRequestView[]>

  /** Reseller ka apna — order banane se pehle */
  findFilledForReseller(
    resellerId: string,
    token: string,
  ): Promise<FilledAddressRequestView | null>

  /**
   * Order ban gaya — link ab band.
   *
   * 🔴 `orderId` par DB ki unique hadd hai. Reseller do dafa button dabaye ya do tab
   * khuli hon to doosri koshish yahin girti hai — aur us se pehle ke maal rok liya jaye.
   */
  markUsed(resellerId: string, token: string, orderId: string, at: Date): Promise<boolean>
}
