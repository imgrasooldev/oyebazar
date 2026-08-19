import { z } from 'zod'
import { apiHandler, parseBody } from '@/lib/api/handler'
import { requireReseller } from '@/lib/api/session'
import { container } from '@/lib/container'

export const runtime = 'nodejs'

const BodySchema = z.union([
  z.object({ action: z.literal('RECEIVED') }).strict(),
  // Jhagre par wajah lazmi — ops ko baad mein isi se faisla karna hota hai
  z.object({ action: z.literal('NOT_RECEIVED'), note: z.string().trim().min(3).max(200) }).strict(),
])

/**
 * PATCH /api/v1/payouts/:payoutId — reseller ki taraf ka jawab.
 *
 * "Mil gaye" hisab band kar deta hai. "Nahi mile" us ko ops ki screen par le aata hai,
 * wholesaler ke dawe (reference) ke saath — dono baatein ek jagah.
 */
export async function PATCH(request: Request, ctx: { params: Promise<{ payoutId: string }> }) {
  return apiHandler(async () => {
    const { reseller } = await requireReseller()
    const { payoutId } = await ctx.params
    const body = await parseBody(request, BodySchema)

    const payout =
      body.action === 'RECEIVED'
        ? await container.payouts.confirmReceived(reseller.id, payoutId)
        : await container.payouts.raiseDispute(reseller.id, payoutId, body.note)

    return { id: payout.id, status: payout.status, orderNo: payout.orderNo }
  })
}
