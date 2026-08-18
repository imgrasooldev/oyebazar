import { z } from 'zod'
import { apiHandler, parseBody } from '@/lib/api/handler'
import { requireOpsUser } from '@/lib/api/admin-session'
import { container } from '@/lib/container'

export const runtime = 'nodejs'

const BodySchema = z.object({ status: z.enum(['ACTIVE', 'LIMITED', 'SUSPENDED']) }).strict()

/** PATCH /api/v1/admin/resellers/:id — band karte hi us ki saari sessions bhi khatam. */
export async function PATCH(request: Request, ctx: { params: Promise<{ resellerId: string }> }) {
  return apiHandler(async () => {
    const { user } = await requireOpsUser()
    const { resellerId } = await ctx.params
    const { status } = await parseBody(request, BodySchema)

    await container.admin.setResellerStatus(user, resellerId, status)
    return { ok: true }
  })
}
