import { z } from 'zod'
import { RATING_MAX, RATING_MIN, reviewPeriod } from '@oyebazar/core'
import { apiHandler, parseBody } from '@/lib/api/handler'
import { requireReseller } from '@/lib/api/session'
import { container } from '@/lib/container'
import { ValidationError } from '@oyebazar/shared'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const Rating = z.number().int().min(RATING_MIN).max(RATING_MAX)

const BodySchema = z.object({
  orderId: z.string().min(1),
  quality: Rating,
  communication: Rating,
  payoutOnTime: Rating,
  comment: z.string().trim().max(300).optional(),
})

/**
 * POST /api/v1/supplier-reviews — reseller ki raye us dukan ke bare mein.
 *
 * 🔴 Raye ORDER se bandhi hui hai, dukan se nahi — aur ye poori hifazat isi par khari hai.
 *
 * Agar sirf `supplierId` liya jata to koi bhi logged-in reseller kisi bhi dukan ko sitare
 * de sakti — us se kharida ho ya na ho. Us soorat mein ye nizam pehle hi hafte be-maani
 * ho jata: muqablay wali dukan ko girana aur apni pasand wali ko uthana chand request ka
 * kaam hota.
 *
 * Order us ka apna hona chahiye, POHANCHA hua hona chahiye, aur dukan usi order se aati
 * hai — reseller ke bheje hue `supplierId` par bharosa nahi kiya jata.
 */
export async function POST(request: Request) {
  return apiHandler(async () => {
    const { reseller } = await requireReseller()
    const input = await parseBody(request, BodySchema)

    const order = await container.repositories.orders.findById(input.orderId)

    if (!order || order.resellerId !== reseller.id) {
      throw new ValidationError('Ye order aap ka nahi hai')
    }

    /*
     * Pohancha hua na ho to raye ka koi matlab nahi: "maal kaisa nikla" ka jawab hai hi
     * nahi, aur "commission waqt par mila" ka bilkul nahi — paisa delivery ke baad aata
     * hai.
     */
    if (order.status !== 'DELIVERED') {
      throw new ValidationError('Raye pohanche hue order par hi di ja sakti hai')
    }

    await container.repositories.supplierReviews.add({
      // 🔴 Dukan ORDER se — reseller ke bheje hue kisi khaane se nahi
      supplierId: order.supplierId,
      resellerId: reseller.id,
      orderId: order.id,
      quality: input.quality,
      communication: input.communication,
      payoutOnTime: input.payoutOnTime,
      ...(input.comment ? { comment: input.comment } : {}),
      periodMonth: reviewPeriod(new Date()),
    })

    return { ok: true }
  })
}
