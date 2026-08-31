/**
 * AdminRepository — portal ke saare read/write.
 *
 * 🔴 Ye wahid repository hai jo supplier ka rate, reseller ka margin aur fee ek saath
 * dikhati hai. Isay sirf AdminService inject karti hai — kisi reseller ya wholesaler
 * facing service mein ye kabhi nahi jani chahiye.
 */
import type { PrismaClient } from '@prisma/client'
import type {
  AdminActivityRepository,
  AdminActivityRow,
  AdminReferralRepository,
  AdminReferralRow,
  AdminDashboardStats,
  AdminInvoiceRow,
  AdminProductRow,
  AdminRepository,
  AdminResellerRow,
  AdminSupplierRow,
  OpsTeamMember,
  OpsUserRepository,
  OpsUserView,
} from '@oyebazar/core'
import { buildSearchText, pkr } from '@oyebazar/shared'

const OPS_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
} as const

export class PrismaOpsUserRepository implements OpsUserRepository {
  constructor(private readonly db: PrismaClient) {}

  async findById(id: string): Promise<OpsUserView | null> {
    return this.db.opsUser.findUnique({ where: { id }, select: OPS_SELECT })
  }

  async findByPhone(phoneE164: string): Promise<OpsUserView | null> {
    return this.db.opsUser.findUnique({ where: { phone: phoneE164 }, select: OPS_SELECT })
  }

  async list(): Promise<OpsUserView[]> {
    return this.db.opsUser.findMany({ select: OPS_SELECT, orderBy: { createdAt: 'asc' } })
  }

  async touchLastSeen(id: string, at: Date): Promise<void> {
    await this.db.opsUser.update({ where: { id }, data: { lastSeenAt: at } })
  }

  async listTeam(): Promise<OpsTeamMember[]> {
    return this.db.opsUser.findMany({
      select: { ...OPS_SELECT, phone: true, lastSeenAt: true, createdAt: true },
      // Chalne wale pehle, phir naye — band kiye hue neeche
      orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
    })
  }

  async create(input: {
    name: string
    email: string
    phoneE164: string
    role: OpsUserView['role']
  }): Promise<OpsTeamMember> {
    return this.db.opsUser.create({
      data: {
        name: input.name,
        email: input.email,
        phone: input.phoneE164,
        role: input.role,
        isActive: true,
      },
      select: { ...OPS_SELECT, phone: true, lastSeenAt: true, createdAt: true },
    })
  }

  async setRole(id: string, role: OpsUserView['role']): Promise<void> {
    await this.db.opsUser.update({ where: { id }, data: { role } })
  }

  /**
   * 🔴 Band karte hi us ki saari sessions bhi khatam — warna khula hua browser agle
   * 24 ghante tak admin portal chalata rehta hai, aur band karne ka matlab hi yehi hai
   * ke abhi se pohanch khatam.
   */
  async setActive(id: string, isActive: boolean): Promise<void> {
    await this.db.$transaction(async (tx) => {
      await tx.opsUser.update({ where: { id }, data: { isActive } })
      if (!isActive) await tx.session.deleteMany({ where: { opsUserId: id } })
    })
  }
}

export class PrismaAdminRepository implements AdminRepository {
  constructor(private readonly db: PrismaClient) {}

  /**
   * Dashboard ke saare number ek saath (`$transaction`) — alag alag query chalate to
   * har number kisi aur lamhe ka hota aur jama kar ke dekhne par mel na khata.
   */
  async dashboard(now: Date): Promise<AdminDashboardStats> {
    const startOfDay = new Date(now)
    startOfDay.setHours(0, 0, 0, 0)

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const [
      ordersAwaitingConfirmation,
      ordersWithSupplier,
      ordersInTransit,
      ordersToday,
      suppliersPending,
      productsDraft,
      resellersActive,
      feeSum,
      feeInFlight,
    ] = await this.db.$transaction([
      this.db.order.count({ where: { status: 'PENDING_CONFIRM' } }),
      this.db.order.count({ where: { status: { in: ['SENT_TO_SUPPLIER', 'CONFIRMED'] } } }),
      this.db.order.count({ where: { status: { in: ['ACCEPTED', 'DISPATCHED'] } } }),
      this.db.order.count({ where: { createdAt: { gte: startOfDay } } }),
      this.db.supplier.count({ where: { status: 'PENDING' } }),
      this.db.product.count({ where: { status: 'DRAFT' } }),
      this.db.reseller.count({ where: { status: 'ACTIVE' } }),
      // Is mahine ki asli kamai — maal pohanch chuka hai
      this.db.feeLedger.aggregate({
        where: { status: { in: ['EARNED', 'INVOICED', 'COLLECTED'] }, earnedAt: { gte: startOfMonth } },
        _sum: { amount: true },
      }),
      // Raste mein — abhi kamai nahi, magar ops ko dikhna chahiye ke kitna daanv par hai
      this.db.feeLedger.aggregate({
        where: { status: 'PENDING' },
        _sum: { amount: true },
      }),
    ])

    return {
      ordersAwaitingConfirmation,
      ordersWithSupplier,
      ordersInTransit,
      ordersToday,
      suppliersPending,
      productsDraft,
      resellersActive,
      feeEarnedThisMonth: pkr(feeSum._sum.amount ?? 0),
      feeInFlight: pkr(feeInFlight._sum.amount ?? 0),
    }
  }

