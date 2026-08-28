import { z } from 'zod'
import { apiHandler, parseBody } from '@/lib/api/handler'
import { requireSupplier } from '@/lib/api/supplier-session'
import { container } from '@/lib/container'

export const runtime = 'nodejs'

/**
 * Maal zaya hua — toota, kharab hua, ya gum.
 *
 * 🔴 `note` yahan LAZMI hai (`stock/in` par nahi). Ginti ka ghatna register mein sab se
 * mashkook qatar hai: wohi ek jagah hai jahan maal bina bike gayab hota hai. Bina wajah
 * ke likhi hui aisi qatar us sawal ka jawab nahi deti jis ke liye ye register bana hai.
 */
const WriteOffSchema = z
  .object({
    variantId: z.string().min(1),
    qty: z.number().int().min(1).max(100_000),
    note: z.string().trim().min(3).max(200),
  })
  .strict()

/** POST /api/v1/supplier/stock/write-off */
export async function POST(request: Request) {
  return apiHandler(async () => {
    const { supplier } = await requireSupplier()
    const body = await parseBody(request, WriteOffSchema)

    const balance = await container.inventory.writeOff({
      supplierId: supplier.id,
      variantId: body.variantId,
      qty: body.qty,
      note: body.note,
    })

    return { ok: true, stockQty: balance }
  })
}
