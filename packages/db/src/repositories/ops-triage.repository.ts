/**
 * Ops ki chhanni — aath chhote sawal, aath chhoti query.
 *
 * Ek bara join likhna mumkin tha, magar har naya sawal poori query badalta — aur sawal
 * barhte rahenge. Wohi tareeqa `money-ledger.repository.ts` par pehle se chal raha hai.
 *
 * 🔴 Har query ki apni hadd hai. Ops ki list ka maqsad "sab kuch dikhana" nahi, "ab kya
 * karna hai" batana hai — teen hazar qataron wali list wohi cheez hai jise koi nahi
 * kholta.
 */
import type { PrismaClient } from '@prisma/client'
import type {
  DisputedPayoutFlag,
  DuplicateProductRow,
  OddPriceRow,
  OpsTriageRepository,
  OverduePayoutFlag,
  ProductFlagRow,
  StockChurnRow,
  UnansweredOrderFlag,
} from '@oyebazar/core'

const MS_PER_DAY = 86_400_000
const MS_PER_HOUR = 3_600_000

export class PrismaOpsTriageRepository implements OpsTriageRepository {
  constructor(private readonly db: PrismaClient) {}

  async disputedPayouts(limit: number): Promise<DisputedPayoutFlag[]> {
    const rows = await this.db.resellerPayout.findMany({
      where: { status: 'DISPUTED' },
      orderBy: { disputedAt: 'asc' },
      take: limit,
      select: {
        id: true,
        amount: true,
        disputeNote: true,
        disputedAt: true,
        createdAt: true,
        order: { select: { orderNo: true } },
        supplier: { select: { businessName: true } },
        reseller: { select: { name: true } },
      },
    })

    return rows.map((row) => ({
      payoutId: row.id,
      orderNo: row.order.orderNo,
      amount: row.amount,
      supplierName: row.supplier.businessName,
      resellerName: row.reseller.name,
      note: row.disputeNote,
      // `disputedAt` DISPUTED par hamesha bhara hota hai; createdAt sirf ek mehfooz jawab
      disputedAt: row.disputedAt ?? row.createdAt,
    }))
  }

  async overduePayouts(now: Date, limit: number): Promise<OverduePayoutFlag[]> {
    /*
     * PENDING aur SENT dono.
     *
     * SENT ka matlab hai "dukan keh rahi hai bhej diye" — magar reseller ne tasdeeq nahi
     * ki. Wo bhi baqaya hi hai: hisab tab band hota hai jab DONO taraf mil jayen. Sirf
     * PENDING dekhne se wo saari qataren nazar se gir jatin jahan ek taraf ka dawa mojood
     * hai aur doosri taraf khamoshi — aur wahi qataren jhagre mein badalti hain.
     */
    const rows = await this.db.resellerPayout.findMany({
      where: { status: { in: ['PENDING', 'SENT'] } },
      orderBy: { createdAt: 'asc' },
      // Hadd se zyada isliye laate hain ke der ka hisab yahan nahi hota — chhanni
      // ke baad ginti khud hi ghat jati hai
      take: limit * 4,
      select: {
        id: true,
        amount: true,
        termDays: true,
        createdAt: true,
        order: { select: { orderNo: true } },
        supplier: { select: { businessName: true } },
        reseller: { select: { name: true } },
      },
    })

    const late: OverduePayoutFlag[] = []

    for (const row of rows) {
      const due = row.createdAt.getTime() + row.termDays * MS_PER_DAY
      const daysLate = Math.floor((now.getTime() - due) / MS_PER_DAY)
      if (daysLate <= 0) continue

      late.push({
        payoutId: row.id,
        orderNo: row.order.orderNo,
        amount: row.amount,
        supplierName: row.supplier.businessName,
        resellerName: row.reseller.name,
        daysLate,
        since: new Date(due),
      })
      if (late.length >= limit) break
    }

    return late
  }

