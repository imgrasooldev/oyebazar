/**
 * OrderRepository — Prisma adapter.
 *
 * 🔴 Do surfaces, do shapes:
 *   · `findForReseller` / `listForReseller` → RESELLER view (supplier ka koi zikr nahi)
 *   · `findById` → INTERNAL view (supplier cost, fee) — sirf service/ops ke liye
 *
 * Status change aur audit event HAMESHA ek transaction mein — warna kisi din event
 * gum ho jayega aur order ki tareekh adhoori reh jayegi.
 */
import type { Prisma, PrismaClient } from '@prisma/client'
import type {
  InternalOrderView,
  OrderRepository,
  OrderStatusChange,
  PendingConfirmationOrder,
  StuckInTransitOrder,
  PersistOrderInput,
  SupplierOrderView,
  ResellerOrderView,
  CursorQuery,
  OrderStatus,
} from '@oyebazar/core'
import { pkr, toPage, type Page } from '@oyebazar/shared'

const INTERNAL_SELECT = {
  id: true,
  orderNo: true,
  resellerId: true,
  supplierId: true,
  status: true,
  total: true,
  bajiFee: true,
  feeRateBps: true,
  confirmedAt: true,
  confirmedBy: true,
  items: {
    select: {
      productId: true,
      variantId: true,
      qty: true,
      supplierPriceSnapshot: true,
      bajiPriceSnapshot: true,
      retailPriceSnapshot: true,
    },
  },
} satisfies Prisma.OrderSelect

/** 🔴 supplierId, supplierPriceSnapshot, bajiFee — in mein se kuch bhi yahan nahi. */
/**
 * 🔴 Wholesaler ko dikhne wale khaane. `retailPriceSnapshot` aur `bajiPriceSnapshot`
 * yahan JAAN BOOJH KAR nahi hain — us ko sirf apni raqam dikhni chahiye. Agar us ko
 * reseller ka retail nazar aa gaya to us ke paas hamein bypass karne ki wajah ban jati hai.
 */
const SUPPLIER_SELECT = {
  id: true,
  orderNo: true,
  // RTO ka record isi se banta hai — dukan ko qubool karne se pehle
  resellerId: true,
  status: true,
  customerName: true,
  customerPhone: true,
  customerAddress: true,
  area: true,
  locationLat: true,
  locationLng: true,
  paymentMethod: true,
  total: true,
  createdAt: true,
  acceptedAt: true,
  dispatchedAt: true,
  items: {
    select: {
      qty: true,
      supplierPriceSnapshot: true,
      productId: true,
    },
  },
} as const

const RESELLER_SELECT = {
  id: true,
  orderNo: true,
  status: true,
  customerName: true,
  customerPhone: true,
  customerAddress: true,
  area: true,
  subtotal: true,
  deliveryFee: true,
  total: true,
  confirmedAt: true,
  confirmedBy: true,
  createdAt: true,
  items: {
    select: {
      productId: true,
      qty: true,
      bajiPriceSnapshot: true,
      retailPriceSnapshot: true,
      // supplierPriceSnapshot: JAAN BOOJH KAR NAHI
    },
  },
} satisfies Prisma.OrderSelect

type InternalRow = Prisma.OrderGetPayload<{ select: typeof INTERNAL_SELECT }>
type ResellerRow = Prisma.OrderGetPayload<{ select: typeof RESELLER_SELECT }>

function toInternal(row: InternalRow): InternalOrderView {
  return {
    id: row.id,
    orderNo: row.orderNo,
    resellerId: row.resellerId,
    supplierId: row.supplierId,
    status: row.status,
    total: pkr(row.total),
    bajiFee: pkr(row.bajiFee),
    feeRateBps: row.feeRateBps,
    confirmedAt: row.confirmedAt,
    confirmedBy: row.confirmedBy,
    items: row.items.map((item) => ({
      productId: item.productId,
      variantId: item.variantId,
      qty: item.qty,
      supplierPriceSnapshot: pkr(item.supplierPriceSnapshot),
      bajiPriceSnapshot: pkr(item.bajiPriceSnapshot),
      retailPriceSnapshot: pkr(item.retailPriceSnapshot),
    })),
  }
}

export class PrismaOrderRepository implements OrderRepository {
  constructor(private readonly db: PrismaClient) {}

