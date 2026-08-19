import { z } from 'zod'
import { apiHandler, parseBody } from '@/lib/api/handler'
import { requireSupplier } from '@/lib/api/supplier-session'
import { container } from '@/lib/container'

export const runtime = 'nodejs'

const BodySchema = z
  .object({
    city: z.number().int().min(0).max(5_000),
    other: z.number().int().min(0).max(5_000),
  })
  .strict()

/**
 * PUT /api/v1/supplier/delivery-rates — dukan apna delivery rate likhti hai.
 *
 * 🔴 Rate wohi likhta hai jo courier ka bill bharta hai. Pehle reseller order lagate
 * waqt jo marzi likh deti thi (0 bhi), aur nuqsan chup chaap dukan ke zimme aa jata.
 *
 * Hadd 5,000: is se aage ka "delivery kharcha" delivery nahi rehta, aur us par customer
 * order hi cancel kar deta hai — us se behtar hai ke rate likhte waqt hi rok di jaye.
 */
export async function PUT(request: Request) {
  return apiHandler(async () => {
    const { supplier } = await requireSupplier()
    const body = await parseBody(request, BodySchema)

    await container.supplierCatalogue.setDeliveryRates(supplier.id, body)
    return { ok: true, ...body }
  })
}
