import { z } from 'zod'
import { apiHandler, parseQuery } from '@/lib/api/handler'
import { requireReseller } from '@/lib/api/session'
import { container } from '@/lib/container'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const QuerySchema = z.object({
  q: z.string().trim().min(1).max(60),
})

/**
 * GET /api/v1/catalogue/suggest — login shuda reseller ke liye tajaweez.
 *
 * Public wale se alag endpoint, jaan boojh kar: yahan reseller ka apna rate bhi jata
 * hai (taake patti mein hi nazar aa jaye ke is par kitna bachega), aur wo cheez public
 * endpoint par kabhi nahi ja sakti.
 *
 * 🔴 Yahan bhi sirf `bajiPrice` aur us ka apna retail — supplier ka rate CatalogueService
 * ke views mein hai hi nahi.
 */
export async function GET(request: Request) {
  return apiHandler(async () => {
    const { reseller } = await requireReseller()
    const { q } = parseQuery(request, QuerySchema)

    const page = await container.catalogue.list(reseller.id, { search: q, limit: 6 })

    return {
      products: page.items.map((item) => ({
        type: 'product' as const,
        id: item.product.id,
        nameUr: item.product.titleUr,
        nameEn: item.product.titleEn,
        imageUrl: item.product.coverImageUrl,
        myPrice: item.myRetailPrice ?? item.product.suggestedRetail,
        profit: Math.max((item.myRetailPrice ?? item.product.suggestedRetail) - item.product.bajiPrice, 0),
      })),
    }
  })
}
