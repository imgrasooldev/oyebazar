import { apiHandler } from '@/lib/api/handler'
import { requireSupplier } from '@/lib/api/supplier-session'
import { container } from '@/lib/container'

export const runtime = 'nodejs'

/**
 * POST /api/v1/supplier/orders/:orderNo/accept
 *
 * Portal ka raasta (magic link wala alag hai: /api/v1/supplier/link/:token/accept).
 * Order kis dukan ka hai ye service ke andar `supplierId` ke sath dhoonda jata hai —
 * doosri dukan ka orderNo daalne par "nahi mila" milta hai, "ijazat nahi" bhi nahi
 * (warna order numbers taare ja sakte hain).
 */
export async function POST(_request: Request, ctx: { params: Promise<{ orderNo: string }> }) {
  return apiHandler(async () => {
    const { supplier } = await requireSupplier()
    const { orderNo } = await ctx.params
    const order = await container.orders.acceptForSupplier(supplier.id, orderNo)
    return { orderNo: order.orderNo, status: order.status }
  })
}
