/**
 * ResellerTemplateRepository — reseller ke apne banaye hue template.
 *
 * 🔴 `spec` DB mein `Json` hai, is liye padhte waqt HAR DAFA Zod se guzarta hai.
 *
 * Wajah: ye qadar aage chal kar CSS ban kar render HTML mein jati hai. DB ki purani row
 * (jo pehle wale spec version par likhi thi) ya haath se badla hua record bina jaanche
 * aage chala jaye to wo poore render ko tor sakta hai — aur wo nakami raat 3 baje 10,000
 * packs par ek saath nikalti hai. Jo row spec par poori nahi utarti, usay hum default
 * spec de kar zinda rakhte hain: adhoora template, toote hue pack se behtar hai.
 */
import type { PrismaClient } from '@prisma/client'
import type { ResellerTemplateRepository, ResellerTemplateView } from '@oyebazar/core'
import { DEFAULT_TEMPLATE_SPEC, TemplateSpecSchema, type TemplateSpec } from '@oyebazar/shared'

const TEMPLATE_SELECT = {
  id: true,
  resellerId: true,
  name: true,
  spec: true,
  revision: true,
  updatedAt: true,
} as const

type Row = {
  id: string
  resellerId: string
  name: string
  spec: unknown
  revision: number
  updatedAt: Date
}

function parseSpec(spec: unknown): TemplateSpec {
  const parsed = TemplateSpecSchema.safeParse(spec)
  return parsed.success ? parsed.data : DEFAULT_TEMPLATE_SPEC
}

function toView(row: Row): ResellerTemplateView {
  return { ...row, spec: parseSpec(row.spec) }
}

export class PrismaResellerTemplateRepository implements ResellerTemplateRepository {
  constructor(private readonly db: PrismaClient) {}

  async listForReseller(resellerId: string): Promise<ResellerTemplateView[]> {
    const rows = await this.db.resellerTemplate.findMany({
      where: { resellerId },
      select: TEMPLATE_SELECT,
      orderBy: { updatedAt: 'desc' },
    })
    return rows.map(toView)
  }

  /** 🔴 resellerId shart mein — id jaan lene se doosri reseller ka template na khule. */
  async findById(resellerId: string, id: string): Promise<ResellerTemplateView | null> {
    const row = await this.db.resellerTemplate.findFirst({
      where: { id, resellerId },
      select: TEMPLATE_SELECT,
    })
    return row ? toView(row) : null
  }

  /**
   * Render ke waqt maalik ka pata nahi hota — job mein sirf `custom:<id>` hoti hai.
   *
   * Ye mehfooz hai kyunke wo key khud usi reseller ke pack se aayi hai (cache key mein
   * resellerId alag se mojood hai), aur yahan se koi cheez reseller ko wapas nahi jati —
   * sirf CSS banti hai.
   */
  async findByIdForRender(id: string): Promise<ResellerTemplateView | null> {
    const row = await this.db.resellerTemplate.findUnique({
      where: { id },
      select: TEMPLATE_SELECT,
    })
    return row ? toView(row) : null
  }

  async create(input: {
    resellerId: string
    name: string
    spec: TemplateSpec
  }): Promise<ResellerTemplateView> {
    const row = await this.db.resellerTemplate.create({
      data: { resellerId: input.resellerId, name: input.name, spec: input.spec },
      select: TEMPLATE_SELECT,
    })
    return toView(row)
  }

  /**
   * Har save par `revision` barhta hai.
   *
   * 🔴 Yehi wo cheez hai jo badla hua template asal mein nazar aane deti hai: revision
   * `templateKey` mein jata hai, key badalti hai, aur naya pack banta hai. Iske baghair
   * reseller rang badalti rehti aur usay wohi purani tasveer milti rehti — aur usay
   * kabhi samajh na aata ke kyun.
   */
  async update(
    resellerId: string,
    id: string,
    input: { name: string; spec: TemplateSpec },
  ): Promise<ResellerTemplateView | null> {
    const { count } = await this.db.resellerTemplate.updateMany({
      where: { id, resellerId },
      data: { name: input.name, spec: input.spec, revision: { increment: 1 } },
    })
    if (count === 0) return null

    const row = await this.db.resellerTemplate.findUnique({ where: { id }, select: TEMPLATE_SELECT })
    return row ? toView(row) : null
  }

  async remove(resellerId: string, id: string): Promise<boolean> {
    const { count } = await this.db.resellerTemplate.deleteMany({ where: { id, resellerId } })
    return count > 0
  }

  /**
   * Har template ki har tasveer ka pata.
   *
   * 🔴 Spec ko yahan Zod se nahi guzarte, aur ye jaan boojh kar hai. Agar kisi purane
   * ya kharab spec par parse fail ho jaye to wo template list se GIR jayega — aur us ki
   * tasveerein "kisi ke kaam ki nahi" lagne lagengi. Safai ke liye sab se mehfooz
   * bartao ye hai ke jo bhi cheez `url` jaisi dikhe usay istemal mein maan liya jaye:
   * ek zyada pata rakh lena ek zaroori file mitane se hamesha behtar hai.
   */
  async allImageUrls(): Promise<readonly string[]> {
    const rows = await this.db.resellerTemplate.findMany({ select: { spec: true } })
    const urls: string[] = []

    for (const row of rows) {
      const layers = (row.spec as { layers?: unknown })?.layers
      if (!Array.isArray(layers)) continue
      for (const layer of layers) {
        const url = (layer as { url?: unknown })?.url
        if (typeof url === 'string' && url.length > 0) urls.push(url)
      }
    }

    return urls
  }
}
