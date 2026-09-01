import type { PrismaClient } from '@prisma/client'
import type {
  PayoutAccount,
  PayoutMethod,
  ReferralRow,
  ResellerRepository,
  ResellerView,
} from '@oyebazar/core'
import { packOptionsFrom, type PackOptions } from '@oyebazar/shared'
import {
  PAYOUT_ACCOUNT_SELECT,
  payoutAccountColumns,
  payoutAccountFrom,
} from '../payout-account'

const RESELLER_SELECT = {
  id: true,
  name: true,
  whatsappPhone: true,
  city: true,
  area: true,
  status: true,
  referredById: true,
  ...PAYOUT_ACCOUNT_SELECT,
  packLang: true,
  packShowName: true,
  packShowPhone: true,
  packShowPrice: true,
  packName: true,
  packPhone: true,
  packTemplateKey: true,
  createdAt: true,
} as const

type Row = {
  id: string
  name: string
  whatsappPhone: string
  city: string
  area: string | null
  status: 'ACTIVE' | 'LIMITED' | 'SUSPENDED'
  referredById: string | null
  payoutMethod: PayoutMethod | null
  payoutAccount: string | null
  payoutTitle: string | null
  payoutBankName: string | null
  payoutUpdatedAt: Date | null
  packLang: string
  packShowName: boolean
  packShowPhone: boolean
  packShowPrice: boolean
  packName: string | null
  packPhone: string | null
  packTemplateKey: string | null
  createdAt: Date
}

function toView(row: Row): ResellerView {
  const {
    packLang,
    packShowName,
    packShowPhone,
    packShowPrice,
    packName,
    packPhone,
    packTemplateKey,
    payoutMethod,
    payoutAccount,
    payoutTitle,
    payoutBankName,
    ...reseller
  } = row

  /*
   * Chhe alag khaane yahin ek object ban jate hain. Isse aage ka poora code (Studio,
   * service, cache key) sirf `PackOptions` jaanta hai — DB ki shakal se azad.
   */
  return {
    ...reseller,
    /*
     * Chaar khaane ek khate mein — ya `null`.
     *
     * 🔴 Ye tabdeeli yahin hoti hai aur SIRF yahin. Is ke aage wale poore code ke
     * liye sawal do hi rehte hain: khata hai, ya nahi. "Number to hai magar naam
     * nahi" wali soorat is line se aage kabhi nahi pohanchti — aur wohi soorat hai
     * jis mein dukan wala bina naam milaye paisa bhej deta hai.
     */
    payoutAccount: payoutAccountFrom({
      payoutMethod,
      payoutAccount,
      payoutTitle,
      payoutBankName,
    }),
    packTemplateKey,
    packDefaults: packOptionsFrom({
      lang: packLang === 'en' ? 'en' : 'ur',
      showName: packShowName,
      showPhone: packShowPhone,
      showPrice: packShowPrice,
      ...(packName ? { name: packName } : {}),
      ...(packPhone ? { phone: packPhone } : {}),
    }),
  }
}

export class PrismaResellerRepository implements ResellerRepository {
  constructor(private readonly db: PrismaClient) {}

  async findById(id: string): Promise<ResellerView | null> {
    const row = await this.db.reseller.findUnique({ where: { id }, select: RESELLER_SELECT })
    return row ? toView(row) : null
  }

  async findByPhone(phoneE164: string): Promise<ResellerView | null> {
    const row = await this.db.reseller.findUnique({
      where: { whatsappPhone: phoneE164 },
      select: RESELLER_SELECT,
    })
    return row ? toView(row) : null
  }

  async create(input: {
    name: string
    whatsappPhone: string
    city: string
    area?: string
    referredById?: string
  }): Promise<ResellerView> {
    const row = await this.db.reseller.create({
      data: {
        name: input.name,
        whatsappPhone: input.whatsappPhone,
        city: input.city,
        ...(input.area ? { area: input.area } : {}),
        ...(input.referredById ? { referredById: input.referredById } : {}),
      },
      select: RESELLER_SELECT,
    })
    return toView(row)
  }

  /**
   * Khata mehfooz — `null` usay mita deta hai.
   *
   * 🔴 `payoutUpdatedAt` mitane par bhi likha jata hai. "Kab badla" ka jawab
   * "kab bhara" se alag hai: khata hatana bhi ek tabdeeli hai, aur ops ke liye wohi
   * sab se ahem tabdeeli ho sakti hai.
   */
  async savePayoutAccount(
    id: string,
    account: PayoutAccount | null,
    at: Date,
  ): Promise<ResellerView> {
    const row = await this.db.reseller.update({
      where: { id },
      data: payoutAccountColumns(account, at),
      select: RESELLER_SELECT,
    })
    return toView(row)
  }

  async countReferred(resellerId: string): Promise<number> {
    return this.db.reseller.count({ where: { referredById: resellerId } })
  }

  async listReferred(resellerId: string, limit: number): Promise<readonly ReferralRow[]> {
    const rows = await this.db.reseller.findMany({
      where: { referredById: resellerId },
      // Nayi pehle — jo abhi aayi hai, us par kaam karna baqi hai
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: { id: true, name: true, city: true, createdAt: true },
    })
    if (rows.length === 0) return []

    const ids = rows.map((row) => row.id)

    /*
     * Do query, SAATH — aur dono poori fehrist ke liye ek ek.
     *
     * 🔴 Har qatar ke liye alag poochna N+1 hai. Ye safha aksar chhota hota hai
     * (paanch ya das qatarein) aur wahan farq nazar nahi aata — magar wohi ghalti us din
     * bhaari hoti hai jis din koi behen waqai pachas logon ko bula chuki ho, yani theek
     * us din jab ye safha sab se ziyada maani rakhta hai.
     */
    const [delivered, bonuses] = await Promise.all([
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

    const deliveredBy = new Map(delivered.map((row) => [row.resellerId, row._count._all]))
    const bonusBy = new Map(
      bonuses
        .filter((row): row is typeof row & { fromResellerId: string } => !!row.fromResellerId)
        .map((row) => [row.fromResellerId, row]),
    )

    return rows.map((row) => {
      const bonus = bonusBy.get(row.id)
      return {
        resellerId: row.id,
        name: row.name,
        city: row.city,
        joinedAt: row.createdAt,
        delivered: deliveredBy.get(row.id) ?? 0,
        bonusAmount: bonus?.amount ?? null,
        bonusStatus: bonus?.status ?? null,
      }
    })
  }

  /** Throttled — AuthService har request par nahi, login par call karti hai. */
  async touchLastActive(id: string, at: Date): Promise<void> {
    await this.db.reseller.update({ where: { id }, data: { lastActiveAt: at } })
  }

  async savePackDefaults(
    id: string,
    options: PackOptions,
    /** `null` = system ka default (`simple`); na den to jo pehle se hai wohi rehta hai. */
    templateKey?: string | null,
  ): Promise<ResellerView> {
    const row = await this.db.reseller.update({
      where: { id },
      data: {
        ...(templateKey !== undefined ? { packTemplateKey: templateKey } : {}),
        packLang: options.lang,
        packShowName: options.showName,
        packShowPhone: options.showPhone,
        packShowPrice: options.showPrice,
        // Khali box ka matlab "profile wala naam" — is liye null likhte hain, khali
        // string nahi. Khali string aage chal kar khali naam chhap deti.
        packName: options.name ?? null,
        packPhone: options.phone ?? null,
      },
      select: RESELLER_SELECT,
    })
    return toView(row)
  }
}
