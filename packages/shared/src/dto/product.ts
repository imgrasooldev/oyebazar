/**
 * Product DTOs — surface ke hisaab se ALAG shapes.
 *
 * 🔴 GOLDEN RULE #2: `supplierPrice` kabhi reseller tak na pohanche.
 * 🔴 Public (Bazaar) par KOI price nahi — na Baji price, na retail. Price sirf login ke baad.
 *
 * Har DTO `.strict()` hai: extra key aayi to runtime par THROW hoga, chup chaap leak nahi hogi.
 */
import { z } from 'zod'

const PkrSchema = z.number().int().nonnegative()

export const CategoryRefDTO = z
  .object({
    slug: z.string(),
    nameUr: z.string(),
    nameEn: z.string(),
  })
  .strict()

export const ProductMediaDTO = z
  .object({
    url: z.string(),
    sortOrder: z.number().int(),
  })
  .strict()

export const ProductVariantDTO = z
  .object({
    id: z.string(),
    size: z.string().nullable(),
    colour: z.string().nullable(),
    inStock: z.boolean(),
  })
  .strict()

/**
 * PUBLIC — Bazaar (koi bhi dekh sakta hai, Google se aata hai).
 * 🔴 Koi price field NAHI. Koi order button nahi. Ye qanooni requirement hai.
 */
export const PublicProductDTO = z
  .object({
    slug: z.string(),
    titleUr: z.string(),
    titleEn: z.string(),
    category: CategoryRefDTO,
    coverImageUrl: z.string().nullable(),
    supplierName: z.string(),
    supplierSlug: z.string(),
    supplierCity: z.string(),
  })
  .strict()

/** RESELLER — login ke baad. Baji price dikhta hai, supplier ka kuch nahi. */
export const ResellerProductListItemDTO = z
  .object({
    id: z.string(),
    titleUr: z.string(),
    titleEn: z.string(),
    category: CategoryRefDTO,
    coverImageUrl: z.string().nullable(),
    /** wo price jo reseller Baji ko deti hai */
    bajiPrice: PkrSchema,
    /** hamara mashwara — wo isay badal sakti hai */
    suggestedRetail: PkrSchema,
    /** us ka apna set kiya hua retail price (agar set kiya ho) */
    myRetailPrice: PkrSchema.nullable(),
    inStock: z.boolean(),
  })
  .strict()

export const ResellerProductDetailDTO = ResellerProductListItemDTO.extend({
  descriptionUr: z.string().nullable(),
  media: z.array(ProductMediaDTO),
  variants: z.array(ProductVariantDTO),
}).strict()

export type CategoryRef = z.infer<typeof CategoryRefDTO>
export type PublicProduct = z.infer<typeof PublicProductDTO>
export type ResellerProductListItem = z.infer<typeof ResellerProductListItemDTO>
export type ResellerProductDetail = z.infer<typeof ResellerProductDetailDTO>
