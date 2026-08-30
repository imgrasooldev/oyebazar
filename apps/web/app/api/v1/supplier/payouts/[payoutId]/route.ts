import { z } from 'zod'
import { ValidationError } from '@oyebazar/shared'
import { apiHandler, parseBody } from '@/lib/api/handler'
import { requireSupplier } from '@/lib/api/supplier-session'
import { container } from '@/lib/container'

export const runtime = 'nodejs'

const BodySchema = z
  .object({
    action: z.literal('SENT'),
    // 🔴 Reference lazmi — jhagre mein "bhej diya tha" dono taraf se aata hai, TID ek taraf se
    reference: z.string().trim().min(4).max(60),
    /*
     * Bhejne ki tasveer — MARZI ka.
     *
     * Lazmi na hone ki wajah dukan ki hai: TID likhna ek line ka kaam hai, screenshot
     * lagana teen qadam ka. Lazmi karne ka anjaam ye hota ke dukan wala "bhej diye"
     * likhna hi chhor deta aur hisab khula reh jata — jo adhoore sabooot se buri
     * soorat hai.
     */
    proofUrl: z.string().url().max(500).optional(),
  })
  .strict()

/**
 * PATCH /api/v1/supplier/payouts/:payoutId — "reseller ko paise bhej diye".
 *
 * Ye hisab BAND nahi karta, sirf wholesaler ka dawa darj karta hai. Band tab hota hai
 * jab reseller apni taraf se tasdeeq kare (`/api/v1/payouts/:id`).
 */
export async function PATCH(request: Request, ctx: { params: Promise<{ payoutId: string }> }) {
  return apiHandler(async () => {
    const { supplier } = await requireSupplier()
    const { payoutId } = await ctx.params
    const body = await parseBody(request, BodySchema)

    /*
     * 🔴 Tasveer ka pata HAMARA hona lazmi hai — aur ISI dukan ka.
     *
     * Client se URL lena ek khula darwaza hai. Bina jaanch ke wo kisi bhi pate ki
     * tasveer reseller ke safhe par chipka sakta hai (aur us pate wale ko reseller ka
     * IP aur waqt mil jata hai), ya doosri dukan ke folder ka rasta likh kar wo dekh
     * sakta hai jo us ka nahi.
     *
     * Jaanch banawati nahi hai: `publicUrl` wohi function hai jo upload ke waqt pata
     * banata hai (`/api/v1/supplier/media`), aur us mein `supplier.id` khud hum lagate
     * hain — client ka bheja hua naam kabhi istemal nahi hota. Yani ye prefix sirf usi
     * file par ban sakta hai jo isi dukan ne hamare hi darwaze se upload ki ho.
     */
    if (body.proofUrl) {
      const mine = container.storage.publicUrl(`products/${supplier.id}/`)
      if (!body.proofUrl.startsWith(mine)) {
        throw new ValidationError('Tasveer isi jagah se upload karen')
      }
    }

    const payout = await container.payouts.markSent(
      supplier.id,
      payoutId,
      body.reference,
      body.proofUrl,
    )
    return { id: payout.id, status: payout.status, orderNo: payout.orderNo }
  })
}
