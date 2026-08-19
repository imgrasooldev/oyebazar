/**
 * PriceChangeRepository — LIVE maal ke rate ki darkhwastein.
 *
 * 🔴 Har query mein maal ki milkiyat ya to shart mein hai ya service pehle jaanch chuki
 * hoti hai; aur manzoori ka poora kaam EK transaction mein hota hai.
 */
import type { Prisma, PrismaClient } from '@prisma/client'
import type {
  ApprovedPrices,
  NewPriceChangeRequest,
  PriceChangeRepository,
  PriceChangeRequestView,
} from '@oyebazar/core'
import { pkr } from '@oyebazar/shared'

const REQUEST_SELECT = {
  id: true,
  productId: true,
  supplierId: true,
  currentSupplierPrice: true,
  requestedSupplierPrice: true,
  reason: true,
  createdAt: true,
  product: {
    select: {
      titleUr: true,
      titleEn: true,
      bajiPrice: true,
      supplier: { select: { businessName: true, feeRateBps: true } },
    },
  },
} as const

type Row = Prisma.PriceChangeRequestGetPayload<{ select: typeof REQUEST_SELECT }>

/**
 * 🔴 Prisma ki unique-constraint ghalti — SHAKL se pehchani jati hai, `instanceof` se nahi.
 *
 * `error instanceof Prisma.PrismaClientKnownRequestError` yahan chalta hi nahi: Next
 * apne bundle mein `@prisma/client` ka apna nuskha rakhta hai, aur runtime par phinki
 * gayi ghalti ka class us `Prisma` namespace wale class se alag hota hai jo ye file
 * import karti hai. Natija: shart hamesha false, aur "pehle se darkhwast mojood hai"
 * wala saaf jawab 500 ban kar client tak jata tha.
 *
 * Ye Prisma ka apna tajweez kardah tareeqa bhi hai — `code` hi ahd (contract) hai.
 */
function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'P2002'
  )
}

/** Wholesaler ke rate se hamara rate — wohi formula jo services mein hai. */
function bajiPriceOf(supplierPrice: number, feeRateBps: number): number {
  return supplierPrice + Math.round((supplierPrice * feeRateBps) / 10_000)
}

export class PrismaPriceChangeRepository implements PriceChangeRepository {
  constructor(private readonly db: PrismaClient) {}

  async create(input: NewPriceChangeRequest): Promise<{ id: string } | null> {
    try {
      return await this.db.priceChangeRequest.create({
        data: {
          productId: input.productId,
          supplierId: input.supplierId,
          currentSupplierPrice: input.currentSupplierPrice,
          requestedSupplierPrice: input.requestedSupplierPrice,
          reason: input.reason ?? null,
          // 🔴 Khuli darkhwast ki pehchan — is par unique index hai
          pendingProductId: input.productId,
        },
        select: { id: true },
      })
    } catch (error) {
      // P2002 = unique constraint — is maal par pehle se ek khuli darkhwast hai
      if (isUniqueViolation(error)) return null
      throw error
    }
  }

  async listPending(limit: number): Promise<PriceChangeRequestView[]> {
    const rows = await this.db.priceChangeRequest.findMany({
      where: { status: 'PENDING' },
      select: REQUEST_SELECT,
      // Sab se purani pehle — wo sab se zyada intezar kar rahi hai
      orderBy: { createdAt: 'asc' },
      take: limit,
    })
    return this.withImpact(rows)
  }

  async findPendingById(requestId: string): Promise<PriceChangeRequestView | null> {
    const row = await this.db.priceChangeRequest.findFirst({
      where: { id: requestId, status: 'PENDING' },
      select: REQUEST_SELECT,
    })
    if (!row) return null
    return (await this.withImpact([row]))[0] ?? null
  }

  async findPendingForSupplier(supplierId: string): Promise<PriceChangeRequestView[]> {
    const rows = await this.db.priceChangeRequest.findMany({
      where: { supplierId, status: 'PENDING' },
      select: REQUEST_SELECT,
      orderBy: { createdAt: 'asc' },
    })
    return this.withImpact(rows)
  }

