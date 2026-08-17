import { CreateOrderSchema, OrderListQuerySchema, ValidationError, pkr } from '@oyebazar/shared'
import { apiHandler, parseBody, parseQuery } from '@/lib/api/handler'
import { toResellerOrderDTO } from '@/lib/api/mappers'
import { requireReseller } from '@/lib/api/session'
import { container } from '@/lib/container'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/v1/orders — reseller order lagati hai.
 *
 * 🔴 Idempotency-Key header LAZMI hai. Sasta Android + 3G par "submit" do baar dabna
 * aam baat hai; is ke baghair customer ko do parcel jate hain aur do baar COD.
 */
export async function POST(request: Request) {
  return apiHandler(async () => {
    const { reseller } = await requireReseller()

    const idempotencyKey = request.headers.get('idempotency-key')
    if (!idempotencyKey) {
      throw new ValidationError('Idempotency-Key header zaroori hai')
    }

    const body = await parseBody(request, CreateOrderSchema)

    const order = await container.orders.create({
      resellerId: reseller.id,
      customer: {
        name: body.customer.name,
        phone: body.customer.phone,
        address: body.customer.address,
        area: body.customer.area,
        ...(body.customer.locationLat !== undefined
          ? { locationLat: body.customer.locationLat }
          : {}),
        ...(body.customer.locationLng !== undefined
          ? { locationLng: body.customer.locationLng }
          : {}),
      },
      lines: body.lines.map((line) => ({
        productId: line.productId,
        ...(line.variantId ? { variantId: line.variantId } : {}),
        qty: line.qty,
        retailPrice: pkr(line.retailPrice),
      })),
      deliveryFee: pkr(body.deliveryFee),
      paymentMethod: body.paymentMethod,
      idempotencyKey,
    })

    // 🔴 Response reseller shape mein — internal view (fee, supplier) kabhi wapas nahi jata
    const view = await container.orders.getForReseller(order.orderNo, reseller.id)
    return toResellerOrderDTO(view)
  })
}

/** GET /api/v1/orders — meri orders. */
export async function GET(request: Request) {
  return apiHandler(async () => {
    const { reseller } = await requireReseller()
    const query = parseQuery(request, OrderListQuerySchema)

    const page = await container.orders.listForReseller(reseller.id, {
      limit: query.limit,
      cursor: query.cursor,
      ...(query.status ? { status: query.status } : {}),
    })

    return { items: page.items.map(toResellerOrderDTO), nextCursor: page.nextCursor }
  })
}
