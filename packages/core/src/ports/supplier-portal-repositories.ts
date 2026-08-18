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

export interface SupplierAccountRepository {
  findAccountById(supplierId: string): Promise<SupplierAccountView | null>
  /** Login ke liye — phone Supplier par unique hai. */
  findAccountByPhone(phoneE164: string): Promise<SupplierAccountView | null>
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

export interface SupplierProductRepository {
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
