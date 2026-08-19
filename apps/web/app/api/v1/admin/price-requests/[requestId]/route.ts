import { z } from 'zod'
import { apiHandler, parseBody } from '@/lib/api/handler'
import { requireOpsUser } from '@/lib/api/admin-session'
import { container } from '@/lib/container'

export const runtime = 'nodejs'

const BodySchema = z.union([
  z.object({ decision: z.literal('APPROVE'), note: z.string().trim().max(200).optional() }).strict(),
  // Mana karne par wajah lazmi — warna dukan wala wohi darkhwast dobara bhejta hai
  z.object({ decision: z.literal('REJECT'), note: z.string().trim().min(3).max(200) }).strict(),
])

/**
 * PATCH /api/v1/admin/price-requests/:id — rate ki darkhwast ka faisla.
 *
 * 🔴 Manzoori do kaam ek saath karti hai: maal par naya rate lagta hai, AUR jin
 * resellers ka saved retail ab hamari lagat se neeche reh gaya un ka rate theek hota
 * hai. Doosre ke baghair un ka agla status pack loss par chhap kar WhatsApp par chala
 * jata (saved rate dobara jaancha nahi jata — jaanch sirf likhte waqt hoti hai).
 */
export async function PATCH(request: Request, ctx: { params: Promise<{ requestId: string }> }) {
  return apiHandler(async () => {
    const { user } = await requireOpsUser()

    // Pehle ijazat, phir input — warna jise ijazat hi nahi usay bhi hamare qawaid pata chal jate
    container.admin.assertPermission(user, 'approvePriceChange')

    const body = await parseBody(request, BodySchema)
    const { requestId } = await ctx.params

    if (body.decision === 'REJECT') {
      await container.priceChanges.reject(user.id, requestId, body.note)
      return { ok: true, status: 'REJECTED' as const }
    }

    const result = await container.priceChanges.approve(user.id, requestId, body.note)
    return {
      ok: true,
      status: 'APPROVED' as const,
      resellerSees: result.bajiPrice,
      // Kitni resellers ka rate theek karna para — ops ko nateeja dikhna chahiye
      repricedResellers: result.repricedResellers,
    }
  })
}
