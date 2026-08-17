import { apiHandler } from '@/lib/api/handler'
import { requireOpsKey } from '@/lib/api/ops-auth'
import { container } from '@/lib/container'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/v1/ops/fee-ledger — hamari kamai ki haalat.
 *
 * 🔴 `collectionPct` guardrail #3 hai: target ≥85%. Is se neeche jaye to matlab hai ke
 * order routing badalni hai (fee wahan se nikal rahi hai jahan hum bill nahi kar pa rahe).
 */
export async function GET(request: Request) {
  return apiHandler(async () => {
    requireOpsKey(request)

    const health = await container.feeInvoices.collectionHealth()
    const { period, from, to } = container.feeInvoices.previousMonthPeriod()
    const pending = await container.repositories.feeLedger.summarisePending({ from, to })

    return {
      thisMonth: {
        total: health.total,
        collected: health.collected,
        writtenOff: health.writtenOff,
        collectionPct: health.collectionPct,
        healthy: health.healthy,
      },
      pendingInvoicing: {
        period,
        suppliers: pending.map((row) => ({
          supplierId: row.supplierId,
          businessName: row.businessName,
          orders: row.orders,
          amount: row.amount,
        })),
        total: pending.reduce((sum, row) => sum + row.amount, 0),
      },
    }
  })
}
