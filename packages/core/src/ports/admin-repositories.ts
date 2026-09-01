/**
 * Admin portal ke ports.
 *
 * 🔴 Admin ke paas SAB kuch dikhta hai — supplier ka rate, reseller ka margin, fee.
 * Isi liye ye ports baqi sab se alag file mein hain: koi reseller-facing service
 * ghalti se inhen inject na kar le. Container mein bhi ye sirf admin services ko
 * milte hain.
 */
import type { PayoutAccount } from '../domain/payout-account'
import type { Pkr } from '@oyebazar/shared'
import type { OpsRole } from '../domain/ops-permissions'

export interface OpsUserView {
  readonly id: string
  readonly name: string
  readonly email: string
  readonly role: OpsRole
  readonly isActive: boolean
}

export interface OpsTeamMember extends OpsUserView {
  readonly phone: string | null
  readonly lastSeenAt: Date | null
  readonly createdAt: Date
}

export interface OpsUserRepository {
  findById(id: string): Promise<OpsUserView | null>
  findByPhone(phoneE164: string): Promise<OpsUserView | null>
  list(): Promise<OpsUserView[]>
  touchLastSeen(id: string, at: Date): Promise<void>

  /** Team ka safha — phone aur aakhri hazri bhi, taake pata ho kaun chal raha hai. */
  listTeam(): Promise<OpsTeamMember[]>
  create(input: {
    name: string
    email: string
    phoneE164: string
    role: OpsRole
  }): Promise<OpsTeamMember>
  setRole(id: string, role: OpsRole): Promise<void>
  setActive(id: string, isActive: boolean): Promise<void>
}

/** Dashboard ke number — har ek wo cheez jis par kisi ko AAJ kuch karna hai. */
export interface AdminDashboardStats {
  /** Reseller ki tasdeeq ka intezar — ye order abhi kahin nahi ja rahe */
  readonly ordersAwaitingConfirmation: number
  /** Wholesaler ke jawab ka intezar — sab se mehnga intezar, customer khara hai */
  readonly ordersWithSupplier: number
  readonly ordersInTransit: number
  readonly ordersToday: number
  /** Verification ke muntazir — jab tak ye pending hain, in ka maal bikta nahi */
  readonly suppliersPending: number
  /** DRAFT maal — ops ki manzoori ke baghair reseller ise dekh hi nahi sakti */
  readonly productsDraft: number
  readonly resellersActive: number
  /** Is mahine ki asli kamai — sirf wo order jin ka maal pohanch chuka hai */
  readonly feeEarnedThisMonth: Pkr
  /** Raste mein pare orders ki fee — abhi kamai nahi, magar daanv par hai */
  readonly feeInFlight: Pkr
}

export interface AdminSupplierRow {
  readonly id: string
  readonly businessName: string
  readonly ownerName: string
  readonly phone: string
  readonly city: string
  readonly marketName: string | null
  readonly status: 'PENDING' | 'VERIFIED' | 'SUSPENDED'
  readonly listedOnBazaar: boolean
  readonly feeRateBps: number
  /** Dukan ka apna khata — wapsi/adjustment aur fee ke bill ke liye */
  readonly payoutAccount: PayoutAccount | null
  readonly productCount: number
  readonly createdAt: Date
}

export interface AdminProductRow {
  readonly id: string
  readonly titleUr: string
  readonly titleEn: string
  readonly status: 'DRAFT' | 'LIVE' | 'OUT_OF_STOCK' | 'ARCHIVED'
  readonly supplierPrice: Pkr
  readonly bajiPrice: Pkr
  readonly suggestedRetail: Pkr
  readonly supplierName: string
  readonly categoryNameUr: string
  readonly imageUrl: string | null
  readonly createdAt: Date
}

