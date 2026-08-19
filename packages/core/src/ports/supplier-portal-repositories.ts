/**
 * Wholesaler portal ke ports.
 *
 * 🔴 Yahan har method ka pehla argument `supplierId` hai — jaan boojh kar. Wholesaler
 * sirf apna maal aur apne order dekhta hai; ownership ki shart query ke andar hai,
 * upar service mein `if` laga kar nahi. Ek `if` bhoolne se doosre wholesaler ka
 * data khul jata — is tarah bhoolne ki jagah hi nahi rehti.
 *
 * 🔴 Reseller ka retail price yahan kabhi nahi aata. Wholesaler ko sirf apni raqam
 * dikhti hai, warna use pata chal jayega ke hum kitna kama rahe hain.
 */
import type { MediaKind, Pkr } from '@oyebazar/shared'

export interface SupplierAccountView {
  readonly id: string
  readonly businessName: string
  readonly ownerName: string
  readonly city: string
  readonly marketName: string | null
  readonly status: 'PENDING' | 'VERIFIED' | 'SUSPENDED'
}

export interface SupplierApplication {
  readonly businessName: string
  readonly ownerName: string
  readonly phoneE164: string
  readonly city: string
  readonly marketName?: string | undefined
  readonly address: string
  readonly ntn?: string | undefined
}

export interface SupplierAccountRepository {
  findAccountById(supplierId: string): Promise<SupplierAccountView | null>
  /** Login ke liye — phone Supplier par unique hai. */
  findAccountByPhone(phoneE164: string): Promise<SupplierAccountView | null>
  /**
   * Nayi dukan ki darkhwast — hamesha PENDING aur bazaar se bahar banti hai.
   * Chalu karna ops ka faisla hai (AdminService), aur wo faisla yahan nahi ho sakta.
   */
  createApplication(input: SupplierApplication): Promise<{ id: string }>
}

/**
 * Wholesaler ki upload ki hui ek cheez — tasveer ya video.
 *
 * 🔴 `isStatusSource` sirf IMAGE par sach ho sakta hai. Wo tasveer default hai jo
 * reseller ke Content Studio mein pehle se chuni hui aati hai.
 */
export interface ProductMediaInput {
  readonly url: string
  readonly type: MediaKind
  readonly isStatusSource: boolean
}

export interface SupplierProductMediaView extends ProductMediaInput {
  readonly id: string
}

export interface SupplierProductView {
  readonly id: string
  readonly titleUr: string
  readonly titleEn: string
  /** DRAFT ki edit form inhen pehle se bhar deti hai. */
  readonly descriptionUr: string | null
  readonly categorySlug: string
  readonly status: 'DRAFT' | 'LIVE' | 'OUT_OF_STOCK' | 'ARCHIVED'
  /** Wholesaler ka apna rate — ye us ka apna number hai, chhupana nahi. */
  readonly supplierPrice: Pkr
  readonly imageUrl: string | null
  /** Sab kuch jo us ne is maal par daala — tasveerein aur video dono. */
  readonly media: readonly SupplierProductMediaView[]
  /** Abhi jo order is maal ke chal rahe hain — stock band karne se pehle dikhna chahiye. */
  readonly openOrders: number
  /** Kitna maal bacha hai — reserve shuda nikaal kar */
  readonly stockQty: number
}

export interface NewSupplierProduct {
  readonly supplierId: string
  readonly titleUr: string
  readonly titleEn: string
  readonly descriptionUr?: string | undefined
  readonly categorySlug: string
  /** Wholesaler ka apna rate — hamara rate is par fee lagā kar banta hai */
  readonly supplierPrice: Pkr
  readonly bajiPrice: Pkr
  readonly suggestedRetail: Pkr
  /**
   * Tasveerein aur video — upload ho chuki hain, yahan sirf un ke URL aate hain.
   *
   * 🔴 URL client se aata hai magar wo hamesha HAMARI apni storage ka hota hai: upload
   * `/api/v1/supplier/media` se guzarti hai jahan qism, naap aur asli bytes teenon
   * jaanche jate hain. Yahan dobara jaancha jata hai ke URL hamare hi storage ka ho —
   * warna koi bhi kisi aur ki site ka link daal kar catalogue mein kuch bhi dikha deta.
   */
  readonly media?: readonly ProductMediaInput[] | undefined
  /**
   * Kitna maal mojood hai.
   *
   * 🔴 Bina stock ke product order HI nahi ho sakta (inStock = LIVE + koi variant jis
   * mein stock ho). Pehle ye khaana nahi tha, aur wholesaler ka daala hua maal live
   * hone ke baad bhi "Ye item is waqt mojood nahi" deta tha — bina kisi wajah ke.
   */
  readonly stockQty: number
}

