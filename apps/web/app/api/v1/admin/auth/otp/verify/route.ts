import { OtpVerifySchema } from '@oyebazar/shared'
import { apiHandler, parseBody } from '@/lib/api/handler'
import { setAdminSessionCookie } from '@/lib/api/admin-session'
import { container } from '@/lib/container'

export const runtime = 'nodejs'

/** POST /api/v1/admin/auth/otp/verify — sahih code par admin ki apni cookie. */
export async function POST(request: Request) {
  return apiHandler(async () => {
    const { phone, code } = await parseBody(request, OtpVerifySchema)
    const result = await container.opsAuth.verifyOtp(phone, code, {
      userAgent: request.headers.get('user-agent') ?? undefined,
    })

    await setAdminSessionCookie(result.sessionToken, result.expiresAt)

    // 🔴 token body mein kabhi nahi — sirf httpOnly cookie mein
    return { user: { name: result.user.name, role: result.user.role } }
  })
}
