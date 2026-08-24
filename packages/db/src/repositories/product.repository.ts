/**
 * ProductRepository — Prisma adapter.
 *
 * Har method apna `select` use karta hai (src/selectors.ts). Bare `findMany()` yahan
 * kabhi nahi milega — CI ka price-leak test isi bharose par khara hai.
 */
import type { Prisma, PrismaClient } from '@prisma/client'
import type {
  CatalogueFilters,
  CatalogueSort,
  CursorQuery,
  ProductRepository,
} from '@oyebazar/core'
import type {
  PricingProductView,
  PublicActivityItem,
  PublicProductView,
  RenderProductView,
  ResellerProductView,
} from '@oyebazar/core'
import { pkr, toPage, type Page } from '@oyebazar/shared'
import {
  PRICING_PRODUCT_SELECT,
  PUBLIC_PRODUCT_SELECT,
  RENDER_PRODUCT_SELECT,
  RESELLER_PRODUCT_SELECT,
} from '../selectors'

type MediaRow = { processedUrl: string | null; originalUrl: string; type?: 'IMAGE' | 'VIDEO' }

/**
 * Cover hamesha TASVEER hoti hai.
 *
 * 🔴 `type` ki jaanch is liye lagi ke ab wholesaler video bhi upload karta hai. Sirf
 * `media[0]` lete to jis maal ki pehli cheez video hoti, us ka cover `<img>` mein ek
 * mp4 ka link ban kar catalogue par khali dabba dikhata.
 */
function coverUrl(media: readonly MediaRow[]): string | null {
  const first = media.find((item) => item.type !== 'VIDEO')
  return first ? (first.processedUrl ?? first.originalUrl) : null
}

/** Cursor pagination — limit + 1 fetch kar ke pata chalta hai ke aage aur hai ya nahi. */
function cursorArgs(query: CursorQuery) {
  return {
    take: query.limit + 1,
    ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
  }
}

/**
 * Public surface par cursor `slug` hai, `id` nahi — kyunke `PublicProductView` mein
 * internal id maujood hi nahi (DTO `.strict()` extra field par throw kar deta hai).
 */
function publicCursorArgs(query: CursorQuery) {
  return {
    take: query.limit + 1,
    ...(query.cursor ? { cursor: { slug: query.cursor }, skip: 1 } : {}),
  }
}

export class PrismaProductRepository implements ProductRepository {
  constructor(private readonly db: PrismaClient) {}

  // ------------------------------------------------------------ public (Bazaar)

  async findPublicList(
    filters: Omit<CatalogueFilters, 'minPrice' | 'maxPrice'>,
  ): Promise<Page<PublicProductView>> {
    const rows = await this.db.product.findMany({
      where: await this.publicWhere(filters),
      select: PUBLIC_PRODUCT_SELECT,
      orderBy: [{ createdAt: 'desc' }, { slug: 'desc' }],
      ...publicCursorArgs(filters),
    })
    return toPage(rows.map(toPublicView), filters.limit, (p) => p.slug)
  }

  async findPublicBySlug(slug: string): Promise<PublicProductView | null> {
    const row = await this.db.product.findFirst({
      where: { slug, status: 'LIVE', supplier: { listedOnBazaar: true, status: 'VERIFIED' } },
      select: PUBLIC_PRODUCT_SELECT,
    })
    return row ? toPublicView(row) : null
  }

  async findPublicBySupplier(
    supplierSlug: string,
    query: CursorQuery,
  ): Promise<Page<PublicProductView>> {
    const rows = await this.db.product.findMany({
      where: {
        status: 'LIVE',
        supplier: { slug: supplierSlug, listedOnBazaar: true, status: 'VERIFIED' },
      },
      select: PUBLIC_PRODUCT_SELECT,
      orderBy: [{ createdAt: 'desc' }, { slug: 'desc' }],
      ...publicCursorArgs(query),
    })
    return toPage(rows.map(toPublicView), query.limit, (p) => p.slug)
  }

  // ------------------------------------------------------------ reseller (login ke baad)

