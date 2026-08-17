import { GenerateStatusPackSchema, pkr } from '@oyebazar/shared'
import { apiHandler, parseBody, parseQuery } from '@/lib/api/handler'
import { toStatusPackDTO } from '@/lib/api/mappers'
import { requireReseller } from '@/lib/api/session'
import { container } from '@/lib/container'
import { z } from 'zod'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * ⭐ POST /api/v1/status-pack — Content Studio ka asal endpoint.
 *
 * Cache hit  → { status: 'READY', imageUrl } foran (<200ms target)
 * Cache miss → { status: 'RENDERING' } aur job queue par; UI GET se poll karti hai
 */
export async function POST(request: Request) {
  return apiHandler(async () => {
    const { reseller } = await requireReseller()
    const body = await parseBody(request, GenerateStatusPackSchema)

    const result = await container.statusPacks.generate(
      {
        resellerId: reseller.id,
        productId: body.productId,
        templateKey: body.templateKey,
        retailPrice: body.retailPrice !== undefined ? pkr(body.retailPrice) : undefined,
      },
      reseller,
    )

    return toStatusPackDTO(result)
  })
}

const PollQuerySchema = z.object({
  productId: z.string().min(1),
  templateKey: z.string().min(1),
  priceUsed: z.coerce.number().int().positive(),
})

/** GET /api/v1/status-pack?productId=&templateKey=&priceUsed= — render hone ka intezar. */
export async function GET(request: Request) {
  return apiHandler(async () => {
    const { reseller } = await requireReseller()
    const query = parseQuery(request, PollQuerySchema)

    const result = await container.statusPacks.getStatus(reseller, {
      productId: query.productId,
      templateKey: query.templateKey,
      priceUsed: pkr(query.priceUsed),
    })

    return result ? toStatusPackDTO(result) : { status: 'NOT_FOUND' as const }
  })
}
