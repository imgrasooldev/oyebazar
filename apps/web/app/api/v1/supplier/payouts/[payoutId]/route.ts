import { z } from 'zod'
import { apiHandler, parseBody } from '@/lib/api/handler'
import { requireSupplier } from '@/lib/api/supplier-session'
import { container } from '@/lib/container'

export const runtime = 'nodejs'

const BodySchema = z
  .object({
    action: z.literal('SENT'),
    // 🔴 Reference lazmi — jhagre mein "bhej diya tha" dono taraf se aata hai, TID ek taraf se
    reference: z.string().trim().min(4).max(60),
  })
  .strict()

/**
 * PATCH /api/v1/supplier/payouts/:payoutId — "reseller ko paise bhej diye".
 *
 * Ye hisab BAND nahi karta, sirf wholesaler ka dawa darj karta hai. Band tab hota hai
 * jab reseller apni taraf se tasdeeq kare (`/api/v1/payouts/:id`).
 */
export async function PATCH(request: Request, ctx: { params: Promise<{ payoutId: string }> }) {
  return apiHandler(async () => {
    const { supplier } = await requireSupplier()
    const { payoutId } = await ctx.params
    const body = await parseBody(request, BodySchema)

    const payout = await container.payouts.markSent(supplier.id, payoutId, body.reference)
    return { id: payout.id, status: payout.status, orderNo: payout.orderNo }
  })
}
