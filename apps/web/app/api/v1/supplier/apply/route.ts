import { SupplierApplicationSchema } from '@oyebazar/shared'
import { apiHandler, clientIp, parseBody } from '@/lib/api/handler'
import { container } from '@/lib/container'

export const runtime = 'nodejs'

/**
 * POST /api/v1/supplier/apply — "apni dukan list karwayen".
 *
 * Koi login nahi (nayi dukan ke paas account hai hi nahi). Do hifazatein service mein
 * hain: IP par ginti, aur jawab hamesha ek jaisa — chahe number pehle se mojood ho.
 *
 * 🔴 Darkhwast se dukan chalu NAHI hoti. Wo PENDING banti hai aur admin portal ke
 * "Waiting for verification" mein aati hai; manzoori insaan deta hai.
 */
export async function POST(request: Request) {
  return apiHandler(async () => {
    const body = await parseBody(request, SupplierApplicationSchema)

    await container.supplierOnboarding.apply(
      {
        businessName: body.businessName,
        ownerName: body.ownerName,
        phoneE164: body.phone,
        city: body.city,
        address: body.address,
        ...(body.marketName ? { marketName: body.marketName } : {}),
        ...(body.ntn ? { ntn: body.ntn } : {}),
      },
      clientIp(request),
    )

    return { ok: true }
  })
}
