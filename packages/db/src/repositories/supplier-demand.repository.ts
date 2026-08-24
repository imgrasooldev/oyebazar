/**
 * SupplierDemandRepository — wholesaler ko ye batana ke yahan hone ka faida kya hai.
 *
 * 🔴 Order ki ginti us sawal ka sirf AADHA jawab hai.
 *
 * Wholesaler ka pehla sawal ye hota hai: "main yahan kyun list karun?" Agar usay sirf
 * order dikhaye jayen to naye maal par wo hamesha sifar dekhega aur samjhega ke kuch ho
 * hi nahi raha. Doosra aadha ye hai ke us ka maal kitni reseller tak POHANCHA — aur us
 * ka saboot status pack hai: pack bana matlab kisi ne us maal ko apne customer ke
 * saamne rakhne ka faisla kiya, chahe order abhi na aaya ho.
 *
 * Yehi wo number hai jo usay maal barhane par majboor karta hai.
 */
import type { PrismaClient } from '@prisma/client'
import type { SupplierDemandRepository, SupplierDemandView } from '@oyebazar/core'

/** Rad aur wapas aaye order shaamil nahi — wo "demand" nahi, us ka ulta hain. */
const REAL_ORDERS = [
  'CONFIRMED',
  'SENT_TO_SUPPLIER',
  'ACCEPTED',
  'PACKED',
  'DISPATCHED',
  'DELIVERED',
] as const

export class PrismaSupplierDemandRepository implements SupplierDemandRepository {
  constructor(private readonly db: PrismaClient) {}

  async demand(supplierId: string, since: Date): Promise<SupplierDemandView> {
    /*
     * `StatusPack` par `supplierId` nahi hota — wo maal se juda hai, dukan se nahi.
     * Is liye pehle is dukan ka maal, phir un par bane hue pack.
     */
    const products = await this.db.product.findMany({
      where: { supplierId },
      select: { id: true },
    })
    const productIds = products.map((p) => p.id)

    if (productIds.length === 0) {
      return { resellers: 0, packs: 0, packsDownloaded: 0, orders: 0, delivered: 0 }
    }

    const [packRows, packsDownloaded, orders, delivered] = await this.db.$transaction([
      /*
       * Poori qatarein — sirf ginti nahi — kyunke "kitni ALAG reseller" chahiye. `count`
       * qatarein ginta hai, aur ek hi reseller ke chaar naap ke chaar pack hote hain.
       */
      this.db.statusPack.findMany({
        where: { productId: { in: productIds }, imageUrl: { not: null }, createdAt: { gte: since } },
        select: { resellerId: true },
      }),
      this.db.statusPack.count({
        where: {
          productId: { in: productIds },
          downloadedAt: { not: null, gte: since },
        },
      }),
      this.db.order.count({
        where: { supplierId, createdAt: { gte: since }, status: { in: [...REAL_ORDERS] } },
      }),
      this.db.order.count({
        where: { supplierId, createdAt: { gte: since }, status: 'DELIVERED' },
      }),
    ])

    return {
      resellers: new Set(packRows.map((p) => p.resellerId)).size,
      packs: packRows.length,
      packsDownloaded,
      orders,
      delivered,
    }
  }
}
