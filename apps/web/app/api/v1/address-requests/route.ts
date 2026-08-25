import { z } from 'zod'
import { apiHandler, parseBody } from '@/lib/api/handler'
import { requireReseller } from '@/lib/api/session'
import { container } from '@/lib/container'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BodySchema = z
  .object({
    productId: z.string().min(1),
    variantId: z.string().min(1).optional(),
    qty: z.number().int().min(1).max(20),
    retailPrice: z.number().int().positive(),
  })
  .strict()

/**
 * POST /api/v1/address-requests — reseller apni customer ke liye link banati hai.
 *
 * 🔴 `resellerId` session se aata hai, body se nahi. Body se lene ka matlab hota ke koi
 * bhi logged-in reseller kisi doosri ke naam par link bana sakti — aur us link se bana
 * hua order us doosri ke hisab mein charh jata.
 */
export async function POST(request: Request) {
  return apiHandler(async () => {
    const { reseller } = await requireReseller()
    const input = await parseBody(request, BodySchema)

    const { token, expiresAt } = await container.addressRequests.open({
      resellerId: reseller.id,
      productId: input.productId,
      ...(input.variantId ? { variantId: input.variantId } : {}),
      qty: input.qty,
      retailPrice: input.retailPrice,
    })

    return {
      token,
      // Poora link yahin banta hai — client ko origin jorhne ki zaroorat na pare
      url: `${process.env.APP_URL ?? ''}/pata/${token}`,
      expiresAt: expiresAt.toISOString(),
    }
  })
}
