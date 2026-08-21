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

/**
 * Ek tasveer ya video.
 *
 * `id` yahan is liye hai ke reseller har tasveer ka ALAG status pack bana sakti hai —
 * POST /status-pack par yehi id `mediaId` ban kar jati hai. Ye product ki apni media
 * row ki id hai, koi supplier ya price ka data nahi.
 */
export const ProductMediaDTO = z
  .object({
    id: z.string(),
    type: z.enum(['IMAGE', 'VIDEO']),
    url: z.string(),
    sortOrder: z.number().int(),
  })
  .strict()

/**
 * Ek variant (size/rang) — Phase 2 tak har product par ek hi hota hai.
 *
 * 🔴 Yahan `listedAt` NAHI hai, aur ye jaan boojh kar: listing ki tareekh product ki
 * hai, variant ki nahi (wo `ResellerProductListItemDTO` par pehle se hai). Pehle ye
 * khaana yahan bhi para tha aur repository usay bharti hi nahi thi — natija ye ke
 * `.strict()` DTO har dafa "Invalid date" par throw karta tha aur POORA product ka
 * safha (yani Content Studio) 500 deta tha.
 */
export const ProductVariantDTO = z
  .object({
    id: z.string(),
    size: z.string().nullable(),
    colour: z.string().nullable(),
    inStock: z.boolean(),
    /** Is jorhe ki apni tasveer — na ho to poore maal wali chalti hai */
    imageUrl: z.string().nullable(),
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
    /** kab list hua — "2 din pehle" */
    listedAt: z.coerce.date(),
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
    /**
     * Kitna maal bacha hai.
     *
     * Sirf haan/na se do piece wala maal poore stock jaisa lagta tha — reseller us par
     * status lagati, teen customer laati, aur do ko mana karna parta. Us mein us ki
     * apni sakh jati hai, jo is kaam ki asal poonji hai.
     */
    stockLeft: z.number().int().nonnegative(),
    listedAt: z.coerce.date(),
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
