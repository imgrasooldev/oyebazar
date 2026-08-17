import { z } from 'zod'
import { apiHandler, parseBody } from '@/lib/api/handler'
import { requireOpsKey } from '@/lib/api/ops-auth'
import { container } from '@/lib/container'

export const runtime = 'nodejs'

const CollectSchema = z.object({ invoiceId: z.string().trim().min(3) })

/**
 * POST /api/v1/ops/fee-ledger/invoice — pichhle mahine ke invoice banao.
 *
 * Normally ye job mahine ki 1 tareekh ko khud chalti hai (worker). Ye endpoint us waqt
 * ke liye hai jab job fail ho gayi ho ya kisi ne mahine ke beech mein dobara chalana ho.
 *
 * 🔴 Dobara chalana mehfooz hai: sirf PENDING rows invoice hoti hain, is liye kisi
 * supplier ko dohra bill nahi ja sakta.
 */
export async function POST(request: Request) {
  return apiHandler(async () => {
    requireOpsKey(request)
    const invoices = await container.feeInvoices.generateMonthlyInvoices()

    return {
      invoices,
      total: invoices.reduce((sum, invoice) => sum + invoice.amount, 0),
    }
  })
}

/** PATCH — paisa aa gaya, invoice COLLECTED. */
export async function PATCH(request: Request) {
  return apiHandler(async () => {
    requireOpsKey(request)
    const { invoiceId } = await parseBody(request, CollectSchema)
    return container.feeInvoices.markCollected(invoiceId)
  })
}
