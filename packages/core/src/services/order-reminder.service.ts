/**
 * OrderReminderService — atke hue orders ka anjaam.
 *
 *   6 ghante  → reseller ko WhatsApp: "ye order abhi tak confirm nahi hua"
 *  24 ghante  → order khud cancel
 *   4 din     → dukan se: "ye order raste mein hai — pohancha ya wapas aaya?"
 *
 * Auto-cancel kyun: bina confirm kiya order mahino qatar mein para rehta hai, aur phir
 * kisi din koi usay confirm kar ke bhej deta hai — customer ko yaad bhi nahi hota ke
 * us ne kya manga tha. Wo parcel seedha RTO banta hai, jo ~PKR 300 khata hai.
 *
 * 🔴 PENDING_CONFIRM par fee ledger row abhi bani hi nahi hoti (wo confirmation par banti hai),
 * isliye auto-cancel se paise ka koi hisab kharab nahi hota.
 */
import { formatPkr } from '@oyebazar/shared'
import { ORDER_CONFIRMATION, ORDER_TRANSIT } from '@oyebazar/shared'
import type { OrderRepository } from '../ports/order-repositories'
import type { Analytics, Clock, Logger, MessagingProvider } from '../ports/infrastructure'

const BATCH_SIZE = 200

export interface ReminderResult {
  readonly reminded: number
  readonly failed: number
}

export interface AutoCancelResult {
  readonly cancelled: number
}

export class OrderReminderService {
  constructor(
    private readonly orders: OrderRepository,
    private readonly messaging: MessagingProvider,
    private readonly clock: Clock,
    private readonly analytics: Analytics,
    private readonly logger: Logger,
  ) {}

  /** 6 ghante wala yaad-dehani. Ek order par SIRF EK BAAR — roz ka nag nahi. */
  async remindStale(): Promise<ReminderResult> {
    const now = this.clock.now()
    const olderThan = new Date(now.getTime() - ORDER_CONFIRMATION.resellerAlertAfterMs)

    const pending = await this.orders.findAwaitingConfirmation({
      olderThan,
      onlyWithoutReminder: true,
      limit: BATCH_SIZE,
    })

    let reminded = 0
    let failed = 0

    for (const order of pending) {
      try {
        await this.messaging.sendTemplate({
          to: order.resellerPhone,
          template: 'baji_order_pending_confirm',
          params: {
            name: order.resellerName,
            orderNo: order.orderNo,
            customer: order.customerName,
            total: formatPkr(order.total),
          },
        })
        // Message chala gaya — dobara na jaye
        await this.orders.markReminderSent(order.id, now)
        reminded += 1
      } catch (error) {
        failed += 1
        this.logger.error('reminder_send_failed', {
          orderNo: order.orderNo,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    if (reminded > 0 || failed > 0) {
      this.logger.info('order_reminders_sent', { reminded, failed })
    }
    return { reminded, failed }
  }

  /** 24 ghante ke baad order khatam. */
  async autoCancelStale(): Promise<AutoCancelResult> {
    const now = this.clock.now()
    const olderThan = new Date(now.getTime() - ORDER_CONFIRMATION.autoCancelAfterMs)

    const stale = await this.orders.findAwaitingConfirmation({
      olderThan,
      onlyWithoutReminder: false,
      limit: BATCH_SIZE,
    })

    let cancelled = 0

    for (const order of stale) {
      await this.orders.applyStatusChange({
        orderId: order.id,
        from: 'PENDING_CONFIRM',
        to: 'CANCELLED',
        at: now,
        actorType: 'system',
        note: '24 ghante mein tasdeeq nahi hui — khud ba khud mansookh',
      })
      cancelled += 1
    }

    if (cancelled > 0) {
      await this.analytics.track({
        name: 'orders_auto_cancelled',
        actorType: 'system',
        properties: { count: cancelled },
      })
      this.logger.info('orders_auto_cancelled', { cancelled })
    }

    return { cancelled }
  }

  /**
   * Raste mein khare order — dukan se ek dafa poochha jata hai.
   *
   * 🔴 Ye khabar ka nahi, PAISE ka kaam hai. Reseller ka hissa DELIVERED par khulta hai
   * (dekhen OrderService.afterDelivered). Dukan agar likhna bhool jaye — aur bhoolne ki
   * poori wajah hai, us ka kaam parcel bhejte hi khatam ho jata hai — to order DISPATCHED
   * par khara reh jata hai aur reseller ka paisa kabhi banta hi nahi. Us ki nazar mein
   * "maal to bhej diya gaya tha", aur us ke paas poochhne ka koi rasta nahi.
   *
   * Ek order par SIRF EK BAAR. Roz ka nag wo cheez hai jis ke baad log paighaam parhna
   * hi chhor dete hain — aur phir wo paighaam bhi na-kaam ho jata hai jo waqai zaroori ho.
   */
  async remindStuckInTransit(): Promise<ReminderResult> {
    const now = this.clock.now()
    const olderThan = new Date(now.getTime() - ORDER_TRANSIT.askSupplierAfterMs)

    const stuck = await this.orders.findStuckInTransit({ olderThan, limit: BATCH_SIZE })

    let reminded = 0
    let failed = 0

    for (const order of stuck) {
      const days = Math.floor((now.getTime() - order.dispatchedAt.getTime()) / 86_400_000)

      try {
        await this.messaging.sendTemplate({
          to: order.supplierPhone,
          template: 'baji_order_in_transit_check',
          params: {
            orderNo: order.orderNo,
            customer: order.customerName,
            days: String(days),
          },
        })
        // Paighaam chala gaya — dobara na jaye
        await this.orders.markTransitReminderSent(order.id, now)
        reminded += 1
      } catch (error) {
        failed += 1
        this.logger.error('transit_reminder_failed', {
          orderNo: order.orderNo,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    if (reminded > 0 || failed > 0) {
      this.logger.info('transit_reminders_sent', { reminded, failed })
    }
    return { reminded, failed }
  }
}
