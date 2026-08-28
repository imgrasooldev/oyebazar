import { z } from 'zod'
import { apiHandler, parseBody } from '@/lib/api/handler'
import { requireSupplier } from '@/lib/api/supplier-session'
import { container } from '@/lib/container'

export const runtime = 'nodejs'

/**
 * Naam badalna, ya godown band/chalu karna.
 *
 * 🔴 Mitane ka koi rasta yahan nahi hai — jaan boojh kar. Godown mit jaye to us ke
 * register ki har qatar bemani ho jati hai ("kahan se nikla tha?" ka jawab gum), aur
 * wohi qataren jhagre ke din kaam aati hain. Band karna wo sab kuch de deta hai jo
 * mitane se chahiye tha: naya maal us mein nahi jata, aur wo liston se hat jata hai.
 */
const PatchSchema = z
  .object({
    name: z.string().trim().min(2).max(40).optional(),
    isActive: z.boolean().optional(),
  })
  .strict()

export async function PATCH(request: Request, ctx: { params: Promise<{ warehouseId: string }> }) {
  return apiHandler(async () => {
    const { supplier } = await requireSupplier()
    const { warehouseId } = await ctx.params
    const body = await parseBody(request, PatchSchema)

    if (body.name !== undefined) {
      await container.inventory.renameWarehouse({
        supplierId: supplier.id,
        warehouseId,
        name: body.name,
      })
    }

    if (body.isActive !== undefined) {
      await container.inventory.setWarehouseActive({
        supplierId: supplier.id,
        warehouseId,
        isActive: body.isActive,
      })
    }

    return { ok: true }
  })
}
