import { z } from 'zod'
import { apiHandler, parseBody } from '@/lib/api/handler'
import { requireOpsUser } from '@/lib/api/admin-session'
import { container } from '@/lib/container'

export const runtime = 'nodejs'

const CreateSchema = z
  .object({
    nameUr: z.string().trim().min(2).max(60),
    nameEn: z.string().trim().min(2).max(60),
    parentId: z.string().min(1).nullable().optional(),
    imageUrl: z.string().url().optional(),
  })
  .strict()

const ReorderSchema = z
  .object({
    parentId: z.string().min(1).nullable(),
    orderedIds: z.array(z.string().min(1)).min(1).max(200),
  })
  .strict()

/** POST /api/v1/admin/categories — nayi category (jarh par ya kisi ke andar). */
export async function POST(request: Request) {
  return apiHandler(async () => {
    const { user } = await requireOpsUser()
    container.admin.assertPermission(user, 'manageCategories')

    const body = await parseBody(request, CreateSchema)
    return container.categoryAdmin.create(user.id, {
      nameUr: body.nameUr,
      nameEn: body.nameEn,
      parentId: body.parentId ?? null,
      ...(body.imageUrl ? { imageUrl: body.imageUrl } : {}),
    })
  })
}

/**
 * PATCH /api/v1/admin/categories — ek hi baap ke bachchon ki nayi tarteeb.
 *
 * Tarteeb poori list bhej kar set hoti hai, "upar/neeche" ke ek ek qadam se nahi:
 * drag & drop ke baad asli tarteeb sirf browser ke paas hoti hai, aur usay wahi bhej
 * dena sab se kam ghalati wala tareeqa hai.
 */
export async function PATCH(request: Request) {
  return apiHandler(async () => {
    const { user } = await requireOpsUser()
    container.admin.assertPermission(user, 'manageCategories')

    const body = await parseBody(request, ReorderSchema)
    await container.categoryAdmin.reorder(user.id, body.parentId, body.orderedIds)
    return { ok: true }
  })
}
