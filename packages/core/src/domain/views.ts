/**
 * READ MODELS — surface ke hisaab se alag.
 *
 * Ye is codebase ka sab se ahem design faisla hai:
 * `supplierPrice` sirf `PricingProductView` mein maujood hai, jo SIRF order pricing aur
 * fee calculation ke liye use hota hai. Reseller-facing service is type ko chhoo hi nahi sakti —
 * TypeScript compile hi nahi hoga.
 *
 * Yani price leak ko rokne ke liye discipline par bharosa nahi — type system par hai.
 */
import type { Pkr } from '@oyebazar/shared'

/** PUBLIC (Bazaar) — 🔴 koi price field nahi. Ye qanooni requirement hai. */
export interface PublicProductView {
  readonly slug: string
  readonly titleUr: string
  readonly titleEn: string
  readonly category: CategoryView
  readonly coverImageUrl: string | null
  readonly supplierName: string
  readonly supplierSlug: string
  readonly supplierCity: string
}

/** RESELLER (login ke baad) — Baji price dikhta hai, supplier ka kuch nahi. */
export interface ResellerProductView {
  readonly id: string
  readonly titleUr: string
  readonly titleEn: string
  readonly descriptionUr: string | null
  readonly category: CategoryView
  readonly coverImageUrl: string | null
  readonly bajiPrice: Pkr
  readonly suggestedRetail: Pkr
  readonly inStock: boolean
  readonly media: readonly ProductMediaView[]
  readonly variants: readonly ProductVariantView[]
}

/**
 * 🔴 INTERNAL ONLY — is mein supplierPrice hai.
 * Sirf order pricing, fee ledger aur ops surfaces. Kabhi bhi reseller ya public response mein nahi.
 */
export interface PricingProductView {
  readonly id: string
  readonly supplierId: string
  readonly supplierPrice: Pkr
  readonly bajiPrice: Pkr
  readonly suggestedRetail: Pkr
  readonly inStock: boolean
}

/** Content Studio render ke liye — image par sirf yehi cheezein chhapti hain. */
export interface RenderProductView {
  readonly id: string
  readonly titleUr: string
  readonly titleEn: string
  readonly coverImageUrl: string | null
  readonly categoryNameUr: string
}

/**
 * Home ki live patti ka ek item.
 *
 * 🔴 Ye Alahdeen ke "buyer requests" jaisa nazar aata hai magar hai bilkul alag:
 * hum banawati requests nahi dikhate (hamare paas public orders hain hi nahi).
 * Ye asli waqia hai — falan wholesaler ne falan maal list kiya.
 */
export interface PublicActivityItem {
  readonly slug: string
  readonly titleUr: string
  readonly titleEn: string
  readonly supplierName: string
  readonly supplierSlug: string
  readonly city: string
  readonly categoryNameUr: string
  readonly categoryNameEn: string
  readonly listedAt: Date
}

export interface CategoryView {
  readonly slug: string
  readonly nameUr: string
  readonly nameEn: string
}

export interface ProductMediaView {
  readonly url: string
  readonly sortOrder: number
}

export interface ProductVariantView {
  readonly id: string
  readonly size: string | null
  readonly colour: string | null
  readonly inStock: boolean
}

export interface PublicSupplierView {
  readonly slug: string
  readonly businessName: string
  readonly city: string
  readonly marketName: string | null
  readonly bioUr: string | null
  readonly whatsappPublic: string
  readonly address: string | null
  readonly logoUrl: string | null
  /** Dono zubanon mein — UI locale ke hisaab se chunti hai */
  readonly categories: readonly { nameUr: string; nameEn: string }[]
  readonly productCount: number
}

export interface ResellerView {
  readonly id: string
  readonly name: string
  readonly whatsappPhone: string
  readonly city: string
  readonly area: string | null
  readonly tier: 'NEW' | 'BRONZE' | 'SILVER' | 'GOLD'
  readonly status: 'ACTIVE' | 'LIMITED' | 'SUSPENDED'
  readonly payoutAccount: string | null
  readonly createdAt: Date
}

export interface StatusPackView {
  readonly id: string
  readonly resellerId: string
  readonly productId: string
  readonly templateKey: string
  readonly priceUsed: Pkr
  readonly imageUrl: string | null
  readonly generatedAt: Date | null
  readonly downloadedAt: Date | null
}