  /**
   * Invoice ki list.
   *
   * FeeLedger mein har order ki apni row hai; invoice un rows ka jama hai. Is liye
   * yahan groupBy hota hai — alag "Invoice" table jaan boojh kar nahi banaya gaya,
   * kyunke asal sach ledger hai aur invoice sirf us ka khulasa.
   */
  async listInvoices(limit: number): Promise<AdminInvoiceRow[]> {
    const groups = await this.db.feeLedger.groupBy({
      by: ['invoiceId', 'invoicePeriod', 'supplierId', 'status'],
      where: { invoiceId: { not: null } },
      _sum: { amount: true },
      _count: { _all: true },
      _max: { invoicedAt: true },
      orderBy: { _max: { invoicedAt: 'desc' } },
      take: limit,
    })

    const suppliers = await this.db.supplier.findMany({
      where: { id: { in: groups.map((group) => group.supplierId) } },
      select: { id: true, businessName: true },
    })
    const names = new Map(suppliers.map((supplier) => [supplier.id, supplier.businessName]))

    return groups.map((group) => ({
      invoiceId: group.invoiceId ?? '',
      period: group.invoicePeriod ?? '',
      supplierName: names.get(group.supplierId) ?? '—',
      orders: group._count._all,
      amount: pkr(group._sum.amount ?? 0),
      status: group.status,
      invoicedAt: group._max.invoicedAt,
    }))
  }

  // ------------------------------------------------------------------ suppliers

  async listSuppliers(filter: { status?: string; limit: number }): Promise<AdminSupplierRow[]> {
    const rows = await this.db.supplier.findMany({
      ...(filter.status ? { where: { status: filter.status as 'PENDING' } } : {}),
      select: {
        id: true,
        businessName: true,
        ownerName: true,
        phone: true,
        city: true,
        marketName: true,
        status: true,
        listedOnBazaar: true,
        feeRateBps: true,
        createdAt: true,
        _count: { select: { products: true } },
      },
      // Pending pehle: yehi wo hain jin par kaam baqi hai
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      take: filter.limit,
    })

    return rows.map(({ _count, ...row }) => ({ ...row, productCount: _count.products }))
  }

  async setSupplierStatus(
    id: string,
    status: 'PENDING' | 'VERIFIED' | 'SUSPENDED',
  ): Promise<void> {
    await this.db.$transaction(async (tx) => {
      await tx.supplier.update({ where: { id }, data: { status } })

      // 🔴 Band ki hui dukan bazaar par nahi reh sakti — warna reseller us ka maal
      // lagati rahegi aur order kahin nahi jayega
      if (status === 'SUSPENDED') {
        await tx.supplier.update({ where: { id }, data: { listedOnBazaar: false } })
      }
    })
  }

  async setSupplierListed(id: string, listed: boolean): Promise<void> {
    await this.db.supplier.update({ where: { id }, data: { listedOnBazaar: listed } })
  }

