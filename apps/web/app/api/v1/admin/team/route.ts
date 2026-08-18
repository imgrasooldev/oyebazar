import { z } from 'zod'
import { PakistaniPhoneSchema } from '@oyebazar/shared'
import { apiHandler, parseBody } from '@/lib/api/handler'
import { requireOpsUser } from '@/lib/api/admin-session'
import { container } from '@/lib/container'

export const runtime = 'nodejs'

const BodySchema = z
  .object({
    name: z.string().trim().min(2).max(60),
    email: z.string().trim().email().max(80),
    phone: PakistaniPhoneSchema,
    role: z.enum(['COORDINATOR', 'MANAGER', 'FOUNDER']),
  })
  .strict()

/**
 * POST /api/v1/admin/team — naya ops user.
 *
 * 🔴 Sirf FOUNDER (AdminService rokta hai). Naya user banana matlab kisi ko andar aane
 * ka ikhtiyar dena — aur FOUNDER banane ka matlab paise ka ikhtiyar dena.
 *
 * Password kahin nahi: login usi WhatsApp number se hota hai jo yahan likha jata hai.
 */
export async function POST(request: Request) {
  return apiHandler(async () => {
    const { user } = await requireOpsUser()
    const body = await parseBody(request, BodySchema)

    const created = await container.admin.addTeamMember(user, {
      name: body.name,
      email: body.email,
      phoneE164: body.phone,
      role: body.role,
    })

    return { id: created.id, name: created.name, role: created.role }
  })
}
