import { z } from 'zod'
import { apiHandler, parseBody } from '@/lib/api/handler'
import { requireSupplier } from '@/lib/api/supplier-session'
import { container } from '@/lib/container'

export const runtime = 'nodejs'

/**
 * Wajah sirf un do qadmon par lazmi hai jo order ko MAAR dete hain (RTO, CANCELLED).
 * Aage barhne wale qadmon par wajah poochhna sirf ek rukawat hoti.
 */
const BodySchema = z
  .object({
    toStatus: z.enum(['PACKED', 'DISPATCHED', 'DELIVERED', 'RTO', 'CANCELLED']),
    reason: z.string().trim().min(3).max(200).optional(),
    /*
     * DISPATCHED ke saath — courier aur CN.
     *
     * Yahan sirf shakl dekhi jati hai; asal shart (kaun sa courier, aur CN kab lazmi
     * hai) service ke andar `readShipment` mein hai — taake magic link wale raste par
     * bhi wohi lage.
     */
    courier: z.string().trim().min(1).max(30).optional(),
    trackingNo: z.string().trim().max(60).optional(),
  })
  .strict()
  .refine((body) => !['RTO', 'CANCELLED'].includes(body.toStatus) || Boolean(body.reason), {
    message: 'Wajah likhen — reseller ke customer ko yehi batana parta hai',
    path: ['reason'],
  })
  .refine((body) => body.toStatus !== 'DISPATCHED' || Boolean(body.courier), {
    message: 'Courier chunen',
    path: ['courier'],
  })

/**
 * PATCH /api/v1/supplier/orders/:orderNo/status
 *
 * Wholesaler khud batata hai ke kaam kahan tak pohancha: maal bandh diya (PACKED),
 * courier ko de diya (DISPATCHED), maal pohanch gaya aur cash mil gaya (DELIVERED),
 * maal wapas aa gaya (RTO), ya maal hi na nikla (CANCELLED).
 *
 * 🔴 DELIVERED pehle yahan nahi tha — "ye courier/ops ki khabar hai" wali soch par.
 * Amal mein us ka natija ulta nikla: COD ka cash SAB SE PEHLE wholesaler ke haath aata
 * hai, aur us ke button dabane tak intezar karwane ka matlab tha ke reseller ka hisab
 * (aur us ka paisa) kisi teesre bande ke aane tak khulta hi nahi tha.
 *
 * Faida uthane wali soorat bhi is taraf nahi banti: DELIVERED likhne se dukan ke ZIMME
 * paisa charhta hai (reseller ka hissa + hamari fee), ghatta nahi. Khatra sirf ulta hai
 * — koi likhe hi na. Wo khamoshi chhupti nahi: order "raste mein" par khara rehta hai
 * aur dono taraf nazar aata hai.
 */
export async function PATCH(request: Request, ctx: { params: Promise<{ orderNo: string }> }) {
  return apiHandler(async () => {
    const { supplier } = await requireSupplier()
    const { orderNo } = await ctx.params
    const { toStatus, reason, courier, trackingNo } = await parseBody(request, BodySchema)

    const order = await run()

    async function run() {
      switch (toStatus) {
        case 'PACKED':
          return container.orders.markPackedBySupplier(supplier.id, orderNo)
        case 'DISPATCHED':
          return container.orders.markDispatchedBySupplier(supplier.id, orderNo, {
            courier: courier ?? '',
            ...(trackingNo ? { trackingNo } : {}),
          })
        case 'DELIVERED':
          return container.orders.markDeliveredBySupplier(supplier.id, orderNo)
        case 'RTO':
          return container.orders.markRtoBySupplier(supplier.id, orderNo, reason ?? '')
        case 'CANCELLED':
          return container.orders.cancelBySupplier(supplier.id, orderNo, reason ?? '')
      }
    }

    return { orderNo: order.orderNo, status: order.status }
  })
}
