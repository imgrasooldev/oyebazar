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
import {
  KIT_FORMATS,
  NotFoundError,
  PACK_PLATFORMS,
  PACK_PLATFORM_KEYS,
  buildCaption,
  formatPkr,
  type CaptionScript,
  type PackFormatKey,
  type PackPlatformKey,
  type Pkr,
} from '@oyebazar/shared'
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
  /** Kaun sa naap — na batayen to WhatsApp status (9:16). */
  readonly format?: PackFormatKey
}

/**
 * Poori kit — ek product, chaar naap, aur har platform ka apna caption.
 *
 * `assets` mein har naap ki apni halat hoti hai: koi cache se foran mil jata hai, koi
 * abhi ban raha hota hai. UI ko intezar poore kit ka nahi karna parta — jo tayyar hai
 * wo foran download ho sakta hai.
 */
export interface StatusPackKitResult {
  readonly assets: readonly {
    readonly format: PackFormatKey
    readonly pack: StatusPackView
    readonly status: 'READY' | 'RENDERING'
  }[]
  readonly captions: Readonly<Record<PackPlatformKey, string>>
  readonly platforms: readonly {
    readonly key: PackPlatformKey
    readonly formats: readonly PackFormatKey[]
  }[]
  readonly priceUsed: Pkr
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
      format: cmd.format ?? 'story',
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
      format: cacheKey.format,
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

  /**
   * ⭐ Poori kit — ek dafa maango, har platform ke liye tayyar.
   *
   * Chaaron naap ek saath: jo cache mein hai wo foran, baqi queue par. Ek naap ka
   * render fail ho to baqi rukte nahi — reseller ko WhatsApp wala pack mil jata hai
   * chahe Facebook wala abhi ban raha ho.
   *
   * Captions bhi yahin bante hain (shared/pack-kit.ts se), taake mobile app aane par
   * wohi text bina dobara likhe mil jaye.
   */
  async generateKit(
    cmd: Omit<GenerateStatusPackCommand, 'format'>,
    reseller: ResellerView,
    /** Caption kis likhawat mein — reseller ki chuni hui zaban se aata hai */
    script: CaptionScript = 'ur',
  ): Promise<StatusPackKitResult> {
    const product = await this.products.findForRender(cmd.productId)
    if (!product) throw new NotFoundError('Product', cmd.productId)

    const priceUsed = await this.pricingService.resolvePriceForPack(
      cmd.resellerId,
      cmd.productId,
      cmd.retailPrice,
    )

    const base = {
      resellerId: cmd.resellerId,
      productId: cmd.productId,
      templateKey: cmd.templateKey,
      priceUsed,
    }

    // Ek hi query mein poori kit — chaar alag lookup network par chaar chakkar hote
    const existing = await this.packs.findKit(base)
    const byFormat = new Map(existing.map((pack) => [pack.format, pack]))

    const assets = await Promise.all(
      KIT_FORMATS.map(async (format) => {
        const cached = byFormat.get(format)
        if (cached?.imageUrl) return { format, pack: cached, status: 'READY' as const }

        const pending = cached ?? (await this.packs.create({ ...base, format, imageUrl: null }))
        await this.queue.enqueue({
          statusPackId: pending.id,
          resellerId: cmd.resellerId,
          productId: cmd.productId,
          templateKey: cmd.templateKey,
          priceUsed,
          format,
        })
        return { format, pack: pending, status: 'RENDERING' as const }
      }),
    )

    await this.analytics.track({
      name: 'status_pack_kit_requested',
      actorType: 'reseller',
      actorId: cmd.resellerId,
      properties: {
        productId: cmd.productId,
        templateKey: cmd.templateKey,
        ready: assets.filter((asset) => asset.status === 'READY').length,
      },
    })

    return {
      assets,
      captions: this.buildCaptions(product, priceUsed, reseller, script),
      platforms: PACK_PLATFORM_KEYS.map((key) => ({
        key,
        formats: PACK_PLATFORMS[key].formats,
      })),
      priceUsed,
    }
  }

  /** Kit ki halat — UI polling ke liye. Naya render shuru nahi karta. */
  async getKitStatus(
    reseller: ResellerView,
    key: { productId: string; templateKey: string; priceUsed: Pkr },
    script: CaptionScript = 'ur',
  ): Promise<StatusPackKitResult | null> {
    const existing = await this.packs.findKit({ resellerId: reseller.id, ...key })
    if (existing.length === 0) return null

    const product = await this.products.findForRender(key.productId)
    if (!product) throw new NotFoundError('Product', key.productId)

    const byFormat = new Map(existing.map((pack) => [pack.format, pack]))

    return {
      assets: KIT_FORMATS.flatMap((format) => {
        const pack = byFormat.get(format)
        return pack ? [{ format, pack, status: pack.imageUrl ? ('READY' as const) : ('RENDERING' as const) }] : []
      }),
      captions: this.buildCaptions(product, key.priceUsed, reseller, script),
      platforms: PACK_PLATFORM_KEYS.map((platform) => ({
        key: platform,
        formats: PACK_PLATFORMS[platform].formats,
      })),
      priceUsed: key.priceUsed,
    }
  }

  /** UI polling — render hone tak har 800ms. */
  async getStatus(
    reseller: ResellerView,
    key: { productId: string; templateKey: string; priceUsed: Pkr; format?: PackFormatKey },
  ): Promise<StatusPackResult | null> {
    const pack = await this.packs.findByCacheKey({
      resellerId: reseller.id,
      ...key,
      format: key.format ?? 'story',
    })
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

  /** Har platform ka apna caption — mizaj alag hai, is liye text bhi alag. */
  private buildCaptions(
    product: RenderProductView,
    price: Pkr,
    reseller: ResellerView,
    script: CaptionScript = 'ur',
  ): Record<PackPlatformKey, string> {
    const input = {
      titleUr: product.titleUr,
      titleEn: product.titleEn,
      priceText: formatPkr(price),
      resellerName: reseller.name,
      resellerPhone: reseller.whatsappPhone,
      city: reseller.city,
    }

    return Object.fromEntries(
      PACK_PLATFORM_KEYS.map((platform) => [platform, buildCaption(platform, input, script)]),
    ) as Record<PackPlatformKey, string>
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
