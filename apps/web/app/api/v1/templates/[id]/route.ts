import { NotFoundError, TemplateSpecSchema, customTemplateKey } from '@oyebazar/shared'
import { z } from 'zod'
import { apiHandler, parseBody } from '@/lib/api/handler'
import { requireReseller } from '@/lib/api/session'
import { container } from '@/lib/container'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const UpdateTemplateSchema = z.object({
  name: z.string().trim().min(1).max(40),
  spec: TemplateSpecSchema,
})

/**
 * PUT — template mehfooz.
 *
 * 🔴 Har save par `revision` barhta hai (repository mein), aur wo key ka hissa hai. Is
 * ke baghair reseller rang badalti rehti aur usay wohi purani tasveer milti rehti —
 * kyunke cache ki nazar mein key wohi purani hoti.
 */
export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  return apiHandler(async () => {
    const { reseller } = await requireReseller()
    const { id } = await context.params
    const body = await parseBody(request, UpdateTemplateSchema)

    const template = await container.repositories.resellerTemplates.update(reseller.id, id, {
      name: body.name,
      spec: body.spec,
    })
    if (!template) throw new NotFoundError('Template', id)

    return {
      id: template.id,
      key: customTemplateKey(template.id, template.revision),
      name: template.name,
      spec: template.spec,
    }
  })
}

/**
 * DELETE — template hata dein.
 *
 * Pehle se bane hue packs apni jagah rehte hain: unki tasveerein storage par mehfooz
 * hain aur unhen dobara render karne ki zaroorat nahi parti. Sirf naya pack is template
 * par nahi ban sakta.
 */
export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  return apiHandler(async () => {
    const { reseller } = await requireReseller()
    const { id } = await context.params

    const removed = await container.repositories.resellerTemplates.remove(reseller.id, id)
    if (!removed) throw new NotFoundError('Template', id)

    return { ok: true }
  })
}
