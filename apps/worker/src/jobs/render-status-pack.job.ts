/**
 * Job: ek status pack render kar ke storage par rakhta hai aur DB update karta hai.
 *
 * Idempotent: agar pack pehle se rendered hai to foran wapas — BullMQ retry ya
 * duplicate enqueue se dobara render nahi hota (roz ke 10,000 renders par ye paisa bachata hai).
 */
import type { Logger, ObjectStorage, RenderStatusPackJob } from '@oyebazar/core'
import type { Repositories } from '@oyebazar/db'
import { pkr } from '@oyebazar/shared'
import type { StatusPackRenderer } from '../render/render-status-pack'

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

  const existing = await repositories.statusPacks.findByCacheKey({
    resellerId: job.resellerId,
    productId: job.productId,
    templateKey: job.templateKey,
    priceUsed: pkr(job.priceUsed),
    format,
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

  const rendered = await renderer.render(
    job.templateKey,
    {
      titleUr: product.titleUr,
      categoryNameUr: product.categoryNameUr,
      price: pkr(job.priceUsed),
      resellerName: reseller.name,
      resellerPhone: reseller.whatsappPhone,
      photoUrl: product.coverImageUrl,
    },
    format,
  )

  // key mein price aur naap dono — wohi cache key jo DB constraint mein hai. Naap na ho
  // to chokor pack lambe wali file ko storage par overwrite kar deta.
  const key = `packs/${job.resellerId}/${job.productId}-${job.templateKey}-${job.priceUsed}-${format}.${rendered.extension}`
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
