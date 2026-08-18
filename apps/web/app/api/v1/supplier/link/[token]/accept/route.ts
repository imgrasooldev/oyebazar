import { apiHandler, clientIp } from '@/lib/api/handler'
import { container } from '@/lib/container'
import { RateLimitedError } from '@oyebazar/shared'

export const runtime = 'nodejs'

/**
 * POST /api/v1/supplier/link/:token/accept
 *
 * Koi login nahi — token hi chabi hai. Do hifazatein:
 *  · token 32 bytes ka hai (guess karna namumkin) aur sirf ek order par chalta hai
 *  · IP par rate limit — koi token brute-force na kar sake
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
    const order = await container.orders.acceptBySupplier(token)
    return { orderNo: order.orderNo, status: order.status }
  })
}