  /**
   * 🔴 Har darkhwast ke saath ye bhi ke MANZOORI KIS KO LAGEGI.
   *
   * `resellersUnderWater` is poore safhe ki wajah hai: itni resellers ka saved retail
   * naye bajiPrice se neeche hai. Ops ko ye number dekhe baghair "haan" nahi kehna
   * chahiye — wohi log hain jin ka pehle se laga hua status pack ab apni lagat se kam
   * ka rate dikha raha hoga.
   *
   * Ginti ek hi groupBy mein — har darkhwast par alag query (N+1) nahi.
   */
  private async withImpact(rows: Row[]): Promise<PriceChangeRequestView[]> {
    if (rows.length === 0) return []

    const productIds = rows.map((row) => row.productId)

    const saved = await this.db.resellerPricing.findMany({
      where: { productId: { in: productIds } },
      select: { productId: true, retailPrice: true },
    })

    const byProduct = new Map<string, number[]>()
    for (const entry of saved) {
      const list = byProduct.get(entry.productId) ?? []
      list.push(entry.retailPrice)
      byProduct.set(entry.productId, list)
    }

    return rows.map((row) => {
      const feeRateBps = row.product.supplier.feeRateBps
      const proposedBajiPrice = bajiPriceOf(row.requestedSupplierPrice, feeRateBps)
      const prices = byProduct.get(row.productId) ?? []

      return {
        id: row.id,
        productId: row.productId,
        supplierId: row.supplierId,
        supplierName: row.product.supplier.businessName,
        productTitleUr: row.product.titleUr,
        productTitleEn: row.product.titleEn,
        currentSupplierPrice: pkr(row.currentSupplierPrice),
        requestedSupplierPrice: pkr(row.requestedSupplierPrice),
        currentBajiPrice: pkr(row.product.bajiPrice),
        proposedBajiPrice: pkr(proposedBajiPrice),
        reason: row.reason,
        resellersWithSavedPrice: prices.length,
        resellersUnderWater: prices.filter((price) => price < proposedBajiPrice).length,
        createdAt: row.createdAt,
      }
    })
  }

  /**
   * 🔴 Manzoori — teen cheezein, EK transaction.
   *
   *   1. maal par naya rate
   *   2. jin resellers ka saved rate ab lagat se neeche hai, unhen upar lana
   *   3. darkhwast band (aur `pendingProductId` null, taake nayi darkhwast ban sake)
   *
   * Alag alag karte to beech mein gir jane par rate lag jata magar darkhwast khuli
   * rehti — aur agli manzoori rate DOBARA barha deti.
   */
  async approve(
    requestId: string,
    opsUserId: string,
    prices: ApprovedPrices,
    at: Date,
  ): Promise<{ repricedResellers: number }> {
    return this.db.$transaction(async (tx) => {
      const request = await tx.priceChangeRequest.findFirst({
        where: { id: requestId, status: 'PENDING' },
        select: { id: true, productId: true },
      })
      if (!request) return { repricedResellers: 0 }

      await tx.product.update({
        where: { id: request.productId },
        data: {
          supplierPrice: prices.supplierPrice,
          bajiPrice: prices.bajiPrice,
          suggestedRetail: prices.suggestedRetail,
          // 🔴 status yahan NAHI — rate badalne se maal live/band nahi hota
        },
      })

      // Jin ka apna rate ab hamari lagat se neeche hai — un ka pack loss par chhapta
      const { count } = await tx.resellerPricing.updateMany({
        where: { productId: request.productId, retailPrice: { lt: prices.bajiPrice } },
        data: { retailPrice: prices.repriceUnderWaterTo },
      })

      await tx.priceChangeRequest.update({
        where: { id: requestId },
        data: {
          status: 'APPROVED',
          decidedAt: at,
          decidedBy: opsUserId,
          // Khuli darkhwast ki pehchan hata dete hain — ab nayi ban sakti hai
          pendingProductId: null,
        },
      })

      return { repricedResellers: count }
    })
  }

  async reject(
    requestId: string,
    opsUserId: string,
    note: string,
    at: Date,
  ): Promise<boolean> {
    const { count } = await this.db.priceChangeRequest.updateMany({
      where: { id: requestId, status: 'PENDING' },
      data: {
        status: 'REJECTED',
        decidedAt: at,
        decidedBy: opsUserId,
        decisionNote: note,
        pendingProductId: null,
      },
    })
    return count > 0
  }
}
