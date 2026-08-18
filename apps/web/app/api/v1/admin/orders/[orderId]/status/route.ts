import { z } from 'zod'
import { ValidationError } from '@oyebazar/shared'
import { apiHandler, parseBody } from '@/lib/api/handler'
import { requireOpsUser } from '@/lib/api/admin-session'
import { container } from '@/lib/container'

export const runtime = 'nodejs'

const BodySchema = z.object({
  toStatus: z.enum(['SENT_TO_SUPPLIER', 'DISPATCHED', 'DELIVERED', 'RTO']),
  note: z.string().trim().max(200).optional(),
})

/**
 * PATCH /api/v1/admin/orders/:orderId/status
 *
 * Wohi kaam jo purane ops endpoint par hai, magar shared API key ke bajaye asli login
 * se — aur actorId ab "ops" nahi, us shakhs ki id hoti hai. Kis ne order aage barhaya,
 * ab ye order ki tareekh mein likha jata hai.
 *
 * 🔴 Koi shortcut nahi: har transition OrderService se guzarti hai, jo state machine
 * aur confirmation ki shart dono lagati hai. Admin bhi bina tasdeeq ke order wholesaler
 * ko nahi bhej sakta.
 */
export async function PATCH(request: Request, ctx: { params: Promise<{ orderId: string }> }) {
  return apiHandler(async () => {
    const { user } = await requireOpsUser()

    // 🔴 REVIEWER sirf dekhta hai. Pehle yahan koi rok NAHI thi — us waqt har ops user
    // COORDINATOR ya upar tha, is liye masla nazar nahi aaya; REVIEWER aate hi read-only
    // banda order wholesaler ko bhej sakta tha.
    container.admin.assertPermission(user, 'moveOrders')

    const { orderId } = await ctx.params
    const body = await parseBody(request, BodySchema)

    switch (body.toStatus) {
      case 'SENT_TO_SUPPLIER': {
        const order = await container.orders.sendToSupplier(orderId, user.id)
        return { orderNo: order.orderNo, status: order.status }
      }
      case 'DISPATCHED': {
        const order = await container.orders.markDispatched(orderId, user.id)
        return { orderNo: order.orderNo, status: order.status }
      }
      case 'DELIVERED': {
        const order = await container.orders.markDelivered(orderId, user.id)
        return { orderNo: order.orderNo, status: order.status }
      }
      case 'RTO': {
        // RTO ki wajah lazmi — yehi number batata hai ke kaun sa ilaqa ya reseller
        // baar baar nuqsan de rahi hai
        if (!body.note) throw new ValidationError('RTO ki wajah likhna zaroori hai')
        const order = await container.orders.markRto(orderId, body.note, user.id)
        return { orderNo: order.orderNo, status: order.status }
      }
    }
  })
}
