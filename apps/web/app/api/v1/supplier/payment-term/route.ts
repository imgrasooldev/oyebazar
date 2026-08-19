import { z } from 'zod'
import { MAX_PAYOUT_TERM_DAYS } from '@oyebazar/core'
import { apiHandler, parseBody } from '@/lib/api/handler'
import { requireSupplier } from '@/lib/api/supplier-session'
import { container } from '@/lib/container'

export const runtime = 'nodejs'

const BodySchema = z.object({ days: z.number().int().min(0).max(MAX_PAYOUT_TERM_DAYS) }).strict()

/**
 * PUT /api/v1/supplier/payment-term — dukan apna waada likhti hai.
 *
 * 🔴 Badalne se PURANE hisab par asar nahi parta: har payout apni shart ka snapshot
 * saath rakhta hai. Warna baqaya purana hote hi waada barha kar record saaf kiya ja
 * sakta tha.
 */
export async function PUT(request: Request) {
  return apiHandler(async () => {
    const { supplier } = await requireSupplier()
    const { days } = await parseBody(request, BodySchema)

    await container.payouts.setPaymentTerm(supplier.id, days)
    return { ok: true, days }
  })
}
