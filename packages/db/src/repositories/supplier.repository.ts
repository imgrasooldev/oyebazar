/**
 * SupplierRepository — sirf PUBLIC (Bazaar) read paths.
 *
 * 🔴 Reseller-facing koi method yahan nahi hai. Reseller ko supplier ka naam, number,
 * ya id kabhi nahi dikhta — warna wo seedha wholesaler ke paas chali jayegi.
 */
import type { Prisma, PrismaClient } from '@prisma/client'
import type {
  PublicSupplierView,
  SupplierAccountRepository,
  SupplierAccountView,
  SupplierApplication,
  SupplierFilters,
  SupplierInternalRepository,
  SupplierRepository,
} from '@oyebazar/core'
import { toPage, type Page } from '@oyebazar/shared'
import { PUBLIC_SUPPLIER_SELECT } from '../selectors'

/**
 * Select se hi nikala hua — haath se likhi hui naql nahi.
 *
 * Pehle ye alag list thi aur selector mein khaana barhate hi yahan lagana bhool jate the;
 * ab select badle to type khud badalta hai.
 */
type SupplierRow = Prisma.SupplierGetPayload<{ select: typeof PUBLIC_SUPPLIER_SELECT }>

const ACCOUNT_SELECT = {
  id: true,
  businessName: true,
  ownerName: true,
  city: true,
  marketName: true,
  status: true,
} as const

export class PrismaSupplierRepository
  implements SupplierRepository, SupplierInternalRepository, SupplierAccountRepository
{
  constructor(private readonly db: PrismaClient) {}

  /** Portal ka login/session — phone ya id se dukan ka khata. */
  async findAccountById(supplierId: string): Promise<SupplierAccountView | null> {
    return this.db.supplier.findUnique({ where: { id: supplierId }, select: ACCOUNT_SELECT })
  }

  async findAccountByPhone(phoneE164: string): Promise<SupplierAccountView | null> {
    return this.db.supplier.findUnique({ where: { phone: phoneE164 }, select: ACCOUNT_SELECT })
  }

  /**
   * 🔴 Hamesha PENDING aur `listedOnBazaar: false` — ye default yahan hard-code hai,
   * caller se nahi aata. Warna kabhi koi naya endpoint ghalti se `status` bhej deta
   * aur bina jaanchi dukan seedha bazaar par aa jati.
   */
  async createApplication(input: SupplierApplication): Promise<{ id: string }> {
    return this.db.supplier.create({
      data: {
        slug: await this.uniqueSlug(input.businessName),
        businessName: input.businessName,
        ownerName: input.ownerName,
        phone: input.phoneE164,
        city: input.city,
        address: input.address,
        ...(input.marketName ? { marketName: input.marketName } : {}),
        ...(input.ntn ? { ntn: input.ntn } : {}),
        status: 'PENDING',
        listedOnBazaar: false,
      },
      select: { id: true },
    })
  }

  /**
   * Slug naam se banta hai; Urdu naam par kuch nahi bachta, is liye us soorat mein
   * "shop" + number. Ops chahe to baad mein behtar slug laga sakti hai.
   */
  private async uniqueSlug(businessName: string): Promise<string> {
    const base =
      businessName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 40) || 'shop'

    for (let attempt = 0; attempt < 50; attempt += 1) {
      const slug = attempt === 0 ? base : `${base}-${attempt + 1}`
      const taken = await this.db.supplier.findUnique({ where: { slug }, select: { id: true } })
      if (!taken) return slug
    }

    // 50 dukanon ka ek hi naam — mumkin nahi, magar chup chaap fail hone se behtar hai
    return `${base}-${Date.now()}`
  }

  /**
   * 🔴 INTERNAL — fee rate aur supplier ka phone yahan hai.
   * Sirf OrderService (fee calculation, order routing) is method ko call karti hai.
   * Kisi reseller-facing endpoint se ye kabhi na chale.
   */
  async findInternal(supplierId: string) {
    return this.db.supplier.findUnique({
      where: { id: supplierId },
      select: {
        id: true,
        businessName: true,
        phone: true,
        feeRateBps: true,
        status: true,
        deliveryFeeCity: true,
        deliveryFeeOther: true,
      },
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
      /*
       * "Naya maal" = pichhle 7 din mein koi LIVE listing.
       * Shart products par lagti hai, kisi jama kiye hue khaane par nahi: aisa khaana
       * ek din asli listing se alag ho jata (koi update chhoot jaye) aur phir wo dukan
       * hamesha ghalat side par khari rehti.
       */
      ...(filters.freshOnly
        ? {
            products: {
              some: {
                status: 'LIVE',
                createdAt: { gte: new Date(Date.now() - 7 * 86_400_000) },
              },
            },
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
      memberSince: row.createdAt,
      lastListedAt: row.products[0]?.createdAt ?? null,
    }
  }
}
