import type { PrismaClient } from '@prisma/client'
import type { DailyDropRepository, DailyDropView, DropSummary } from '@oyebazar/core'

const DROP_SELECT = {
  id: true,
  dropDate: true,
  status: true,
  sentAt: true,
  items: { select: { productId: true }, orderBy: { sortOrder: 'asc' } },
} as const

type Row = {
  id: string
  dropDate: Date
  status: 'DRAFT' | 'SCHEDULED' | 'SENT'
  sentAt: Date | null
  items: { productId: string }[]
}

function toView(row: Row): DailyDropView {
  return {
    id: row.id,
    dropDate: row.dropDate,
    status: row.status,
    sentAt: row.sentAt,
    productIds: row.items.map((i) => i.productId),
  }
}

export class PrismaDailyDropRepository implements DailyDropRepository {
  constructor(private readonly db: PrismaClient) {}

  async listRecent(limit: number): Promise<DropSummary[]> {
    const rows = await this.db.dailyDrop.findMany({
      orderBy: { dropDate: 'desc' },
      take: limit,
      select: {
        id: true,
        dropDate: true,
        status: true,
        sentAt: true,
        sentCount: true,
        // Poore item na laane ka faida: ye list sirf "gaya ya nahi" ke liye hai
        _count: { select: { items: true } },
      },
    })

    return rows.map((row) => ({
      id: row.id,
      dropDate: row.dropDate,
      status: row.status,
      sentAt: row.sentAt,
      sentCount: row.sentCount,
      itemCount: row._count.items,
    }))
  }

  async findByDate(date: Date): Promise<DailyDropView | null> {
    const row = await this.db.dailyDrop.findUnique({ where: { dropDate: date }, select: DROP_SELECT })
    return row ? toView(row) : null
  }

  /**
   * Idempotent: raat ka job do baar chale (retry, deploy) to bhi ek hi drop banta hai.
   * Warna aadhi resellers ko ek list milti aur aadhi ko doosri.
   */
  async create(date: Date, productIds: readonly string[]): Promise<DailyDropView> {
    const row = await this.db.dailyDrop.upsert({
      where: { dropDate: date },
      create: {
        dropDate: date,
        status: 'SCHEDULED',
        items: {
          create: productIds.map((productId, index) => ({ productId, sortOrder: index })),
        },
      },
      update: {},
      select: DROP_SELECT,
    })
    return toView(row)
  }

  async markSent(dropId: string, at: Date, sentCount: number): Promise<void> {
    await this.db.dailyDrop.update({
      where: { id: dropId },
      data: { status: 'SENT', sentAt: at, sentCount },
    })
  }

  async findRecentlyDroppedProductIds(since: Date): Promise<string[]> {
    const rows = await this.db.dailyDropItem.findMany({
      where: { drop: { dropDate: { gte: since } } },
      select: { productId: true },
      distinct: ['productId'],
    })
    return rows.map((r) => r.productId)
  }
}
