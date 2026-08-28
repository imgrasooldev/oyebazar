/**
 * InventoryRepository — maal ki ginti, ek hi jagah.
 *
 * Abhi har product ka ek hi variant hota hai (size/rang Phase 2). Is liye ginti product
 * ke saare variants ka jama hai, aur reserve pehle us variant se hota hai jis mein maal
 * mojood ho.
 *
 * 🔴 Har wo amal jo ginti badalta hai, register mein apni qatar bhi likhta hai — aur
 * DONO ek hi transaction mein. Ye is file ka sab se ahem usool hai. Alag alag likhne se
 * wo soorat banti hai jahan ginti badal jaye aur qatar na bane (ya ulta), aur us ke baad
 * register par bharosa khatam — jo register par bharosa na ho wo hone aur na hone mein
 * barabar hai.
 */
import type { PrismaClient, Prisma } from '@prisma/client'
import type {
  InventoryRepository,
  LowStockLine,
  StockLedgerRepository,
  StockLevel,
  StockLine,
  StockMoveView,
  StockValueLine,
  VariantView,
} from '@oyebazar/core'
import { nextAvgCost } from '@oyebazar/core'

/** Register ki qatar likhne ke liye — sab kuch ek hi jagah se. */
type MoveInput = {
  supplierId: string
  productId: string
  variantId: string
  delta: number
  balanceAfter: number
  reason: Prisma.StockMoveCreateInput['reason']
  orderNo?: string | null
  unitCost?: number | null
  note?: string | null
  actorType: string
  actorId?: string | null
}

export class PrismaInventoryRepository implements InventoryRepository, StockLedgerRepository {
  constructor(private readonly db: PrismaClient) {}

  /**
   * 🔴 Ek hi atomic update: `stockQty >= qty` shart WHERE mein hai, JS mein nahi.
   *
   * Pehle parhna phir likhna is soorat mein tootta hai: do resellers ek hi lamhe order
   * lagayen, dono ko "5 mojood hai" dikhe, dono 5 nikaal len — aur stock manfi ho jaye.
   * `updateMany` ka count batata hai ke kaam hua ya nahi.
   *
   * Poora amal ek transaction mein hai taake register ki qatar bhi usi ke saath bane.
   * Shart phir bhi WHERE hi mein rehti hai — transaction us shart ki jagah nahi leti.
   */
  async reserve(line: StockLine): Promise<boolean> {
    return this.db.$transaction(async (tx) => {
      const candidate = line.variantId
        ? await tx.productVariant.findFirst({
            where: { id: line.variantId, productId: line.productId, stockQty: { gte: line.qty } },
            select: { id: true, product: { select: { supplierId: true } } },
          })
        : /*
           * Variant bataya gaya ho to WAHI — koi doosra nahi.
           *
           * Pehle yahan hamesha "jis mein maal ho" wala chalta tha, chahe customer ne
           * rang aur size chun rakha ho. Us se ginti aur haqiqat alag ho jate: system
           * kehta laal khatam nahi hua, aur dukan par laal hai hi nahi.
           */
          await tx.productVariant.findFirst({
            where: { productId: line.productId, stockQty: { gte: line.qty } },
            select: { id: true, product: { select: { supplierId: true } } },
          })

      if (!candidate) return false

      const { count } = await tx.productVariant.updateMany({
        where: { id: candidate.id, stockQty: { gte: line.qty } },
        data: { stockQty: { decrement: line.qty } },
      })
      if (count === 0) return false

      const after = await tx.productVariant.findUnique({
        where: { id: candidate.id },
        select: { stockQty: true },
      })

      await this.writeMove(tx, {
        supplierId: candidate.product.supplierId,
        productId: line.productId,
        variantId: candidate.id,
        delta: -line.qty,
        balanceAfter: after?.stockQty ?? 0,
        reason: 'ORDER_RESERVED',
        orderNo: line.orderNo ?? null,
        actorType: 'system',
      })

      return true
    })
  }

