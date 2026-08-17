import { z } from 'zod'
import { STATUS_PACK_TEMPLATES } from '../constants'

export const TemplateKeySchema = z.enum(STATUS_PACK_TEMPLATES)

/**
 * Status pack — hamara asal product.
 * `status` isliye hai ke render on-demand ho sakta hai (cache miss par queue mein jata hai).
 */
export const StatusPackDTO = z
  .object({
    id: z.string(),
    productId: z.string(),
    templateKey: TemplateKeySchema,
    /** wo price jo image par chhapa hai */
    priceUsed: z.number().int().nonnegative(),
    status: z.enum(['READY', 'RENDERING']),
    imageUrl: z.string().nullable(),
    /** WhatsApp par paste karne ke liye tayyar caption */
    caption: z.string(),
    generatedAt: z.string().nullable(),
  })
  .strict()

export const TemplateOptionDTO = z
  .object({
    key: TemplateKeySchema,
    nameUr: z.string(),
    previewUrl: z.string().nullable(),
  })
  .strict()

export type StatusPack = z.infer<typeof StatusPackDTO>
export type TemplateOption = z.infer<typeof TemplateOptionDTO>
