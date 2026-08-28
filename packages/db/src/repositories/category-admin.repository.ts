/**
 * Category ke darakht ka intizam.
 *
 * Do cheezen yahan ehtiyat maangti hain: jagah badalna (poori shaakh ka path badalta
 * hai) aur tarteeb (bhai-behnon ke sortOrder ek saath badalte hain). Dono ek hi
 * transaction/query mein hoti hain — aadha darakht ek jagah aur aadha doosri jagah
 * reh jana sab se buri soorat hai, kyunke us ke baad maal kahin nazar hi nahi aata.
 */
import type { PrismaClient } from '@prisma/client'
import type { CategoryAdminRepository, CategoryNode } from '@oyebazar/core'
import { buildSearchText } from '@oyebazar/shared'

export class PrismaCategoryAdminRepository implements CategoryAdminRepository {
  constructor(private readonly db: PrismaClient) {}

  async tree(): Promise<CategoryNode[]> {
    const rows = await this.db.category.findMany({
      select: {
        id: true,
        slug: true,
        nameUr: true,
        nameEn: true,
        imageUrl: true,
        parentId: true,
        path: true,
        depth: true,
        sortOrder: true,
        _count: { select: { products: true } },
      },
      orderBy: [{ depth: 'asc' }, { sortOrder: 'asc' }, { nameEn: 'asc' }],
    })

    /*
     * Shaakh ka jama neeche se upar: rows gehrai ke hisab se lage hain, is liye ulta
     * chal kar har bachche ka jama us ke baap mein daal dete hain. Har category par
     * alag query karne se 58 categories 58 query maangtin.
     */
    const branch = new Map<string, number>()
    for (const row of [...rows].reverse()) {
      const own = row._count.products
      const total = own + (branch.get(row.id) ?? 0)
      branch.set(row.id, total)
      if (row.parentId) branch.set(row.parentId, (branch.get(row.parentId) ?? 0) + total)
    }

    const nodes = new Map<string, CategoryNode & { children: CategoryNode[] }>()
    for (const row of rows) {
      nodes.set(row.id, {
        id: row.id,
        slug: row.slug,
        nameUr: row.nameUr,
        nameEn: row.nameEn,
        imageUrl: row.imageUrl,
        parentId: row.parentId,
        path: row.path,
        depth: row.depth,
        sortOrder: row.sortOrder,
        productCount: row._count.products,
        branchProductCount: branch.get(row.id) ?? 0,
        children: [],
      })
    }

    const roots: CategoryNode[] = []
    for (const row of rows) {
      const node = nodes.get(row.id)!
      const parent = row.parentId ? nodes.get(row.parentId) : undefined

      // Baap gum ho to bachcha jarh ban kar dikhta hai — chhupane se wo hamesha ke liye
      // ghaib ho jata aur koi usay theek bhi nahi kar pata
      if (parent) parent.children.push(node)
      else roots.push(node)
    }

    return roots
  }

  async findById(id: string) {
    return this.db.category.findUnique({
      where: { id },
      select: { id: true, parentId: true, path: true, depth: true },
    })
  }

  async create(input: {
    slug: string
    nameUr: string
    nameEn: string
    imageUrl?: string | undefined
    parentId: string | null
    path: string
    depth: number
    sortOrder: number
  }): Promise<{ id: string; path: string }> {
    const created = await this.db.category.create({
      data: {
        slug: input.slug,
        nameUr: input.nameUr,
        nameEn: input.nameEn,
        imageUrl: input.imageUrl ?? null,
        parentId: input.parentId,
        path: input.path,
        depth: input.depth,
        sortOrder: input.sortOrder,
      },
      select: { id: true, path: true },
    })
    return created
  }

  async setPath(id: string, path: string): Promise<void> {
    await this.db.category.update({ where: { id }, data: { path } })
  }

