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

/**
 * Poori kit — chaar naap + har platform ka caption.
 *
 * 🔴 `.strict()` yahan bhi: kal koi service galti se supplierPrice is response mein
 * daal de to runtime par THROW hoga, khamoshi se leak nahi hoga.
 */
export const PackKitAssetDTO = z
  .object({
    format: z.enum(['story', 'square', 'portrait', 'wide']),
    /** Naap — UI par "1080×1920" dikhane ke liye, aur download filename mein bhi */
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    labelUr: z.string(),
    labelEn: z.string(),
    status: z.enum(['READY', 'RENDERING']),
    imageUrl: z.string().nullable(),
    packId: z.string(),
  })
  .strict()

export const PackKitDTO = z
  .object({
    productId: z.string(),
    templateKey: TemplateKeySchema,
    priceUsed: z.number().int().nonnegative(),
    assets: z.array(PackKitAssetDTO),
    /** platform → us ke kaam ke naap, tarteeb se (pehla sab se aam) */
    platforms: z.array(
      z
        .object({
          key: z.enum(['whatsapp', 'instagram', 'facebook', 'tiktok']),
          labelUr: z.string(),
          labelEn: z.string(),
          formats: z.array(z.enum(['story', 'square', 'portrait', 'wide'])),
          caption: z.string(),
        })
        .strict(),
    ),
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
export type PackKit = z.infer<typeof PackKitDTO>
export type PackKitAsset = z.infer<typeof PackKitAssetDTO>
export type TemplateOption = z.infer<typeof TemplateOptionDTO>
