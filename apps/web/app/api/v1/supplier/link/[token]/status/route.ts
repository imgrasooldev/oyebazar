import { z } from 'zod'
import { RateLimitedError } from '@oyebazar/shared'
import { apiHandler, clientIp, parseBody } from '@/lib/api/handler'
import { container } from '@/lib/container'

export const runtime = 'nodejs'

const BodySchema = z
  .object({
    toStatus: z.enum(['PACKED', 'DISPATCHED', 'DELIVERED', 'RTO', 'CANCELLED']),
    reason: z.string().trim().min(3).max(200).optional(),
  })
  .strict()
  .refine((body) => !['RTO', 'CANCELLED'].includes(body.toStatus) || Boolean(body.reason), {
    message: 'Wajah likhen — reseller ke customer ko yehi batana parta hai',
    path: ['reason'],
  })

/**
 * PATCH /api/v1/supplier/link/:token/status
 *
 * 🔴 Koi login nahi — wohi token jo qubool karne ke liye chalta hai.
 *
 * Wajah karobari hai: dukan wala WhatsApp par link kholta hai aur ek tap mein order
 * qubool kar leta hai. Us ke baad ke qadam portal mein the (login, OTP, ek aur app
 * jaisi cheez) — aur bohot se dukan wale wahan tak jate hi nahi. Us ki qeemat reseller
 * bhugatti thi: DELIVERED wohi qadam hai jis par us ka hissa khulta hai.
 *
 * Hifazat wohi jo accept/reject par hai: token 32 bytes ka, ek hi order par, aur IP par
 * rate limit.
 */
export async function PATCH(request: Request, ctx: { params: Promise<{ token: string }> }) {
  return apiHandler(async () => {
    const limit = await container.rateLimiter.consume(
      `supplier:${clientIp(request)}`,
      30,
      10 * 60 * 1000,
    )
    if (!limit.allowed) throw new RateLimitedError(undefined, limit.retryAfterMs)

    const { token } = await ctx.params
    const { toStatus, reason } = await parseBody(request, BodySchema)

    const order = await container.orders.markStatusByToken(
      token,
      toStatus,
      ...(reason ? ([reason] as const) : ([] as const)),
    )

    return { orderNo: order.orderNo, status: order.status }
  })
}
