import { z } from 'zod'
import { apiHandler, parseBody } from '@/lib/api/handler'
import { requireSupplier } from '@/lib/api/supplier-session'
import { container } from '@/lib/container'

export const runtime = 'nodejs'

const StockSchema = z.object({ inStock: z.boolean() }).strict()

/**
 * PATCH /api/v1/supplier/products/:productId/stock
 *
 * Portal ka sab se ziyada dabaya jane wala button. Maal khatam hote hi band karna
 * ek tap ka kaam hona chahiye — warna resellers us maal ke status lagati rehti hain
 * aur akhir mein order RTO ban kar sab ka nuqsan karta hai.
 */
export async function PATCH(request: Request, ctx: { params: Promise<{ productId: string }> }) {
  return apiHandler(async () => {
    const { supplier } = await requireSupplier()
    const { inStock } = await parseBody(request, StockSchema)
    const { productId } = await ctx.params
    await container.supplierCatalogue.setStock(supplier.id, productId, inStock)
    return { ok: true, inStock }
  })
}
