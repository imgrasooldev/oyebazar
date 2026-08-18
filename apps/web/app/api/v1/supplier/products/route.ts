import { NewProductSchema, pkr } from '@oyebazar/shared'
import { apiHandler, parseBody } from '@/lib/api/handler'
import { requireSupplier } from '@/lib/api/supplier-session'
import { container } from '@/lib/container'

export const runtime = 'nodejs'

/**
 * POST /api/v1/supplier/products — wholesaler apna maal daalta hai.
 *
 * 🔴 Wo sirf APNA rate bhejta hai (1000). Hamara rate (1050) server par banta hai —
 * us ki apni fee ke hisab se. Client se bajiPrice lete to koi bhi apni marzi ka rate
 * bhej kar hamari fee ura sakta tha.
 *
 * Maal DRAFT banta hai: ops dekh kar LIVE karti hai.
 */
export async function POST(request: Request) {
  return apiHandler(async () => {
    const { supplier } = await requireSupplier()
    const body = await parseBody(request, NewProductSchema)

    const result = await container.supplierCatalogue.addProduct(supplier.id, {
      titleUr: body.titleUr,
      titleEn: body.titleEn,
      ...(body.descriptionUr ? { descriptionUr: body.descriptionUr } : {}),
      categorySlug: body.categorySlug,
      supplierPrice: pkr(body.supplierPrice),
      ...(body.imageUrl ? { imageUrl: body.imageUrl } : {}),
    })

    // Wholesaler ko poora hisab wapas — "aap ko itna milega, reseller ko itna dikhega"
    return {
      id: result.id,
      yourPrice: body.supplierPrice,
      resellerSees: result.bajiPrice,
      suggestedRetail: result.suggestedRetail,
    }
  })
}
