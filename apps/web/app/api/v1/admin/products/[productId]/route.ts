import { z } from 'zod'
import { apiHandler, parseBody } from '@/lib/api/handler'
import { requireOpsUser } from '@/lib/api/admin-session'
import { container } from '@/lib/container'

export const runtime = 'nodejs'

const BodySchema = z.object({ status: z.enum(['DRAFT', 'LIVE', 'ARCHIVED']) }).strict()

/** PATCH /api/v1/admin/products/:id — maal ka darwaza: DRAFT se LIVE. */
export async function PATCH(request: Request, ctx: { params: Promise<{ productId: string }> }) {
  return apiHandler(async () => {
    const { user } = await requireOpsUser()
    const { productId } = await ctx.params
    const { status } = await parseBody(request, BodySchema)

    await container.admin.setProductStatus(user, productId, status)
    return { ok: true }
  })
}
