import { z } from 'zod'
import { apiHandler, parseBody } from '@/lib/api/handler'
import { requireOpsUser } from '@/lib/api/admin-session'
import { container } from '@/lib/container'

export const runtime = 'nodejs'

/*
 * Do alag kaam, ek endpoint — magar EK request mein ek hi.
 *
 * 🔴 `z.union` + `.strict()` jaan boojh kar: "status + naam" ek saath bhejne par
 * daftar mein ye pata hi na chalta ke us harkat mein asal mein kya hua, aur do alag
 * ijazaton (halat badalna, naam badalna) ka farq bhi mit jata. Wohi tareeqa dukan wale
 * endpoint par pehle se chal raha hai.
 */
const BodySchema = z.union([
  z.object({ status: z.enum(['DRAFT', 'LIVE', 'ARCHIVED']) }).strict(),
  z
    .object({
      titleUr: z.string().trim().max(80),
      titleEn: z.string().trim().min(1).max(80),
      /*
       * `null` ki ijazat = "khaana waisa hi rehne do".
       *
       * Ops aksar sirf naam theek karti hai aur category ko haath nahi lagati. Us
       * surat mein khaali string bhejne par wo "koi category nahi" ban jati — yani ek
       * theek kiya hua maal chup chaap us chhanni se nikal jata jis mein wo tha.
       */
      categorySlug: z.string().trim().min(1).nullable(),
    })
    .strict(),
])

/** PATCH /api/v1/admin/products/:id — maal ka darwaza: DRAFT se LIVE. */
export async function PATCH(request: Request, ctx: { params: Promise<{ productId: string }> }) {
  return apiHandler(async () => {
    const { user } = await requireOpsUser()
    const { productId } = await ctx.params
    const body = await parseBody(request, BodySchema)

    if ('status' in body) await container.admin.setProductStatus(user, productId, body.status)
    else await container.admin.setProductNaming(user, productId, body)

    return { ok: true }
  })
}
