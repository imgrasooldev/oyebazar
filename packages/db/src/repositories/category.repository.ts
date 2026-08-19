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
  /**
   * Poora darakht — EK query mein, har darje tak.
   *
   * 🔴 Pehle ye query do darje maangti thi (`children` ke andar aur children nahi). Ops
   * ke haath mein darakht aane ke baad teesre darje ki category menu mein aati hi nahi
   * thi — banti thi, chalti thi, magar kisi ko dikhti nahi thi.
   *
   * Ab saari rows ek saath aati hain aur darakht JS mein banta hai. Nested `select`
   * likhne se har naye darje par query badalni parti — aur gehrai ab tay-shuda nahi.
   */
  async findTree(): Promise<CategoryTreeNode[]> {
    const publicProduct = {
      status: 'LIVE',
      supplier: { listedOnBazaar: true, status: 'VERIFIED' },
    } as const

    const rows = await this.db.category.findMany({
      orderBy: [{ depth: 'asc' }, { sortOrder: 'asc' }],
      select: {
        ...CATEGORY_SELECT,
        // id/parentId sirf darakht jorne ke liye — neeche node se nikal jate hain.
        // Public view slug par chalti hai, id kabhi bahar nahi jati.
        id: true,
        parentId: true,
        imageUrl: true,
        _count: { select: { products: { where: publicProduct } } },
      },
    })

    type Node = CategoryTreeNode & { children: CategoryTreeNode[] }
    const nodes = new Map<string, Node>()

    for (const row of rows) {
      const { _count, imageUrl, id: _id, parentId: _parentId, ...category } = row
      nodes.set(row.id, {
        ...category,
        coverImageUrl: imageUrl,
        productCount: _count.products,
        children: [],
      })
    }

    const roots: Node[] = []
    for (const row of rows) {
      const node = nodes.get(row.id)!
      const parent = row.parentId ? nodes.get(row.parentId) : undefined
      if (parent) parent.children.push(node)
      else roots.push(node)
    }

    /*
     * Ginti neeche se upar jama hoti hai: maal sab se neeche wali category par lagta hai,
     * magar patti aur menu upar wali dikhate hain. Jama na karte to "کپڑا" par hamesha
     * 0 likha aata — aur click karne par nataij aate. Wo tazad user ka bharosa kha jata.
     */
    const roll = (node: Node): number => {
      const total = node.children.reduce((sum, child) => sum + roll(child as Node), 0)
      const withBranch = node.productCount + total
      ;(node as { productCount: number }).productCount = withBranch
      return withBranch
    }
    roots.forEach(roll)

    return roots
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
