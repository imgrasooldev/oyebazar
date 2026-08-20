/**
 * InventoryRepository — maal ki ginti, ek hi jagah.
 *
 * Abhi har product ka ek hi variant hota hai (size/rang Phase 2). Is liye ginti product
 * ke saare variants ka jama hai, aur reserve pehle us variant se hota hai jis mein maal
 * mojood ho.
 */
import type { PrismaClient } from '@prisma/client'
import type {
  InventoryRepository,
  StockLevel,
  StockLine,
  VariantView,
} from '@oyebazar/core'

export class PrismaInventoryRepository implements InventoryRepository {
  constructor(private readonly db: PrismaClient) {}

  /**
   * 🔴 Ek hi atomic update: `stockQty >= qty` shart WHERE mein hai, JS mein nahi.
   *
   * Pehle parhna phir likhna is soorat mein tootta hai: do resellers ek hi lamhe order
   * lagayen, dono ko "5 mojood hai" dikhe, dono 5 nikaal len — aur stock manfi ho jaye.
   * `updateMany` ka count batata hai ke kaam hua ya nahi.
   */
  async reserve(line: StockLine): Promise<boolean> {
    /*
     * Variant bataya gaya ho to WAHI — koi doosra nahi.
     *
     * Pehle yahan hamesha "jis mein maal ho" wala chalta tha, chahe customer ne rang
     * aur size chun rakha ho. Us se ginti aur haqiqat alag ho jate: system kehta laal
     * khatam nahi hua, aur dukan par laal hai hi nahi.
     */
    const variantId = line.variantId
      ? (
          await this.db.productVariant.findFirst({
            where: { id: line.variantId, productId: line.productId, stockQty: { gte: line.qty } },
            select: { id: true },
          })
        )?.id
      : (
          await this.db.productVariant.findFirst({
            where: { productId: line.productId, stockQty: { gte: line.qty } },
            select: { id: true },
          })
        )?.id

    if (!variantId) return false

    const { count } = await this.db.productVariant.updateMany({
      where: { id: variantId, stockQty: { gte: line.qty } },
      data: { stockQty: { decrement: line.qty } },
    })

    return count > 0
  }

  async release(line: StockLine): Promise<void> {
    // Wapas usi variant mein jis se nikla tha — warna order marne par maal ek variant
    // se kam aur doosre mein zyada ho jata hai
    const variant = line.variantId
      ? await this.db.productVariant.findFirst({
          where: { id: line.variantId, productId: line.productId },
          select: { id: true },
        })
      : await this.db.productVariant.findFirst({
          where: { productId: line.productId },
          select: { id: true },
          orderBy: { id: 'asc' },
        })
    if (!variant) return

    await this.db.productVariant.update({
      where: { id: variant.id },
      data: { stockQty: { increment: line.qty } },
    })
  }

  /**
   * Wholesaler ne ginti theek ki.
   *
   * 🔴 supplierId shart mein hai — doosri dukan ka maal chhua nahi ja sakta.
   * @returns false agar maal is dukan ka nahi
   */
  async setQuantity(supplierId: string, productId: string, qty: number): Promise<boolean> {
    const product = await this.db.product.findFirst({
      where: { id: productId, supplierId },
      select: { id: true, variants: { select: { id: true }, take: 1 } },
    })
    if (!product) return false

    const variantId = product.variants[0]?.id

    await this.db.$transaction(async (tx) => {
      if (variantId) {
        await tx.productVariant.update({ where: { id: variantId }, data: { stockQty: qty } })
      } else {
        // Purana maal jis ka variant hi nahi bana tha — ab bana dete hain
        await tx.productVariant.create({
          data: { productId, skuCode: `${productId}-default`, stockQty: qty },
        })
      }

      // Ginti sifar hote hi listing band — warna reseller status lagati rehti hai
      // aur order aakhir mein RTO banta hai
      await tx.product.updateMany({
        where: { id: productId, status: { in: ['LIVE', 'OUT_OF_STOCK'] } },
        data: { status: qty > 0 ? 'LIVE' : 'OUT_OF_STOCK' },
      })
    })

    return true
  }

  // --------------------------------------------------------------- variants

  async listVariants(supplierId: string, productId: string): Promise<VariantView[]> {
    return this.db.productVariant.findMany({
      // supplierId product ke zariye — doosri dukan ka maal yahan se nazar nahi aata
      where: { productId, product: { supplierId } },
      select: { id: true, size: true, colour: true, skuCode: true, stockQty: true },
      orderBy: [{ colour: 'asc' }, { size: 'asc' }],
    })
  }

