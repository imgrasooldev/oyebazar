import { apiHandler } from '@/lib/api/handler'
import { requireOpsUser } from '@/lib/api/admin-session'
import { container } from '@/lib/container'

export const runtime = 'nodejs'

/**
 * POST /api/v1/admin/order-messages/:messageId/resolve — "ye masla ab khula nahi".
 *
 * 🔴 Ye darwaza pehle nahi tha, aur us ki ghair-mojoodgi ka anjaam ops ki screen par
 * dikhta: `orderMessages.resolve()` repository mein LIKHA hua tha magar usay koi bulata
 * hi nahi tha. Yani reseller masla utha sakti thi, ops usay dekh sakti thi — aur wo
 * hamesha ke liye "khula" reh jata.
 *
 * Aisi list sirf barhti hai. Aur jo list sirf barhti ho, wo teen hafte mein wo cheez
 * ban jati hai jise koi nahi kholta — us din bhi jab us mein waqai koi naya masla ho.
 * Ye us se buri soorat hai ke list hoti hi na, kyunke us ki mojoodgi ye yaqeen deti
 * hai ke maslon par nazar hai.
 *
 * `moveOrders` ki ijazat wohi hai jo order ki halat badalne ki hai — masla band karna
 * usi darje ka faisla hai, aur alag ijazat banane se sirf ye hota ke kisi din wo kisi
 * ko di hi na jati.
 */
export async function POST(_request: Request, ctx: { params: Promise<{ messageId: string }> }) {
  return apiHandler(async () => {
    const { user } = await requireOpsUser()
    // Pehle ijazat, phir input — warna jise ijazat hi nahi usay hamare qawaid pata chal jate hain
    container.admin.assertPermission(user, 'moveOrders')

    const { messageId } = await ctx.params
    await container.repositories.orderMessages.resolve(messageId, new Date())

    return { ok: true }
  })
}
