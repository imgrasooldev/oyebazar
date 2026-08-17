import { apiHandler } from '@/lib/api/handler'
import { toResellerOrderDTO } from '@/lib/api/mappers'
import { requireReseller } from '@/lib/api/session'
import { container } from '@/lib/container'

export const runtime = 'nodejs'

/**
 * POST /api/v1/orders/:orderNo/confirm
 *
 * 🔴 Ye poore business ka sab se ahem button hai.
 *
 * Reseller customer se baat kar ke confirm karti hai. Is se pehle order wholesaler ko
 * ja hi nahi sakta (state machine service layer mein rokti hai), aur isi lamhe fee
 * ledger row banti hai — yani hamari kamai yahin record hoti hai.
 *
 * Phase 2 mein customer khud WhatsApp par "HAAN" likhega; tab `confirmedBy` CUSTOMER
 * hoga aur dono ka RTO moqabla ho sakega.
 */
export async function POST(_request: Request, ctx: { params: Promise<{ orderNo: string }> }) {
  return apiHandler(async () => {
    const { reseller } = await requireReseller()
    const { orderNo } = await ctx.params

    await container.orders.confirmByReseller(orderNo, reseller.id)

    const view = await container.orders.getForReseller(orderNo, reseller.id)
    return toResellerOrderDTO(view)
  })
}
