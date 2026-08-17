/**
 * ⭐ StatusPackService — Content Studio ka dimagh. Hamara wahid differentiator.
 *
 * Flow: reseller product par "Status Pack banayen" dabati hai
 *   → price tay hota hai (slider ya saved price)
 *   → CACHE dekha jata hai (resellerId + productId + template + price)
 *   → mile to foran image (target <200ms)
 *   → na mile to render queue par job, UI polling karti hai (p95 <2s)
 *
 * Render khud yahan nahi hota — wo worker ka kaam hai (Playwright ko long-running
 * process aur ~1GB memory chahiye). Ye service sirf faisla karti hai.
 */
import { NotFoundError, type Pkr, formatPkr } from '@oyebazar/shared'
import type { RenderProductView, ResellerView, StatusPackView } from '../domain/views'
import type {
  ProductRepository,
  ResellerPricingRepository,
  StatusPackRepository,
} from '../ports/repositories'
import type { Analytics, Clock, RenderQueue } from '../ports/infrastructure'
import type { PricingService } from './pricing.service'

export interface GenerateStatusPackCommand {
  readonly resellerId: string
  readonly productId: string
  readonly templateKey: string
  /** slider se aaya hua price; na ho to saved/suggested use hoga */
  readonly retailPrice?: Pkr
}

export interface StatusPackResult {
  readonly pack: StatusPackView
  readonly status: 'READY' | 'RENDERING'
  /** WhatsApp par paste karne ke liye tayyar caption — reseller ko dobara type na karna pare */
  readonly caption: string
}

export class StatusPackService {
  constructor(
    private readonly packs: StatusPackRepository,
    private readonly products: ProductRepository,
    private readonly pricingRepo: ResellerPricingRepository,
    private readonly pricingService: PricingService,
    private readonly queue: RenderQueue,
    private readonly clock: Clock,
    private readonly analytics: Analytics,
  ) {}

  async generate(
    cmd: GenerateStatusPackCommand,
    reseller: ResellerView,
  ): Promise<StatusPackResult> {
    const product = await this.products.findForRender(cmd.productId)
    if (!product) throw new NotFoundError('Product', cmd.productId)

    const priceUsed = await this.pricingService.resolvePriceForPack(
      cmd.resellerId,
      cmd.productId,
      cmd.retailPrice,
    )

    const cacheKey = {
      resellerId: cmd.resellerId,
      productId: cmd.productId,
      templateKey: cmd.templateKey,
      priceUsed,
    }

    // 1. Cache — DB ka unique constraint hi cache key hai. Wohi price + wohi template = wohi image.
    const cached = await this.packs.findByCacheKey(cacheKey)
    if (cached?.imageUrl) {
      await this.analytics.track({
        name: 'status_pack_served_from_cache',
        actorType: 'reseller',
        actorId: cmd.resellerId,
        properties: { productId: cmd.productId, templateKey: cmd.templateKey },
      })
      return { pack: cached, status: 'READY', caption: this.buildCaption(product, priceUsed, reseller) }
    }

    // 2. Cache miss — row pehle banti hai (idempotency), phir render queue par jata hai
    const pending = cached ?? (await this.packs.create({ ...cacheKey, imageUrl: null }))

    await this.queue.enqueue({
      statusPackId: pending.id,
      resellerId: cmd.resellerId,
      productId: cmd.productId,
      templateKey: cmd.templateKey,
      priceUsed,
    })

    await this.analytics.track({
      name: 'status_pack_requested',
      actorType: 'reseller',
      actorId: cmd.resellerId,
      properties: { productId: cmd.productId, templateKey: cmd.templateKey, priceUsed },
    })

    return {
      pack: pending,
      status: 'RENDERING',
      caption: this.buildCaption(product, priceUsed, reseller),
    }
  }

  /** UI polling — render hone tak har 800ms. */
  async getStatus(
    reseller: ResellerView,
    key: { productId: string; templateKey: string; priceUsed: Pkr },
  ): Promise<StatusPackResult | null> {
    const pack = await this.packs.findByCacheKey({ resellerId: reseller.id, ...key })
    if (!pack) return null

    const product = await this.products.findForRender(key.productId)
    if (!product) throw new NotFoundError('Product', key.productId)

    return {
      pack,
      status: pack.imageUrl ? 'READY' : 'RENDERING',
      caption: this.buildCaption(product, key.priceUsed, reseller),
    }
  }

  /** Download button — ye #1 north-star metric feed karta hai (packs shared per week). */
  async markDownloaded(packId: string): Promise<void> {
    await this.packs.markDownloaded(packId, this.clock.now())
    await this.analytics.track({
      name: 'status_pack_downloaded',
      actorType: 'reseller',
      properties: { packId },
    })
  }

  private buildCaption(product: RenderProductView, price: Pkr, reseller: ResellerView): string {
    const lines = [
      product.titleUr,
      `قیمت: ${formatPkr(price)}`,
      'آرڈر کے لیے میسج کریں 👇',
    ]
    if (reseller.whatsappPhone) lines.push(`wa.me/${reseller.whatsappPhone}`)
    return lines.join('\n')
  }
}
