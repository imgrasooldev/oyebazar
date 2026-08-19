/**
 * InventoryRepository — maal ki ginti, ek hi jagah.
 *
 * Abhi har product ka ek hi variant hota hai (size/rang Phase 2). Is liye ginti product
 * ke saare variants ka jama hai, aur reserve pehle us variant se hota hai jis mein maal
 * mojood ho.
 */
import type { PrismaClient } from '@prisma/client'
import type { InventoryRepository, StockLevel, StockLine } from '@oyebazar/core'

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
    const variants = await this.db.productVariant.findMany({
      where: { productId: line.productId, stockQty: { gte: line.qty } },
      select: { id: true },
      take: 1,
    })

    const variantId = variants[0]?.id
    if (!variantId) return false

    const { count } = await this.db.productVariant.updateMany({
      where: { id: variantId, stockQty: { gte: line.qty } },
      data: { stockQty: { decrement: line.qty } },
    })

    return count > 0
  }

  async release(line: StockLine): Promise<void> {
    const variant = await this.db.productVariant.findFirst({
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
