import { z } from 'zod'
import { apiHandler, parseBody } from '@/lib/api/handler'
import { requireSupplier } from '@/lib/api/supplier-session'
import { container } from '@/lib/container'

export const runtime = 'nodejs'

const PatchSchema = z
  .object({
    size: z.string().trim().max(30).nullable().optional(),
    colour: z.string().trim().max(30).nullable().optional(),
    stockQty: z.number().int().min(0).max(100_000).optional(),
  })
  .strict()

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ variantId: string }> },
) {
  return apiHandler(async () => {
    const { supplier } = await requireSupplier()
    const { variantId } = await ctx.params
    const body = await parseBody(request, PatchSchema)

    await container.supplierCatalogue.updateVariant(supplier.id, variantId, body)
    return { ok: true }
  })
}

/** DELETE — jis par order ho chuka ho wo nahi mitta (service rokti hai). */
export async function DELETE(_request: Request, ctx: { params: Promise<{ variantId: string }> }) {
  return apiHandler(async () => {
    const { supplier } = await requireSupplier()
    const { variantId } = await ctx.params

    await container.supplierCatalogue.removeVariant(supplier.id, variantId)
    return { ok: true }
  })
}
