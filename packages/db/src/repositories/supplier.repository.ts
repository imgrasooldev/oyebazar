/**
 * SupplierRepository — sirf PUBLIC (Bazaar) read paths.
 *
 * 🔴 Reseller-facing koi method yahan nahi hai. Reseller ko supplier ka naam, number,
 * ya id kabhi nahi dikhta — warna wo seedha wholesaler ke paas chali jayegi.
 */
import type { Prisma, PrismaClient } from '@prisma/client'
import type {
  PublicSupplierView,
  SupplierFilters,
  SupplierInternalRepository,
  SupplierRepository,
} from '@oyebazar/core'
import { toPage, type Page } from '@oyebazar/shared'
import { PUBLIC_SUPPLIER_SELECT } from '../selectors'

type SupplierRow = {
  slug: string
  businessName: string
  city: string
  marketName: string | null
  bioUr: string | null
  whatsappPublic: string | null
  address: string | null
  logoUrl: string | null
  _count: { products: number }
}

export class PrismaSupplierRepository implements SupplierRepository, SupplierInternalRepository {
  constructor(private readonly db: PrismaClient) {}

  /**
   * 🔴 INTERNAL — fee rate aur supplier ka phone yahan hai.
   * Sirf OrderService (fee calculation, order routing) is method ko call karti hai.
   * Kisi reseller-facing endpoint se ye kabhi na chale.
   */
  async findInternal(supplierId: string) {
    return this.db.supplier.findUnique({
      where: { id: supplierId },
      select: { id: true, businessName: true, phone: true, feeRateBps: true, status: true },
    })
  }

  async findPublicList(filters: SupplierFilters): Promise<Page<PublicSupplierView>> {
    const rows = await this.db.supplier.findMany({
      where: this.publicWhere(filters),
      select: PUBLIC_SUPPLIER_SELECT,
      orderBy: [{ businessName: 'asc' }, { slug: 'asc' }],
      take: filters.limit + 1,
      ...(filters.cursor ? { cursor: { slug: filters.cursor }, skip: 1 } : {}),
    })
    const views = await Promise.all(rows.map((row) => this.toView(row)))
    return toPage(views, filters.limit, (s) => s.slug)
  }

  async findPublicBySlug(slug: string): Promise<PublicSupplierView | null> {
    const row = await this.db.supplier.findFirst({
      where: { slug, listedOnBazaar: true, status: 'VERIFIED' },
      select: PUBLIC_SUPPLIER_SELECT,
    })
    return row ? this.toView(row) : null
  }

  async listCities(): Promise<{ city: string; count: number }[]> {
    const grouped = await this.db.supplier.groupBy({
      by: ['city'],
      where: { listedOnBazaar: true, status: 'VERIFIED' },
      _count: { _all: true },
      orderBy: { _count: { id: 'desc' } },
    })
    return grouped.map((g) => ({ city: g.city, count: g._count._all }))
  }

  private publicWhere(filters: SupplierFilters): Prisma.SupplierWhereInput {
    return {
      listedOnBazaar: true,
      status: 'VERIFIED',
      ...(filters.city ? { city: { equals: filters.city, mode: 'insensitive' } } : {}),
      ...(filters.categorySlug
        ? { products: { some: { status: 'LIVE', category: { slug: filters.categorySlug } } } }
        : {}),
      ...(filters.search
        ? {
            OR: [
              { businessName: { contains: filters.search, mode: 'insensitive' } },
              { marketName: { contains: filters.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    }
  }

  private async toView(row: SupplierRow): Promise<PublicSupplierView> {
    const categories = await this.db.category.findMany({
      where: { products: { some: { supplier: { slug: row.slug }, status: 'LIVE' } } },
      select: { nameUr: true, nameEn: true },
      take: 6,
    })
    return {
      slug: row.slug,
      businessName: row.businessName,
      city: row.city,
      marketName: row.marketName,
      bioUr: row.bioUr,
      // listing ki shart hi yehi hai ke public number ho
      whatsappPublic: row.whatsappPublic ?? '',
      address: row.address,
      logoUrl: row.logoUrl,
      categories,
      productCount: row._count.products,
    }
  }
}