  async setSupplierFeeRate(id: string, feeRateBps: number): Promise<number | null> {
    /*
     * Purana rate PEHLE parhte hain — usi transaction mein.
     *
     * 🔴 Bahar parhne ka matlab hota ke do harkaton ke darmiyan koi teesra rate
     * badal de, aur daftar mein wo "kahan se" likha jaye jo kabhi tha hi nahi. Ye
     * soorat aam nahi hai, magar daftar ka poora faida usi din hai jis din koi us par
     * sawal uthaye — aur us din "shayad theek hoga" ka koi wazan nahi.
     */
    return this.db.$transaction(async (tx) => {
      const before = await tx.supplier.findUnique({
        where: { id },
        select: { feeRateBps: true },
      })
      if (!before) return null

      // Purane order ki fee snapshot par hai — naya rate sirf aage ke orders par lagta hai
      await tx.supplier.update({ where: { id }, data: { feeRateBps } })
      return before.feeRateBps
    })
  }

  // ------------------------------------------------------------------- products

  async listProducts(filter: { status?: string; limit: number }): Promise<AdminProductRow[]> {
    const rows = await this.db.product.findMany({
      ...(filter.status ? { where: { status: filter.status as 'DRAFT' } } : {}),
      select: {
        id: true,
        titleUr: true,
        titleEn: true,
        status: true,
        supplierPrice: true,
        bajiPrice: true,
        suggestedRetail: true,
        createdAt: true,
        supplier: { select: { businessName: true } },
        category: { select: { nameUr: true } },
        media: {
          where: { isStatusSource: true },
          select: { processedUrl: true, originalUrl: true },
          take: 1,
        },
      },
      // DRAFT pehle — inhi par ops ka faisla baqi hai
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      take: filter.limit,
    })

    return rows.map((row) => ({
      id: row.id,
      titleUr: row.titleUr,
      titleEn: row.titleEn,
      status: row.status,
      supplierPrice: pkr(row.supplierPrice),
      bajiPrice: pkr(row.bajiPrice),
      suggestedRetail: pkr(row.suggestedRetail),
      supplierName: row.supplier.businessName,
      categoryNameUr: row.category.nameUr,
      imageUrl: row.media[0]?.processedUrl ?? row.media[0]?.originalUrl ?? null,
      createdAt: row.createdAt,
    }))
  }

  async setProductStatus(id: string, status: 'DRAFT' | 'LIVE' | 'ARCHIVED'): Promise<void> {
    await this.db.product.update({ where: { id }, data: { status } })
  }