/**
 * DRAFT ki nayi tafseel.
 *
 * `bajiPrice` aur `suggestedRetail` yahan aate hain magar CLIENT se nahi — service
 * unhen supplier ke apne fee rate se dobara ginti hai, bilkul waise jaise naya maal
 * banate waqt. Client se lete to koi bhi apni marzi ka rate bhej kar fee ura leta.
 */
export interface DraftProductUpdate {
  readonly titleUr: string
  readonly titleEn: string
  readonly descriptionUr?: string | undefined
  readonly categorySlug: string
  readonly supplierPrice: Pkr
  readonly bajiPrice: Pkr
  readonly suggestedRetail: Pkr
  readonly stockQty: number
}

export interface SupplierProductRepository {
  /**
   * Naya maal — hamesha DRAFT.
   *
   * 🔴 Wholesaler khud apna maal LIVE nahi kar sakta. Us ka daala hua rate, tasveer aur
   * naam ops dekhti hai; ek ghalat rate ya bina tasveer ka maal poore catalogue ki
   * sakh khata hai (reseller usay apne status par lagati hai).
   */
  create(input: NewSupplierProduct): Promise<{ id: string }>

  listForSupplier(supplierId: string): Promise<SupplierProductView[]>

  /**
   * DRAFT maal ki poori tafseel badalna.
   *
   * 🔴 Sirf DRAFT. Shart repository ki query ke andar hai (`status: 'DRAFT'`), service
   * ke kisi `if` par nahi.
   *
   * Wajah: DRAFT ko na ops ne dekha hai na kisi reseller ne. Wo dukan wale ka apna
   * kaghaz hai — naam mein typo ya rate mein ek sifar zyada, dono yahan bina kisi
   * nuqsan ke theek ho sakte hain. LIVE hone ke baad wohi cheezein badalna alag maslaa
   * hai: reseller apna rate save kar chuki hoti hai, us ke status pack bane hue hote
   * hain, aur ops ne naam aur rate dekh kar manzoori di hoti hai.
   */
  updateDraft(
    supplierId: string,
    productId: string,
    input: DraftProductUpdate,
  ): Promise<boolean>

  /**
   * Maal par nayi tasveer ya video lagana.
   *
   * 🔴 `supplierId` shart mein hai — doosri dukan ke product par kuch nahi lag sakta.
   * @returns false agar maal is dukan ka nahi
   */
  addMedia(
    supplierId: string,
    productId: string,
    media: readonly ProductMediaInput[],
  ): Promise<boolean>

  /**
   * Ek tasveer/video hatana.
   *
   * @returns false agar wo media is dukan ke kisi maal ki nahi
   */
  removeMedia(supplierId: string, productId: string, mediaId: string): Promise<boolean>

  /**
   * Kaunsi tasveer status pack par jayegi (aur catalogue par cover banegi).
   *
   * @returns false agar media is dukan ki nahi ya wo video hai
   */
  setStatusSource(supplierId: string, productId: string, mediaId: string): Promise<boolean>

  /** Tarteeb badalna — pehli tasveer catalogue par cover banti hai. */
  reorderMedia(supplierId: string, productId: string, mediaIds: readonly string[]): Promise<boolean>
  /**
   * Stock on/off. Sirf LIVE ↔ OUT_OF_STOCK — DRAFT aur ARCHIVED ops ka faisla hai,
   * wholesaler apne aap maal live nahi kar sakta (pehle verification hoti hai).
   *
   * @returns false agar product is wholesaler ka nahi ya DRAFT/ARCHIVED hai.
   */
  setStockStatus(
    supplierId: string,
    productId: string,
    status: 'LIVE' | 'OUT_OF_STOCK',
  ): Promise<boolean>
}
