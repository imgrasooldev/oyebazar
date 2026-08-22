import { SavePackDefaultsSchema, packOptionsFrom } from '@oyebazar/shared'
import { apiHandler, parseBody } from '@/lib/api/handler'
import { requireReseller } from '@/lib/api/session'
import { container } from '@/lib/container'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * PUT /api/v1/status-pack/defaults — Studio ka "ہمیشہ کے لیے" button.
 *
 * Jo faislay reseller ne abhi kiye hain (zaban, naam/number/qeemat), wo us ke profile
 * par mehfooz ho jate hain aur aage har naya pack wahin se shuru hota hai — raat ki
 * pre-generation aur subah ka broadcast bhi.
 *
 * 🔴 Ye `name`/`whatsappPhone` ko HAATH NAHI LAGATA. Wo login aur paighaam ka number
 * hai; tasveer par chhapne wala naam alag khaana hai (Reseller.packName/packPhone).
 * Dono ko mila dena us reseller ka login tor deta jo apna zaati number chhupa kar
 * karobar ka number chhapwana chahti hai — yani bilkul wohi jis ke liye ye feature hai.
 */
export async function PUT(request: Request) {
  return apiHandler(async () => {
    const { reseller } = await requireReseller()
    const body = await parseBody(request, SavePackDefaultsSchema)

    const { templateKey, ...options } = body

    const saved = await container.repositories.resellers.savePackDefaults(
      reseller.id,
      packOptionsFrom(options),
      // `undefined` = template ko haath na lagayen; `null` = system ka default
      templateKey,
    )

    return { ok: true, defaults: saved.packDefaults, templateKey: saved.packTemplateKey }
  })
}
