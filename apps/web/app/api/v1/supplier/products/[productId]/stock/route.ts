import { z } from 'zod'
import { apiHandler, parseBody } from '@/lib/api/handler'
import { requireSupplier } from '@/lib/api/supplier-session'
import { container } from '@/lib/container'

export const runtime = 'nodejs'

/**
 * Do tarah ka kaam, dono stock ke bare mein:
 *  · `inStock` — switch (jaldi mein band/chalu)
 *  · `qty` — asli ginti (naya maal aaya, ya gin kar kam nikla)
 */
const StockSchema = z.union([
  z.object({ inStock: z.boolean() }).strict(),
  z.object({ qty: z.number().int().min(0).max(100_000) }).strict(),
])

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
    const body = await parseBody(request, StockSchema)
    const { productId } = await ctx.params

    if ('qty' in body) {
      await container.supplierCatalogue.setStockQuantity(supplier.id, productId, body.qty)
      return { ok: true, qty: body.qty }
    }

    await container.supplierCatalogue.setStock(supplier.id, productId, body.inStock)
    return { ok: true, inStock: body.inStock }
  })
}
