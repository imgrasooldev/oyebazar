import { z } from 'zod'
import { apiHandler, parseQuery } from '@/lib/api/handler'
import { requireReseller } from '@/lib/api/session'
import { container } from '@/lib/container'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const QuerySchema = z.object({ phone: z.string().trim().min(10).max(20) })

/**
 * GET /api/v1/customers?phone=03001234567 — MERI purani customer.
 *
 * 🔴 Ye `/api/v1/phone-record` se BILKUL alag cheez hai, aur dono ka saath rehna hi
 * theek hai:
 *
 *   · phone-record — POORE platform ka chalan, magar sirf DO GINTIYAN. Kis ne bheja,
 *     kya bheja, kis naam par — kuch nahi. Ye ek ajnabi ke bare mein hai.
 *   · yahan        — SIRF isi reseller ki apni fehrist, magar poori tafseel ke saath.
 *     Ye us ki apni customer hai; naam aur pata us ne khud likha tha.
 *
 * Dono ko mila dena poore nizam ki sab se bari khata hoti: reseller A ko B ke customer
 * ka naam aur pata mil jata — sirf number likh kar, aur us shakhs ki ijazat ke baghair
 * jo kabhi hamare saamne aaya hi nahi. Isi liye repository ka har method `resellerId`
 * maangta hai, aur wo yahan session se aata hai — query se kabhi nahi.
 *
 * Na milne par `null`, koi 404 nahi: naya customer hona ghalti nahi, aam soorat hai —
 * aur form ke liye dono ka jawab ek jaisa hai ("kuch bharna nahi").
 */
export async function GET(request: Request) {
  return apiHandler(async () => {
    const { reseller } = await requireReseller()
    const { phone } = parseQuery(request, QuerySchema)

    return container.repositories.customers.findByPhone(reseller.id, phone)
  })
}