  /**
   * Naam aur khaana theek karo — aur TALASH ka khaana bhi saath.
   *
   * 🔴 `searchText` dobara banana yahan LAZMI hai, marzi ka nahi. Talash usi
   * khaane par chalti hai, naam par nahi (dekhen `product.repository.ts`). Sirf naam
   * badal dene ka matlab ye hota ke maal ka naya naam safhe par dikhta magar us naam
   * se wo maal DHOONDA hi na ja sakta — aur wohi ek cheez hai jis ke liye naam theek
   * kiya ja raha tha. Wo kharabi khamosh hoti hai: sab kuch theek dikhta hai.
   *
   * Category ka slug na mile to `false` — us surat mein kuch bhi nahi badalta, taake
   * aadha kaam na ho jaye.
   */
  async setProductNaming(
    id: string,
    input: { titleUr: string; titleEn: string; categorySlug: string | null },
  ): Promise<boolean> {
    return this.db.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id },
        select: { descriptionUr: true, category: { select: { id: true, nameUr: true, nameEn: true } } },
      })
      if (!product) return false

      let category = product.category
      if (input.categorySlug) {
        const chosen = await tx.category.findUnique({
          where: { slug: input.categorySlug },
          select: { id: true, nameUr: true, nameEn: true },
        })
        if (!chosen) return false
        category = chosen
      }

      await tx.product.update({
        where: { id },
        data: {
          titleUr: input.titleUr,
          titleEn: input.titleEn,
          categoryId: category.id,
          searchText: buildSearchText({
            titleUr: input.titleUr,
            titleEn: input.titleEn,
            descriptionUr: product.descriptionUr,
            categoryNameUr: category.nameUr,
            categoryNameEn: category.nameEn,
          }),
        },
      })
      return true
    })
  }

  // ------------------------------------------------------------------ resellers

  async listResellers(filter: { status?: string; limit: number }): Promise<AdminResellerRow[]> {
    const rows = await this.db.reseller.findMany({
      ...(filter.status ? { where: { status: filter.status as 'ACTIVE' } } : {}),
      select: {
        id: true,
        name: true,
        whatsappPhone: true,
        city: true,
        status: true,
        referredById: true,
        lastActiveAt: true,
        createdAt: true,
        _count: { select: { orders: true } },
      },
      orderBy: [{ createdAt: 'desc' }],
      take: filter.limit,
    })

    /*
     * Bulane wali ka NAAM — ek hi query mein.
     *
     * 🔴 Har qatar ke liye alag `findUnique` chalana N+1 hai, aur is safhe par
     * pachaas qatarein hoti hain. `Set` is liye ke ek behen aksar kai ko bulati hai:
     * pachaas qatarein aksar paanch naamon ki hoti hain.
     */
    /*
     * Kis ne kitno ko bulaya — EK groupBy, chahe qatarein kitni bhi hon.
     *
     * 🔴 Chhanni SIRF is safhe ki qataron par (`in`), poore platform par nahi.
     * Bina us ke ye ginti poore Reseller table par chalti — aur wo us din bhaari ho
     * jati jis din ye kaam ki hoti (yani jab log ziyada hon).
     */
    const invited = await this.db.reseller.groupBy({
      by: ['referredById'],
      where: { referredById: { in: rows.map((row) => row.id) } },
      _count: { _all: true },
    })
    const invitedCounts = new Map(
      invited
        .filter((group): group is typeof group & { referredById: string } => !!group.referredById)
        .map((group) => [group.referredById, group._count._all]),
    )

    const referrerIds = [
      ...new Set(rows.map((row) => row.referredById).filter((id): id is string => !!id)),
    ]
    const names = new Map<string, string>()
    if (referrerIds.length > 0) {
      const referrers = await this.db.reseller.findMany({
        where: { id: { in: referrerIds } },
        select: { id: true, name: true },
      })
      for (const referrer of referrers) names.set(referrer.id, referrer.name)
    }

    return rows.map(({ _count, referredById, ...row }) => ({
      ...row,
      referredByName: referredById ? (names.get(referredById) ?? null) : null,
      invitedCount: invitedCounts.get(row.id) ?? 0,
      orderCount: _count.orders,
    }))
  }

  async setResellerStatus(
    id: string,
    status: 'ACTIVE' | 'LIMITED' | 'SUSPENDED',
  ): Promise<void> {
    await this.db.$transaction(async (tx) => {
      await tx.reseller.update({ where: { id }, data: { status } })

      // 🔴 Band karte hi us ki saari sessions bhi khatam — warna khula hua phone
      // agle 7 din tak chalta rehta hai
      if (status === 'SUSPENDED') {
        await tx.session.deleteMany({ where: { resellerId: id } })
      }
    })
  }
}

/**
 * Ops ki harkaton ka daftar — sirf PARHNE ke liye.
 *
 * 🔴 Likhna is class ka kaam nahi. Har harkat pehle se `AdminService.record()`
 * ke zariye `Event` table mein jati hai; ye sirf wahi wapas laati hai. Do jagah se
 * likhne ka matlab ye hota ke kal koi ek raste par nishan lagana bhool jata, aur wo
 * daftar jis par jawabdehi khari hai, chup chaap adhoora ho jata.
 */
export class PrismaAdminActivityRepository implements AdminActivityRepository {
  constructor(private readonly db: PrismaClient) {}

  async recent(filters: {
    actorType?: string | undefined
    limit: number
  }): Promise<AdminActivityRow[]> {
    const rows = await this.db.event.findMany({
      where: {
        ...(filters.actorType ? { actorType: filters.actorType } : {}),
        /*
         * 🔴 Purani qatarein jo OPS ki nahi hain — bahar.
         *
         * `AnalyticsEvent.actorType` mein 'supplier' baad mein daala gaya. Us se pehle
         * dukan wale ke har kaam par `actorType: 'ops'` likha jata tha aur asal farq
         * `actorId: 'supplier:<id>'` mein chhupaya jata tha (dekhen us khaane ka apna
         * note). Wo qatarein DB mein aaj bhi wesi hi pari hain.
         *
         * Nateeja jawabdehi wale safhe par ye tha ke "supplier:cmt3jed… login" bees
         * dafa upar aa jata — ek aisi id jo kisi ops member ki hai hi nahi, aur jis se
         * parhne wala sirf ye seekhta hai ke is safhe par bharosa nahi karna.
         *
         * Purani qatarein MITTI nahi ja rahin — wo apni jagah mehfooz hain. Ye safha
         * ops ki jawabdehi ka hai, aur wo un mein se nahi.
         */
        ...(filters.actorType === 'ops' ? { NOT: { actorId: { startsWith: 'supplier:' } } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: filters.limit,
    })
    if (rows.length === 0) return []

    /*
     * Naam ek hi query mein — har qatar ke liye alag lana N+1 hai, aur is safhe par
     * pachaas qatarein hoti hain. `Set` is liye ke ek hi banda aksar kai harkatein
     * karta hai; bees qatarein aksar teen naamon ki hoti hain.
     */
    const actorIds = [...new Set(rows.map((row) => row.actorId).filter((id): id is string => !!id))]
    const names = new Map<string, string>()
    if (actorIds.length > 0) {
      const users = await this.db.opsUser.findMany({
        where: { id: { in: actorIds } },
        select: { id: true, name: true },
      })
      for (const user of users) names.set(user.id, user.name)
    }

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      actorType: row.actorType,
      actorId: row.actorId,
      actorName: row.actorId ? (names.get(row.actorId) ?? null) : null,
      properties: (row.properties ?? {}) as Record<string, unknown>,
      createdAt: row.createdAt,
    }))
  }
}

