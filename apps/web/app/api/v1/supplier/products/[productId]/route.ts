import { EditDraftProductSchema, pkr } from '@oyebazar/shared'
import { apiHandler, parseBody } from '@/lib/api/handler'
import { requireSupplier } from '@/lib/api/supplier-session'
import { container } from '@/lib/container'

export const runtime = 'nodejs'

/**
 * PATCH /api/v1/supplier/products/:id — DRAFT maal ki poori tafseel badalna.
 *
 * 🔴 Sirf DRAFT. Us par na ops ki nazar pari hai na kisi reseller ki, is liye naam,
 * rate, category — sab bina kisi nuqsan ke theek ho sakte hain. Pehle is ka koi raasta
 * hi nahi tha: naam mein typo ya rate mein ek sifar zyada ka ilaaj sirf naya maal
 * banana tha.
 *
 * LIVE maal yahan se nahi badalta (repository ki query mein `status: 'DRAFT'` hai).
 * Us ka apna alag flow chahiye — reseller apna retail rate save kar chuki hoti hai aur
 * us ke status pack pehle se WhatsApp par ja chuke hote hain.
 *
 * Rate client se nahi liya jata: wo sirf APNA rate bhejta hai, hamara rate server par
 * us ki apni fee se banta hai.
 */
export async function PATCH(request: Request, ctx: { params: Promise<{ productId: string }> }) {
  return apiHandler(async () => {
    const { supplier } = await requireSupplier()
    const body = await parseBody(request, EditDraftProductSchema)
    const { productId } = await ctx.params

    const result = await container.supplierCatalogue.updateDraft(supplier.id, productId, {
      titleUr: body.titleUr,
      titleEn: body.titleEn,
      ...(body.descriptionUr ? { descriptionUr: body.descriptionUr } : {}),
      categorySlug: body.categorySlug,
      supplierPrice: pkr(body.supplierPrice),
      stockQty: body.stockQty,
    })

    // Wohi hisab jo naya maal daalte waqt dikhta hai — "aap ko itna milega, reseller ko itna"
    return {
      id: productId,
      yourPrice: body.supplierPrice,
      resellerSees: result.bajiPrice,
      suggestedRetail: result.suggestedRetail,
    }
  })
}