  async unansweredOrders(
    now: Date,
    minHours: number,
    limit: number,
  ): Promise<UnansweredOrderFlag[]> {
    const cutoff = new Date(now.getTime() - minHours * MS_PER_HOUR)

    const rows = await this.db.order.findMany({
      where: {
        status: 'SENT_TO_SUPPLIER',
        // Intezar us lamhe se ginte hain jab order dukan ko GAYA, jab bana tha us se nahi
        sentToSupplierAt: { lt: cutoff },
      },
      orderBy: { sentToSupplierAt: 'asc' },
      take: limit,
      select: {
        id: true,
        orderNo: true,
        sentToSupplierAt: true,
        createdAt: true,
        supplier: { select: { businessName: true } },
        reseller: { select: { name: true } },
      },
    })

    return rows.map((row) => {
      const since = row.sentToSupplierAt ?? row.createdAt
      return {
        orderId: row.id,
        orderNo: row.orderNo,
        supplierName: row.supplier.businessName,
        resellerName: row.reseller.name,
        hoursWaiting: Math.floor((now.getTime() - since.getTime()) / MS_PER_HOUR),
        since,
      }
    })
  }

  async oddPricedProducts(minTimes: number, limit: number): Promise<OddPriceRow[]> {
    /*
     * Category ka DARMIYANA (median), aosat nahi.
     *
     * 🔴 Aosat is jagah bilkul ghalat hisab hai: hum wo rate dhoond rahe hain jis mein
     * sifar reh gaya, aur wohi ek rate aosat ko itna kheench leta hai ke wo khud apni
     * ghalti chhupa leta — yani pemana usi cheez se kharab hota jise wo naapne ke liye
     * bana tha. Yehi soch `risk.repository.ts` ke `medianTotals` par bhi hai.
     *
     * Kam se kam PAANCH maal wali category — us se kam par "aam rate" jaisi koi cheez
     * hoti hi nahi, aur nayi category ka har maal mashkook ban jata.
     */
    const rows = await this.db.$queryRaw<
      {
        productId: string
        slug: string
        titleUr: string
        titleEn: string
        supplierName: string
        supplierPrice: number
        categoryName: string
        categoryMedian: number
        createdAt: Date
      }[]
    >`
      WITH medians AS (
        SELECT p."categoryId",
               percentile_cont(0.5) WITHIN GROUP (ORDER BY p."supplierPrice") AS median,
               COUNT(*) AS items
        FROM "Product" p
        WHERE p."status" IN ('LIVE', 'OUT_OF_STOCK')
        GROUP BY p."categoryId"
        HAVING COUNT(*) >= 5
      )
      SELECT p."id"        AS "productId",
             p."slug",
             p."titleUr",
             p."titleEn",
             s."businessName" AS "supplierName",
             p."supplierPrice",
             c."nameUr"    AS "categoryName",
             ROUND(m.median)::int AS "categoryMedian",
             p."createdAt"
      FROM "Product" p
      JOIN medians m    ON m."categoryId" = p."categoryId"
      JOIN "Category" c ON c."id" = p."categoryId"
      JOIN "Supplier" s ON s."id" = p."supplierId"
      WHERE p."status" IN ('LIVE', 'OUT_OF_STOCK')
        AND m.median > 0
        AND (
          p."supplierPrice" >= m.median * ${minTimes}
          OR p."supplierPrice" <= m.median / ${minTimes}
        )
      ORDER BY p."createdAt" ASC
      LIMIT ${limit}
    `

    return rows.map((row) => ({
      productId: row.productId,
      slug: row.slug,
      titleUr: row.titleUr,
      titleEn: row.titleEn,
      supplierName: row.supplierName,
      supplierPrice: row.supplierPrice,
      categoryName: row.categoryName,
      categoryMedian: Number(row.categoryMedian),
      createdAt: row.createdAt,
    }))
  }