export interface AdminResellerRow {
  readonly id: string
  readonly name: string
  readonly whatsappPhone: string
  readonly city: string
  readonly status: 'ACTIVE' | 'LIMITED' | 'SUSPENDED'
  /**
   * Kis behen ne bulaya — naam, id nahi.
   *
   * 🔴 Ye khaana `tier` ki jagah aaya hai. Wo har qatar par 'NEW' chhapta tha
   * (kyunke usay koi badalta hi nahi tha) aur us ka dikhna un numberon ka wazan bhi kam
   * karta tha jo us ke saath khare hain aur sach bolte hain.
   *
   * Yahan naam jata hai, `referredById` nahi: ops ko wo jorna nahi chahiye jo hum jor
   * kar de sakte hain.
   */
  /**
   * Wo khata jis mein is ka munafa jata hai — ops ke liye POORA.
   *
   * 🔴 Ops ko ye is liye chahiye ke jhagra hamesha yahin phansta hai: reseller kehti
   * hai paise nahi mile, dukan kehta hai bhej diye. Dono ke saamne ek hi khata rakhe
   * baghair ye baat kabhi tay nahi hoti — aur aaj tak wo khata kisi record mein tha
   * hi nahi, sirf kisi purani WhatsApp chat mein.
   */
  readonly payoutAccount: PayoutAccount | null
  readonly payoutUpdatedAt: Date | null
  readonly referredByName: string | null
  /**
   * Is ne kitni behnon ko bulaya.
   *
   * 🔴 Ye "kis ne bulaya" se ULTA rukh hai, aur ops ko dono chahiyen. Pehla ek
   * qatar ke bare mein hai (ye kahan se aayi); ye poore nizam ke bare mein hai — kaun
   * waqai log laa raha hai. Growth ka poora jawab isi doosre number mein hai, aur bina
   * us ke ye maloom hi nahi hota ke referral scheme kaam kar rahi hai ya sirf chal rahi
   * hai.
   */
  readonly invitedCount: number
  readonly orderCount: number
  readonly lastActiveAt: Date | null
  readonly createdAt: Date
}

export interface AdminInvoiceRow {
  readonly invoiceId: string
  readonly period: string
  readonly supplierName: string
  readonly orders: number
  readonly amount: Pkr
  /** Ek invoice ki saari rows ek hi haal mein hoti hain — INVOICED ya COLLECTED */
  readonly status: string
  readonly invoicedAt: Date | null
}

export interface AdminRepository {
  /** Bane hue invoice — naye pehle. Ledger rows invoiceId par jama kar ke. */
  listInvoices(limit: number): Promise<AdminInvoiceRow[]>

  dashboard(now: Date): Promise<AdminDashboardStats>

  listSuppliers(filter: { status?: string; limit: number }): Promise<AdminSupplierRow[]>
  setSupplierStatus(id: string, status: 'PENDING' | 'VERIFIED' | 'SUSPENDED'): Promise<void>
  setSupplierListed(id: string, listed: boolean): Promise<void>
  /**
   * Fee ka rate badle — aur PURANA rate wapas de.
   *
   * 🔴 Purani qadar isi liye wapas aati hai ke daftar mein "300 bps kar diya"
   * likhna adhoora hai. Asal sawal hamesha ye hota hai ke KAHAN SE kahan gaya: 500 se
   * 300 karna paisa dena hai, aur 200 se 300 karna paisa lena. Ek hi jumla dono ke liye
   * likhna us daftar ko bekar kar deta hai jis par jawabdehi khari hai.
   *
   * Dukan na milne par `null` — us soorat mein kuch badla bhi nahi.
   */
  setSupplierFeeRate(id: string, feeRateBps: number): Promise<number | null>

  listProducts(filter: { status?: string; limit: number }): Promise<AdminProductRow[]>
  setProductStatus(id: string, status: 'DRAFT' | 'LIVE' | 'ARCHIVED'): Promise<void>

