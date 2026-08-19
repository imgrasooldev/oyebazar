import { z } from 'zod'
import { apiHandler, parseBody } from '@/lib/api/handler'
import { requireSupplier } from '@/lib/api/supplier-session'
import { container } from '@/lib/container'

export const runtime = 'nodejs'

const BodySchema = z
  .object({
    size: z.string().trim().max(30).optional(),
    colour: z.string().trim().max(30).optional(),
    stockQty: z.number().int().min(0).max(100_000),
  })
  .strict()

/**
 * POST /api/v1/supplier/products/:productId/variants — naya rang/size.
 *
 * SKU yahan nahi maanga jata, service khud banati hai: dukan wale se maangte to ya wo
 * khali chhorta ya wohi code do jagah likh deta — aur SKU poore nizam mein unique hai.
 */
export async function POST(request: Request, ctx: { params: Promise<{ productId: string }> }) {
  return apiHandler(async () => {
    const { supplier } = await requireSupplier()
    const { productId } = await ctx.params
    const body = await parseBody(request, BodySchema)

    return container.supplierCatalogue.addVariant(supplier.id, productId, body)
  })
}
