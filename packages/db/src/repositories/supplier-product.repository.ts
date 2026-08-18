/**
 * SupplierProductRepository — wholesaler ke apne maal ki listing aur stock on/off.
 *
 * 🔴 Har query mein `supplierId` shart ke taur par hai. `updateMany` jaan boojh kar
 * use kiya hai (update nahi): `where` mein supplierId dal kar count 0 aaye to matlab
 * maal is dukan ka nahi — service ko wohi "nahi mila" wala jawab milta hai. Is tarah
 * doosre wholesaler ke product id se chher-chhaar kaam nahi karti, aur ye baat query
 * mein likhi hai, kisi upar wale `if` par nahi chhori.
 */
import type { PrismaClient } from '@prisma/client'
import type {
  NewSupplierProduct,
  SupplierProductRepository,
  SupplierProductView,
} from '@oyebazar/core'
import { NotFoundError } from '@oyebazar/shared'
import { pkr } from '@oyebazar/shared'

/** Ye order abhi chal rahe hain — inhen stock band karne se pehle dikhna chahiye. */
const OPEN_STATUSES = [
  'PENDING_CONFIRM',
  'CONFIRMED',
  'SENT_TO_SUPPLIER',
  'ACCEPTED',
  'DISPATCHED',
] as const

export class PrismaSupplierProductRepository implements SupplierProductRepository {
  constructor(private readonly db: PrismaClient) {}

  /**
   * Naya maal — hamesha DRAFT aur bina stock ke.
   *
   * 🔴 `status: 'DRAFT'` yahan hard-code hai, caller se nahi aata: warna kal koi naya
   * endpoint ghalti se LIVE bhej deta aur bina dekha hua maal seedha reseller ke
   * catalogue mein aa jata.
   */
  async create(input: NewSupplierProduct): Promise<{ id: string }> {
    // Maal sub-category par lagta hai; slug se dhoondte hain
    const category = await this.db.category.findUnique({
      where: { slug: input.categorySlug },
      select: { id: true },
    })
    if (!category) throw new NotFoundError('Category', input.categorySlug)

    return this.db.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          slug: await this.uniqueSlug(tx, input.titleEn || input.titleUr),
          supplierId: input.supplierId,
          titleUr: input.titleUr,
          titleEn: input.titleEn,
          ...(input.descriptionUr ? { descriptionUr: input.descriptionUr } : {}),
          categoryId: category.id,
          supplierPrice: input.supplierPrice,
          bajiPrice: input.bajiPrice,
          suggestedRetail: input.suggestedRetail,
          status: 'DRAFT',
        },
        select: { id: true },
      })

      if (input.imageUrl) {
        await tx.productMedia.create({
          data: {
            productId: product.id,
            originalUrl: input.imageUrl,
            processedUrl: input.imageUrl,
            // Status pack isi tasveer par banta hai
            isStatusSource: true,
            sortOrder: 0,
          },
        })
      }

      return product
    })
  }

  /** Slug naam se; Urdu naam par kuch nahi bachta, to "item" + number. */
  private async uniqueSlug(
    tx: { product: { findUnique: PrismaClient['product']['findUnique'] } },
    name: string,
  ): Promise<string> {
    const base =
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 40) || 'item'

    for (let attempt = 0; attempt < 50; attempt += 1) {
      const slug = attempt === 0 ? base : `${base}-${attempt + 1}`
      const taken = await tx.product.findUnique({ where: { slug }, select: { id: true } })
      if (!taken) return slug
    }
    return `${base}-${Date.now()}`
  }

  async listForSupplier(supplierId: string): Promise<SupplierProductView[]> {
    const rows = await this.db.product.findMany({
      where: { supplierId, status: { not: 'ARCHIVED' } },
      select: {
        id: true,
        titleUr: true,
        titleEn: true,
        status: true,
        supplierPrice: true,
        media: {
          where: { isStatusSource: true },
          select: { processedUrl: true, originalUrl: true },
          take: 1,
        },
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    })

    // Khule order ek hi group-by mein — har product par alag query (N+1) nahi
    const open = await this.db.orderItem.groupBy({
      by: ['productId'],
      where: {
        productId: { in: rows.map((row) => row.id) },
        order: { supplierId, status: { in: [...OPEN_STATUSES] } },
      },
      _count: { productId: true },
    })
    const openByProduct = new Map(open.map((row) => [row.productId, row._count.productId]))

    return rows.map((row) => ({
      id: row.id,
      titleUr: row.titleUr,
      titleEn: row.titleEn,
      status: row.status,
      supplierPrice: pkr(row.supplierPrice),
      imageUrl: row.media[0]?.processedUrl ?? row.media[0]?.originalUrl ?? null,
      openOrders: openByProduct.get(row.id) ?? 0,
    }))
  }

  async setStockStatus(
    supplierId: string,
    productId: string,
    status: 'LIVE' | 'OUT_OF_STOCK',
  ): Promise<boolean> {
    const { count } = await this.db.product.updateMany({
      // status ki shart bhi yahin: DRAFT/ARCHIVED maal wholesaler khud live nahi kar sakta
      where: { id: productId, supplierId, status: { in: ['LIVE', 'OUT_OF_STOCK'] } },
      data: { status },
    })
    return count > 0
  }
}
