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
  media: {
    // variantId: kis jorhe ki tasveer hai — reseller ko chuna hua rang dikhane ke liye
    select: {
      id: true,
      processedUrl: true,
      originalUrl: true,
      type: true,
      sortOrder: true,
      variantId: true,
    },
    orderBy: { sortOrder: 'asc' },
  },
  createdAt: true,
  /*
   * 🔴 Dukan ki SHANAKHT hai, us se RABTA nahi — aur ye farq poore feature ki jaan hai.
   *
   * Pehle yahan likha tha "supplier: NAHI", aur wajah durust thi: agar reseller ko pata
   * chal jaye ke maal kis dukan ka hai to wo seedha wahan ja sakti hai aur fee dene ki
   * wajah khatam ho jati hai. Marketplace isi tarah bypass hote hain.
   *
   * Magar wo hifazat asal mein thi hi nahi: dukan ka naam, sheher aur us ka PUBLIC
   * WhatsApp number `/bazaar` par bina login ke pehle se mojood hai. Yani jo cheez
   * chhupayi ja rahi thi wo doosre tab mein khuli hui thi — aur us chhupane ki qeemat
   * reseller de rahi thi, jo apna maal chunte waqt ye nahi jaan sakti thi ke wo kis se
   * le rahi hai.
   *
   * Is liye ab shanakht yahan hai — naam, sheher, mandi — magar `phone` aur
   * `whatsappPublic` NAHI. Portal ke andar dukan CHUNI ja sakti hai, us se seedha rabta
   * nahi kiya ja sakta. Wo raasta bazaar par pehle se khula hai; usay portal ke andar
   * dohrana bypass ko aasan banana hoga, faida koi nahi.
   */
  supplier: {
    select: { id: true, slug: true, businessName: true, city: true, marketName: true },
  },
  // supplierPrice: NAHI. supplier.phone / whatsappPublic: NAHI.
} satisfies Prisma.ProductSelect

/**
 * Content Studio render — image par sirf yehi cheezein chhapti hain.
 *
 * 🔴 Media ab SAARI tasveerein laata hai, sirf status wali nahi: reseller khud chunti
 * hai ke kaunsi tasveer us ke status par jaye. `take: 1` hata dene se yahan bhi wohi
 * usool rehta hai — koi price column phir bhi nahi maanga jata.
 *
 * VIDEO jaan boojh kar bahar hai. Pack Playwright ke HTML screenshot se banta hai;
 * video ka apna raasta (ffmpeg) abhi hai hi nahi.
 */
export const RENDER_PRODUCT_SELECT = {
  id: true,
  titleUr: true,
  titleEn: true,
  category: { select: { nameUr: true } },
  media: {
    where: { type: 'IMAGE' as const },
    select: { id: true, processedUrl: true, originalUrl: true, isStatusSource: true },
    orderBy: [{ isStatusSource: 'desc' as const }, { sortOrder: 'asc' as const }],
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
