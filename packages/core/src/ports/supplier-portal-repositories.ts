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
import type { Pkr } from '@oyebazar/shared'

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

export interface SupplierProductView {
  readonly id: string
  readonly titleUr: string
  readonly titleEn: string
  readonly status: 'DRAFT' | 'LIVE' | 'OUT_OF_STOCK' | 'ARCHIVED'
  /** Wholesaler ka apna rate — ye us ka apna number hai, chhupana nahi. */
  readonly supplierPrice: Pkr
  readonly imageUrl: string | null
  /** Abhi jo order is maal ke chal rahe hain — stock band karne se pehle dikhna chahiye. */
  readonly openOrders: number
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
  readonly imageUrl?: string | undefined
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
