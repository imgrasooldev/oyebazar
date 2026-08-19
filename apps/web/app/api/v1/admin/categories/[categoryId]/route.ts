import { z } from 'zod'
import { apiHandler, parseBody } from '@/lib/api/handler'
import { requireOpsUser } from '@/lib/api/admin-session'
import { container } from '@/lib/container'

export const runtime = 'nodejs'

const PatchSchema = z.union([
  z
    .object({
      action: z.literal('rename'),
      nameUr: z.string().trim().min(2).max(60),
      nameEn: z.string().trim().min(2).max(60),
      imageUrl: z.string().url().nullable().optional(),
    })
    .strict(),
  z
    .object({
      action: z.literal('move'),
      // null = jarh par le aao. Ye khaana lazmi hai — "haath na lagao" wali soorat
      // yahan hoti hi nahi, move ka matlab hi jagah badalna hai.
      newParentId: z.string().min(1).nullable(),
      position: z.number().int().min(0).max(500).optional(),
    })
    .strict(),
])

export async function PATCH(request: Request, ctx: { params: Promise<{ categoryId: string }> }) {
  return apiHandler(async () => {
    const { user } = await requireOpsUser()
    container.admin.assertPermission(user, 'manageCategories')

    const { categoryId } = await ctx.params
    const body = await parseBody(request, PatchSchema)

    if (body.action === 'rename') {
      await container.categoryAdmin.rename(user.id, categoryId, {
        nameUr: body.nameUr,
        nameEn: body.nameEn,
        ...(body.imageUrl === undefined ? {} : { imageUrl: body.imageUrl }),
      })
      return { ok: true }
    }

    await container.categoryAdmin.move(user.id, {
      id: categoryId,
      newParentId: body.newParentId,
      ...(body.position === undefined ? {} : { position: body.position }),
    })
    return { ok: true }
  })
}

/** DELETE — sirf khali category (rok service mein hai, ginti ke saath). */
export async function DELETE(_request: Request, ctx: { params: Promise<{ categoryId: string }> }) {
  return apiHandler(async () => {
    const { user } = await requireOpsUser()
    container.admin.assertPermission(user, 'manageCategories')

    const { categoryId } = await ctx.params
    await container.categoryAdmin.remove(user.id, categoryId)
    return { ok: true }
  })
}
