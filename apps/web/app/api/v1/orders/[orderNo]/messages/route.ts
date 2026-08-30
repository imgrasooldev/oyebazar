import { z } from 'zod'
import { ValidationError } from '@oyebazar/shared'
import { apiHandler, parseBody } from '@/lib/api/handler'
import { requireReseller } from '@/lib/api/session'
import { container } from '@/lib/container'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Order ke gird ki baat — reseller ki taraf se.
 *
 * 🔴 Ye WhatsApp ki jagah nahi le raha. WhatsApp hamesha tez rahega aur log wahin baat
 * karenge. Ye us cheez ke liye hai jo BAAD mein kaam aati hai: jab reseller aur dukan ki
 * baat alag ho aur kisi ko faisla karna ho, to platform ke paas kuch to ho. Abhi us waqt
 * kuch bhi nahi hota — aur us khali jagah ki qeemat hamesha usi ko chukani parti hai jis
 * ke paas kam taqat hai.
 */
const BodySchema = z.object({
  /**
   * `ISSUE` = "masla hua" — order ke safhe par numaya, aur ops ki list mein.
   * `NOTE` = aam baat.
   */
  kind: z.enum(['NOTE', 'ISSUE']).default('NOTE'),
  /**
   * 🔴 Hadd chhoti nahi hai (1000) magar mojood zaroor hai. Ye matn ops parhta hai aur
   * jhagre ka saboot banta hai; bina hadd ke ek galat request se poora safha bhar sakta
   * hai.
   */
  body: z.string().trim().min(1).max(1000),
  /**
   * Maal ki tasveer — "aisa aaya hai".
   *
   * 🔴 Jhagre ke din lafz kaam nahi aate. Reseller likhti hai "rang ghalat hai",
   * dukan likhta hai "wohi bheja tha", aur ops ke paas faisla karne ka koi zariya nahi
   * hota. Ek tasveer wo poora jhagra ek lamhe mein khatam kar deti hai.
   *
   * Marzi ka: har paighaam ke saath tasveer nahi hoti, aur lazmi karne se aam baat
   * likhna hi mushkil ho jata.
   */
  photoUrl: z.string().url().max(500).optional(),
})

export async function POST(request: Request, ctx: { params: Promise<{ orderNo: string }> }) {
  return apiHandler(async () => {
    const { reseller } = await requireReseller()
    const { orderNo } = await ctx.params
    const input = await parseBody(request, BodySchema)

    /*
     * 🔴 Order pehle reseller ke NAAM par dhoonda jata hai — sirf `orderNo` par nahi.
     * Order number tarteeb se banta hai (BJ-1043), yani agle ka andaza lagana aasan hai.
     * Bina is shart ke koi bhi logged-in reseller doosri ke order par likh sakti.
     */
    const order = await container.orders.getForReseller(orderNo, reseller.id)

    /*
     * 🔴 Tasveer ka pata HAMARA hona lazmi hai, aur ISI reseller ka.
     *
     * Bahar ka link lene ka matlab hota ke koi order ke safhe par kisi bhi pate ki
     * tasveer chipka de — aur us pate wale ko har us bande ka IP aur waqt mil jata jo
     * wo safha kholta hai, ops samet.
     *
     * Jaanch banawati nahi: `publicUrl` wohi function hai jo upload ke waqt pata banata
     * hai (`/api/v1/media`), aur us mein `reseller.id` khud hum lagate hain — client ka
     * bheja hua naam kabhi istemal nahi hota. Yani ye prefix sirf usi tasveer par ban
     * sakta hai jo isi reseller ne hamare hi darwaze se bheji ho.
     */
    if (input.photoUrl) {
      const mine = container.storage.publicUrl(`order-photos/${reseller.id}/`)
      if (!input.photoUrl.startsWith(mine)) {
        throw new ValidationError('Tasveer isi jagah se bhejen')
      }
    }

    const message = await container.repositories.orderMessages.add({
      orderId: order.id,
      kind: input.kind,
      authorType: 'reseller',
      authorId: reseller.id,
      body: input.body,
      ...(input.photoUrl ? { photoUrl: input.photoUrl } : {}),
    })

    return { ok: true, message }
  })
}

export async function GET(_request: Request, ctx: { params: Promise<{ orderNo: string }> }) {
  return apiHandler(async () => {
    const { reseller } = await requireReseller()
    const { orderNo } = await ctx.params
    const order = await container.orders.getForReseller(orderNo, reseller.id)
    return { messages: await container.repositories.orderMessages.listForOrder(order.id) }
  })
}
