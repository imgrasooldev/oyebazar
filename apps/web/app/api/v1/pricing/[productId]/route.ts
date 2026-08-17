import { SetRetailPriceSchema, pkr } from '@oyebazar/shared'
import { apiHandler, parseBody } from '@/lib/api/handler'
import { requireReseller } from '@/lib/api/session'
import { container } from '@/lib/container'

export const runtime = 'nodejs'

/** GET — slider ki hadain (min = Baji price, suggested, max). */
export async function GET(_request: Request, ctx: { params: Promise<{ productId: string }> }) {
  return apiHandler(async () => {
    await requireReseller()
    const { productId } = await ctx.params
    return container.pricing.getRange(productId)
  })
}

/** PUT — reseller apna retail price set karti hai (Baji price se kam nahi ho sakta). */
export async function PUT(request: Request, ctx: { params: Promise<{ productId: string }> }) {
  return apiHandler(async () => {
    const { reseller } = await requireReseller()
    const { productId } = await ctx.params
    const { retailPrice } = await parseBody(request, SetRetailPriceSchema)
    const saved = await container.pricing.setRetailPrice(reseller.id, productId, pkr(retailPrice))
    return { productId, retailPrice: saved }
  })
}
