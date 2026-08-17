/**
 * Order DTOs — 🔴 reseller-facing shape mein supplier ka koi field nahi:
 * na supplierId, na supplierPriceSnapshot, na bajiFee.
 *
 * Reseller ko sirf apne numbers dikhte hain: customer ne kya diya, aur us ka munafa kitna hai.
 */
import { z } from 'zod'

const PkrSchema = z.number().int().nonnegative()

export const OrderStatusSchema = z.enum([
  'PENDING_CONFIRM',
  'CONFIRMED',
  'SENT_TO_SUPPLIER',
  'ACCEPTED',
  'REJECTED',
  'DISPATCHED',
  'DELIVERED',
  'RTO',
  'CANCELLED',
])

export const ConfirmedBySchema = z.enum(['RESELLER', 'CUSTOMER', 'OPS'])

/** UI mein status kabhi kachcha enum na dikhe — dono zubanon mein labels. */
export const ORDER_STATUS_UR: Record<z.infer<typeof OrderStatusSchema>, string> = {
  PENDING_CONFIRM: 'تصدیق باقی ہے',
  CONFIRMED: 'تصدیق ہو گئی',
  SENT_TO_SUPPLIER: 'ہول سیلر کے پاس',
  ACCEPTED: 'ہول سیلر نے قبول کیا',
  REJECTED: 'ہول سیلر نے معذرت کی',
  DISPATCHED: 'راستے میں',
  DELIVERED: 'پہنچ گیا',
  RTO: 'واپس آ گیا',
  CANCELLED: 'منسوخ',
}

export const ORDER_STATUS_EN: Record<z.infer<typeof OrderStatusSchema>, string> = {
  PENDING_CONFIRM: 'Awaiting confirmation',
  CONFIRMED: 'Confirmed',
  SENT_TO_SUPPLIER: 'With the wholesaler',
  ACCEPTED: 'Wholesaler accepted',
  REJECTED: 'Wholesaler declined',
  DISPATCHED: 'On the way',
  DELIVERED: 'Delivered',
  RTO: 'Returned',
  CANCELLED: 'Cancelled',
}

export const OrderLineDTO = z
  .object({
    productId: z.string(),
    titleUr: z.string(),
    qty: z.number().int().positive(),
    bajiPrice: PkrSchema,
    retailPrice: PkrSchema,
  })
  .strict()

export const ResellerOrderDTO = z
  .object({
    id: z.string(),
    orderNo: z.string(),
    status: OrderStatusSchema,
    statusUr: z.string(),
    customerName: z.string(),
    customerPhone: z.string(),
    customerAddress: z.string(),
    area: z.string(),
    subtotal: PkrSchema,
    deliveryFee: PkrSchema,
    total: PkrSchema,
    /** reseller ka munafa — (retail − Baji) × qty */
    myEarnings: PkrSchema,
    confirmedAt: z.string().nullable(),
    confirmedBy: ConfirmedBySchema.nullable(),
    createdAt: z.string(),
    items: z.array(OrderLineDTO),
  })
  .strict()

export type OrderStatusValue = z.infer<typeof OrderStatusSchema>
export type ResellerOrder = z.infer<typeof ResellerOrderDTO>
export type OrderLine = z.infer<typeof OrderLineDTO>
