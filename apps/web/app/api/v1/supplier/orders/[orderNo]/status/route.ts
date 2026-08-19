import { z } from 'zod'
import { apiHandler, parseBody } from '@/lib/api/handler'
import { requireSupplier } from '@/lib/api/supplier-session'
import { container } from '@/lib/container'

export const runtime = 'nodejs'

const BodySchema = z.object({ toStatus: z.enum(['PACKED', 'DISPATCHED']) }).strict()

/**
 * PATCH /api/v1/supplier/orders/:orderNo/status
 *
 * Wholesaler khud batata hai ke kaam kahan tak pohancha: maal bandh diya (PACKED),
 * courier ko de diya (DISPATCHED). Pehle ye dono ops karti thi aur system mein order
 * teen din "qubool kiya" par khara rehta tha.
 *
 * DELIVERED yahan nahi hai — wo courier/ops ki khabar hai, dukan wale ki nahi. Aur
 * usi par hamari fee EARNED hoti hai, is liye us ka faisla dene wale ke haath mein
 * nahi ho sakta.
 */
export async function PATCH(request: Request, ctx: { params: Promise<{ orderNo: string }> }) {
  return apiHandler(async () => {
    const { supplier } = await requireSupplier()
    const { orderNo } = await ctx.params
    const { toStatus } = await parseBody(request, BodySchema)

    const order =
      toStatus === 'PACKED'
        ? await container.orders.markPackedBySupplier(supplier.id, orderNo)
        : await container.orders.markDispatchedBySupplier(supplier.id, orderNo)

    return { orderNo: order.orderNo, status: order.status }
  })
}
