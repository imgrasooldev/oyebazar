import { CancelOrderSchema } from '@oyebazar/shared'
import { apiHandler, parseBody } from '@/lib/api/handler'
import { toResellerOrderDTO } from '@/lib/api/mappers'
import { requireReseller } from '@/lib/api/session'
import { container } from '@/lib/container'

export const runtime = 'nodejs'

/** POST /api/v1/orders/:orderNo/cancel — confirm ho chuka ho to fee WRITTEN_OFF hoti hai. */
export async function POST(request: Request, ctx: { params: Promise<{ orderNo: string }> }) {
  return apiHandler(async () => {
    const { reseller } = await requireReseller()
    const { orderNo } = await ctx.params
    const { reason } = await parseBody(request, CancelOrderSchema)

    await container.orders.cancel(orderNo, reseller.id, reason)

    const view = await container.orders.getForReseller(orderNo, reseller.id)
    return toResellerOrderDTO(view)
  })
}
