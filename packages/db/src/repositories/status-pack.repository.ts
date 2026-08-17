/**
 * StatusPackRepository.
 *
 * 🔴 Cache DB ke unique constraint par khara hai:
 *    (resellerId, productId, templateKey, priceUsed)
 * Wohi price + wohi template = wohi image. Dobara render nahi hoga.
 */
import type { PrismaClient } from '@prisma/client'
import type {
  CursorQuery,
  StatusPackCacheKey,
  StatusPackRepository,
  StatusPackView,
} from '@oyebazar/core'
import { pkr, toPage, type Page } from '@oyebazar/shared'

const PACK_SELECT = {
  id: true,
  resellerId: true,
  productId: true,
  templateKey: true,
  priceUsed: true,
  imageUrl: true,
  generatedAt: true,
  downloadedAt: true,
} as const

type Row = {
  id: string
  resellerId: string
  productId: string
  templateKey: string
  priceUsed: number
  imageUrl: string | null
  generatedAt: Date | null
  downloadedAt: Date | null
}

function toView(row: Row): StatusPackView {
  return { ...row, priceUsed: pkr(row.priceUsed) }
}

export class PrismaStatusPackRepository implements StatusPackRepository {
  constructor(private readonly db: PrismaClient) {}

  async findByCacheKey(key: StatusPackCacheKey): Promise<StatusPackView | null> {
    const row = await this.db.statusPack.findUnique({
      where: {
        resellerId_productId_templateKey_priceUsed: {
          resellerId: key.resellerId,
          productId: key.productId,
          templateKey: key.templateKey,
          priceUsed: key.priceUsed,
        },
      },
      select: PACK_SELECT,
    })
    return row ? toView(row) : null
  }

  /**
   * Idempotent create — do tabs se ek saath dabane par unique constraint chalti hai,
   * hum wohi maujooda row wapas kar dete hain (crash nahi).
   */
  async create(input: StatusPackCacheKey & { imageUrl: string | null }): Promise<StatusPackView> {
    const row = await this.db.statusPack.upsert({
      where: {
        resellerId_productId_templateKey_priceUsed: {
          resellerId: input.resellerId,
          productId: input.productId,
          templateKey: input.templateKey,
          priceUsed: input.priceUsed,
        },
      },
      create: {
        resellerId: input.resellerId,
        productId: input.productId,
        templateKey: input.templateKey,
        priceUsed: input.priceUsed,
        imageUrl: input.imageUrl,
      },
      update: {},
      select: PACK_SELECT,
    })
    return toView(row)
  }

  async markRendered(id: string, imageUrl: string, at: Date): Promise<StatusPackView> {
    const row = await this.db.statusPack.update({
      where: { id },
      data: { imageUrl, generatedAt: at },
      select: PACK_SELECT,
    })
    return toView(row)
  }

  async markDownloaded(id: string, at: Date): Promise<void> {
    await this.db.statusPack.update({ where: { id }, data: { downloadedAt: at } })
  }

  async incrementShared(id: string): Promise<void> {
    await this.db.statusPack.update({ where: { id }, data: { sharedCount: { increment: 1 } } })
  }

  async findRecentByReseller(resellerId: string, query: CursorQuery): Promise<Page<StatusPackView>> {
    const rows = await this.db.statusPack.findMany({
      where: { resellerId, imageUrl: { not: null } },
      select: PACK_SELECT,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    })
    return toPage(rows.map(toView), query.limit, (p) => p.id)
  }
}
