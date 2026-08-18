import { z } from 'zod'
import { OPS_ROLES } from '@oyebazar/core'
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
    role: z.enum(OPS_ROLES),
  })
  .strict()

/**
 * POST /api/v1/admin/team — naya ops user.
 *
 * 🔴 Sirf SUPER_ADMIN (AdminService rokta hai). Naya user banana matlab kisi ko andar aane
 * ka ikhtiyar dena — aur SUPER_ADMIN banane ka matlab paise ka ikhtiyar dena.
 *
 * Password kahin nahi: login usi WhatsApp number se hota hai jo yahan likha jata hai.
 */
export async function POST(request: Request) {
  return apiHandler(async () => {
    const { user } = await requireOpsUser()

    // Pehle ijazat, phir input ki jaanch — warna jise ijazat hi nahi, usay bhi hamare
    // qawaid ka pata chal jata hai ("naam do harf ka ho") aur hum us ka kaam bhi karte hain
    container.admin.assertPermission(user, 'manageTeam')

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
