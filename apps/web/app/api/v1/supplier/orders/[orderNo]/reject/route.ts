import { CancelOrderSchema } from '@oyebazar/shared'
import { apiHandler, parseBody } from '@/lib/api/handler'
import { requireSupplier } from '@/lib/api/supplier-session'
import { container } from '@/lib/container'

export const runtime = 'nodejs'

/** POST /api/v1/supplier/orders/:orderNo/reject — wajah lazmi, reseller ko wohi jati hai. */
export async function POST(request: Request, ctx: { params: Promise<{ orderNo: string }> }) {
  return apiHandler(async () => {
    const { supplier } = await requireSupplier()
    const { reason } = await parseBody(request, CancelOrderSchema)
    const { orderNo } = await ctx.params
    const order = await container.orders.rejectForSupplier(supplier.id, orderNo, reason)
    return { orderNo: order.orderNo, status: order.status }
  })
}
