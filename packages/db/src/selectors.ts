/**
 * 🔴 SELECTORS — price leak ke khilaf pehli defence layer.
 *
 * GOLDEN RULE #2 (docs/CONVENTIONS.md):
 *   Reseller-facing query par `select` LAZMI hai. Bare `findMany()` MANA hai —
 *   wo har column laata hai, jis mein supplierPrice bhi hai.
 *
 * Yahan har surface ka apna select hai. Naya field add karte waqt sochen:
 * "kya ye reseller/public ko dikhna chahiye?"
 */
import { Prisma } from '@prisma/client'

/**
 * PUBLIC (Bazaar) — 🔴 koi price column nahi. Ek bhi nahi.
 * Reseller ko price sirf login ke baad dikhta hai; public ko kabhi nahi.
 */
export const PUBLIC_PRODUCT_SELECT = {
  slug: true,
  titleUr: true,
  titleEn: true,
  category: { select: { slug: true, nameUr: true, nameEn: true } },
  media: {
    where: { isStatusSource: true },
    select: { processedUrl: true, originalUrl: true },
    orderBy: { sortOrder: 'asc' },
    take: 1,
  },
  supplier: { select: { businessName: true, slug: true, city: true } },
  createdAt: true,
  // supplierPrice / bajiPrice / suggestedRetail: JAAN BOOJH KAR NAHI
} satisfies Prisma.ProductSelect

/** RESELLER (login ke baad) — bajiPrice hai, supplier ka kuch bhi nahi. */
export const RESELLER_PRODUCT_SELECT = {
  id: true,
  titleUr: true,
  titleEn: true,
  descriptionUr: true,
  bajiPrice: true,
  suggestedRetail: true,
  status: true,
  category: { select: { slug: true, nameUr: true, nameEn: true } },
  variants: { select: { id: true, size: true, colour: true, stockQty: true } },
  media: { select: { processedUrl: true, originalUrl: true, sortOrder: true }, orderBy: { sortOrder: 'asc' } },
  createdAt: true,
  // supplierPrice: NAHI. supplierId: NAHI. supplier: NAHI.
} satisfies Prisma.ProductSelect

/** Content Studio render — image par sirf yehi cheezein chhapti hain. */
export const RENDER_PRODUCT_SELECT = {
  id: true,
  titleUr: true,
  titleEn: true,
  category: { select: { nameUr: true } },
  media: {
    where: { isStatusSource: true },
    select: { processedUrl: true, originalUrl: true },
    orderBy: { sortOrder: 'asc' },
    take: 1,
  },
} satisfies Prisma.ProductSelect

/**
 * 🔴 INTERNAL — supplierPrice yahan hai.
 * Sirf order pricing, fee ledger aur ops. Kabhi bhi reseller/public response mein nahi.
 */
export const PRICING_PRODUCT_SELECT = {
  id: true,
  supplierId: true,
  supplierPrice: true,
  bajiPrice: true,
  suggestedRetail: true,
  status: true,
  variants: { select: { stockQty: true } },
} satisfies Prisma.ProductSelect

export const PUBLIC_SUPPLIER_SELECT = {
  slug: true,
  businessName: true,
  city: true,
  marketName: true,
  bioUr: true,
  whatsappPublic: true,
  address: true,
  logoUrl: true,
  createdAt: true,
  // ntn / strn / phone / bankAccount / feeRateBps: kabhi public nahi
  _count: { select: { products: { where: { status: 'LIVE' } } } },
  // Aakhri live listing — "2 din pehle naya maal" isi se banta hai
  products: {
    where: { status: 'LIVE' as const },
    select: { createdAt: true },
    orderBy: { createdAt: 'desc' as const },
    take: 1,
  },
} satisfies Prisma.SupplierSelect
