/**
 * SupplierRepository — sirf PUBLIC (Bazaar) read paths.
 *
 * 🔴 Reseller-facing koi method yahan nahi hai. Reseller ko supplier ka naam, number,
 * ya id kabhi nahi dikhta — warna wo seedha wholesaler ke paas chali jayegi.
 */
import type { Prisma, PrismaClient } from '@prisma/client'
import type {
  PayoutAccount,
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
import {
  PAYOUT_ACCOUNT_SELECT,
  payoutAccountColumns,
  payoutAccountFrom,
} from '../payout-account'
import { categoryFilter } from './product.repository'

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
  logoUrl: true,
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
    const row = await this.db.supplier.findUnique({
      where: { id: supplierId },
      select: {
        id: true,
        businessName: true,
        phone: true,
        feeRateBps: true,
        status: true,
        deliveryFeeCity: true,
        deliveryFeeOther: true,
        ...PAYOUT_ACCOUNT_SELECT,
      },
    })
    if (!row) return null

    const { payoutMethod, payoutAccount, payoutTitle, payoutBankName, ...rest } = row
    return {
      ...rest,
      payoutAccount: payoutAccountFrom({
        payoutMethod,
        payoutAccount,
        payoutTitle,
        payoutBankName,
      }),
    }
  }

  async savePayoutAccount(
    supplierId: string,
    account: PayoutAccount | null,
    at: Date,
  ): Promise<void> {
    await this.db.supplier.update({
      where: { id: supplierId },
      data: payoutAccountColumns(account, at),
    })
  }

  async findPublicList(filters: SupplierFilters): Promise<Page<PublicSupplierView>> {
    const rows = await this.db.supplier.findMany({
      where: await this.publicWhere(filters),
      select: PUBLIC_SUPPLIER_SELECT,
      orderBy: [{ businessName: 'asc' }, { slug: 'asc' }],
      take: filters.limit + 1,
      ...(filters.cursor ? { cursor: { slug: filters.cursor }, skip: 1 } : {}),
    })
    /*
     * 🔴 Categories SAB dukanon ki EK query mein — pehle har dukan ki apni query thi.
     *
     * `Promise.all(rows.map(toView))` dekhne mein parallel lagta hai, magar wo N+1 hai:
     * 15 dukanein = 15 alag query, aur har ek ke andar `products.some` wala subquery
     * bhi. Wo saath saath chalti bhi hain to bhi DB par bojh utna hi rehta hai, aur
     * connection pool usi waqt bhar jata hai jab safha sab se zyada khulta hai.
     *
     * Ab ek hi query, aur groupbandi JS mein.
     */
    const byslug = await this.categoriesFor(rows.map((row) => row.slug))
    const views = rows.map((row) => this.toView(row, byslug.get(row.slug) ?? []))
    return toPage(views, filters.limit, (s) => s.slug)
  }

  async findPublicBySlug(slug: string): Promise<PublicSupplierView | null> {
    const row = await this.db.supplier.findFirst({
      where: { slug, listedOnBazaar: true, status: 'VERIFIED' },
      select: PUBLIC_SUPPLIER_SELECT,
    })
    if (!row) return null

    // Ek dukan — wohi helper, bas ek hi slug ke saath
    const byslug = await this.categoriesFor([row.slug])
    return this.toView(row, byslug.get(row.slug) ?? [])
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

  private async publicWhere(filters: SupplierFilters): Promise<Prisma.SupplierWhereInput> {
    return {
      listedOnBazaar: true,
      status: 'VERIFIED',
      ...(filters.city ? { city: { equals: filters.city, mode: 'insensitive' } } : {}),
      /*
       * 🔴 Yahan pehle `category: { slug }` tha — yani BILKUL wohi category, us ke neeche
       * ka kuch nahi.
       *
       * Aur `/bazaar` ki patti par UPAR wali categories dikhti hain (Cosmetics, Apparel,
       * Toys), jabke maal NEECHE wali par laga hota hai (Makeup, Lawn, Bridal Wear). Is
       * liye har chhanni sifar deti thi — cosmetics par bhi, apparel par bhi, sab par.
       *
       * Aur wo chup chaap deti thi: koi error nahi, bas "koi dukan nahi mili". Theek us
       * kharabi se `categoryFilter` ka apna comment mana karta hai — magar wo helper
       * sirf maal wali query mein laga tha, yahan nahi. Ek usool, do jagah likha hua —
       * aur ek jagah purani reh gayi.
       *
       * Ab dono ek hi helper istemal karte hain.
       */
      ...(filters.categorySlug
        ? {
            products: {
              some: {
                status: 'LIVE' as const,
                category: await categoryFilter(this.db, filters.categorySlug),
              },
            },
          }
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

  /**
   * Kai dukanon ki categories — ek hi query mein.
   *
   * 🔴 `distinct` DB par lagta hai, JS mein nahi: ek dukan ke 400 maal ho sakte hain
   * magar categories chhe. Bina `distinct` ke chaar hazar qatarein network par aatin
   * taake un mein se saath alag naam nikale jayen.
   */
  private async categoriesFor(
    slugs: readonly string[],
  ): Promise<Map<string, { nameUr: string; nameEn: string }[]>> {
    if (slugs.length === 0) return new Map()

    const rows = await this.db.product.findMany({
      where: { status: 'LIVE', supplier: { slug: { in: [...slugs] } } },
      select: {
        supplier: { select: { slug: true } },
        category: { select: { nameUr: true, nameEn: true } },
      },
      distinct: ['supplierId', 'categoryId'],
    })

    const byslug = new Map<string, { nameUr: string; nameEn: string }[]>()
    for (const row of rows) {
      const list = byslug.get(row.supplier.slug) ?? []
      // Chhe se ziyada naam card par samate hi nahi — wahi hadd jo pehle `take: 6` thi
      if (list.length < 6) list.push(row.category)
      byslug.set(row.supplier.slug, list)
    }

    return byslug
  }

  private toView(
    row: SupplierRow,
    categories: { nameUr: string; nameEn: string }[],
  ): PublicSupplierView {
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
      deliveryFeeCity: row.deliveryFeeCity,
      deliveryFeeOther: row.deliveryFeeOther,
      payoutTermDays: row.payoutTermDays,
    }
  }
}
