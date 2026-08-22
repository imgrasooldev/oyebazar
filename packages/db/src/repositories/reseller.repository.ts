import type { PrismaClient } from '@prisma/client'
import type { ResellerRepository, ResellerView } from '@oyebazar/core'
import { packOptionsFrom, type PackOptions } from '@oyebazar/shared'

const RESELLER_SELECT = {
  id: true,
  name: true,
  whatsappPhone: true,
  city: true,
  area: true,
  tier: true,
  status: true,
  payoutAccount: true,
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
  tier: 'NEW' | 'BRONZE' | 'SILVER' | 'GOLD'
  status: 'ACTIVE' | 'LIMITED' | 'SUSPENDED'
  payoutAccount: string | null
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
    ...reseller
  } = row

  /*
   * Chhe alag khaane yahin ek object ban jate hain. Isse aage ka poora code (Studio,
   * service, cache key) sirf `PackOptions` jaanta hai — DB ki shakal se azad.
   */
  return {
    ...reseller,
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
  }): Promise<ResellerView> {
    const row = await this.db.reseller.create({
      data: {
        name: input.name,
        whatsappPhone: input.whatsappPhone,
        city: input.city,
        ...(input.area ? { area: input.area } : {}),
      },
      select: RESELLER_SELECT,
    })
    return toView(row)
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
