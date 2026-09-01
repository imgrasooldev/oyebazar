import { z } from 'zod'
import { SEO_DESCRIPTION_MAX, SEO_TITLE_MAX, cleanSeoText } from '@oyebazar/core'
import { NotFoundError } from '@oyebazar/shared'
import { apiHandler, parseBody } from '@/lib/api/handler'
import { requireSupplier } from '@/lib/api/supplier-session'
import { container } from '@/lib/container'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BodySchema = z
  .object({
    seoTitle: z.string().max(500).nullable(),
    seoDescription: z.string().max(2_000).nullable(),
  })
  .strict()

/**
 * PATCH /api/v1/supplier/products/:id/seo — maal ke safhe ka unwan aur do line.
 *
 * 🔴 Ye `PATCH /supplier/products/:id` se ALAG rasta hai, aur wo alag hona hi is ka
 * poora nuqta hai. Wo route sirf DRAFT par chalta hai (repository ki query mein
 * `status: 'DRAFT'` hai) kyunke LIVE ke baad naam aur rate par ops ki manzoori aur
 * reseller ke bane hue status pack khare hote hain.
 *
 * SEO ka matn un mein se kisi cheez ko nahi chhoota — wo sirf Google ke natije ki do
 * line hai. Aur usay LIVE ke BAAD badalne ki zaroorat sab se zyada parti hai: dukandar
 * ko pata hi tab chalta hai ke unwan kaam nahi kar raha jab safha teen mahine se kisi
 * ko nazar nahi aaya.
 */
export async function PATCH(request: Request, ctx: { params: Promise<{ productId: string }> }) {
  return apiHandler(async () => {
    const { supplier } = await requireSupplier()
    const { productId } = await ctx.params
    const body = await parseBody(request, BodySchema)

    const saved = await container.repositories.supplierProducts.saveProductSeo(
      supplier.id,
      productId,
      {
        seoTitle: cleanSeoText(body.seoTitle, SEO_TITLE_MAX),
        seoDescription: cleanSeoText(body.seoDescription, SEO_DESCRIPTION_MAX),
      },
    )

    /*
     * 🔴 `false` ka matlab hai ke ye maal is dukan ka hai hi nahi — aur us par
     * `NotFoundError` bhejna jaan boojh kar hai, "aap ka nahi hai" nahi. Doosri dukan
     * ko ye batana ke "ye id mojood to hai magar aap ki nahi" us ko wo maloomat de
     * deta hai jo us ka haq nahi.
     */
    if (!saved) throw new NotFoundError('Product', productId)

    return { ok: true }
  })
}
