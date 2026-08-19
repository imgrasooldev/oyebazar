/**
 * Supplier DTOs.
 *
 * 🔴 Sirf PUBLIC shape maujood hai — reseller-facing kisi bhi response mein supplier
 * ka data (id, naam, phone, NTN) nahi jata. Reseller ko sirf Baji dikhta hai.
 *
 * Bazaar par supplier ka WhatsApp number JAAN BOOJH KAR public hai — ye directory
 * ki value hai, aur isi wajah se Bazaar muft rehta hai (koi fee, koi order button nahi).
 */
import { z } from 'zod'

export const PublicSupplierListItemDTO = z
  .object({
    slug: z.string(),
    businessName: z.string(),
    city: z.string(),
    marketName: z.string().nullable(),
    /** dono zubanein — UI locale ke hisaab se chunta hai */
    categories: z.array(z.object({ nameUr: z.string(), nameEn: z.string() }).strict()),
    logoUrl: z.string().nullable(),
    productCount: z.number().int().nonnegative(),
    /** ISO string — DTO JSON par bhi chalta hai, Date object sirf server par */
    memberSince: z.coerce.date(),
    lastListedAt: z.coerce.date().nullable(),
  })
  .strict()

export const PublicSupplierDetailDTO = PublicSupplierListItemDTO.extend({
  bioUr: z.string().nullable(),
  /** public directory ka maqsad hi yehi hai */
  whatsappPublic: z.string(),
  address: z.string().nullable(),
}).strict()

export type PublicSupplierListItem = z.infer<typeof PublicSupplierListItemDTO>
export type PublicSupplierDetail = z.infer<typeof PublicSupplierDetailDTO>
