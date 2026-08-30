import { RegisterSchema } from '@oyebazar/shared'
import { apiHandler, parseBody } from '@/lib/api/handler'
import { toResellerProfileDTO } from '@/lib/api/mappers'
import { setSessionCookie } from '@/lib/api/session'
import { container } from '@/lib/container'

export const runtime = 'nodejs'

/**
 * POST /api/v1/auth/register — nayi reseller ka account + foran session.
 *
 * Ek hi qadam: OTP yahin jaancha jata hai aur wahin account ban jata hai. "Pehle verify,
 * phir register" do request hoti to code pehli hi par khatam ho jata.
 *
 * Number pehle se mojood ho to naya account nahi banta — usi ki session khul jati hai
 * (whatsappPhone unique hai, aur shared phone par ye behtar suret hai).
 */
export async function POST(request: Request) {
  return apiHandler(async () => {
    const { phone, code, name, city, referredById } = await parseBody(request, RegisterSchema)
    const result = await container.auth.register(
      phone,
      code,
      { name, city, ...(referredById ? { referredById } : {}) },
      { userAgent: request.headers.get('user-agent') ?? undefined },
    )

    await setSessionCookie(result.sessionToken, result.expiresAt)

    // 🔴 token response body mein kabhi nahi — sirf httpOnly cookie mein
    return { reseller: toResellerProfileDTO(result.reseller) }
  })
}
