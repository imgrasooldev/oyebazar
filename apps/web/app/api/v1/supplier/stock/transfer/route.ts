import { z } from 'zod'
import { apiHandler, parseBody } from '@/lib/api/handler'
import { requireSupplier } from '@/lib/api/supplier-session'
import { container } from '@/lib/container'

export const runtime = 'nodejs'

/**
 * Maal ek godown se doosre.
 *
 * 🔴 Kul ginti BILKUL nahi badalti — maal dukan hi mein rehta hai, sirf jagah badalti
 * hai. Isi liye ye "nikalo phir daalo" ka jorha nahi hai: wo do amal kul ginti ko pehle
 * ghata kar phir barha dete, aur us beech mein aya hua order ghalat jawab paata.
 */
const TransferSchema = z
  .object({
    variantId: z.string().min(1),
    fromWarehouseId: z.string().min(1),
    toWarehouseId: z.string().min(1),
    qty: z.number().int().min(1).max(100_000),
  })
  .strict()

export async function POST(request: Request) {
  return apiHandler(async () => {
    const { supplier } = await requireSupplier()
    const body = await parseBody(request, TransferSchema)

    await container.inventory.transfer({ supplierId: supplier.id, ...body })
    return { ok: true }
  })
}