  async findResellerList(filters: CatalogueFilters): Promise<Page<ResellerProductView>> {
    const rows = await this.db.product.findMany({
      where: await this.resellerWhere(filters),
      select: RESELLER_PRODUCT_SELECT,
      orderBy: orderFor(filters.sort),
      ...cursorArgs(filters),
    })
    return toPage(rows.map(toResellerView), filters.limit, (p) => p.id)
  }

  async deliveryRatesFor(productId: string): Promise<{ city: number; other: number }> {
    const row = await this.db.product.findUnique({
      where: { id: productId },
      select: { supplier: { select: { deliveryFeeCity: true, deliveryFeeOther: true } } },
    })

    // Maal na mile to wohi qadar jo nayi dukan par lagti hai — safha rukna nahi chahiye
    return {
      city: row?.supplier.deliveryFeeCity ?? 200,
      other: row?.supplier.deliveryFeeOther ?? 350,
    }
  }

  /**
   * Kuch mutayyin maal — usi tarteeb mein jis mein ids aayi thin.
   *
   * Tarteeb yahin lagti hai kyunke DB `IN (...)` par apni marzi ki tarteeb deta hai,
   * aur is list ka poora matlab hi tarteeb hai (sab se zyada chalne wala pehle).
   * Jo maal ab LIVE nahi raha wo chup chaap gir jata hai — chalta hua maal jo khatam
   * ho gaya, us ko dikhana sirf jhoot hai.
   */
  async findResellerByIds(productIds: readonly string[]): Promise<ResellerProductView[]> {
    if (productIds.length === 0) return []

    const rows = await this.db.product.findMany({
      where: { id: { in: [...productIds] }, status: 'LIVE' },
      select: RESELLER_PRODUCT_SELECT,
    })

    const byId = new Map(rows.map((row) => [row.id, toResellerView(row)]))
    return productIds.flatMap((id) => {
      const view = byId.get(id)
      return view ? [view] : []
    })
  }

  async findIdBySlug(slug: string): Promise<string | null> {
    const row = await this.db.product.findUnique({
      where: { slug },
      // Sirf wo maal jo abhi zinda hai — archived ka rasta khula rakhna sirf 404 deta hai
      select: { id: true, status: true },
    })

    return row && row.status !== 'ARCHIVED' ? row.id : null
  }

  async findResellerById(productId: string): Promise<ResellerProductView | null> {
    const row = await this.db.product.findFirst({
      where: { id: productId, status: { in: ['LIVE', 'OUT_OF_STOCK'] } },
      select: RESELLER_PRODUCT_SELECT,
    })
    return row ? toResellerView(row) : null
  }

  // ------------------------------------------------------------ render + pricing

  async findForRender(productId: string): Promise<RenderProductView | null> {
    const row = await this.db.product.findUnique({
      where: { id: productId },
      select: RENDER_PRODUCT_SELECT,
    })
    if (!row) return null

    // Selector pehle status wali tasveer deta hai, phir sortOrder — is liye images[0]
    // hi cover hai aur do alag lists banane ki zaroorat nahi
    const images = row.media.map((media) => ({
      id: media.id,
      url: media.processedUrl ?? media.originalUrl,
    }))

    return {
      id: row.id,
      titleUr: row.titleUr,
      titleEn: row.titleEn,
      coverImageUrl: images[0]?.url ?? null,
      images,
      categoryNameUr: row.category.nameUr,
    }
  }

  /** 🔴 Sirf order pricing / fee ledger. Reseller-facing code se ye method call na ho. */
  async findForPricing(productIds: readonly string[]): Promise<PricingProductView[]> {
    if (productIds.length === 0) return []
    const rows = await this.db.product.findMany({
      where: { id: { in: [...productIds] } },
      select: PRICING_PRODUCT_SELECT,
    })
    return rows.map((row) => ({
      id: row.id,
      supplierId: row.supplierId,
      supplierPrice: pkr(row.supplierPrice),
      bajiPrice: pkr(row.bajiPrice),
      suggestedRetail: pkr(row.suggestedRetail),
      inStock: row.status === 'LIVE' && row.variants.some((v) => v.stockQty > 0),
    }))
  }

