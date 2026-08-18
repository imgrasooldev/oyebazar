import { z } from 'zod'
import { apiHandler, parseBody } from '@/lib/api/handler'
import { requireOpsUser } from '@/lib/api/admin-session'
import { container } from '@/lib/container'

export const runtime = 'nodejs'

const BodySchema = z.object({ collected: z.literal(true) }).strict()

/** PATCH /api/v1/admin/invoices/:invoiceId — paisa aa gaya. */
export async function PATCH(request: Request, ctx: { params: Promise<{ invoiceId: string }> }) {
  return apiHandler(async () => {
    const { user } = await requireOpsUser()
    const { invoiceId } = await ctx.params
    await parseBody(request, BodySchema)

    const result = await container.admin.markInvoiceCollected(user, invoiceId)
    return { ok: true, rows: result.rows, amount: result.amount }
  })
}
