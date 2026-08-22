import { OtpRequestSchema } from '@oyebazar/shared'
import { apiHandler, clientIp, parseBody } from '@/lib/api/handler'
import { devOtpFor } from '@/lib/api/dev-otp'
import { staticOtpHint } from '@/lib/api/static-otp-hint'
import { container } from '@/lib/container'

export const runtime = 'nodejs'

/**
 * POST /api/v1/auth/otp/request
 *
 * Jawab hamesha ek jaisa hai — chahe number registered ho ya na ho.
 * Warna koi bhi ye pata kar sakta hai ke kaun si reseller hamare saath hai.
 */
export async function POST(request: Request) {
  return apiHandler(async () => {
    const { phone } = await parseBody(request, OtpRequestSchema)
    await container.auth.requestOtp(phone, clientIp(request))

    // Dev par code safhe par bhi — production mein ye hamesha undefined hota hai
    const devCode = devOtpFor(phone)
    // Soft launch: STATIC_OTP laga ho to wohi code safhe par — dekhen static-otp-hint.ts
    const staticOtp = staticOtpHint()
    return {
      ok: true,
      message: 'Code aap ke WhatsApp par bhej diya gaya hai',
      ...(devCode ? { devCode } : {}),
      ...(staticOtp ? { staticOtp } : {}),
    }
  })
}