  /** Live patti — abhi abhi jo maal list hua (koi price nahi). */
  async findRecentlyListed(limit: number): Promise<PublicActivityItem[]> {
    const rows = await this.db.product.findMany({
      where: { status: 'LIVE', supplier: { listedOnBazaar: true, status: 'VERIFIED' } },
      select: {
        slug: true,
        titleUr: true,
        titleEn: true,
        createdAt: true,
        category: { select: { nameUr: true, nameEn: true } },
        supplier: { select: { businessName: true, slug: true, city: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    return rows.map((row) => ({
      slug: row.slug,
      titleUr: row.titleUr,
      titleEn: row.titleEn,
      supplierName: row.supplier.businessName,
      supplierSlug: row.supplier.slug,
      city: row.supplier.city,
      categoryNameUr: row.category.nameUr,
      categoryNameEn: row.category.nameEn,
      listedAt: row.createdAt,
    }))
  }

  /**
   * "Popular" — jin par sab se zyada orders aaye.
   *
   * 🔴 Yahan sirf GINTI use hoti hai, koi price ya order ki tafseel nahi. Naye
   * catalogue mein orders kam hote hain, is liye khali nateeje par naya maal dikhate hain
   * — banawati "popular" tag lagane se behtar hai.
   */
  /**
   * Chal raha maal — pichhle `days` din ke order ki ginti se.
   *
   * Ginti ORDER ki hai, tukron (qty) ki nahi. Ek banda 20 piece ka ek order kare to
   * wo "chal raha hai" ki daleel nahi — 20 alag customer hain, wo daleel hai. Qty phir
   * bhi sath jati hai kyunke dukan ke apne safhe par wo kaam ki cheez hai.
   *
   * 🔴 Mare hue order shumar nahi hote (dekhen port ka comment). PENDING_CONFIRM bhi
   * nahi: us ka customer ne abhi haan hi nahi ki.
   */
  async findTrending(input: {
    limit: number
    days: number
    supplierId?: string | undefined
  }): Promise<readonly { productId: string; orders: number; qty: number }[]> {
    const since = new Date(Date.now() - input.days * 24 * 60 * 60 * 1000)

    const rows = await this.db.orderItem.groupBy({
      by: ['productId'],
      where: {
        order: {
          createdAt: { gte: since },
          status: {
            notIn: ['PENDING_CONFIRM', 'CANCELLED', 'REJECTED', 'RTO'],
          },
          ...(input.supplierId ? { supplierId: input.supplierId } : {}),
        },
      },
      _count: { _all: true },
      _sum: { qty: true },
      orderBy: { _count: { productId: 'desc' } },
      take: input.limit,
    })

    return rows.map((row) => ({
      productId: row.productId,
      orders: row._count._all,
      qty: row._sum.qty ?? 0,
    }))
  }

  async findPublicPopular(limit: number): Promise<PublicProductView[]> {
    const ranked = await this.db.orderItem.groupBy({
      by: ['productId'],
      _count: { _all: true },
      orderBy: { _count: { productId: 'desc' } },
      take: limit,
    })

    const rows = ranked.length
      ? await this.db.product.findMany({
          where: {
            id: { in: ranked.map((r) => r.productId) },
            status: 'LIVE',
            supplier: { listedOnBazaar: true, status: 'VERIFIED' },
          },
          select: PUBLIC_PRODUCT_SELECT,
        })
      : []

    if (rows.length >= limit) return rows.map(toPublicView)

    // kam paray to naya maal mila dete hain
    const filler = await this.db.product.findMany({
      where: {
        status: 'LIVE',
        supplier: { listedOnBazaar: true, status: 'VERIFIED' },
        slug: { notIn: rows.map((r) => r.slug) },
      },
      select: PUBLIC_PRODUCT_SELECT,
      orderBy: { createdAt: 'desc' },
      take: limit - rows.length,
    })

    return [...rows, ...filler].map(toPublicView)
  }

  async countPublic(): Promise<number> {
    return this.db.product.count({
      where: { status: 'LIVE', supplier: { listedOnBazaar: true, status: 'VERIFIED' } },
    })
  }

  // ------------------------------------------------------------ where builders

  private async publicWhere(
    filters: Omit<CatalogueFilters, 'minPrice' | 'maxPrice'>,
  ): Promise<Prisma.ProductWhereInput> {
    return {
      status: 'LIVE',
      // 🔴 Bazaar par sirf wo suppliers jo listed + verified hain
      supplier: { listedOnBazaar: true, status: 'VERIFIED' },
      ...(filters.categorySlug
        ? { category: await categoryFilter(this.db, filters.categorySlug) }
        : {}),
      ...(filters.search ? { OR: searchClause(filters.search) } : {}),
    }
  }

  private async resellerWhere(filters: CatalogueFilters): Promise<Prisma.ProductWhereInput> {
    return {
      status: filters.inStockOnly ? 'LIVE' : { in: ['LIVE', 'OUT_OF_STOCK'] },
      // Dukan se chhanna — aur `status: VERIFIED` yahan bhi qaim rehta hai
      supplier: {
        status: 'VERIFIED',
        ...(filters.supplierSlug ? { slug: filters.supplierSlug } : {}),
      },
      ...(filters.categorySlug
        ? { category: await categoryFilter(this.db, filters.categorySlug) }
        : {}),
      ...(filters.search ? { OR: searchClause(filters.search) } : {}),
      ...(filters.minPrice !== undefined || filters.maxPrice !== undefined
        ? {
            bajiPrice: {
              ...(filters.minPrice !== undefined ? { gte: filters.minPrice } : {}),
              ...(filters.maxPrice !== undefined ? { lte: filters.maxPrice } : {}),
            },
          }
        : {}),
      ...(filters.inStockOnly ? { variants: { some: { stockQty: { gt: 0 } } } } : {}),
    }
  }
}

function searchClause(term: string): Prisma.ProductWhereInput[] {
  return [
    { titleUr: { contains: term, mode: 'insensitive' } },
    { titleEn: { contains: term, mode: 'insensitive' } },
  ]
}

type PublicRow = {
  slug: string
  titleUr: string
  titleEn: string
  category: { slug: string; nameUr: string; nameEn: string }
  media: MediaRow[]
  supplier: { businessName: string; slug: string; city: string }
  createdAt: Date
}

function toPublicView(row: PublicRow): PublicProductView {
  return {
    slug: row.slug,
    titleUr: row.titleUr,
    titleEn: row.titleEn,
    category: row.category,
    coverImageUrl: coverUrl(row.media),
    supplierName: row.supplier.businessName,
    supplierSlug: row.supplier.slug,
    supplierCity: row.supplier.city,
    listedAt: row.createdAt,
  }
}

type ResellerRow = {
  id: string
  titleUr: string
  titleEn: string
  descriptionUr: string | null
  supplier: {
    id: string
    slug: string
    businessName: string
    city: string
    marketName: string | null
  }
  bajiPrice: number
  suggestedRetail: number
  status: string
  category: { slug: string; nameUr: string; nameEn: string }
  variants: { id: string; size: string | null; colour: string | null; stockQty: number }[]
  media: {
    id: string
    processedUrl: string | null
    originalUrl: string
    variantId: string | null
    type: 'IMAGE' | 'VIDEO'
    sortOrder: number
  }[]
  createdAt: Date
}

/**
 * Tarteeb — har rukh ke saath id bhi.
 *
 * 🔴 id sirf khoobsurti ke liye nahi: do maal ka rate ek jaisa ho (aur hota hai — 500,
 * 1000 wale rate aam hain) to un ki aapas ki tarteeb har query par badal sakti hai. Us
 * soorat mein cursor wali pagination ek hi maal do bar dikhati hai ya kisi ko bilkul
 * chhod deti hai.
 *
 * "Munafa zyada" `suggestedRetail` par chalta hai, reseller ke apne rate par nahi: us ka
 * apna rate doosri table mein hai aur us par tarteeb dene ke liye join chahiye — jis ka
 * kharcha is chhote faide ke laiq nahi. Hamara mashwara hi us ka nuqta-e-aaghaz hota hai.
 */
function orderFor(sort: CatalogueSort | undefined) {
  switch (sort) {
    case 'priceLow':
      return [{ bajiPrice: 'asc' as const }, { id: 'desc' as const }]
    case 'priceHigh':
      return [{ bajiPrice: 'desc' as const }, { id: 'desc' as const }]
    case 'profitHigh':
      return [{ suggestedRetail: 'desc' as const }, { id: 'desc' as const }]
    default:
      return [{ createdAt: 'desc' as const }, { id: 'desc' as const }]
  }
}

/** Kisi ek jorhe ki pehli tasveer — sortOrder ke hisab se. */
function firstImageFor(
  media: readonly { processedUrl: string | null; originalUrl: string; variantId: string | null }[],
  variantId: string,
): string | null {
  const found = media.find((item) => item.variantId === variantId)
  return found ? (found.processedUrl ?? found.originalUrl) : null
}

function toResellerView(row: ResellerRow): ResellerProductView {
  return {
    id: row.id,
    titleUr: row.titleUr,
    titleEn: row.titleEn,
    descriptionUr: row.descriptionUr,
    // Shanakht, rabta nahi — dekhen RESELLER_PRODUCT_SELECT ka note
    supplier: row.supplier,
    category: row.category,
    coverImageUrl: coverUrl(row.media),
    bajiPrice: pkr(row.bajiPrice),
    suggestedRetail: pkr(row.suggestedRetail),
    inStock: row.status === 'LIVE' && row.variants.some((v) => v.stockQty > 0),
    // Sab jorhon ka jama — jis maal par rang/size na hon us ka bhi ek default variant hota hai
    stockLeft: row.variants.reduce((sum, v) => sum + Math.max(v.stockQty, 0), 0),
    media: row.media.map((m) => ({
      id: m.id,
      type: m.type,
      url: m.processedUrl ?? m.originalUrl,
      sortOrder: m.sortOrder,
    })),
    variants: row.variants.map((v) => ({
      id: v.id,
      size: v.size,
      colour: v.colour,
      inStock: v.stockQty > 0,
      // Is jorhe ki apni tasveer — na ho to null, phir poore maal wali chalti hai
      imageUrl: firstImageFor(row.media, v.id),
    })),
    listedAt: row.createdAt,
  }
}

/**
 * Category ka filter — ye category AUR is ke neeche ka poora darakht.
 *
 * 🔴 Maal hamesha sab se neeche wali category par lagta hai (lawn, abaya…), magar chips
 * aur menu upar wali dikhate hain (kapra aur malbusat). Sirf `slug` par match karte to
 * "کپڑا" par click karne se 0 nataij aate.
 *
 * Pehle yahan `{ OR: [{ slug }, { parent: { slug } }] }` tha — yani sirf DO darje. Ab
 * darakht jitna marzi gehra ja sakta hai, aur teesre darje ka maal us purane filter se
 * chup chaap ghaib ho jata: koi error nahi, bas "koi maal nahi mila".
 *
 * Ab path se: har category ka path jarh se us tak ka rasta hai ("/a/b/c/"), is liye
 * "is shaakh ka sab kuch" sirf ek `startsWith` hai — chahe wo paanch darje neeche ho.
 */
async function categoryFilter(
  db: PrismaClient,
  slug: string,
): Promise<Prisma.CategoryWhereInput> {
  const target = await db.category.findUnique({ where: { slug }, select: { path: true } })

  // Category hi na mile to woh slug kisi maal par nahi lagta — khali natija sahi jawab hai
  if (!target) return { slug }

  return { path: { startsWith: target.path } }
}
