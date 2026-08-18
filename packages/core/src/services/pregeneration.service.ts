/**
 * PregenerationService — raat 3 baje ka kaam.
 *
 * Subah 9 baje jab 500 resellers ek saath app kholti hain, us waqt render karna do wajah
 * se bura hai: (1) sab ko intezar karna parta hai, (2) worker ek hi lamhe mein doob jata hai.
 * Isliye raat ko chup chaap sab kuch bana kar rakh dete hain — subah sirf cache hit hota hai (<200ms).
 *
 * Paimana: 2,000 resellers × 5 products = 10,000 renders. 6 parallel × ~900ms ≈ 25 minute.
 *
 * 🔴 Idempotent: dobara chalane par pehle se bane hue packs skip ho jate hain (DB ka unique
 * constraint hi cache key hai), isliye retry sasta hai.
 */
import { pkr } from '@oyebazar/shared'
import type { DailyDropView } from '../domain/daily-drop'
import type { BroadcastAudienceRepository } from '../ports/daily-drop-repositories'
import type { ProductRepository, ResellerPricingRepository, StatusPackRepository } from '../ports/repositories'
import type { Logger, RenderQueue } from '../ports/infrastructure'

const AUDIENCE_PAGE_SIZE = 100

export interface PregenerationResult {
  readonly resellers: number
  readonly queued: number
  readonly alreadyReady: number
}

export class PregenerationService {
  constructor(
    private readonly audience: BroadcastAudienceRepository,
    private readonly pricing: ResellerPricingRepository,
    private readonly statusPacks: StatusPackRepository,
    private readonly products: ProductRepository,
    private readonly renderQueue: RenderQueue,
    private readonly logger: Logger,
  ) {}

  async pregenerate(
    drop: DailyDropView,
    options: { templateKey: string; activeSince?: Date },
  ): Promise<PregenerationResult> {
    let resellers = 0
    let queued = 0
    let alreadyReady = 0
    let cursor: string | null = null

    // Suggested prices ek baar — har reseller ke liye dobara nikalna 10,000 queries hai
    const suggested = new Map<string, number>()
    for (const productId of drop.productIds) {
      const product = await this.products.findResellerById(productId)
      if (product) suggested.set(productId, product.suggestedRetail)
    }

    do {
      const page = await this.audience.listActive({
        limit: AUDIENCE_PAGE_SIZE,
        ...(cursor ? { cursor } : {}),
        ...(options.activeSince ? { activeSince: options.activeSince } : {}),
      })

      for (const reseller of page.recipients) {
        resellers += 1
        const prices = await this.pricing.findMany(reseller.id, drop.productIds)

        for (const productId of drop.productIds) {
          const priceUsed = prices.get(productId) ?? suggested.get(productId)
          if (priceUsed === undefined) continue

          const key = {
            resellerId: reseller.id,
            productId,
            templateKey: options.templateKey,
            priceUsed: pkr(priceUsed),
            // Raat ko sirf story (9:16) — yehi 9 baje broadcast mein jata hai. Baqi naap
            // reseller ke maangne par bante hain, warna har raat chaar guna render.
            format: 'story' as const,
          }

          const existing = await this.statusPacks.findByCacheKey(key)
          if (existing?.imageUrl) {
            alreadyReady += 1
            continue
          }

          const pack = existing ?? (await this.statusPacks.create({ ...key, imageUrl: null }))
          await this.renderQueue.enqueue({
            statusPackId: pack.id,
            resellerId: reseller.id,
            productId,
            templateKey: options.templateKey,
            priceUsed,
            format: 'story',
          })
          queued += 1
        }
      }

      cursor = page.nextCursor
    } while (cursor)

    this.logger.info('pregeneration_done', {
      dropId: drop.id,
      resellers,
      queued,
      alreadyReady,
    })

    return { resellers, queued, alreadyReady }
  }
}
