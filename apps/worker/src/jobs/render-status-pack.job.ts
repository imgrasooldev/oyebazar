/**
 * Job: ek status pack render kar ke storage par rakhta hai aur DB update karta hai.
 *
 * Idempotent: agar pack pehle se rendered hai to foran wapas — BullMQ retry ya
 * duplicate enqueue se dobara render nahi hota (roz ke 10,000 renders par ye paisa bachata hai).
 */
import { createHash } from 'node:crypto'
import type { Logger, ObjectStorage, RenderStatusPackJob } from '@oyebazar/core'
import type { Repositories } from '@oyebazar/db'
import { packOptionsFrom, packOptionsKey, pkr } from '@oyebazar/shared'
import type { StatusPackRenderer } from '../render/render-status-pack'

/**
 * optionsKey ko file ke naam ka mehfooz hissa banata hai.
 *
 * Default (khali key) par khali string — yani pehle se mojood har file ka naam waisa ka
 * waisa rehta hai aur koi pack dobara render nahi hota.
 */
function optionsFilePart(optionsKey: string): string {
  if (!optionsKey) return ''
  return `-${createHash('sha1').update(optionsKey).digest('hex').slice(0, 10)}`
}

export interface RenderJobDeps {
  readonly repositories: Repositories
  readonly renderer: StatusPackRenderer
  readonly storage: ObjectStorage
  readonly logger: Logger
}

export async function handleRenderStatusPack(
  job: RenderStatusPackJob,
  deps: RenderJobDeps,
): Promise<{ imageUrl: string; cached: boolean }> {
  const { repositories, renderer, storage, logger } = deps

  // Purane job (jo migration se pehle queue mein pare the) par format nahi hota — wo sab
  // WhatsApp status the, is liye 'story'
  const format = job.format ?? 'story'
  // Purane job par mediaId nahi hota — wo sab cover par bante the
  const mediaId = job.mediaId ?? ''
  // Purane job par options bhi nahi hoti — default (Urdu, sab kuch dikhta hua), jo unka
  // purana bartao hai. `packOptionsKey` un par khali string deta hai, yani wohi purani key.
  const options = packOptionsFrom(job.options)

  const existing = await repositories.statusPacks.findByCacheKey({
    resellerId: job.resellerId,
    productId: job.productId,
    mediaId,
    templateKey: job.templateKey,
    priceUsed: pkr(job.priceUsed),
    format,
    optionsKey: packOptionsKey(options),
  })

  if (existing?.imageUrl) {
    logger.info('render_skipped_already_done', { statusPackId: job.statusPackId })
    return { imageUrl: existing.imageUrl, cached: true }
  }

  const [product, reseller] = await Promise.all([
    repositories.products.findForRender(job.productId),
    repositories.resellers.findById(job.resellerId),
  ])

  if (!product) throw new Error(`Product nahi mila: ${job.productId}`)
  if (!reseller) throw new Error(`Reseller nahi mili: ${job.resellerId}`)

  /*
   * Kaunsi tasveer render par jayegi.
   *
   * mediaId enqueue ke waqt service jaanch chuki hoti hai. Yahan phir bhi cover par
   * girte hain (throw nahi karte): tasveer job queue mein parne ke baad delete ho sakti
   * hai, aur us soorat mein pack ka na banna reseller ke liye khali jagah chhorta hai —
   * jabke cover wala pack us ke kaam ka hai.
   */
  const photoUrl = mediaId
    ? (product.images.find((image) => image.id === mediaId)?.url ?? product.coverImageUrl)
    : product.coverImageUrl

  /*
   * Naam aur number: reseller ka apna likha hua pehle, warna profile wala.
   *
   * `showName`/`showPhone` false hon to yahan khali string jati hai aur template us
   * hisse ko chhupa deta hai (dekhen base.css ka `.hide-*`).
   */
  const rendered = await renderer.render(
    job.templateKey,
    {
      titleUr: product.titleUr,
      titleEn: product.titleEn,
      categoryNameUr: product.categoryNameUr,
      price: pkr(job.priceUsed),
      resellerName: options.name ?? reseller.name,
      resellerPhone: options.phone ?? reseller.whatsappPhone,
      photoUrl,
    },
    format,
    options,
  )

  // key mein price aur naap dono — wohi cache key jo DB constraint mein hai. Naap na ho
  // to chokor pack lambe wali file ko storage par overwrite kar deta.
  // key mein mediaId bhi — warna ek hi product ki do tasveeron ke pack storage par
  // ek doosre ko overwrite kar dete
  const mediaPart = mediaId ? `-${mediaId}` : ''
  /*
   * optionsKey bhi file ke naam mein — DB ki cache key ka har hissa yahan hona chahiye.
   *
   * Warna "number ke saath" aur "number ke baghair" wale pack ek hi file par likhte hain
   * aur jo baad mein bane wo pehle wale ko mita deta hai. Storage par safe rakhne ke liye
   * hash: optionsKey mein reseller ka likha hua naam aa sakta hai (Urdu, space, `/`).
   */
  const optionsPart = job.options ? optionsFilePart(packOptionsKey(options)) : ''
  const key = `packs/${job.resellerId}/${job.productId}${mediaPart}-${job.templateKey}-${job.priceUsed}-${format}${optionsPart}.${rendered.extension}`
  const stored = await storage.upload(key, rendered.image, rendered.contentType)

  await repositories.statusPacks.markRendered(job.statusPackId, stored.url, new Date())

  logger.info('render_job_done', {
    statusPackId: job.statusPackId,
    format,
    durationMs: rendered.durationMs,
    bytes: rendered.bytes,
  })

  return { imageUrl: stored.url, cached: false }
}
