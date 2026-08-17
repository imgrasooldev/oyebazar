import { OtpVerifySchema } from '@oyebazar/shared'
import { apiHandler, parseBody } from '@/lib/api/handler'
import { toResellerProfileDTO } from '@/lib/api/mappers'
import { setSessionCookie } from '@/lib/api/session'
import { container } from '@/lib/container'

export const runtime = 'nodejs'

/** POST /api/v1/auth/otp/verify — sahih code par httpOnly session cookie set hoti hai. */
export async function POST(request: Request) {
  return apiHandler(async () => {
    const { phone, code } = await parseBody(request, OtpVerifySchema)
    const result = await container.auth.verifyOtp(phone, code, {
      userAgent: request.headers.get('user-agent') ?? undefined,
    })

    await setSessionCookie(result.sessionToken, result.expiresAt)

    // 🔴 token response body mein kabhi nahi — sirf httpOnly cookie mein
    return { reseller: toResellerProfileDTO(result.reseller) }
  })
}
