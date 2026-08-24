import { z } from 'zod'
import { apiHandler, parseBody } from '@/lib/api/handler'
import { container } from '@/lib/container'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Order ke gird ki baat — dukan ki taraf se, TOKEN par.
 *
 * 🔴 Yahan login NAHI hai, aur ye jaan boojh kar hai.
 *
 * Bolton Market ka thok wala naya account nahi banata, magar WhatsApp ka link zaroor
 * kholta hai — yehi wajah hai ke order accept/reject bhi isi token se hota hai (dekhen
 * `Order.supplierToken`). Agar jawab dene ke liye usay login karna pare to wo jawab dega
 * hi nahi, aur guftagu ek tarfa reh jayegi — jo us se bhi buri soorat hai ke guftagu
 * hoti hi na.
 *
 * Token hi us ki chabi hai: lamba, opaque, aur SIRF isi order par chalta hai. Yani is
 * raste se wo kisi doosre order ko chhoo bhi nahi sakta.
 */
const BodySchema = z.object({
  body: z.string().trim().min(1).max(1000),
})

export async function POST(request: Request, ctx: { params: Promise<{ token: string }> }) {
  return apiHandler(async () => {
    const { token } = await ctx.params
    const input = await parseBody(request, BodySchema)

    const order = await container.orders.getForSupplierToken(token)

    const message = await container.repositories.orderMessages.add({
      orderId: order.id,
      /*
       * Dukan `ISSUE` shuru nahi karti — sirf jawab deti hai.
       *
       * "Masla hua" reseller ki taraf se uthta hai kyunke nuqsan usi ka hota hai (us ka
       * customer, us ka paisa). Dukan ko bhi masla uthane dena is nizam ko shikayaton ka
       * do-tarfa maidan bana deta, jabke maqsad sirf ye hai ke ek jagah record ho.
       */
      kind: 'NOTE',
      authorType: 'supplier',
      body: input.body,
    })

    return { ok: true, message }
  })
}
