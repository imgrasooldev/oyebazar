import { apiHandler } from '@/lib/api/handler'
import { toResellerOrderDTO } from '@/lib/api/mappers'
import { requireReseller } from '@/lib/api/session'
import { container } from '@/lib/container'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET /api/v1/orders/:orderNo — sirf apna order (repository resellerId par filter karti hai). */
export async function GET(_request: Request, ctx: { params: Promise<{ orderNo: string }> }) {
  return apiHandler(async () => {
    const { reseller } = await requireReseller()
    const { orderNo } = await ctx.params
    const order = await container.orders.getForReseller(orderNo, reseller.id)
    return toResellerOrderDTO(order)
  })
}