/**
 * Invite ka poora silsila — ops ke liye, sirf PARHNE ke liye.
 *
 * 🔴 Ye `PrismaResellerRepository.listReferred` ki NAKAL nahi hai, chahe do
 * query milti julti dikhen. Wo ek reseller ke apne bulaye huon ki fehrist hai (aur us
 * mein bulane wali ka naam hai hi nahi, kyunke wo khud wohi hai); ye poore platform ka
 * silsila hai. Un ka sawal alag hai, un ki hadd alag hai, aur un mein se ek badalne se
 * doosra nahi badalna chahiye.
 */
export class PrismaAdminReferralRepository implements AdminReferralRepository {
  constructor(private readonly db: PrismaClient) {}

  async list(limit: number): Promise<readonly AdminReferralRow[]> {
    const rows = await this.db.reseller.findMany({
      where: { referredById: { not: null } },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: { id: true, name: true, city: true, createdAt: true, referredById: true },
    })
    if (rows.length === 0) return []

    const ids = rows.map((row) => row.id)
    const inviterIds = [
      ...new Set(rows.map((row) => row.referredById).filter((id): id is string => !!id)),
    ]

    /*
     * Teen query, SAATH — aur teenon poori fehrist ke liye ek ek.
     *
     * 🔴 Har qatar ke liye alag poochna N+1 hai, aur is safhe par pachas
     * qatarein hoti hain. Teen chakkar aur ek sau pachas chakkar mein farq wo hai jo
     * safha khulne aur na khulne ka hota hai.
     */
    const [inviters, delivered, bonuses] = await Promise.all([
      this.db.reseller.findMany({
        where: { id: { in: inviterIds } },
        select: { id: true, name: true },
      }),
      this.db.order.groupBy({
        by: ['resellerId'],
        where: { resellerId: { in: ids }, status: 'DELIVERED' },
        _count: { _all: true },
      }),
      this.db.resellerBonus.findMany({
        where: { fromResellerId: { in: ids } },
        select: { fromResellerId: true, amount: true, status: true },
      }),
    ])

    const inviterNames = new Map(inviters.map((row) => [row.id, row.name]))
    const deliveredBy = new Map(delivered.map((row) => [row.resellerId, row._count._all]))
    const bonusBy = new Map(
      bonuses
        .filter((row): row is typeof row & { fromResellerId: string } => !!row.fromResellerId)
        .map((row) => [row.fromResellerId, row]),
    )

    return rows.map((row) => {
      const bonus = bonusBy.get(row.id)
      const invitedById = row.referredById ?? ''
      return {
        resellerId: row.id,
        name: row.name,
        city: row.city,
        joinedAt: row.createdAt,
        invitedById,
        /*
         * Naam na mile to em-dash — kachchi id NAHI.
         *
         * Ye tabhi hota hai jab bulane wali ka account mit chuka ho, aur us surat mein
         * bhi `cmt3jed…` parhne wale ko kuch nahi deta.
         */
        invitedByName: inviterNames.get(invitedById) ?? '—',
        delivered: deliveredBy.get(row.id) ?? 0,
        bonusAmount: bonus?.amount ?? null,
        bonusStatus: bonus?.status ?? null,
      }
    })
  }
}
