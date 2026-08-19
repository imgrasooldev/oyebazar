import { z } from 'zod'
import { apiHandler, parseBody } from '@/lib/api/handler'
import { requireOpsUser } from '@/lib/api/admin-session'
import { container } from '@/lib/container'

export const runtime = 'nodejs'

const BodySchema = z
  .object({
    decision: z.enum(['SETTLED', 'PENDING']),
    note: z.string().trim().min(3).max(200),
  })
  .strict()

/**
 * PATCH /api/v1/admin/payouts/:payoutId — ops ka faisla, jab dono apni baat par qaim hon.
 *
 * Do hi rukh: hisab band kar dena, ya wapas wholesaler ke zimme daal dena. Wajah lazmi
 * hai — teen mahine baad koi poochhe to jawab hona chahiye ke kis bina par faisla hua.
 */
export async function PATCH(request: Request, ctx: { params: Promise<{ payoutId: string }> }) {
  return apiHandler(async () => {
    const { user } = await requireOpsUser()

    // Pehle ijazat, phir input — warna jise ijazat hi nahi usay hamare qawaid pata chal jate hain
    container.admin.assertPermission(user, 'moveOrders')

    const { payoutId } = await ctx.params
    const body = await parseBody(request, BodySchema)

    await container.payouts.resolve({
      opsUserId: user.id,
      payoutId,
      decision: body.decision,
      note: body.note,
    })

    return { ok: true, status: body.decision }
  })
}
