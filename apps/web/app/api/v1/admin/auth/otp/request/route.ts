import { OtpRequestSchema } from '@oyebazar/shared'
import { apiHandler, clientIp, parseBody } from '@/lib/api/handler'
import { devOtpFor } from '@/lib/api/dev-otp'
import { container } from '@/lib/container'

export const runtime = 'nodejs'

/** POST /api/v1/admin/auth/otp/request — jawab hamesha ek jaisa (ops team ki list na bane). */
export async function POST(request: Request) {
  return apiHandler(async () => {
    const { phone } = await parseBody(request, OtpRequestSchema)
    await container.opsAuth.requestOtp(phone, clientIp(request))

    const devCode = devOtpFor(phone)
    return {
      ok: true,
      message: 'Code aap ke WhatsApp par bhej diya gaya hai',
      ...(devCode ? { devCode } : {}),
    }
  })
}
