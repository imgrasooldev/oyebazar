import { CatalogueQuerySchema, pkr } from '@oyebazar/shared'
import { apiHandler, parseQuery } from '@/lib/api/handler'
import { toResellerProductListItemDTO } from '@/lib/api/mappers'
import { requireReseller } from '@/lib/api/session'
import { container } from '@/lib/container'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/v1/catalogue — 🔴 LOGIN-GATED.
 * Price sirf yahan dikhta hai. Public catalogue ka koi price endpoint maujood hi nahi.
 */
export async function GET(request: Request) {
  return apiHandler(async () => {
    const { reseller } = await requireReseller()
    const query = parseQuery(request, CatalogueQuerySchema)

    const page = await container.catalogue.list(reseller.id, {
      limit: query.limit,
      cursor: query.cursor,
      categorySlug: query.category,
      search: query.q,
      minPrice: query.minPrice !== undefined ? pkr(query.minPrice) : undefined,
      maxPrice: query.maxPrice !== undefined ? pkr(query.maxPrice) : undefined,
      inStockOnly: query.inStockOnly,
    })

    return {
      items: page.items.map(toResellerProductListItemDTO),
      nextCursor: page.nextCursor,
    }
  })
}
