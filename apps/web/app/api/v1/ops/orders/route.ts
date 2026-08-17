import { z } from 'zod'
import { PAGINATION } from '@oyebazar/shared'
import { apiHandler, parseQuery } from '@/lib/api/handler'
import { requireOpsKey } from '@/lib/api/ops-auth'
import { container } from '@/lib/container'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const QuerySchema = z.object({
  status: z
    .enum([
      'PENDING_CONFIRM',
      'CONFIRMED',
      'SENT_TO_SUPPLIER',
      'DISPATCHED',
      'DELIVERED',
      'RTO',
      'CANCELLED',
    ])
    .optional(),
  supplierId: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(PAGINATION.maxLimit).default(PAGINATION.defaultLimit),
})

/**
 * GET /api/v1/ops/orders — ops console ki list (Retool isay call karta hai).
 *
 * 🔴 Ye INTERNAL view hai: is mein supplierId aur bajiFee dono hain. Isi liye ye
 * `/ops/` ke neeche hai aur ops key maangta hai — reseller endpoints se bilkul alag.
 */
export async function GET(request: Request) {
  return apiHandler(async () => {
    requireOpsKey(request)
    const query = parseQuery(request, QuerySchema)

    const page = await container.repositories.orders.listForOps({
      status: query.status,
      supplierId: query.supplierId,
      limit: query.limit,
      cursor: query.cursor,
    })

    return {
      items: page.items.map((order) => ({
        id: order.id,
        orderNo: order.orderNo,
        status: order.status,
        supplierId: order.supplierId,
        resellerId: order.resellerId,
        total: order.total,
        bajiFee: order.bajiFee,
        confirmedAt: order.confirmedAt?.toISOString() ?? null,
        confirmedBy: order.confirmedBy,
        items: order.items.length,
      })),
      nextCursor: page.nextCursor,
    }
  })
}
