/**
 * StatusPackRepository.
 *
 * 🔴 Cache DB ke unique constraint par khara hai:
 *    (resellerId, productId, mediaId, templateKey, priceUsed, format)
 * Wohi tasveer + wohi price + wohi template + wohi naap = wohi image. Dobara render
 * nahi hoga. Format is mein shamil hai warna Instagram ka chokor pack WhatsApp ke
 * lambe ko cache mein overwrite kar deta; mediaId is liye ke ab ek product ki kai
 * tasveerein hoti hain aur har ek ka apna pack banta hai.
 */
import type { PrismaClient } from '@prisma/client'
import type {
  CursorQuery,
  StatusPackCacheKey,
  StatusPackRepository,
  StatusPackView,
} from '@oyebazar/core'
import { pkr, toPage, type Page, type PackFormatKey } from '@oyebazar/shared'

const PACK_SELECT = {
  id: true,
  resellerId: true,
  productId: true,
  mediaId: true,
  templateKey: true,
  priceUsed: true,
  format: true,
  imageUrl: true,
  generatedAt: true,
  downloadedAt: true,
} as const

type Row = {
  id: string
  resellerId: string
  productId: string
  mediaId: string
  templateKey: string
  priceUsed: number
  format: string
  imageUrl: string | null
  generatedAt: Date | null
  downloadedAt: Date | null
}

function toView(row: Row): StatusPackView {
  // format DB mein string hai (naye naap bina migration ke add ho saken) — yahan wapas
  // apni type par le aate hain, taake baqi code mein type safety rahe
  return { ...row, priceUsed: pkr(row.priceUsed), format: row.format as PackFormatKey }
}

/** Compound unique ka naam lamba hai — ek hi jagah banate hain, teen jagah likhne se behtar. */
function uniqueWhere(key: StatusPackCacheKey) {
  return {
    resellerId_productId_mediaId_templateKey_priceUsed_format: {
      resellerId: key.resellerId,
      productId: key.productId,
      mediaId: key.mediaId,
      templateKey: key.templateKey,
      priceUsed: key.priceUsed,
      format: key.format,
    },
  }
}

export class PrismaStatusPackRepository implements StatusPackRepository {
  constructor(private readonly db: PrismaClient) {}

  async findByCacheKey(key: StatusPackCacheKey): Promise<StatusPackView | null> {
    const row = await this.db.statusPack.findUnique({
      where: uniqueWhere(key),
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
      where: uniqueWhere(input),
      create: {
        resellerId: input.resellerId,
        productId: input.productId,
        mediaId: input.mediaId,
        templateKey: input.templateKey,
        priceUsed: input.priceUsed,
        format: input.format,
        imageUrl: input.imageUrl,
      },
      update: {},
      select: PACK_SELECT,
    })
    return toView(row)
  }

  /** Poori kit ek query mein — chaar naap ke liye chaar round-trip ka koi faida nahi. */
  async findKit(key: Omit<StatusPackCacheKey, 'format'>): Promise<StatusPackView[]> {
    const rows = await this.db.statusPack.findMany({
      where: {
        resellerId: key.resellerId,
        productId: key.productId,
        mediaId: key.mediaId,
        templateKey: key.templateKey,
        priceUsed: key.priceUsed,
      },
      select: PACK_SELECT,
    })
    return rows.map(toView)
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
