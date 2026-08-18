import { OtpRequestSchema } from '@oyebazar/shared'
import { apiHandler, clientIp, parseBody } from '@/lib/api/handler'
import { devOtpFor } from '@/lib/api/dev-otp'
import { container } from '@/lib/container'

export const runtime = 'nodejs'

/**
 * POST /api/v1/supplier/auth/otp/request
 *
 * Jawab hamesha ek jaisa — number kisi dukan se juda ho ya na ho. Warna koi bhi
 * numbers aazma kar hamare wholesalers ki list bana sakta hai.
 */
export async function POST(request: Request) {
  return apiHandler(async () => {
    const { phone } = await parseBody(request, OtpRequestSchema)
    await container.supplierAuth.requestOtp(phone, clientIp(request))

    const devCode = devOtpFor(phone)
    return {
      ok: true,
      message: 'Code aap ke WhatsApp par bhej diya gaya hai',
      ...(devCode ? { devCode } : {}),
    }
  })
}
