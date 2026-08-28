import { z } from 'zod'
import { apiHandler, parseBody } from '@/lib/api/handler'
import { requireSupplier } from '@/lib/api/supplier-session'
import { container } from '@/lib/container'

export const runtime = 'nodejs'

/**
 * Maddat guzar chuki khep zaya likhna.
 *
 * 🔴 Ye `stock/write-off` se alag rasta NAHI hai — andar wohi amal chalta hai (ginti
 * ghatti hai, godown se katti hai, register mein `DAMAGE` ki qatar banti hai). Farq sirf
 * itna hai ke yahan wo KHEP maloom hai jis se maal gaya, aur wohi ek baat saal ke aakhir
 * mein poochhi jati hai: "kitna maal maddat guzarne par zaya hua".
 */
const BatchWriteOffSchema = z
  .object({
    batchId: z.string().min(1),
    qty: z.number().int().min(1).max(100_000),
    note: z.string().trim().min(3).max(200),
  })
  .strict()

export async function POST(request: Request) {
  return apiHandler(async () => {
    const { supplier } = await requireSupplier()
    const body = await parseBody(request, BatchWriteOffSchema)

    const balance = await container.inventory.writeOffBatch({
      supplierId: supplier.id,
      batchId: body.batchId,
      qty: body.qty,
      note: body.note,
    })

    return { ok: true, stockQty: balance }
  })
}