  /**
   * Maal ka naam aur khaana theek karo.
   *
   * 🔴 Ye rasta pehle tha hi NAHI, aur us ki ghair-mojoodgi ne do nishan bekar
   * kar rakhe the. Ops ki chhanni `oddTitle` (aisa naam jis se maal pehchana hi nahi ja
   * sakta) aur `uncategorised` (koi khaana nahi) dono par nishan lagati thi — aur ops ke
   * paas un mein se kisi ko theek karne ka koi rasta nahi tha. Admin API sirf halat
   * (DRAFT/LIVE/ARCHIVED) badal sakti thi.
   *
   * Jis nishan ka koi agla qadam na ho, wo nishan teen hafte mein wo cheez ban jata hai
   * jise koi nahi dekhta — aur us ke saath wo nishan bhi mar jate hain jin par kaam ho
   * sakta tha.
   *
   * `categorySlug` na mile to `null` — dekhen service ka note.
   */
  setProductNaming(
    id: string,
    input: { titleUr: string; titleEn: string; categorySlug: string | null },
  ): Promise<boolean>

  listResellers(filter: { status?: string; limit: number }): Promise<AdminResellerRow[]>
  setResellerStatus(id: string, status: 'ACTIVE' | 'LIMITED' | 'SUSPENDED'): Promise<void>
}

/**
 * Ek darj shuda harkat — kis ne kya kiya, kab.
 *
 * 🔴 `actorName` yahan is liye hai ke `Event` table mein sirf `actorId` para hai,
 * aur ek fehrist jis mein "cmt3je…8f ne dukan mo'attal ki" likha ho, wo fehrist koi
 * nahi kholta. Jawabdehi ka poora maqsad NAAM par khara hai — bina naam ke ye sirf
 * mehfooz kiya hua kachra hai.
 *
 * Naam na milne par `null` (ops user mit gaya ya harkat kisi aur ne ki) — us soorat
 * mein dikhane wala `actorId` khud dikha de, kyunke "kisi ne" likhna jhoot hai.
 */
export interface AdminActivityRow {
  readonly id: string
  readonly name: string
  readonly actorType: string
  readonly actorId: string | null
  readonly actorName: string | null
  readonly properties: Record<string, unknown>
  readonly createdAt: Date
}

export interface AdminActivityRepository {
  /**
   * Aakhri harkatein — nayi pehle.
   *
   * 🔴 `actorType` ki chhanni lazmi tarah wo cheez hai jis ke baghair ye safha
   * bekar ho jata: `Event` table mein reseller aur dukan ke waqiat bhi jate hain
   * (hazaron rozana), aur un ke darmiyan ops ki dus harkatein gum ho jati hain. Ye
   * safha jawabdehi ka hai, trafik ka nahi.
   */
  recent(filters: { actorType?: string | undefined; limit: number }): Promise<AdminActivityRow[]>
}

export interface AdminReferralRepository {
  /** Har wo reseller jo kisi ke link se aayi — nayi pehle. */
  list(limit: number): Promise<readonly AdminReferralRow[]>
}

/**
 * Ek invite ka poora silsila — ops ke liye.
 *
 * 🔴 Reseller wale `ReferralRow` se ALAG hai, aur wo alag hona zaroori hai: is
 * mein BULANE WALI ka naam bhi hai. Reseller ko wo khaana chahiye hi nahi (bulane wali
 * wo khud hai), aur us ke safhe par wo bhejna us ke liye ek fazool khaana hota. Ops ke
 * liye wohi khaana asal sawal hai: kaun laa raha hai.
 */
export interface AdminReferralRow {
  readonly resellerId: string
  readonly name: string
  readonly city: string
  readonly joinedAt: Date
  readonly invitedById: string
  readonly invitedByName: string
  /** Kitne order POHANCH chuke — bonus isi par khulta hai */
  readonly delivered: number
  readonly bonusAmount: number | null
  readonly bonusStatus: 'PENDING' | 'PAID' | null
}
