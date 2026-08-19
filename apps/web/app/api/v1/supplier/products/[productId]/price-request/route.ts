import { z } from 'zod'
import { pkr } from '@oyebazar/shared'
import { apiHandler, parseBody } from '@/lib/api/handler'
import { requireSupplier } from '@/lib/api/supplier-session'
import { container } from '@/lib/container'

export const runtime = 'nodejs'

const BodySchema = z
  .object({
    supplierPrice: z.number().int().positive('نیا ریٹ لکھیں').max(1_000_000),
    reason: z.string().trim().max(200).optional(),
  })
  .strict()

/**
 * POST /api/v1/supplier/products/:id/price-request — LIVE maal ka naya rate maangna.
 *
 * 🔴 Rate YAHAN NAHI BADALTA. Sirf darkhwast banti hai; badalti ops hai.
 *
 * Wajah: reseller apna retail rate save kar chuki hoti hai aur us ka status pack pehle
 * se WhatsApp par laga hua hota hai. Rate barhte hi wo pack us rate ka elaan kar raha
 * hota hai jo us ki apni lagat se KAM hai — aur usay pata tab chalta hai jab customer
 * haan keh chuka hota hai aur order fail hota hai.
 *
 * DRAFT maal is raste se nahi jata — wahan dukan wala PATCH se khud sab badal leta hai.
 */
export async function POST(request: Request, ctx: { params: Promise<{ productId: string }> }) {
  return apiHandler(async () => {
    const { supplier } = await requireSupplier()
    const body = await parseBody(request, BodySchema)
    const { productId } = await ctx.params

    const result = await container.priceChanges.request(
      supplier.id,
      productId,
      pkr(body.supplierPrice),
      body.reason,
    )

    return {
      id: result.id,
      status: 'PENDING' as const,
      yourPrice: body.supplierPrice,
      // Manzoori mile to reseller ko kya dikhega — dukan wale ko abhi saaf dikhna chahiye
      resellerWouldSee: result.proposedBajiPrice,
    }
  })
}