  async duplicateProducts(limit: number): Promise<DuplicateProductRow[]> {
    /*
     * Wohi naam, ISI dukan par.
     *
     * 🔴 Do alag dukanon par ek jaisa naam bilkul aam hai — thok bazaar mein sab "لان
     * تھری پیس" hi bechte hain — aur usay masla kehna list ko bekar bhar deta. Masla ek
     * hi dukan par doharao hai: reseller ko catalogue mein wohi cheez do dafa dikhti hai
     * aur wo samajhti hai ke koi farq hoga.
     *
     * Naam pehle saaf hota hai (chhote huroof, ramz aur zyada khali jagah hat kar) —
     * warna "Lawn Suit" aur "lawn  suit." do alag cheezein gine jate.
     */
    const rows = await this.db.$queryRaw<
      {
        productId: string
        slug: string
        titleUr: string
        titleEn: string
        supplierName: string
        copies: bigint
        createdAt: Date
      }[]
    >`
      WITH norm AS (
        SELECT p."id",
               p."slug",
               p."titleUr",
               p."titleEn",
               p."supplierId",
               p."createdAt",
               regexp_replace(lower(trim(p."titleEn")), '[^a-z0-9]+', ' ', 'g') AS key
        FROM "Product" p
        WHERE p."status" IN ('LIVE', 'OUT_OF_STOCK', 'DRAFT')
      ),
      dupes AS (
        SELECT "supplierId", key, COUNT(*) AS copies
        FROM norm
        GROUP BY "supplierId", key
        HAVING COUNT(*) > 1
      )
      SELECT n."id"   AS "productId",
             n."slug",
             n."titleUr",
             n."titleEn",
             s."businessName" AS "supplierName",
             d.copies,
             n."createdAt"
      FROM norm n
      JOIN dupes d      ON d."supplierId" = n."supplierId" AND d.key = n.key
      JOIN "Supplier" s ON s."id" = n."supplierId"
      ORDER BY n."createdAt" ASC
      LIMIT ${limit}
    `

    return rows.map((row) => ({
      productId: row.productId,
      slug: row.slug,
      titleUr: row.titleUr,
      titleEn: row.titleEn,
      supplierName: row.supplierName,
      copies: Number(row.copies),
      createdAt: row.createdAt,
    }))
  }

  async uncategorisedProducts(fallbackSlug: string, limit: number): Promise<ProductFlagRow[]> {
    const rows = await this.db.product.findMany({
      where: {
        status: { in: ['LIVE', 'OUT_OF_STOCK'] },
        // Wo khana jo `supplier-product.repository.ts` khud banata hai jab category na di jaye
        category: { slug: fallbackSlug },
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
      select: this.productSelect(),
    })

    return rows.map((row) => this.toProductRow(row))
  }

  async liveProductTitles(limit: number): Promise<ProductFlagRow[]> {
    return (
      await this.db.product.findMany({
        where: { status: { in: ['LIVE', 'OUT_OF_STOCK'] } },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: this.productSelect(),
      })
    ).map((row) => this.toProductRow(row))
  }

  async stockChurn(
    now: Date,
    days: number,
    minFixes: number,
    limit: number,
  ): Promise<StockChurnRow[]> {
    const since = new Date(now.getTime() - days * MS_PER_DAY)

    const grouped = await this.db.stockMove.groupBy({
      by: ['variantId'],
      where: { reason: 'MANUAL_FIX', createdAt: { gte: since } },
      _count: { _all: true },
      having: { variantId: { _count: { gte: minFixes } } },
      orderBy: { _count: { variantId: 'desc' } },
      take: limit,
    })
    if (grouped.length === 0) return []

    const variants = await this.db.productVariant.findMany({
      where: { id: { in: grouped.map((row) => row.variantId) } },
      select: {
        id: true,
        productId: true,
        product: {
          select: { titleUr: true, titleEn: true, supplier: { select: { businessName: true } } },
        },
      },
    })
    const byId = new Map(variants.map((row) => [row.id, row]))

    return grouped.flatMap((row) => {
      const variant = byId.get(row.variantId)
      if (!variant) return []

      return [
        {
          variantId: row.variantId,
          productId: variant.productId,
          titleUr: variant.product.titleUr,
          titleEn: variant.product.titleEn,
          supplierName: variant.product.supplier.businessName,
          fixes: row._count._all,
          since,
        },
      ]
    })
  }

  private productSelect() {
    return {
      id: true,
      slug: true,
      titleUr: true,
      titleEn: true,
      createdAt: true,
      supplier: { select: { businessName: true } },
    } as const
  }

  private toProductRow(row: {
    id: string
    slug: string
    titleUr: string
    titleEn: string
    createdAt: Date
    supplier: { businessName: string }
  }): ProductFlagRow {
    return {
      productId: row.id,
      slug: row.slug,
      titleUr: row.titleUr,
      titleEn: row.titleEn,
      supplierName: row.supplier.businessName,
      createdAt: row.createdAt,
    }
  }
}
