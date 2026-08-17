/**
 * DailyDropService — "آج کا اسٹیٹس پیک".
 *
 * Supplier ka number ek baar milta hai; status pack HAR ROZ chahiye. Isi liye ye
 * business hai, phone book nahi. Ye service us "har roz" ko banati hai.
 *
 * Curation ke qawaid jaan boojh kar saaday hain (Phase 1 mein 500 SKUs par manual
 * curation behtar hai, AI nahi):
 *   1. Sirf LIVE aur stock wale items
 *   2. Jo pichhle 14 din mein ja chuka, wo nahi — warna "kuch naya nahi aaya"
 *   3. Categories mila kar — 5 mein se 5 lawn bhejna kisi ke kaam nahi aata
 *   4. Tarteeb deterministic — ek hi din do martaba chalane par wohi list bane
 */
import { NotFoundError, type Pkr } from '@oyebazar/shared'
import type { DailyDropView, DailyPackItem } from '../domain/daily-drop'
import type { DailyDropRepository } from '../ports/daily-drop-repositories'
import type { ProductRepository, ResellerPricingRepository, StatusPackRepository } from '../ports/repositories'
import type { Clock, Logger } from '../ports/infrastructure'

export const DROP_SIZE = 5
export const REPEAT_WINDOW_DAYS = 14

export class DailyDropService {
  constructor(
    private readonly drops: DailyDropRepository,
    private readonly products: ProductRepository,
    private readonly pricing: ResellerPricingRepository,
    private readonly statusPacks: StatusPackRepository,
    private readonly clock: Clock,
    private readonly logger: Logger,
  ) {}

  /** Aaj ka drop — na ho to bana deta hai (idempotent: dobara chalane par wohi drop). */
  async ensureTodaysDrop(date?: Date): Promise<DailyDropView> {
    const dropDate = startOfDay(date ?? this.clock.now())

    const existing = await this.drops.findByDate(dropDate)
    if (existing) return existing

    const since = new Date(dropDate.getTime() - REPEAT_WINDOW_DAYS * 24 * 60 * 60 * 1000)
    const recentlyDropped = new Set(await this.drops.findRecentlyDroppedProductIds(since))

    // Zyada laate hain taake filter ke baad bhi 5 bach jayen
    const candidates = await this.products.findResellerList({
      limit: DROP_SIZE * 12,
      inStockOnly: true,
    })

    const fresh = candidates.items.filter((p) => !recentlyDropped.has(p.id))
    const pool = fresh.length >= DROP_SIZE ? fresh : candidates.items

    // Category-wise ek ek kar ke — variety khud ba khud aa jati hai, koi random nahi
    const byCategory = new Map<string, typeof pool>()
    for (const product of pool) {
      const list = byCategory.get(product.category.slug) ?? []
      list.push(product)
      byCategory.set(product.category.slug, list)
    }

    const picked: string[] = []
    let round = 0
    while (picked.length < DROP_SIZE) {
      let addedThisRound = false
      for (const list of byCategory.values()) {
        const product = list[round]
        if (!product) continue
        picked.push(product.id)
        addedThisRound = true
        if (picked.length === DROP_SIZE) break
      }
      if (!addedThisRound) break
      round += 1
    }

    if (picked.length === 0) {
      throw new NotFoundError('Aaj ke drop ke liye koi item')
    }

    const drop = await this.drops.create(dropDate, picked)
    this.logger.info('daily_drop_created', {
      dropDate: dropDate.toISOString(),
      items: picked.length,
      freshPool: fresh.length,
    })
    return drop
  }

  async getTodaysDrop(date?: Date): Promise<DailyDropView | null> {
    return this.drops.findByDate(startOfDay(date ?? this.clock.now()))
  }

  /**
   * Reseller ke liye aaj ka pack — us ke apne price ke saath, aur agar pack pehle se
   * render ho chuka hai to seedha image URL (raat ki pre-generation ka faida yahin milta hai).
   */
  async packsForReseller(
    resellerId: string,
    templateKey: string,
    date?: Date,
  ): Promise<DailyPackItem[]> {
    const drop = await this.getTodaysDrop(date)
    if (!drop) return []

    const prices = await this.pricing.findMany(resellerId, drop.productIds)

    const items = await Promise.all(
      drop.productIds.map(async (productId) => {
        const product = await this.products.findResellerById(productId)
        if (!product) return null

        const myPrice: Pkr = prices.get(productId) ?? product.suggestedRetail
        const pack = await this.statusPacks.findByCacheKey({
          resellerId,
          productId,
          templateKey,
          priceUsed: myPrice,
        })

        return {
          productId,
          titleUr: product.titleUr,
          coverImageUrl: product.coverImageUrl,
          bajiPrice: product.bajiPrice,
          myPrice,
          imageUrl: pack?.imageUrl ?? null,
        } satisfies DailyPackItem
      }),
    )

    return items.filter((item): item is DailyPackItem => item !== null)
  }

  markSent(dropId: string, sentCount: number): Promise<void> {
    return this.drops.markSent(dropId, this.clock.now(), sentCount)
  }
}

/** UTC midnight — dropDate ek DATE column hai, waqt ka is se koi taalluq nahi. */
export function startOfDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}
