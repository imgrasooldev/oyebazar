import { z } from 'zod'
import { apiHandler, parseBody } from '@/lib/api/handler'
import { requireSupplier } from '@/lib/api/supplier-session'
import { container } from '@/lib/container'

export const runtime = 'nodejs'

const NewSchema = z.object({ name: z.string().trim().min(2).max(40) }).strict()

/** GET — dukan ke apne godown, har ek mein kitne piece. */
export async function GET() {
  return apiHandler(async () => {
    const { supplier } = await requireSupplier()
    return { warehouses: await container.inventory.listWarehouses(supplier.id) }
  })
}

/**
 * POST — naya godown.
 *
 * Isi naam ka godown pehle se ho to service mana kar deti hai. Chup chaap doosra bana
 * dena sab se bura anjaam deta: "Store" naam ke do godown, ginti un mein bat gayi, aur
 * dukan wale ko khud pata nahi ke maal kis mein daala tha.
 */
export async function POST(request: Request) {
  return apiHandler(async () => {
    const { supplier } = await requireSupplier()
    const body = await parseBody(request, NewSchema)

    const warehouse = await container.inventory.addWarehouse({
      supplierId: supplier.id,
      name: body.name,
    })
    return { ok: true, warehouse }
  })
}
