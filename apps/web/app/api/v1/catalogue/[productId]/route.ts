import { apiHandler } from '@/lib/api/handler'
import { toResellerProductDetailDTO } from '@/lib/api/mappers'
import { requireReseller } from '@/lib/api/session'
import { container } from '@/lib/container'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET /api/v1/catalogue/:productId — login-gated product detail (Baji price ke saath). */
export async function GET(_request: Request, ctx: { params: Promise<{ productId: string }> }) {
  return apiHandler(async () => {
    const { reseller } = await requireReseller()
    const { productId } = await ctx.params
    const item = await container.catalogue.getById(reseller.id, productId)
    return toResellerProductDetailDTO(item)
  })
}
