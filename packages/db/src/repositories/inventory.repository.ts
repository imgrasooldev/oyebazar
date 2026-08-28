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
  BatchRepository,
  BatchView,
  InventoryLine,
  InventoryRepository,
  StockLedgerRepository,
  StockLevel,
  StockLine,
  StockMoveView,
  StockValueLine,
  VariantView,
  WarehouseRepository,
  WarehouseStockLine,
  WarehouseView,
} from '@oyebazar/core'
import { nextAvgCost, takeFefo } from '@oyebazar/core'

/** Register ki qatar likhne ke liye — sab kuch ek hi jagah se. */
type MoveInput = {
  supplierId: string
  productId: string
  variantId: string
  delta: number
  balanceAfter: number
  reason: Prisma.StockMoveCreateInput['reason']
  warehouseId?: string | null
  orderNo?: string | null
  unitCost?: number | null
  batchId?: string | null
  note?: string | null
  actorType: string
  actorId?: string | null
}

export class PrismaInventoryRepository
  implements InventoryRepository, StockLedgerRepository, WarehouseRepository, BatchRepository
{
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

      /*
       * 🔴 Ye ek update DO kaam karta hai, aur dono zaroori hain:
       *
       *  1. Shart (`stockQty >= qty`) WHERE mein hai — wohi cheez do resellers ko ek hi
       *     aakhri piece bechne se rokti hai.
       *  2. Ye is variant ki qatar par TAALA bhi laga deta hai. Neeche godownon wala
       *     loop usi taale ke saye mein chalta hai — is liye us dauran koi doosra amal
       *     isi cheez ki ginti kisi godown mein nahi badal sakta. (Isi wajah se
       *     `transfer` bhi is qatar ko chhoota hai, halanke wo kul ginti nahi badalta.)
       */
      const { count } = await tx.productVariant.updateMany({
        where: { id: candidate.id, stockQty: { gte: line.qty } },
        data: { stockQty: { decrement: line.qty } },
      })
      if (count === 0) return false

      const after = await tx.productVariant.findUnique({
        where: { id: candidate.id },
        select: { stockQty: true },
      })

      /*
       * Ab ye batana ke maal KIS godown se nikla.
       *
       * Ek order ki ek line kai godownon se poori ho sakti hai — das than mein se chhay
       * dukan se aur chaar store se. Wo dukan par waqai hota hai, is liye register mein
       * bhi waise hi likha jata hai: har godown ki apni qatar.
       */
      const taken = await this.takeFromWarehouses(
        tx,
        candidate.product.supplierId,
        candidate.id,
        line.qty,
      )

      /*
       * Khep se bhi utna hi maal nikal jata hai — FEFO tarteeb mein.
       *
       * 🔴 Ye BEST-EFFORT hai aur bikri ko KABHI nahi rokta. Khep mein poora maal na
       * mile to bacha hua hissa chhoot jata hai aur order phir bhi lagta hai — kyunke
       * bikri ka faisla upar `stockQty` ki shart par ho chuka hai. Jo dukan khep likhti
       * hi nahi (kapra, bartan) us par ye qadam kuch karta hi nahi.
       *
       * Bina is ke `qtyLeft` bikri par ghatta hi nahi, aur maddat wali list us maal ka
       * ishara deti rehti jo kab ka bik chuka hota — yani wo list jhooti ho jati.
       */
      await this.consumeBatches(tx, candidate.id, line.qty)

      let running = after?.stockQty ?? 0
      for (const part of [...taken].reverse()) {
        await this.writeMove(tx, {
          supplierId: candidate.product.supplierId,
          productId: line.productId,
          variantId: candidate.id,
          warehouseId: part.warehouseId,
          delta: -part.qty,
          /*
           * `balanceAfter` KUL ginti hai, godown ki nahi — poore register mein wo ek hi
           * cheez naapta hai. Isi liye qataren ulti tarteeb mein bhari jati hain: aakhri
           * qatar par wo aakhri ginti aati hai jo update ke baad waqai bani.
           */
          balanceAfter: running,
          reason: 'ORDER_RESERVED',
          orderNo: line.orderNo ?? null,
          actorType: 'system',
        })
        running += part.qty
      }

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

      /*
       * Maal wapas USI godown mein jahan se nikla tha — aur ye register ka apna phal hai.
       *
       * Order par ye kahin mehfooz nahi ke maal kis jagah se utha tha; magar register
       * mein hai (`ORDER_RESERVED` ki qataren, isi orderNo par). Bina us ke sab kuch
       * default godown mein wapas girta, aur do char mahine mein store ka maal aahista
       * aahista dukan mein muntaqil ho jata — kaghaz par, zameen par nahi.
       */
      const parts = await this.reservedPlaces(tx, variant.id, line.orderNo, line.qty)

      /*
       * Khep mein wapas — usi FEFO tarteeb mein jis se nikla tha.
       *
       * 🔴 Ye theek theek "wohi khep" nahi hai: bikri par hum ye mehfooz nahi karte ke
       * maal kis khep se gaya (ek line kai khepon se ja sakti hai, aur us ka hisab
       * register ko bhaari kar deta bina kisi asli faide ke). Is liye wapas usi tarteeb
       * mein daalte hain jis se nikla tha, aur har khep ki hadd us ki apni `qtyIn` hai —
       * koi khep apni aayi hui miqdar se zyada nahi ho sakti.
       *
       * Anjaam: mansookh order ke baad khep ki ginti thori kam par rah sakti hai. Wo
       * mehfooz rukh hai — hum kabhi ye dawa nahi karte ke maal us se ZYADA taza hai
       * jitna hai.
       */
      await this.restoreBatches(tx, variant.id, line.qty)

      let running = updated.stockQty
      for (const part of [...parts].reverse()) {
        await this.applyWarehouseDelta(tx, variant.id, part.warehouseId, part.qty)
        await this.writeMove(tx, {
          supplierId: variant.product.supplierId,
          productId: line.productId,
          variantId: variant.id,
          warehouseId: part.warehouseId,
          delta: part.qty,
          balanceAfter: running,
          reason,
          orderNo: line.orderNo ?? null,
          actorType: 'system',
        })
        running -= part.qty
      }
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
        /*
         * Haath se durust ki hui ginti hamesha DEFAULT godown par lagti hai.
         *
         * Dukan wala jab "ab 4 hain" likhta hai to wo saamne wale maal ki baat kar raha
         * hota hai — us se ye poochhna ke "kis godown ki baat kar rahe hain" us ek-tap
         * wale kaam ko form bana deta, aur wo phir usay chhoota hi nahi. Jise waqai
         * godown ke hisab se ginti theek karni ho, us ke liye transfer aur zaya hone ka
         * apna rasta hai.
         */
        const warehouseId = await this.defaultWarehouseId(tx, supplierId)
        await this.applyWarehouseDelta(tx, variantId, warehouseId, delta)

        await this.writeMove(tx, {
          supplierId,
          productId,
          variantId,
          warehouseId,
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
        const warehouseId = await this.defaultWarehouseId(tx, input.supplierId)
        await this.applyWarehouseDelta(tx, variant.id, warehouseId, input.stockQty)

        await this.writeMove(tx, {
          supplierId: input.supplierId,
          productId: input.productId,
          variantId: variant.id,
          warehouseId,
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
        const warehouseId = await this.defaultWarehouseId(tx, input.supplierId)
        const delta = input.stockQty - before.stockQty
        await this.applyWarehouseDelta(tx, input.variantId, warehouseId, delta)

        await this.writeMove(tx, {
          supplierId: input.supplierId,
          productId: before.productId,
          variantId: input.variantId,
          warehouseId,
          delta,
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
    warehouseId?: string | undefined
    batchNo?: string | undefined
    expiryAt?: Date | undefined
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
      /*
       * Godown chuna hua ho to wohi — magar sirf agar wo ISI dukan ka aur CHALU ho.
       * Band godown mein naya maal daalna wo soorat banata hai jahan maal aisi jagah
       * para hai jise dukan wala apni list mein dekhta hi nahi.
       */
      const warehouseId = await this.pickWarehouse(tx, input.supplierId, input.warehouseId)

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

      await this.applyWarehouseDelta(tx, variant.id, warehouseId, input.qty)

      /*
       * Khep sirf tab banti hai jab dukan ne khep ka number YA maddat likhi ho.
       *
       * 🔴 Har stock-in par khali khep banana sab se bura anjaam deta: kapre wali dukan
       * ke register mein saikron aisi qataren ban jatin jin par koi maddat hai hi nahi,
       * aur maddat wali list unhen chhaan-ne mein khali dikhti rehti.
       */
      const batch =
        input.batchNo || input.expiryAt
          ? await tx.stockBatch.create({
              data: {
                supplierId: input.supplierId,
                variantId: variant.id,
                warehouseId,
                batchNo: input.batchNo ?? null,
                expiryAt: input.expiryAt ?? null,
                qtyIn: input.qty,
                qtyLeft: input.qty,
                unitCost: input.unitCost ?? null,
                note: input.note ?? null,
              },
              select: { id: true },
            })
          : null

      await this.writeMove(tx, {
        supplierId: input.supplierId,
        productId: variant.productId,
        variantId: variant.id,
        warehouseId,
        batchId: batch?.id ?? null,
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
    warehouseId?: string | undefined
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

      /*
       * Godown bataya gaya ho to sirf usi se — aur agar us mein itna maal na ho to
       * kahin se nahi. Warna "store ka toota hua maal" chup chaap dukan ki ginti se
       * kat jata, aur dono godownon ke number ghalat ho jate.
       */
      const parts = input.warehouseId
        ? [{ warehouseId: input.warehouseId, qty: input.qty }]
        : await this.takeFromWarehouses(tx, input.supplierId, variant.id, input.qty)

      if (input.warehouseId) {
        const ok = await this.applyWarehouseDelta(tx, variant.id, input.warehouseId, -input.qty)
        if (!ok) throw new Error('Is godown mein itna maal nahi hai')
      }

      let running = balanceAfter
      for (const part of [...parts].reverse()) {
        await this.writeMove(tx, {
          supplierId: input.supplierId,
          productId: variant.productId,
          variantId: variant.id,
          warehouseId: part.warehouseId,
          delta: -part.qty,
          balanceAfter: running,
          reason: 'DAMAGE',
          note: input.note,
          actorType: 'supplier',
          actorId: input.actorId,
        })
        running += part.qty
      }
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
        warehouse: { select: { name: true } },
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
      warehouseName: row.warehouse?.name ?? null,
      unitCost: row.unitCost,
      note: row.note,
      actorType: row.actorType,
      createdAt: row.createdAt,
    }))
  }

  async lines(input: {
    supplierId: string
    onlyLow: boolean
    limit: number
    search?: string | undefined
  }): Promise<InventoryLine[]> {
    /*
     * "Kam" ki do shartein OR se: khatam ho chuka maal, aur wo jo dukan ki apni hadd par
     * aa gaya. `reorderLevel = 0` wale sirf khatam hone par aate hain — us ka matlab
     * "ishara band" hai, "hadd sifar" nahi (dekhen `domain/stock.ts`).
     *
     * Sirf wo maal jo bikne ke qabil hai: DRAFT aur ARCHIVED par "manga lein" likhna
     * bekar hai — us maal ka koi order aana hi nahi.
     *
     * 🔴 Tarteeb dono soorton mein CHAAL par hai, ginti par nahi. "2 bache hain" us maal
     * par bhi sach hai jo saal mein ek dafa bikta hai; upar wo aana chahiye jo waqai
     * chal raha hai — warna dukan wala list ek dafa dekh kar dobara nahi kholta.
     */
    const term = input.search?.trim()
    const like = term ? `%${term.toLowerCase()}%` : null

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
      WHERE p."supplierId" = ${input.supplierId}
        AND p."status" IN ('LIVE', 'OUT_OF_STOCK')
        AND (
          ${input.onlyLow}::boolean = false
          OR v."stockQty" <= 0
          OR (v."reorderLevel" > 0 AND v."stockQty" <= v."reorderLevel")
        )
        AND (
          ${like}::text IS NULL
          OR lower(p."titleUr") LIKE ${like}
          OR lower(p."titleEn") LIKE ${like}
          OR lower(v."skuCode") LIKE ${like}
        )
      ORDER BY "soldLast30" DESC, v."stockQty" ASC
      LIMIT ${input.limit}
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

  // ----------------------------------------------------------------- godown

  async listWarehouses(supplierId: string): Promise<WarehouseView[]> {
    const rows = await this.db.warehouse.findMany({
      where: { supplierId },
      orderBy: [{ isDefault: 'desc' }, { sortOrder: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        isDefault: true,
        isActive: true,
        stock: { select: { qty: true } },
      },
    })

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      isDefault: row.isDefault,
      isActive: row.isActive,
      pieces: row.stock.reduce((sum, line) => sum + line.qty, 0),
    }))
  }

  async addWarehouse(input: { supplierId: string; name: string }): Promise<WarehouseView | null> {
    const clash = await this.db.warehouse.findFirst({
      where: { supplierId: input.supplierId, name: input.name },
      select: { id: true },
    })
    if (clash) return null

    const count = await this.db.warehouse.count({ where: { supplierId: input.supplierId } })

    const created = await this.db.warehouse.create({
      data: {
        supplierId: input.supplierId,
        name: input.name,
        /*
         * Pehla godown khud-ba-khud default ban jata hai. Us ke baghair ek aisi dukan
         * ban sakti hai jis ka koi default na ho — aur us par har wo amal chup chaap
         * girta hai jo godown nahi maangta (ginti durust karna, naya variant).
         */
        isDefault: count === 0,
        sortOrder: count,
      },
      select: { id: true, name: true, isDefault: true, isActive: true },
    })

    return { ...created, pieces: 0 }
  }

  async renameWarehouse(input: {
    supplierId: string
    warehouseId: string
    name: string
  }): Promise<boolean> {
    const clash = await this.db.warehouse.findFirst({
      where: { supplierId: input.supplierId, name: input.name, NOT: { id: input.warehouseId } },
      select: { id: true },
    })
    if (clash) return false

    const { count } = await this.db.warehouse.updateMany({
      where: { id: input.warehouseId, supplierId: input.supplierId },
      data: { name: input.name },
    })
    return count > 0
  }

  async setWarehouseActive(input: {
    supplierId: string
    warehouseId: string
    isActive: boolean
  }): Promise<boolean> {
    const { count } = await this.db.warehouse.updateMany({
      where: {
        id: input.warehouseId,
        supplierId: input.supplierId,
        // 🔴 Default godown band nahi hota — wajah port mein likhi hai
        ...(input.isActive ? {} : { isDefault: false }),
      },
      data: { isActive: input.isActive },
    })
    return count > 0
  }

  async transfer(input: {
    supplierId: string
    variantId: string
    fromWarehouseId: string
    toWarehouseId: string
    qty: number
    actorId: string
  }): Promise<boolean> {
    if (input.qty <= 0 || input.fromWarehouseId === input.toWarehouseId) return false

    return this.db.$transaction(async (tx) => {
      const variant = await tx.productVariant.findFirst({
        where: { id: input.variantId, product: { supplierId: input.supplierId } },
        select: { id: true, productId: true, stockQty: true },
      })
      if (!variant) return false

      const houses = await tx.warehouse.findMany({
        where: {
          supplierId: input.supplierId,
          id: { in: [input.fromWarehouseId, input.toWarehouseId] },
        },
        select: { id: true },
      })
      if (houses.length !== 2) return false

      /*
       * 🔴 Kul ginti nahi badalti — magar us qatar ko CHHOOTE zaroor hain.
       *
       * `stockQty + 0` ek bekar update lagta hai, hai nahi: wo isi variant ki qatar par
       * wohi taala lagata hai jo `reserve` lagata hai. Bina us ke transfer aur reserve
       * ek hi lamhe chal sakte hain, aur godown ki ginti manfi mein ja sakti hai —
       * halanke kul ginti theek nazar aati rehti. Aisi kharabi mahinon chhupi rehti hai.
       */
      await tx.productVariant.update({
        where: { id: variant.id },
        data: { stockQty: { increment: 0 } },
      })

      const moved = await this.applyWarehouseDelta(
        tx,
        variant.id,
        input.fromWarehouseId,
        -input.qty,
      )
      if (!moved) return false

      await this.applyWarehouseDelta(tx, variant.id, input.toWarehouseId, input.qty)

      /*
       * DO qataren, ek nahi — dono ek hi transaction mein. Ek qatar likhne se har godown
       * ki apni tareekh adhoori reh jati: godown B ka register kholne par us mein wo
       * maal aata hua nazar hi na aata.
       */
      for (const part of [
        { warehouseId: input.fromWarehouseId, delta: -input.qty, reason: 'TRANSFER_OUT' as const },
        { warehouseId: input.toWarehouseId, delta: input.qty, reason: 'TRANSFER_IN' as const },
      ]) {
        await this.writeMove(tx, {
          supplierId: input.supplierId,
          productId: variant.productId,
          variantId: variant.id,
          warehouseId: part.warehouseId,
          delta: part.delta,
          // Kul ginti badli hi nahi — dono qataron par wohi number
          balanceAfter: variant.stockQty,
          reason: part.reason,
          actorType: 'supplier',
          actorId: input.actorId,
        })
      }

      return true
    })
  }

  async stockByWarehouse(
    supplierId: string,
    variantIds: readonly string[],
  ): Promise<Map<string, WarehouseStockLine[]>> {
    const result = new Map<string, WarehouseStockLine[]>()
    if (variantIds.length === 0) return result

    const rows = await this.db.variantStock.findMany({
      where: {
        variantId: { in: [...variantIds] },
        // 🔴 supplierId shart mein — variant ki id URL mein nazar aati hai
        warehouse: { supplierId },
      },
      select: {
        variantId: true,
        qty: true,
        warehouse: { select: { id: true, name: true, isDefault: true, sortOrder: true } },
      },
      orderBy: [{ warehouse: { isDefault: 'desc' } }, { warehouse: { sortOrder: 'asc' } }],
    })

    for (const row of rows) {
      const list = result.get(row.variantId) ?? []
      list.push({
        warehouseId: row.warehouse.id,
        warehouseName: row.warehouse.name,
        qty: row.qty,
      })
      result.set(row.variantId, list)
    }

    return result
  }

  // ------------------------------------------------------- godown ke helpers

  /**
   * Dukan ka default godown — na ho to bana kar deta hai.
   *
   * 🔴 Ye kabhi `null` nahi lautata. Bina is ke har amal ko do soorton mein sochna parta
   * ("godown hai ya nahi"), aur wohi jagah hai jahan kuch arse baad ek soorat bhool jati
   * hai aur ginti chup chaap gum ho jati hai. Migration har mojooda dukan ko ye de chuki
   * hai; ye us NAYI dukan ke liye hai jo us ke baad bani.
   */
  private async defaultWarehouseId(
    tx: Prisma.TransactionClient,
    supplierId: string,
  ): Promise<string> {
    const existing = await tx.warehouse.findFirst({
      where: { supplierId, isDefault: true },
      select: { id: true },
    })
    if (existing) return existing.id

    const created = await tx.warehouse.create({
      data: { supplierId, name: 'دکان', isDefault: true, sortOrder: 0 },
      select: { id: true },
    })
    return created.id
  }

  /** Chuna hua godown — magar sirf agar wo isi dukan ka aur chalu ho. Warna default. */
  private async pickWarehouse(
    tx: Prisma.TransactionClient,
    supplierId: string,
    wanted: string | undefined,
  ): Promise<string> {
    if (wanted) {
      const found = await tx.warehouse.findFirst({
        where: { id: wanted, supplierId, isActive: true },
        select: { id: true },
      })
      if (found) return found.id
    }
    return this.defaultWarehouseId(tx, supplierId)
  }

  /**
   * Ek godown ki ginti barhana ya ghatana.
   *
   * Ghatate waqt shart (`qty >= …`) WHERE mein hai — wohi soch jo `reserve` par hai.
   * Qatar mojood na ho to ban jati hai (sirf barhane par).
   *
   * @returns false agar us godown mein itna maal hai hi nahi
   */
  private async applyWarehouseDelta(
    tx: Prisma.TransactionClient,
    variantId: string,
    warehouseId: string,
    delta: number,
  ): Promise<boolean> {
    if (delta === 0) return true

    if (delta > 0) {
      await tx.variantStock.upsert({
        where: { variantId_warehouseId: { variantId, warehouseId } },
        create: { variantId, warehouseId, qty: delta },
        update: { qty: { increment: delta } },
      })
      return true
    }

    const { count } = await tx.variantStock.updateMany({
      where: { variantId, warehouseId, qty: { gte: -delta } },
      data: { qty: { increment: delta } },
    })
    return count > 0
  }

  /**
   * Itna maal godownon se nikaalna — default pehle, phir jis mein sab se zyada ho.
   *
   * Ek line kai godownon se poori ho sakti hai (das than: chhay dukan se, chaar store
   * se) — dukan par wo waqai hota hai, is liye register mein bhi waise hi likha jata hai.
   *
   * 🔴 Ye sirf us taale ke saye mein bulaya jata hai jo `ProductVariant` ki qatar par
   * lag chuka hota hai. Us ke baghair do reserve ek saath chal kar ek hi godown se do
   * dafa maal nikaal sakte hain.
   */
  private async takeFromWarehouses(
    tx: Prisma.TransactionClient,
    supplierId: string,
    variantId: string,
    qty: number,
  ): Promise<{ warehouseId: string; qty: number }[]> {
    const rows = await tx.variantStock.findMany({
      where: { variantId, qty: { gt: 0 }, warehouse: { supplierId } },
      select: { warehouseId: true, qty: true, warehouse: { select: { isDefault: true } } },
      orderBy: [{ warehouse: { isDefault: 'desc' } }, { qty: 'desc' }],
    })

    const taken: { warehouseId: string; qty: number }[] = []
    let left = qty

    for (const row of rows) {
      if (left <= 0) break
      const take = Math.min(row.qty, left)
      await this.applyWarehouseDelta(tx, variantId, row.warehouseId, -take)
      taken.push({ warehouseId: row.warehouseId, qty: take })
      left -= take
    }

    /*
     * Godownon ki ginti kul ginti se kam nikli — ye ho nahi sakta tha, magar agar ho
     * jaye to baqi maal default godown par likhte hain, chhorte nahi.
     *
     * Wajah: kul ginti (`stockQty`) upar guarded update se ghat CHUKI hai. Yahan chup
     * ho jane ka matlab hota ke register aur ginti alag ho gaye — aur jis register par
     * bharosa na ho wo hone aur na hone mein barabar hai. Ye qatar wo farq SAAMNE le
     * aati hai (godown ki ginti manfi ho kar), chhupati nahi.
     */
    if (left > 0) {
      const fallback = await this.defaultWarehouseId(tx, supplierId)
      await tx.variantStock.upsert({
        where: { variantId_warehouseId: { variantId, warehouseId: fallback } },
        create: { variantId, warehouseId: fallback, qty: -left },
        update: { qty: { decrement: left } },
      })
      taken.push({ warehouseId: fallback, qty: left })
    }

    return taken
  }

  /**
   * Ye maal kis kis godown se nikla tha — register se.
   *
   * Order par ye kahin mehfooz nahi; register mein hai. Ye us register ka apna phal hai:
   * bina is ke wapas aya maal sab default godown mein girta, aur do char mahine mein
   * store ka maal aahista aahista dukan mein muntaqil ho jata — kaghaz par.
   */
  private async reservedPlaces(
    tx: Prisma.TransactionClient,
    variantId: string,
    orderNo: string | undefined,
    qty: number,
  ): Promise<{ warehouseId: string; qty: number }[]> {
    if (orderNo) {
      const rows = await tx.stockMove.findMany({
        where: { variantId, orderNo, reason: 'ORDER_RESERVED', warehouseId: { not: null } },
        select: { warehouseId: true, delta: true },
        orderBy: { createdAt: 'asc' },
      })

      const places: { warehouseId: string; qty: number }[] = []
      let left = qty

      for (const row of rows) {
        if (left <= 0) break
        const take = Math.min(-row.delta, left)
        if (take > 0) {
          places.push({ warehouseId: row.warehouseId as string, qty: take })
          left -= take
        }
      }

      if (left > 0) {
        places.push({ warehouseId: await this.defaultWarehouseId(tx, await this.supplierOf(tx, variantId)), qty: left })
      }
      if (places.length > 0) return places
    }

    // Purane order (register se pehle ke) — koi qatar nahi milti, to default godown
    const supplierId = await this.supplierOf(tx, variantId)
    return [{ warehouseId: await this.defaultWarehouseId(tx, supplierId), qty }]
  }

  private async supplierOf(tx: Prisma.TransactionClient, variantId: string): Promise<string> {
    const row = await tx.productVariant.findUniqueOrThrow({
      where: { id: variantId },
      select: { product: { select: { supplierId: true } } },
    })
    return row.product.supplierId
  }

  // ------------------------------------------------------------------- khep

  async listBatches(supplierId: string, variantId: string): Promise<BatchView[]> {
    const rows = await this.db.stockBatch.findMany({
      // 🔴 supplierId hamesha shart mein — variant ki id URL mein nazar aati hai
      where: { supplierId, variantId },
      orderBy: [{ expiryAt: 'asc' }, { receivedAt: 'desc' }],
      select: this.batchSelect(),
    })
    return rows.map((row) => this.toBatchView(row))
  }

  async expiringBatches(supplierId: string, before: Date, limit: number): Promise<BatchView[]> {
    const rows = await this.db.stockBatch.findMany({
      where: {
        supplierId,
        // Maddat likhi hui ho, aur wo is tareekh se pehle ki ho
        expiryAt: { not: null, lte: before },
        /*
         * 🔴 Sirf wo khepein jin mein maal BACHA hua hai. Khatam ho chuki khep ki maddat
         * par ishara dena wo shor hai jis par kuch kiya hi nahi ja sakta — aur aisa ek
         * bhi ishara list ko un ke liye bekar bana deta hai jo waqai kaam ke hain.
         */
        qtyLeft: { gt: 0 },
      },
      // FEFO: jo pehle mari wo pehle
      orderBy: { expiryAt: 'asc' },
      take: limit,
      select: this.batchSelect(),
    })
    return rows.map((row) => this.toBatchView(row))
  }

  async writeOffBatch(input: {
    supplierId: string
    batchId: string
    qty: number
    note: string
    actorId: string
  }): Promise<number | null> {
    if (input.qty <= 0) return null

    const batch = await this.db.stockBatch.findFirst({
      where: { id: input.batchId, supplierId: input.supplierId },
      select: {
        id: true,
        qtyLeft: true,
        warehouseId: true,
        variant: { select: { id: true, productId: true, stockQty: true } },
      },
    })
    if (!batch || batch.qtyLeft < input.qty) return null

    const balanceAfter = batch.variant.stockQty - input.qty
    if (balanceAfter < 0) return null

    await this.db.$transaction(async (tx) => {
      /*
       * Shart yahan bhi WHERE mein — beech mein koi order laga kar maal nikal le to ye
       * update chalna hi nahi chahiye, warna ginti manfi mein chali jati hai. Wohi soch
       * jo `reserve` aur `writeOff` par hai.
       */
      const { count } = await tx.productVariant.updateMany({
        where: { id: batch.variant.id, stockQty: { gte: input.qty } },
        data: { stockQty: { decrement: input.qty } },
      })
      if (count === 0) return

      await tx.stockBatch.updateMany({
        where: { id: batch.id, qtyLeft: { gte: input.qty } },
        data: { qtyLeft: { decrement: input.qty } },
      })

      if (batch.warehouseId) {
        await this.applyWarehouseDelta(tx, batch.variant.id, batch.warehouseId, -input.qty)
      }

      await this.writeMove(tx, {
        supplierId: input.supplierId,
        productId: batch.variant.productId,
        variantId: batch.variant.id,
        warehouseId: batch.warehouseId,
        batchId: batch.id,
        delta: -input.qty,
        balanceAfter,
        reason: 'DAMAGE',
        note: input.note,
        actorType: 'supplier',
        actorId: input.actorId,
      })
    })

    await this.syncProductStatus(batch.variant.productId)
    return balanceAfter
  }

  // ------------------------------------------------------------ khep helpers

  /**
   * Khep se maal nikalna — FEFO, aur BEST-EFFORT.
   *
   * 🔴 Ye kuch bhi nahi rokta aur kabhi throw nahi karta. Khep mein poora maal na mile
   * to bacha hua hissa chhoot jata hai — bikri ka faisla upar `stockQty` ki shart par ho
   * chuka hota hai. Jo dukan khep likhti hi nahi, us par ye ek khali query hai.
   *
   * Tarteeb `domain/batch.ts` ke `takeFefo` se aati hai — wahan us ka test hai.
   */
  private async consumeBatches(
    tx: Prisma.TransactionClient,
    variantId: string,
    qty: number,
  ): Promise<void> {
    const batches = await tx.stockBatch.findMany({
      where: { variantId, qtyLeft: { gt: 0 } },
      select: { id: true, expiryAt: true, receivedAt: true, qtyLeft: true },
    })
    if (batches.length === 0) return

    for (const part of takeFefo(batches, qty).taken) {
      await tx.stockBatch.updateMany({
        where: { id: part.batch.id, qtyLeft: { gte: part.qty } },
        data: { qtyLeft: { decrement: part.qty } },
      })
    }
  }

  /**
   * Khep mein maal wapas — usi FEFO tarteeb mein jis se nikla tha.
   *
   * 🔴 Har khep ki hadd us ki apni `qtyIn` hai: koi khep apni aayi hui miqdar se zyada
   * nahi ho sakti. Bina is hadd ke ek mansookh order khep ko us se bhara kar deta jitna
   * wo kabhi thi hi nahi — aur us ke baad maddat ka hisab jhoot bolne lagta.
   */
  private async restoreBatches(
    tx: Prisma.TransactionClient,
    variantId: string,
    qty: number,
  ): Promise<void> {
    const batches = await tx.stockBatch.findMany({
      where: { variantId },
      select: { id: true, expiryAt: true, receivedAt: true, qtyLeft: true, qtyIn: true },
      orderBy: [{ expiryAt: 'asc' }, { receivedAt: 'asc' }],
    })

    let left = qty
    for (const batch of batches) {
      if (left <= 0) break
      const room = batch.qtyIn - batch.qtyLeft
      if (room <= 0) continue

      const give = Math.min(room, left)
      await tx.stockBatch.update({
        where: { id: batch.id },
        data: { qtyLeft: { increment: give } },
      })
      left -= give
    }
  }

  private batchSelect() {
    return {
      id: true,
      batchNo: true,
      expiryAt: true,
      qtyIn: true,
      qtyLeft: true,
      unitCost: true,
      receivedAt: true,
      warehouse: { select: { name: true } },
      variant: {
        select: {
          id: true,
          productId: true,
          skuCode: true,
          size: true,
          colour: true,
          product: { select: { titleUr: true, titleEn: true } },
        },
      },
    } as const
  }

  private toBatchView(row: {
    id: string
    batchNo: string | null
    expiryAt: Date | null
    qtyIn: number
    qtyLeft: number
    unitCost: number | null
    receivedAt: Date
    warehouse: { name: string } | null
    variant: {
      id: string
      productId: string
      skuCode: string
      size: string | null
      colour: string | null
      product: { titleUr: string; titleEn: string }
    }
  }): BatchView {
    return {
      id: row.id,
      productId: row.variant.productId,
      variantId: row.variant.id,
      titleUr: row.variant.product.titleUr,
      titleEn: row.variant.product.titleEn,
      skuCode: row.variant.skuCode,
      size: row.variant.size,
      colour: row.variant.colour,
      batchNo: row.batchNo,
      expiryAt: row.expiryAt,
      qtyIn: row.qtyIn,
      qtyLeft: row.qtyLeft,
      unitCost: row.unitCost,
      warehouseName: row.warehouse?.name ?? null,
      receivedAt: row.receivedAt,
    }
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
        warehouseId: move.warehouseId ?? null,
        delta: move.delta,
        balanceAfter: move.balanceAfter,
        reason: move.reason,
        orderNo: move.orderNo ?? null,
        unitCost: move.unitCost ?? null,
        batchId: move.batchId ?? null,
        note: move.note ?? null,
        actorType: move.actorType,
        actorId: move.actorId ?? null,
      },
    })
  }
}
