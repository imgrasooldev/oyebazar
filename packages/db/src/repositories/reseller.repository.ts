import type { PrismaClient } from '@prisma/client'
import type { ResellerRepository, ResellerView } from '@oyebazar/core'

const RESELLER_SELECT = {
  id: true,
  name: true,
  whatsappPhone: true,
  city: true,
  area: true,
  tier: true,
  status: true,
  payoutAccount: true,
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
  createdAt: Date
}

function toView(row: Row): ResellerView {
  return row
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
}