  async create(input: PersistOrderInput): Promise<InternalOrderView> {
    const row = await this.db.order.create({
      data: {
        orderNo: input.orderNo,
        resellerId: input.resellerId,
        supplierId: input.supplierId,
        customerName: input.customer.name,
        customerPhone: input.customer.phone,
        customerAddress: input.customer.address,
        area: input.customer.area,
        locationLat: input.customer.locationLat ?? null,
        locationLng: input.customer.locationLng ?? null,
        subtotal: input.subtotal,
        deliveryFee: input.deliveryFee,
        total: input.total,
        bajiFee: input.bajiFee,
        feeRateBps: input.feeRateBps,
        paymentMethod: input.paymentMethod,
        status: 'PENDING_CONFIRM',
        idempotencyKey: input.idempotencyKey ?? null,
        items: {
          create: input.lines.map((line) => ({
            productId: line.productId,
            variantId: line.variantId,
            qty: line.qty,
            supplierPriceSnapshot: line.supplierPriceSnapshot,
            bajiPriceSnapshot: line.bajiPriceSnapshot,
            retailPriceSnapshot: line.retailPriceSnapshot,
          })),
        },
        events: {
          create: {
            toStatus: 'PENDING_CONFIRM',
            actorType: 'reseller',
            actorId: input.resellerId,
          },
        },
      },
      select: INTERNAL_SELECT,
    })
    return toInternal(row)
  }

  /**
   * Wholesaler ka magic link.
   *
   * 🔴 Select mein reseller ka retail price NAHI hai — wholesaler ko sirf apna price
   * dikhta hai. Us ko ye pata chal gaya ke reseller kis bhaav bech rahi hai, to wo
   * kal usay bypass karne ki soch sakta hai.
   */
  async findBySupplierToken(token: string): Promise<SupplierOrderView | null> {
    const row = await this.db.order.findUnique({
      where: { supplierToken: token },
      select: SUPPLIER_SELECT,
    })
    if (!row) return null
    return this.toSupplierView(row, await this.loadTitles([row]))
  }

  /**
   * 🔴 supplierId `where` ke andar hai, baad ke filter mein nahi — doosre wholesaler ka
   * order query se nikalta hi nahi.
   */
  async listForSupplier(
    supplierId: string,
    query: CursorQuery & { status?: OrderStatus | undefined },
  ): Promise<Page<SupplierOrderView>> {
    const rows = await this.db.order.findMany({
      where: { supplierId, ...(query.status ? { status: query.status } : {}) },
      select: SUPPLIER_SELECT,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    })

    // Titles ek hi query mein — warna har order par ek aur query (N+1)
    const titles = await this.loadTitles(rows)
    const views = rows.map((row) => this.toSupplierView(row, titles))
    return toPage(views, query.limit, (o) => o.id)
  }

  async findForSupplier(supplierId: string, orderNo: string): Promise<SupplierOrderView | null> {
    const row = await this.db.order.findFirst({
      where: { orderNo, supplierId },
      select: SUPPLIER_SELECT,
    })
    if (!row) return null
    return this.toSupplierView(row, await this.loadTitles([row]))
  }

  private async loadTitles(
    rows: readonly Prisma.OrderGetPayload<{ select: typeof SUPPLIER_SELECT }>[],
  ): Promise<Map<string, { titleUr: string; titleEn: string }>> {
    const ids = [...new Set(rows.flatMap((row) => row.items.map((item) => item.productId)))]
    if (ids.length === 0) return new Map()

    const products = await this.db.product.findMany({
      where: { id: { in: ids } },
      select: { id: true, titleUr: true, titleEn: true },
    })
    return new Map(products.map((p) => [p.id, { titleUr: p.titleUr, titleEn: p.titleEn }]))
  }

  private toSupplierView(
    row: Prisma.OrderGetPayload<{ select: typeof SUPPLIER_SELECT }>,
    titles: Map<string, { titleUr: string; titleEn: string }>,
  ): SupplierOrderView {
    return {
      id: row.id,
      orderNo: row.orderNo,
      resellerId: row.resellerId,
      status: row.status,
      customerName: row.customerName,
      customerPhone: row.customerPhone,
      customerAddress: row.customerAddress,
      area: row.area,
      locationLat: row.locationLat,
      locationLng: row.locationLng,
      paymentMethod: row.paymentMethod,
      total: pkr(row.total),
      createdAt: row.createdAt,
      acceptedAt: row.acceptedAt,
      dispatchedAt: row.dispatchedAt,
      items: row.items.map((item) => ({
        titleUr: titles.get(item.productId)?.titleUr ?? '',
        titleEn: titles.get(item.productId)?.titleEn ?? '',
        qty: item.qty,
        supplierPrice: pkr(item.supplierPriceSnapshot),
      })),
    }
  }

