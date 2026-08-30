/**
 * Order domain types.
 *
 * Do usool jo poore module par chalte hain:
 *  1. Har OrderItem par PRICE SNAPSHOTS — order banne ke waqt ke prices. Kal product ka
 *     price badla to purana order na badle, warna reconciliation toot jati hai.
 *  2. Fee bhi usi waqt calculate hoti hai, snapshots se — live prices se kabhi nahi.
 */
import type { Pkr } from '@oyebazar/shared'
import type { OrderStatus } from './order-status'

export type ConfirmedBy = 'RESELLER' | 'CUSTOMER' | 'OPS'

export interface CustomerDetails {
  readonly name: string
  readonly phone: string
  readonly address: string
  readonly area: string
  /** 🔴 RTO ka sab se bara lever — pin milne se pata dhoondhna aasan hota hai */
  readonly locationLat?: number
  readonly locationLng?: number
}

export interface OrderLineInput {
  readonly productId: string
  readonly variantId?: string
  readonly qty: number
  /** reseller ne customer se jo price liya — us ka apna retail */
  readonly retailPrice: Pkr
}

export interface OrderLineView {
  readonly productId: string
  readonly variantId: string | null
  readonly qty: number
  /**
   * Kitne wapas aaye — adhoori wapsi.
   *
   * 🔴 `qty` se ALAG. `qty` wo hai jo bheja gaya (snapshot, kabhi nahi badalta);
   * ye wo hai jo wapas aaya. Paisa dono ke FARQ par banta hai, aur wo farq har jagah ek
   * hi jagah se nikalna chahiye — dekhen `keptQty()`.
   */
  readonly returnedQty: number
  readonly supplierPriceSnapshot: Pkr
  readonly bajiPriceSnapshot: Pkr
  readonly retailPriceSnapshot: Pkr
}

/**
 * Kitne maal ka paisa bana — bheje hue mein se wapas aaye hue nikaal kar.
 *
 * 🔴 Ye ek hi jagah hai jahan ye hisab hota hai, aur wohi is function ki poori
 * wajah hai. Reseller ki kamai, hamari fee aur register — teenon isi par khare hain.
 * Teen jagah teen dafa likhne ka matlab ye hota ke kal ek jagah theek hoti aur do
 * purani reh jatin, aur wo farq kisi ko mahinon nazar na aata: har number apni jagah
 * theek DIKHTA rehta.
 *
 * `Math.max` is liye ke wapsi kabhi bheje hue se zyada na ho — wo sirf ek ghalat likhi
 * hui qadar se hi mumkin hai, aur us par manfi paisa banane se behtar sifar hai.
 */
export function keptQty(line: { qty: number; returnedQty: number }): number {
  return Math.max(line.qty - line.returnedQty, 0)
}

/** Reseller ko dikhne wala order — 🔴 is mein supplier ka koi zikr nahi. */
export interface ResellerOrderView {
  readonly id: string
  readonly orderNo: string
  readonly status: OrderStatus
  readonly customerName: string
  readonly customerPhone: string
  readonly customerAddress: string
  readonly area: string
  readonly subtotal: Pkr
  readonly deliveryFee: Pkr
  readonly total: Pkr
  /** reseller ka apna munafa — bajiPrice aur retail ka farq */
  readonly myEarnings: Pkr
  readonly confirmedAt: Date | null
  readonly confirmedBy: ConfirmedBy | null
  readonly createdAt: Date
  /*
   * Maal kis ke haath gaya, aur CN kya hai.
   *
   * 🔴 Ye do khaane reseller ke liye hain, hamare hisab ke liye nahi. Us ki customer
   * ka sab se aam sawal "mera parcel kahan hai?" hai, aur ab tak us ka jawab reseller ke
   * paas tha hi nahi — usay dukan ko WhatsApp karna parta tha aur jawab ka intezar.
   */
  readonly courier: string | null
  readonly trackingNo: string | null
  readonly dispatchedAt: Date | null
  readonly items: readonly ResellerOrderLineView[]
}

/** 🔴 supplierPriceSnapshot yahan bhi nahi — reseller ko sirf apne numbers dikhte hain. */
export interface ResellerOrderLineView {
  readonly productId: string
  readonly titleUr: string
  readonly qty: number
  readonly bajiPrice: Pkr
  readonly retailPrice: Pkr
}

/** Ops/supplier ke liye poora order — is mein supplier cost aur fee dono hain. */
export interface InternalOrderView {
  readonly id: string
  readonly orderNo: string
  readonly resellerId: string
  readonly supplierId: string
  readonly status: OrderStatus
  readonly total: Pkr
  readonly bajiFee: Pkr
  readonly feeRateBps: number
  readonly confirmedAt: Date | null
  readonly confirmedBy: ConfirmedBy | null
  readonly items: readonly OrderLineView[]
}

export interface CreateOrderCommand {
  readonly resellerId: string
  readonly customer: CustomerDetails
  readonly lines: readonly OrderLineInput[]
  readonly deliveryFee: Pkr
  readonly paymentMethod: 'COD' | 'PREPAID'
  /** dohra order rokne ke liye — client har order par ek naya key bhejta hai */
  readonly idempotencyKey?: string
}
