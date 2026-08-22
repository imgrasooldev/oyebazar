import { DEFAULT_TEMPLATE_SPEC, TemplateSpecSchema, customTemplateKey } from '@oyebazar/shared'
import { z } from 'zod'
import { apiHandler, parseBody } from '@/lib/api/handler'
import { assertOwnAssets } from '@/lib/api/template-assets'
import { requireReseller } from '@/lib/api/session'
import { container } from '@/lib/container'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CreateTemplateSchema = z.object({
  name: z.string().trim().min(1).max(40),
  /** Na den to `simple` jaisi shakl se shuru — khali canvas par log pehle qadam par ruk jate hain. */
  spec: TemplateSpecSchema.optional(),
})

/** GET — is reseller ke apne saare template. */
export async function GET() {
  return apiHandler(async () => {
    const { reseller } = await requireReseller()
    const templates = await container.repositories.resellerTemplates.listForReseller(reseller.id)

    return {
      templates: templates.map((template) => ({
        id: template.id,
        key: customTemplateKey(template.id, template.revision),
        name: template.name,
        spec: template.spec,
        updatedAt: template.updatedAt.toISOString(),
      })),
      /** Naya banate waqt ka nuqta-e-aaghaz — UI ise khali form ke bajaye dikhata hai. */
      defaultSpec: DEFAULT_TEMPLATE_SPEC,
    }
  })
}

/** POST — naya template. */
export async function POST(request: Request) {
  return apiHandler(async () => {
    const { reseller } = await requireReseller()
    const body = await parseBody(request, CreateTemplateSchema)
    const spec = body.spec ?? DEFAULT_TEMPLATE_SPEC
    assertOwnAssets(spec, container.mediaBaseUrl)

    const template = await container.repositories.resellerTemplates.create({
      resellerId: reseller.id,
      name: body.name,
      spec,
    })

    return {
      id: template.id,
      key: customTemplateKey(template.id, template.revision),
      name: template.name,
      spec: template.spec,
    }
  })
}
