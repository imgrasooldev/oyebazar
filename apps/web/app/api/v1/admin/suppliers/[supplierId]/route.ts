import { z } from 'zod'
import { apiHandler, parseBody } from '@/lib/api/handler'
import { requireOpsUser } from '@/lib/api/admin-session'
import { container } from '@/lib/container'

export const runtime = 'nodejs'

/**
 * PATCH /api/v1/admin/suppliers/:id
 *
 * Teen alag kaam, ek hi endpoint — magar ijazat teenon ki alag hai aur wo faisla
 * AdminService karti hai, yahan nahi. `.strict()` is liye ke ek request mein ek hi
 * kaam ho: "status + feeRate" ek saath bhejne par pata nahi chalta ke kya hua.
 */
const BodySchema = z.union([
  z.object({ status: z.enum(['PENDING', 'VERIFIED', 'SUSPENDED']) }).strict(),
  z.object({ listed: z.boolean() }).strict(),
  z.object({ feeRateBps: z.number().int() }).strict(),
])

export async function PATCH(request: Request, ctx: { params: Promise<{ supplierId: string }> }) {
  return apiHandler(async () => {
    const { user } = await requireOpsUser()
    const { supplierId } = await ctx.params
    const body = await parseBody(request, BodySchema)

    if ('status' in body) await container.admin.setSupplierStatus(user, supplierId, body.status)
    else if ('listed' in body) await container.admin.setSupplierListed(user, supplierId, body.listed)
    else await container.admin.setSupplierFeeRate(user, supplierId, body.feeRateBps)

    return { ok: true }
  })
}