  async rename(
    id: string,
    input: { nameUr: string; nameEn: string; imageUrl?: string | null | undefined },
  ): Promise<void> {
    await this.db.category.update({
      where: { id },
      data: {
        nameUr: input.nameUr,
        nameEn: input.nameEn,
        // undefined = "haath na lagao", null = "hata do" — do alag baatein
        ...(input.imageUrl === undefined ? {} : { imageUrl: input.imageUrl }),
      },
    })

    /*
     * Is category ke maal ka "talash wala khana" dobara likhna.
     *
     * 🔴 Ye khana likhte WAQT banta hai (Product.searchText), aur us mein category ka
     * naam bhi shamil hota hai. Naam badal kar isay chhor dene se talash chupke se
     * purane naam par chalti rehti — koi error nahi aata, bas ops naya naam likh kar
     * apna hi maal nahi dhoond pati aur samajhti hai ke maal gum ho gaya.
     *
     * Ginti chhoti hai (ek category ka maal) aur rename bohat kam hota hai, is liye
     * seedha yahan — koi qatar, koi background job nahi.
     */
    const products = await this.db.product.findMany({
      where: { categoryId: id },
      select: { id: true, titleUr: true, titleEn: true, descriptionUr: true },
    })

    for (const product of products) {
      await this.db.product.update({
        where: { id: product.id },
        data: {
          searchText: buildSearchText({
            titleUr: product.titleUr,
            titleEn: product.titleEn,
            descriptionUr: product.descriptionUr,
            categoryNameUr: input.nameUr,
            categoryNameEn: input.nameEn,
          }),
        },
      })
    }
  }

  /**
   * 🔴 Jagah badalna — ek transaction, do query.
   *
   * Pehli khud ko naye baap par lagati hai, doosri us ke NEECHE ke sab ka path seedha
   * SQL mein badalti hai (`replace`), taake hazaar bachche bhi ek hi query mein chalen.
   */
  async move(input: {
    id: string
    newParentId: string | null
    oldPath: string
    newPath: string
    depthDelta: number
    sortOrder: number
  }): Promise<void> {
    await this.db.$transaction([
      this.db.category.update({
        where: { id: input.id },
        data: {
          parentId: input.newParentId,
          path: input.newPath,
          depth: { increment: input.depthDelta },
          sortOrder: input.sortOrder,
        },
      }),
      /*
       * 🔴 Lambai SQL ke andar `length()` se nikalti hai, JS se nahi bheji jati.
       *
       * Prisma JS ka number raw query mein bigint bana kar bhejta hai, aur Postgres ka
       * `substring(text, bigint)` mojood hi nahi — "function does not exist" par poora
       * move nakaam ho jata tha. `length($1)` integer deta hai aur masla khatam.
       */
      this.db.$executeRaw`
        UPDATE "Category"
        SET "path" = ${input.newPath} || substring("path", length(${input.oldPath}) + 1),
            "depth" = "depth" + ${input.depthDelta}
        WHERE "path" LIKE ${input.oldPath + '%'} AND "id" <> ${input.id}
      `,
    ])
  }

  async reorder(parentId: string | null, orderedIds: readonly string[]): Promise<void> {
    await this.db.$transaction(
      orderedIds.map((id, index) =>
        // parentId shart mein hai: doosri shaakh ki id bheji jaye to wo chhooti nahi
        this.db.category.updateMany({
          where: { id, parentId },
          data: { sortOrder: index },
        }),
      ),
    )
  }

  async remove(id: string): Promise<void> {
    await this.db.category.delete({ where: { id } })
  }

  async countsFor(id: string): Promise<{ products: number; children: number }> {
    const [products, children] = await Promise.all([
      this.db.product.count({ where: { categoryId: id } }),
      this.db.category.count({ where: { parentId: id } }),
    ])
    return { products, children }
  }

  async slugExists(slug: string): Promise<boolean> {
    const found = await this.db.category.findUnique({ where: { slug }, select: { id: true } })
    return found !== null
  }

  async nextSortOrder(parentId: string | null): Promise<number> {
    const last = await this.db.category.findFirst({
      where: { parentId },
      select: { sortOrder: true },
      orderBy: { sortOrder: 'desc' },
    })
    return (last?.sortOrder ?? -1) + 1
  }
}
