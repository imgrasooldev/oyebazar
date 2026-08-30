import { z } from 'zod'
import { apiHandler, parseBody } from '@/lib/api/handler'
import { requireSupplier } from '@/lib/api/supplier-session'
import { container } from '@/lib/container'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Order ke gird ki baat — dukan ki taraf se, PORTAL se.
 *
 * 🔴 Ye darwaza pehle tha hi nahi, aur us ki khamoshi khatarnak thi.
 *
 * Guftagu do jagah se hoti hai: reseller apne `/orders` safhe se, aur dukan WhatsApp
 * wale magic link se (`/api/v1/supplier/link/[token]/messages`). Magar jo dukan wala
 * login kar ke portal mein baitha hai — jo hamara chahne wala istemal hai — us ke paas
 * na paighaam parhne ka rasta tha, na likhne ka.
 *
 * Nateeja ye banta tha: reseller likhti "laal wala bhejna, neela nahi", portal wala
 * dukandar wo kabhi dekhta hi nahi, maal ghalat chala jata — aur dono ke paas apni
 * jagah ka poora sabooot hota ke unhon ne theek kiya. Aisi kharabi shikayat ke tor par
 * bhi nahi aati; wo sirf ghalat maal ban kar aati hai.
 *
 * Malkiyat `findForSupplier` par chhori hai — wohi ek jagah jahan portal ke baqi qadam
 * (accept, reject, status) bhi jaanche jate hain. Order us dukan ka na ho to milta hi
 * nahi, aur 404 usi jagah se aata hai.
 */
const BodySchema = z.object({
  body: z.string().trim().min(1).max(1000),
})

export async function POST(request: Request, ctx: { params: Promise<{ orderNo: string }> }) {
  return apiHandler(async () => {
    const { supplier } = await requireSupplier()
    const { orderNo } = await ctx.params
    const input = await parseBody(request, BodySchema)

    const order = await container.orders.getForSupplierPortal(supplier.id, orderNo)

    const message = await container.repositories.orderMessages.add({
      orderId: order.id,
      /*
       * Portal se bhi dukan `ISSUE` shuru nahi karti — sirf `NOTE`.
       *
       * Wajah wohi hai jo token wale raste par likhi hai: masla wo uthata hai jis ka
       * nuqsan hota hai. Do raston par do alag qaida rakhne ka matlab ye hota ke dukan
       * wala magic link chhor kar portal se masla uthana seekh leta — aur qaida wo nahi
       * raha jo hum ne socha tha, balke wo jo raste ne ittefaqan bana diya.
       */
      kind: 'NOTE',
      authorType: 'supplier',
      authorId: supplier.id,
      body: input.body,
    })

    return { ok: true, message }
  })
}