  async setSupplierToken(orderId: string, token: string): Promise<void> {
    await this.db.order.update({ where: { id: orderId }, data: { supplierToken: token } })
  }

  async findById(orderId: string): Promise<InternalOrderView | null> {
    const row = await this.db.order.findUnique({ where: { id: orderId }, select: INTERNAL_SELECT })
    return row ? toInternal(row) : null
  }

  async findByIdempotencyKey(resellerId: string, key: string): Promise<InternalOrderView | null> {
    const row = await this.db.order.findFirst({
      where: { resellerId, idempotencyKey: key },
      select: INTERNAL_SELECT,
    })
    return row ? toInternal(row) : null
  }

  async findForReseller(resellerId: string, orderNo: string): Promise<ResellerOrderView | null> {
    const row = await this.db.order.findFirst({
      where: { orderNo, resellerId },
      select: RESELLER_SELECT,
    })
    if (!row) return null
    return this.toResellerView(row)
  }

  async listForReseller(
    resellerId: string,
    query: CursorQuery & { status?: OrderStatus | undefined },
  ): Promise<Page<ResellerOrderView>> {
    const rows = await this.db.order.findMany({
      where: { resellerId, ...(query.status ? { status: query.status } : {}) },
      select: RESELLER_SELECT,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    })

    const views = await Promise.all(rows.map((row) => this.toResellerView(row)))
    return toPage(views, query.limit, (o) => o.id)
  }

  /** 🔴 Status + audit event ek saath. Ek bhi kam hua to order ki tareekh jhooti ho jati hai. */
  async applyStatusChange(change: OrderStatusChange): Promise<InternalOrderView> {
    const [, updated] = await this.db.$transaction([
      this.db.orderEvent.create({
        data: {
          orderId: change.orderId,
          fromStatus: change.from,
          toStatus: change.to,
          actorType: change.actorType,
          actorId: change.actorId ?? null,
          note: change.note ?? null,
          createdAt: change.at,
        },
      }),
      this.db.order.update({
        where: { id: change.orderId },
        data: {
          status: change.to,
          ...(change.to === 'CONFIRMED'
            ? { confirmedAt: change.at, confirmedBy: change.confirmedBy ?? 'RESELLER' }
            : {}),
          ...(change.to === 'SENT_TO_SUPPLIER' ? { sentToSupplierAt: change.at } : {}),
          ...(change.to === 'ACCEPTED' ? { acceptedAt: change.at } : {}),
          ...(change.to === 'REJECTED'
            ? { rejectedAt: change.at, rejectionReason: change.rejectionReason ?? change.note ?? null }
            : {}),
          ...(change.to === 'DISPATCHED' ? { dispatchedAt: change.at } : {}),
          ...(change.to === 'DELIVERED' ? { deliveredAt: change.at } : {}),
          ...(change.to === 'RTO' ? { rtoReason: change.note ?? null } : {}),
        },
        select: INTERNAL_SELECT,
      }),
    ])

    return toInternal(updated)
  }

  async findAwaitingConfirmation(options: {
    olderThan: Date
    onlyWithoutReminder: boolean
    limit: number
  }): Promise<PendingConfirmationOrder[]> {
    const rows = await this.db.order.findMany({
      where: {
        status: 'PENDING_CONFIRM',
        createdAt: { lt: options.olderThan },
        ...(options.onlyWithoutReminder ? { reminderSentAt: null } : {}),
      },
      select: {
        id: true,
        orderNo: true,
        resellerId: true,
        customerName: true,
        total: true,
        createdAt: true,
        reminderSentAt: true,
        reseller: { select: { name: true, whatsappPhone: true } },
      },
      orderBy: { createdAt: 'asc' },
      take: options.limit,
    })

    return rows.map((row) => ({
      id: row.id,
      orderNo: row.orderNo,
      resellerId: row.resellerId,
      resellerName: row.reseller.name,
      resellerPhone: row.reseller.whatsappPhone,
      customerName: row.customerName,
      total: pkr(row.total),
      createdAt: row.createdAt,
      reminderSentAt: row.reminderSentAt,
    }))
  }

