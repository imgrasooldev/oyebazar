import { z } from 'zod'
import { ValidationError } from '@oyebazar/shared'
import { apiHandler, parseBody } from '@/lib/api/handler'
import { requireOpsUser } from '@/lib/api/admin-session'
import { container } from '@/lib/container'

export const runtime = 'nodejs'

const BodySchema = z
  .object({
    // 🔴 Reference lazmi — jhagre mein "de diya tha" dono taraf se aata hai, TID ek taraf se
    reference: z.string().trim().min(4).max(60),
  })
  .strict()

/**
 * PATCH /api/v1/admin/bonuses/:id — "bonus de diya".
 *
 * 🔴 Ijazat `payBonus` — apni alag, `markInvoicePaid` ke saath nahi. Wo paisa hai jo
 * hamare paas AAYA; ye wo hai jo hamare paas se JATA hai. Dono ek naam par rakhne ka
 * matlab ye hota ke jis bande ko "wasooli likhna" ka kaam diya gaya wo chup chaap
 * "paisa dena" bhi kar sakta.
 *
 * 🔴 Ye "kholta" kuch nahi. Bonus khud ba khud khulta hai jab order POHANCHTA hai
 * (`OrderService.awardBonuses`), aur ops ka kaam sirf usay dena aur likhna hai. Ops ko
 * bonus KHOLNE dena us poori shart ko bemani kar deta jo us ke peechhe khari hai.
 */
export async function PATCH(request: Request, ctx: { params: Promise<{ bonusId: string }> }) {
  return apiHandler(async () => {
    const { user } = await requireOpsUser()
    // Pehle ijazat, phir input — warna jise ijazat hi nahi usay hamare qawaid pata chal jate hain
    container.admin.assertPermission(user, 'payBonus')

    const { bonusId } = await ctx.params
    const { reference } = await parseBody(request, BodySchema)

    const done = await container.repositories.bonuses.markPaid(bonusId, reference, new Date())
    /*
     * Pehle se PAID par saaf jawab — chup chaap "ok" nahi.
     *
     * Do bandon ne ek hi qatar par kaam kiya, ya safha purana tha. Us par "ho gaya"
     * likh dene ka matlab ye hota ke doosra samajhta hai us ne diya hai, aur wahi paisa
     * dobara chala jata.
     */
    if (!done) throw new ValidationError('Ye bonus pehle hi diya ja chuka hai')

    return { ok: true }
  })
}