  async release(
    line: StockLine,
    reason: 'ORDER_RELEASED' | 'RETURN_TO_SHELF' = 'ORDER_RELEASED',
  ): Promise<void> {
    await this.db.$transaction(async (tx) => {
      // Wapas usi variant mein jis se nikla tha — warna order marne par maal ek variant
      // se kam aur doosre mein zyada ho jata hai
      const variant = line.variantId
        ? await tx.productVariant.findFirst({
            where: { id: line.variantId, productId: line.productId },
            select: { id: true, product: { select: { supplierId: true } } },
          })
        : await tx.productVariant.findFirst({
            where: { productId: line.productId },
            select: { id: true, product: { select: { supplierId: true } } },
            orderBy: { id: 'asc' },
          })
      if (!variant) return

      const updated = await tx.productVariant.update({
        where: { id: variant.id },
        data: { stockQty: { increment: line.qty } },
        select: { stockQty: true },
      })

      await this.writeMove(tx, {
        supplierId: variant.product.supplierId,
        productId: line.productId,
        variantId: variant.id,
        delta: line.qty,
        balanceAfter: updated.stockQty,
        reason,
        orderNo: line.orderNo ?? null,
        actorType: 'system',
      })
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
      select: { id: true, variants: { select: { id: true, stockQty: true }, take: 1 } },
    })
    if (!product) return false

    const existing = product.variants[0]

    await this.db.$transaction(async (tx) => {
      let variantId: string

      if (existing) {
        await tx.productVariant.update({ where: { id: existing.id }, data: { stockQty: qty } })
        variantId = existing.id
      } else {
        // Purana maal jis ka variant hi nahi bana tha — ab bana dete hain
        const created = await tx.productVariant.create({
          data: { productId, skuCode: `${productId}-default`, stockQty: qty },
          select: { id: true },
        })
        variantId = created.id
      }

      /*
       * Farq hi qatar ki jaan hai. "Ab 4 hain" register mein bemani hai; "18 kam kiye"
       * wo cheez hai jise dukan wala saal ke aakhir mein dekh kar sawal karta hai.
       */
      const delta = qty - (existing?.stockQty ?? 0)
      if (delta !== 0) {
        await this.writeMove(tx, {
          supplierId,
          productId,
          variantId,
          delta,
          balanceAfter: qty,
          reason: 'MANUAL_FIX',
          actorType: 'supplier',
          actorId: supplierId,
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

    const created = await this.db.$transaction(async (tx) => {
      const variant = await tx.productVariant.create({
        data: {
          productId: input.productId,
          size: input.size,
          colour: input.colour,
          skuCode: input.skuCode,
          stockQty: input.stockQty,
        },
        select: { id: true, size: true, colour: true, skuCode: true, stockQty: true },
      })

      /*
       * Pehli ginti bhi register mein aati hai — `OPENING`.
       *
       * Bina is ke har register beech se shuru hota: pehli qatar "5 nikle" hoti aur
       * upar kuch na hota, jis se ye kabhi sabit na hota ke maal aya kahan se tha.
       */
      if (input.stockQty > 0) {
        await this.writeMove(tx, {
          supplierId: input.supplierId,
          productId: input.productId,
          variantId: variant.id,
          delta: input.stockQty,
          balanceAfter: input.stockQty,
          reason: 'OPENING',
          actorType: 'supplier',
          actorId: input.supplierId,
        })
      }

      return variant
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
    const before = await this.db.productVariant.findFirst({
      where: { id: input.variantId, product: { supplierId: input.supplierId } },
      select: { id: true, productId: true, stockQty: true },
    })
    if (!before) return false

    await this.db.$transaction(async (tx) => {
      await tx.productVariant.update({
        where: { id: input.variantId },
        data: {
          ...(input.size === undefined ? {} : { size: input.size }),
          ...(input.colour === undefined ? {} : { colour: input.colour }),
          ...(input.stockQty === undefined ? {} : { stockQty: input.stockQty }),
        },
      })

      if (input.stockQty !== undefined && input.stockQty !== before.stockQty) {
        await this.writeMove(tx, {
          supplierId: input.supplierId,
          productId: before.productId,
          variantId: input.variantId,
          delta: input.stockQty - before.stockQty,
          balanceAfter: input.stockQty,
          reason: 'MANUAL_FIX',
          actorType: 'supplier',
          actorId: input.supplierId,
        })
      }
    })

    // Poore maal ki halat variants ke jama se banti hai, kisi ek se nahi
    await this.syncProductStatus(before.productId)
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

  // ------------------------------------------------------ register aur lagat

  async stockIn(input: {
    supplierId: string
    variantId: string
    qty: number
    unitCost?: number | undefined
    note?: string | undefined
    actorId: string
  }): Promise<number | null> {
    if (input.qty <= 0) return null

    const variant = await this.db.productVariant.findFirst({
      where: { id: input.variantId, product: { supplierId: input.supplierId } },
      select: { id: true, productId: true, stockQty: true, avgCost: true },
    })
    if (!variant) return null

    const balanceAfter = variant.stockQty + input.qty

    await this.db.$transaction(async (tx) => {
      await tx.productVariant.update({
        where: { id: variant.id },
        data: {
          stockQty: balanceAfter,
          /*
           * Lagat sirf tab badalti hai jab dukan ne khud batayi ho — hisab
           * `domain/stock.ts` mein hai jahan us ke test bhi hain.
           */
          avgCost: nextAvgCost({
            currentAvg: variant.avgCost,
            currentQty: variant.stockQty,
            incomingQty: input.qty,
            incomingUnitCost: input.unitCost ?? null,
          }),
        },
      })

      await this.writeMove(tx, {
        supplierId: input.supplierId,
        productId: variant.productId,
        variantId: variant.id,
        delta: input.qty,
        balanceAfter,
        reason: 'STOCK_IN',
        unitCost: input.unitCost ?? null,
        note: input.note ?? null,
        actorType: 'supplier',
        actorId: input.actorId,
      })
    })

    // Naya maal aate hi listing wapas chalu
    await this.syncProductStatus(variant.productId)
    return balanceAfter
  }

  async writeOff(input: {
    supplierId: string
    variantId: string
    qty: number
    note: string
    actorId: string
  }): Promise<number | null> {
    if (input.qty <= 0) return null

    const variant = await this.db.productVariant.findFirst({
      where: { id: input.variantId, product: { supplierId: input.supplierId } },
      select: { id: true, productId: true, stockQty: true },
    })
    if (!variant || variant.stockQty < input.qty) return null

    const balanceAfter = variant.stockQty - input.qty

    await this.db.$transaction(async (tx) => {
      /*
       * Shart yahan bhi WHERE mein — beech mein koi order laga kar maal nikal le to ye
       * update chalna hi nahi chahiye, warna ginti manfi mein chali jati hai.
       */
      const { count } = await tx.productVariant.updateMany({
        where: { id: variant.id, stockQty: { gte: input.qty } },
        data: { stockQty: { decrement: input.qty } },
      })
      if (count === 0) return

      await this.writeMove(tx, {
        supplierId: input.supplierId,
        productId: variant.productId,
        variantId: variant.id,
        delta: -input.qty,
        balanceAfter,
        reason: 'DAMAGE',
        note: input.note,
        actorType: 'supplier',
        actorId: input.actorId,
      })
    })

    await this.syncProductStatus(variant.productId)
    return balanceAfter
  }

  async setReorderLevel(input: {
    supplierId: string
    variantId: string
    level: number
  }): Promise<boolean> {
    const { count } = await this.db.productVariant.updateMany({
      where: { id: input.variantId, product: { supplierId: input.supplierId } },
      data: { reorderLevel: Math.max(0, Math.trunc(input.level)) },
    })
    return count > 0
  }

  async moves(input: {
    supplierId: string
    variantId?: string | undefined
    productId?: string | undefined
    limit: number
  }): Promise<StockMoveView[]> {
    const rows = await this.db.stockMove.findMany({
      where: {
        // 🔴 supplierId hamesha shart mein — variant ki id URL mein nazar aati hai
        supplierId: input.supplierId,
        ...(input.variantId ? { variantId: input.variantId } : {}),
        ...(input.productId ? { productId: input.productId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: input.limit,
      select: {
        id: true,
        productId: true,
        variantId: true,
        delta: true,
        balanceAfter: true,
        reason: true,
        orderNo: true,
        unitCost: true,
        note: true,
        actorType: true,
        createdAt: true,
        variant: {
          select: {
            skuCode: true,
            size: true,
            colour: true,
            product: { select: { titleUr: true, titleEn: true } },
          },
        },
      },
    })

    return rows.map((row) => ({
      id: row.id,
      productId: row.productId,
      variantId: row.variantId,
      productTitleUr: row.variant.product.titleUr,
      productTitleEn: row.variant.product.titleEn,
      skuCode: row.variant.skuCode,
      size: row.variant.size,
      colour: row.variant.colour,
      delta: row.delta,
      balanceAfter: row.balanceAfter,
      reason: row.reason,
      orderNo: row.orderNo,
      unitCost: row.unitCost,
      note: row.note,
      actorType: row.actorType,
      createdAt: row.createdAt,
    }))
  }

  async lowStock(supplierId: string, limit: number): Promise<LowStockLine[]> {
    /*
     * Do shartein OR se: khatam ho chuka maal, aur wo jo dukan ki apni hadd par aa gaya.
     * `reorderLevel = 0` wale sirf khatam hone par aate hain — us ka matlab "ishara band"
     * hai, "hadd sifar" nahi (dekhen `domain/stock.ts`).
     *
     * Sirf wo maal jo bikne ke qabil hai: DRAFT aur ARCHIVED par "manga lein" likhna
     * bekar hai — us maal ka koi order aana hi nahi.
     */
    const rows = await this.db.$queryRaw<
      {
        productId: string
        variantId: string
        slug: string
        titleUr: string
        titleEn: string
        skuCode: string
        size: string | null
        colour: string | null
        stockQty: number
        reorderLevel: number
        avgCost: number
        soldLast30: bigint | null
      }[]
    >`
      SELECT p."id"            AS "productId",
             v."id"            AS "variantId",
             p."slug",
             p."titleUr",
             p."titleEn",
             v."skuCode",
             v."size",
             v."colour",
             v."stockQty",
             v."reorderLevel",
             v."avgCost",
             COALESCE((
               SELECT SUM(-m."delta")
               FROM "StockMove" m
               WHERE m."variantId" = v."id"
                 AND m."reason" = 'ORDER_RESERVED'
                 AND m."createdAt" > NOW() - INTERVAL '30 days'
             ), 0) AS "soldLast30"
      FROM "ProductVariant" v
      JOIN "Product" p ON p."id" = v."productId"
      WHERE p."supplierId" = ${supplierId}
        AND p."status" IN ('LIVE', 'OUT_OF_STOCK')
        AND (v."stockQty" <= 0 OR (v."reorderLevel" > 0 AND v."stockQty" <= v."reorderLevel"))
      ORDER BY "soldLast30" DESC, v."stockQty" ASC
      LIMIT ${limit}
    `

    return rows.map((row) => ({
      productId: row.productId,
      variantId: row.variantId,
      slug: row.slug,
      titleUr: row.titleUr,
      titleEn: row.titleEn,
      skuCode: row.skuCode,
      size: row.size,
      colour: row.colour,
      stockQty: row.stockQty,
      reorderLevel: row.reorderLevel,
      avgCost: row.avgCost,
      soldLast30: Number(row.soldLast30 ?? 0),
    }))
  }

  async valueLines(supplierId: string): Promise<StockValueLine[]> {
    return this.db.productVariant.findMany({
      where: { product: { supplierId, status: { in: ['LIVE', 'OUT_OF_STOCK', 'DRAFT'] } } },
      select: { stockQty: true, avgCost: true },
    })
  }

  /**
   * Register ki ek qatar — hamesha usi transaction mein jis ne ginti badli.
   *
   * `tx` lazmi hai (`this.db` nahi): agar koi isay transaction ke bahar bula le to
   * ginti aur qatar alag alag ho sakti hain, aur wahi wo ek soorat hai jise ye poora
   * register rokne ke liye bana hai.
   */
  private async writeMove(tx: Prisma.TransactionClient, move: MoveInput): Promise<void> {
    if (move.delta === 0) return

    await tx.stockMove.create({
      data: {
        supplierId: move.supplierId,
        productId: move.productId,
        variantId: move.variantId,
        delta: move.delta,
        balanceAfter: move.balanceAfter,
        reason: move.reason,
        orderNo: move.orderNo ?? null,
        unitCost: move.unitCost ?? null,
        note: move.note ?? null,
        actorType: move.actorType,
        actorId: move.actorId ?? null,
      },
    })
  }
}
