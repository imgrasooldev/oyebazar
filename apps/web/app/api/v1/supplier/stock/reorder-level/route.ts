import { z } from 'zod'
import { apiHandler, parseBody } from '@/lib/api/handler'
import { requireSupplier } from '@/lib/api/supplier-session'
import { container } from '@/lib/container'

export const runtime = 'nodejs'

/** 0 = ishara band. Dekhen `domain/stock.ts` — "hadd sifar" ka matlab nahi. */
const LevelSchema = z
  .object({
    variantId: z.string().min(1),
    level: z.number().int().min(0).max(100_000),
  })
  .strict()

/** PATCH /api/v1/supplier/stock/reorder-level */
export async function PATCH(request: Request) {
  return apiHandler(async () => {
    const { supplier } = await requireSupplier()
    const body = await parseBody(request, LevelSchema)

    await container.inventory.setReorderLevel({
      supplierId: supplier.id,
      variantId: body.variantId,
      level: body.level,
    })

    return { ok: true, level: body.level }
  })
}
