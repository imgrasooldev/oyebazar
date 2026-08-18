import { OtpVerifySchema } from '@oyebazar/shared'
import { apiHandler, parseBody } from '@/lib/api/handler'
import { setSupplierSessionCookie } from '@/lib/api/supplier-session'
import { container } from '@/lib/container'

export const runtime = 'nodejs'

/** POST /api/v1/supplier/auth/otp/verify — sahih code par wholesaler ki apni cookie. */
export async function POST(request: Request) {
  return apiHandler(async () => {
    const { phone, code } = await parseBody(request, OtpVerifySchema)
    const result = await container.supplierAuth.verifyOtp(phone, code, {
      userAgent: request.headers.get('user-agent') ?? undefined,
    })

    await setSupplierSessionCookie(result.sessionToken, result.expiresAt)

    // 🔴 token body mein kabhi nahi — sirf httpOnly cookie mein
    return { supplier: { businessName: result.supplier.businessName, city: result.supplier.city } }
  })
}
