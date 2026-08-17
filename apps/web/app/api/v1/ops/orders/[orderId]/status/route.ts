import { z } from 'zod'
import { ValidationError } from '@oyebazar/shared'
import { apiHandler, parseBody } from '@/lib/api/handler'
import { opsActorId, requireOpsKey } from '@/lib/api/ops-auth'
import { container } from '@/lib/container'

export const runtime = 'nodejs'

const BodySchema = z.object({
  toStatus: z.enum(['SENT_TO_SUPPLIER', 'DISPATCHED', 'DELIVERED', 'RTO']),
  note: z.string().trim().max(200).optional(),
})

/**
 * PATCH /api/v1/ops/orders/:orderId/status — order ka safar aage barhana.
 *
 * 🔴 Yahan koi shortcut nahi: har transition OrderService se guzarti hai, jo state machine
 * aur confirmation invariant dono lagati hai. Ops bhi bina confirm kiye order wholesaler
 * ko nahi bhej sakti — ye jaan boojh kar hai.
 */
export async function PATCH(request: Request, ctx: { params: Promise<{ orderId: string }> }) {
  return apiHandler(async () => {
    requireOpsKey(request)
    const actorId = opsActorId(request)
    const { orderId } = await ctx.params
    const body = await parseBody(request, BodySchema)

    switch (body.toStatus) {
      case 'SENT_TO_SUPPLIER':
        return summarise(await container.orders.sendToSupplier(orderId, actorId))
      case 'DISPATCHED':
        return summarise(await container.orders.markDispatched(orderId, actorId))
      case 'DELIVERED':
        return summarise(await container.orders.markDelivered(orderId, actorId))
      case 'RTO':
        if (!body.note) throw new ValidationError('RTO ki wajah likhna zaroori hai')
        return summarise(await container.orders.markRto(orderId, body.note, actorId))
    }
  })
}

function summarise(order: { id: string; orderNo: string; status: string; bajiFee: number }) {
  return { id: order.id, orderNo: order.orderNo, status: order.status, bajiFee: order.bajiFee }
}