  async markReminderSent(orderId: string, at: Date): Promise<void> {
    await this.db.order.update({ where: { id: orderId }, data: { reminderSentAt: at } })
  }

  async findStuckInTransit(options: {
    olderThan: Date
    limit: number
  }): Promise<StuckInTransitOrder[]> {
    const rows = await this.db.order.findMany({
      where: {
        status: 'DISPATCHED',
        // Ginti bhejne ke din se, order banne ke din se nahi
        dispatchedAt: { lt: options.olderThan },
        // Ek hi dafa poochha jata hai — roz ka nag paighaam parhna band karwa deta hai
        transitReminderAt: null,
      },
      select: {
        id: true,
        orderNo: true,
        supplierId: true,
        customerName: true,
        dispatchedAt: true,
        supplier: { select: { phone: true } },
      },
      orderBy: { dispatchedAt: 'asc' },
      take: options.limit,
    })

    return rows.flatMap((row) =>
      // `dispatchedAt` schema mein optional hai magar DISPATCHED par hamesha likha jata
      // hai; TypeScript ko ye pata nahi, aur bina tareekh ke "kitne din" ka jawab hi
      // nahi banta — is liye aisi qatar chhorh dete hain, farz nahi karte
      row.dispatchedAt
        ? [
            {
              id: row.id,
              orderNo: row.orderNo,
              supplierId: row.supplierId,
              supplierPhone: row.supplier.phone,
              customerName: row.customerName,
              dispatchedAt: row.dispatchedAt,
            },
          ]
        : [],
    )
  }

  async markTransitReminderSent(orderId: string, at: Date): Promise<void> {
    await this.db.order.update({ where: { id: orderId }, data: { transitReminderAt: at } })
  }

  async listForOps(filters: {
    status?: OrderStatus | undefined
    supplierId?: string | undefined
    limit: number
    cursor?: string | undefined
  }): Promise<Page<InternalOrderView>> {
    const rows = await this.db.order.findMany({
      where: {
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.supplierId ? { supplierId: filters.supplierId } : {}),
      },
      select: INTERNAL_SELECT,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: filters.limit + 1,
      ...(filters.cursor ? { cursor: { id: filters.cursor }, skip: 1 } : {}),
    })
    return toPage(rows.map(toInternal), filters.limit, (o) => o.id)
  }

  async findPendingConfirmationBefore(cutoff: Date, limit: number): Promise<InternalOrderView[]> {
    const rows = await this.db.order.findMany({
      where: { status: 'PENDING_CONFIRM', createdAt: { lt: cutoff } },
      select: INTERNAL_SELECT,
      orderBy: { createdAt: 'asc' },
      take: limit,
    })
    return rows.map(toInternal)
  }

  /** Reseller view mein product ka title chahiye — items ke saath ek hi query mein. */
  private async toResellerView(row: ResellerRow): Promise<ResellerOrderView> {
    const productIds = row.items.map((i) => i.productId)
    const products = await this.db.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, titleUr: true },
    })
    const titles = new Map(products.map((p) => [p.id, p.titleUr]))

    const myEarnings = row.items.reduce(
      (sum, item) => sum + (item.retailPriceSnapshot - item.bajiPriceSnapshot) * item.qty,
      0,
    )

    return {
      id: row.id,
      orderNo: row.orderNo,
      status: row.status,
      customerName: row.customerName,
      customerPhone: row.customerPhone,
      customerAddress: row.customerAddress,
      area: row.area,
      subtotal: pkr(row.subtotal),
      deliveryFee: pkr(row.deliveryFee),
      total: pkr(row.total),
      myEarnings: pkr(Math.max(myEarnings, 0)),
      confirmedAt: row.confirmedAt,
      confirmedBy: row.confirmedBy,
      createdAt: row.createdAt,
      items: row.items.map((item) => ({
        productId: item.productId,
        titleUr: titles.get(item.productId) ?? '',
        qty: item.qty,
        bajiPrice: pkr(item.bajiPriceSnapshot),
        retailPrice: pkr(item.retailPriceSnapshot),
      })),
    }
  }
}
