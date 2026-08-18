import { apiHandler } from '@/lib/api/handler'
import { requireOpsUser } from '@/lib/api/admin-session'
import { container } from '@/lib/container'

export const runtime = 'nodejs'

/**
 * POST /api/v1/admin/invoices — pichhle mahine ke invoice bana deta hai.
 *
 * 🔴 Sirf FOUNDER (AdminService rokta hai). Wajah: banate hi ledger ki rows PENDING se
 * INVOICED ho jati hain aur wo wapas nahi hoti — ghalat waqt par chalane ka matlab hai
 * aadhe mahine ki fee bill ho gayi.
 *
 * Dobara chalane par nuqsan nahi: PENDING rows khatam ho chuki hoti hain, to doosri
 * bar kuch nahi hota (0 invoice).
 */
export async function POST() {
  return apiHandler(async () => {
    const { user } = await requireOpsUser()
    const invoices = await container.admin.generateInvoices(user)

    return {
      count: invoices.length,
      total: invoices.reduce((sum, invoice) => sum + invoice.amount, 0),
    }
  })
}
