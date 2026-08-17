/**
 * ProductRepository — Prisma adapter.
 *
 * Har method apna `select` use karta hai (src/selectors.ts). Bare `findMany()` yahan
 * kabhi nahi milega — CI ka price-leak test isi bharose par khara hai.
 */
import type { Prisma, PrismaClient } from '@prisma/client'
import type {
  CatalogueFilters,
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

type MediaRow = { processedUrl: string | null; originalUrl: string }

function coverUrl(media: readonly MediaRow[]): string | null {
  const first = media[0]
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
      where: this.publicWhere(filters),
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
      where: this.resellerWhere(filters),
      select: RESELLER_PRODUCT_SELECT,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      ...cursorArgs(filters),
    })
    return toPage(rows.map(toResellerView), filters.limit, (p) => p.id)
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
    return {
      id: row.id,
      titleUr: row.titleUr,
      titleEn: row.titleEn,
      coverImageUrl: coverUrl(row.media),
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

  private publicWhere(
    filters: Omit<CatalogueFilters, 'minPrice' | 'maxPrice'>,
  ): Prisma.ProductWhereInput {
    return {
      status: 'LIVE',
      // 🔴 Bazaar par sirf wo suppliers jo listed + verified hain
      supplier: { listedOnBazaar: true, status: 'VERIFIED' },
      ...(filters.categorySlug ? { category: { slug: filters.categorySlug } } : {}),
      ...(filters.search ? { OR: searchClause(filters.search) } : {}),
    }
  }

  private resellerWhere(filters: CatalogueFilters): Prisma.ProductWhereInput {
    return {
      status: filters.inStockOnly ? 'LIVE' : { in: ['LIVE', 'OUT_OF_STOCK'] },
      supplier: { status: 'VERIFIED' },
      ...(filters.categorySlug ? { category: { slug: filters.categorySlug } } : {}),
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
  }
}

type ResellerRow = {
  id: string
  titleUr: string
  titleEn: string
  descriptionUr: string | null
  bajiPrice: number
  suggestedRetail: number
  status: string
  category: { slug: string; nameUr: string; nameEn: string }
  variants: { id: string; size: string | null; colour: string | null; stockQty: number }[]
  media: { processedUrl: string | null; originalUrl: string; sortOrder: number }[]
}

function toResellerView(row: ResellerRow): ResellerProductView {
  return {
    id: row.id,
    titleUr: row.titleUr,
    titleEn: row.titleEn,
    descriptionUr: row.descriptionUr,
    category: row.category,
    coverImageUrl: coverUrl(row.media),
    bajiPrice: pkr(row.bajiPrice),
    suggestedRetail: pkr(row.suggestedRetail),
    inStock: row.status === 'LIVE' && row.variants.some((v) => v.stockQty > 0),
    media: row.media.map((m) => ({ url: m.processedUrl ?? m.originalUrl, sortOrder: m.sortOrder })),
    variants: row.variants.map((v) => ({
      id: v.id,
      size: v.size,
      colour: v.colour,
      inStock: v.stockQty > 0,
    })),
  }
}
