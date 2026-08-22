import { z } from 'zod'
import { STATUS_PACK_TEMPLATES } from '../constants'

/**
 * Template ki key — ya to built-in ka naam (`sale`), ya reseller ka apna
 * (`custom:<id>@<revision>`).
 *
 * Dono ek hi khaane mein rehte hain, is liye cache key, queue ka job aur DB ka column —
 * kisi ko is farq ka pata nahi chalta.
 *
 * 🔴 Custom wali shakl sakht hai (sirf harf, hindse, `@`): ye qadar aage chal kar
 * storage ki file ke naam mein jati hai, aur `/` ya `..` wahan raste badal sakta hai.
 */
export const TemplateKeySchema = z.union([
  z.enum(STATUS_PACK_TEMPLATES),
  z.string().regex(/^custom:[a-z0-9]{1,40}@\d{1,6}$/i, 'Template ki key theek nahi'),
])

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
    /** Kis tasveer ka kit hai — UI polling isi ko wapas bhejti hai. */
    mediaId: z.string().nullable(),
    templateKey: TemplateKeySchema,
    /**
     * Is kit ke faislon ka nishan — UI polling par wapas bhejta hai.
     *
     * Default par khali string. Reseller ka likha hua naam is mein aa sakta hai, is liye
     * ye sirf usi ke apne response mein jata hai — kisi public surface par nahi.
     */
    optionsKey: z.string(),
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
