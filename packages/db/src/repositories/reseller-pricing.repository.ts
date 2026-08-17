import type { PrismaClient } from '@prisma/client'
import type { ResellerPricingRepository } from '@oyebazar/core'
import { pkr, type Pkr } from '@oyebazar/shared'

export class PrismaResellerPricingRepository implements ResellerPricingRepository {
  constructor(private readonly db: PrismaClient) {}

  async find(resellerId: string, productId: string): Promise<Pkr | null> {
    const row = await this.db.resellerPricing.findUnique({
      where: { resellerId_productId: { resellerId, productId } },
      select: { retailPrice: true },
    })
    return row ? pkr(row.retailPrice) : null
  }

  /** 🔴 Catalogue list ke liye — har product par alag query (N+1) kabhi nahi. */
  async findMany(resellerId: string, productIds: readonly string[]): Promise<Map<string, Pkr>> {
    if (productIds.length === 0) return new Map()
    const rows = await this.db.resellerPricing.findMany({
      where: { resellerId, productId: { in: [...productIds] } },
      select: { productId: true, retailPrice: true },
    })
    return new Map(rows.map((r) => [r.productId, pkr(r.retailPrice)]))
  }

  async upsert(resellerId: string, productId: string, retailPrice: Pkr): Promise<void> {
    await this.db.resellerPricing.upsert({
      where: { resellerId_productId: { resellerId, productId } },
      create: { resellerId, productId, retailPrice },
      update: { retailPrice },
    })
  }
}
