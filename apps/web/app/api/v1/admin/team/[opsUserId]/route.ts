import { z } from 'zod'
import { OPS_ROLES } from '@oyebazar/core'
import { apiHandler, parseBody } from '@/lib/api/handler'
import { requireOpsUser } from '@/lib/api/admin-session'
import { container } from '@/lib/container'

export const runtime = 'nodejs'

/** Ek request, ek kaam — "role + isActive" ek saath bhejne par pata nahi chalta kya hua. */
const BodySchema = z.union([
  z.object({ role: z.enum(OPS_ROLES) }).strict(),
  z.object({ isActive: z.boolean() }).strict(),
])

/**
 * PATCH /api/v1/admin/team/:opsUserId — role badalna ya access band/chalu karna.
 *
 * Apna role khud badalna aur khud ko band karna dono service mein roke gaye hain:
 * aakhri SUPER_ADMIN khud ko gira de to fee rate aur invoice ka darwaza hamesha ke liye
 * band ho jata hai.
 */
export async function PATCH(request: Request, ctx: { params: Promise<{ opsUserId: string }> }) {
  return apiHandler(async () => {
    const { user } = await requireOpsUser()
    container.admin.assertPermission(user, 'manageTeam')

    const { opsUserId } = await ctx.params
    const body = await parseBody(request, BodySchema)

    if ('role' in body) await container.admin.setTeamRole(user, opsUserId, body.role)
    else await container.admin.setTeamActive(user, opsUserId, body.isActive)

    return { ok: true }
  })
}
