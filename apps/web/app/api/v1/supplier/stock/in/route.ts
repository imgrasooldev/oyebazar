import { z } from 'zod'
import { apiHandler, parseBody } from '@/lib/api/handler'
import { requireSupplier } from '@/lib/api/supplier-session'
import { container } from '@/lib/container'

export const runtime = 'nodejs'

/**
 * Naya maal aaya.
 *
 * 🔴 `unitCost` marzi ka hai — bohat si dukanen apni lagat kisi ko nahi batatin, aur ye
 * un ka haq hai. Lazmi kar dene se do mein se ek cheez hoti: ya wo ye safha istemal
 * karna chhor deti, ya koi bhi number bhar deti — aur dono soorton mein hamare paas
 * pehle se bura data aa jata.
 */
const StockInSchema = z
  .object({
    variantId: z.string().min(1),
    qty: z.number().int().min(1).max(100_000),
    unitCost: z.number().int().min(0).max(10_000_000).optional(),
    note: z.string().trim().max(200).optional(),
    /*
     * Khep ka number aur maddat — DONO marzi ke.
     *
     * 🔴 Ye khaane bharne par ek khep banti hai; na bharen to kuch nahi banta aur sab
     * waise hi chalta hai. Lawn ke suit ki koi maddat nahi hoti, aur us dukan ke saamne
     * ye khana rakhna har dafa ek fazool qadam hai.
     */
    batchNo: z.string().trim().max(60).optional(),
    expiryAt: z.string().datetime().optional(),
  })
  .strict()

/** POST /api/v1/supplier/stock/in */
export async function POST(request: Request) {
  return apiHandler(async () => {
    const { supplier } = await requireSupplier()
    const body = await parseBody(request, StockInSchema)

    const balance = await container.inventory.stockIn({
      supplierId: supplier.id,
      variantId: body.variantId,
      qty: body.qty,
      ...(body.unitCost === undefined ? {} : { unitCost: body.unitCost }),
      ...(body.note === undefined ? {} : { note: body.note }),
      ...(body.batchNo === undefined ? {} : { batchNo: body.batchNo }),
      ...(body.expiryAt === undefined ? {} : { expiryAt: new Date(body.expiryAt) }),
    })

    return { ok: true, stockQty: balance }
  })
}
