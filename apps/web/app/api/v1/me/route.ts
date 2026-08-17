import { apiHandler } from '@/lib/api/handler'
import { toResellerProfileDTO } from '@/lib/api/mappers'
import { requireReseller } from '@/lib/api/session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET /api/v1/me — profile (phone aur payout hamesha masked). */
export async function GET() {
  return apiHandler(async () => {
    const { reseller } = await requireReseller()
    return toResellerProfileDTO(reseller)
  })
}
