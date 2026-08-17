import { z } from 'zod'
import { RateLimitedError } from '@oyebazar/shared'
import { apiHandler, clientIp, parseBody } from '@/lib/api/handler'
import { container } from '@/lib/container'

export const runtime = 'nodejs'

const BodySchema = z.object({ reason: z.string().trim().min(3).max(160) })

/**
 * POST /api/v1/supplier/orders/:token/reject
 *
 * Wajah lazmi hai — wohi reseller ko dikhti hai, aur wohi batati hai ke kaunsa
 * wholesaler bar bar mana karta hai (ops us se baat kar sake).
 */
export async function POST(request: Request, ctx: { params: Promise<{ token: string }> }) {
  return apiHandler(async () => {
    const limit = await container.rateLimiter.consume(
      `supplier:${clientIp(request)}`,
      30,
      10 * 60 * 1000,
    )
    if (!limit.allowed) throw new RateLimitedError(undefined, limit.retryAfterMs)

    const { token } = await ctx.params
    const { reason } = await parseBody(request, BodySchema)

    const order = await container.orders.rejectBySupplier(token, reason)
    return { orderNo: order.orderNo, status: order.status }
  })
}