  async listVariantsFor(
    supplierId: string,
    productIds: readonly string[],
  ): Promise<Map<string, VariantView[]>> {
    if (productIds.length === 0) return new Map()

    const rows = await this.db.productVariant.findMany({
      where: { productId: { in: [...productIds] }, product: { supplierId } },
      select: {
        id: true,
        productId: true,
        size: true,
        colour: true,
        skuCode: true,
        stockQty: true,
      },
      orderBy: [{ colour: 'asc' }, { size: 'asc' }],
    })

    const byProduct = new Map<string, VariantView[]>()
    for (const { productId, ...variant } of rows) {
      const list = byProduct.get(productId) ?? []
      list.push(variant)
      byProduct.set(productId, list)
    }
    return byProduct
  }

  async addVariant(input: {
    supplierId: string
    productId: string
    size: string | null
    colour: string | null
    skuCode: string
    stockQty: number
  }): Promise<VariantView | null> {
    const product = await this.db.product.findFirst({
      where: { id: input.productId, supplierId: input.supplierId },
      select: { id: true },
    })
    if (!product) return null

    const created = await this.db.productVariant.create({
      data: {
        productId: input.productId,
        size: input.size,
        colour: input.colour,
        skuCode: input.skuCode,
        stockQty: input.stockQty,
      },
      select: { id: true, size: true, colour: true, skuCode: true, stockQty: true },
    })

    // Naya maal aate hi listing wapas chalu — warna "out of stock" laga rehta
    if (input.stockQty > 0) {
      await this.db.product.updateMany({
        where: { id: input.productId, status: 'OUT_OF_STOCK' },
        data: { status: 'LIVE' },
      })
    }

    return created
  }

  async updateVariant(input: {
    supplierId: string
    variantId: string
    size?: string | null
    colour?: string | null
    stockQty?: number
  }): Promise<boolean> {
    const { count } = await this.db.productVariant.updateMany({
      where: { id: input.variantId, product: { supplierId: input.supplierId } },
      data: {
        ...(input.size === undefined ? {} : { size: input.size }),
        ...(input.colour === undefined ? {} : { colour: input.colour }),
        ...(input.stockQty === undefined ? {} : { stockQty: input.stockQty }),
      },
    })
    if (count === 0) return false

    // Poore maal ki halat variants ke jama se banti hai, kisi ek se nahi
    const variant = await this.db.productVariant.findUnique({
      where: { id: input.variantId },
      select: { productId: true },
    })
    if (variant) await this.syncProductStatus(variant.productId)

    return true
  }

  async removeVariant(
    supplierId: string,
    variantId: string,
  ): Promise<'removed' | 'in-use' | 'not-found'> {
    const variant = await this.db.productVariant.findFirst({
      where: { id: variantId, product: { supplierId } },
      select: { id: true, productId: true },
    })
    if (!variant) return 'not-found'

    /*
     * 🔴 Jis variant par order ho chuka ho wo mitta nahi.
     *
     * Purane order us ki id se jure hain; mit jaye to order ki qatar par "kaun sa rang"
     * ka jawab hamesha ke liye gum ho jata hai — aur wahi sawal jhagre mein poochha
     * jata hai.
     */
    const used = await this.db.orderItem.count({ where: { variantId } })
    if (used > 0) return 'in-use'

    await this.db.productVariant.delete({ where: { id: variantId } })
    await this.syncProductStatus(variant.productId)
    return 'removed'
  }

  /** Maal LIVE hai ya OUT_OF_STOCK — faisla saare variants ke jama se. */
  private async syncProductStatus(productId: string): Promise<void> {
    const total = await this.db.productVariant.aggregate({
      where: { productId },
      _sum: { stockQty: true },
    })

    await this.db.product.updateMany({
      where: { id: productId, status: { in: ['LIVE', 'OUT_OF_STOCK'] } },
      data: { status: (total._sum.stockQty ?? 0) > 0 ? 'LIVE' : 'OUT_OF_STOCK' },
    })
  }

  async levelsFor(productIds: readonly string[]): Promise<StockLevel[]> {
    if (productIds.length === 0) return []

    const grouped = await this.db.productVariant.groupBy({
      by: ['productId'],
      where: { productId: { in: [...productIds] } },
      _sum: { stockQty: true },
    })

    return grouped.map((row) => ({
      productId: row.productId,
      available: row._sum.stockQty ?? 0,
    }))
  }
}
