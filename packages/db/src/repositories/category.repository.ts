import type { PrismaClient } from '@prisma/client'
import type { CategoryRepository, CategoryTreeNode, CategoryView } from '@oyebazar/core'

const CATEGORY_SELECT = { slug: true, nameUr: true, nameEn: true } as const

export class PrismaCategoryRepository implements CategoryRepository {
  constructor(private readonly db: PrismaClient) {}

  /** 🔴 Sirf bari categories — sub-categories chips ki patti mein nahi aatin. */
  async findAll(): Promise<CategoryView[]> {
    return this.db.category.findMany({
      where: { parentId: null },
      select: CATEGORY_SELECT,
      orderBy: { sortOrder: 'asc' },
    })
  }

  /**
   * Mega-menu ka poora darakht — EK query mein.
   *
   * Har category par alag query (N+1) 12 categories par bhi 13 round-trips hai, aur
   * ye menu har safhe par khulta hai.
   */
  async findTree(): Promise<CategoryTreeNode[]> {
    const publicProduct = {
      status: 'LIVE',
      supplier: { listedOnBazaar: true, status: 'VERIFIED' },
    } as const

    const rows = await this.db.category.findMany({
      where: { parentId: null },
      orderBy: { sortOrder: 'asc' },
      select: {
        ...CATEGORY_SELECT,
        imageUrl: true,
        _count: { select: { products: { where: publicProduct } } },
        children: {
          orderBy: { sortOrder: 'asc' },
          select: {
            ...CATEGORY_SELECT,
            _count: { select: { products: { where: publicProduct } } },
          },
        },
      },
    })

    return rows.map(({ _count, children, imageUrl, ...category }) => {
      const childNodes = children.map(({ _count: childCount, ...child }) => ({
        ...child,
        productCount: childCount.products,
      }))

      return {
        ...category,
        coverImageUrl: imageUrl,
        // maal sub-category par lagta hai, is liye parent ki ginti bachon se jama hoti hai
        productCount: _count.products + childNodes.reduce((sum, c) => sum + c.productCount, 0),
        children: childNodes,
      }
    })
  }

  async findBySlug(slug: string): Promise<CategoryView | null> {
    return this.db.category.findUnique({ where: { slug }, select: CATEGORY_SELECT })
  }

  /** Trending — sirf wo maal ginte hain jo Bazaar par nazar aata hai, saath ek cover tasveer. */
  async findWithCounts(): Promise<
    (CategoryView & { productCount: number; coverImageUrl: string | null })[]
  > {
    const publicProduct = {
      status: 'LIVE',
      supplier: { listedOnBazaar: true, status: 'VERIFIED' },
    } as const

    const rows = await this.db.category.findMany({
      select: {
        ...CATEGORY_SELECT,
        imageUrl: true,
        _count: { select: { products: { where: publicProduct } } },
        // ek hi query mein cover — har category par alag query (N+1) nahi
        products: {
          where: publicProduct,
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            media: {
              where: { isStatusSource: true },
              orderBy: { sortOrder: 'asc' },
              take: 1,
              select: { processedUrl: true, originalUrl: true },
            },
          },
        },
      },
      orderBy: { sortOrder: 'asc' },
    })

    return rows
      .map(({ _count, products, imageUrl, ...category }) => {
        const media = products[0]?.media[0]
        return {
          ...category,
          productCount: _count.products,
          // category ki apni tasveer pehle, warna us ka taza tareen maal
          coverImageUrl: imageUrl ?? (media ? (media.processedUrl ?? media.originalUrl) : null),
        }
      })
      .sort((a, b) => b.productCount - a.productCount)
  }
}
