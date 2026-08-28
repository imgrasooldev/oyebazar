import { z } from 'zod'
import { apiHandler, parseQuery } from '@/lib/api/handler'
import { requireReseller } from '@/lib/api/session'
import { container } from '@/lib/container'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const QuerySchema = z.object({ phone: z.string().trim().min(10).max(20) })

/**
 * GET /api/v1/phone-record?phone=03001234567
 *
 * 🔴 Jawab mein sirf DO GINTIYAN hain — kitne pohanche, kitne wapas aaye.
 *
 * Na koi naam, na order, na ye ke kis reseller ne bheja tha. Ye hadd is feature ki jaan
 * hai: agar reseller ko ye pata chal jaye ke "ye customer Sadia se bhi leti hai", to hum
 * ne ek shakhs ki khareedari ka record ek ajnabi ke saamne khol diya — aur wo shakhs
 * kabhi hamare saamne aaya hi nahi, na us ne ijazat di.
 *
 * 🔴 Login LAZMI hai. Bina login ke ye endpoint kisi ko bhi kisi bhi number ka record
 * dekhne deta — yani ek muft "ye number online kitna kharidta hai" wali service.
 */
export async function GET(request: Request) {
  return apiHandler(async () => {
    await requireReseller()
    const { phone } = parseQuery(request, QuerySchema)

    return container.orders.phoneRecordFor(phone)
  })
}
