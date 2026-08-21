import { describe, expect, it } from 'vitest'
import { pkr } from '@oyebazar/shared'
import { OrderReminderService } from './order-reminder.service'
import type {
  OrderRepository,
  PendingConfirmationOrder,
  OrderStatusChange,
  StuckInTransitOrder,
} from '../ports/order-repositories'
import type { Analytics, Clock, Logger, MessagingProvider } from '../ports/infrastructure'

const NOW = new Date('2026-08-18T12:00:00.000Z')

function order(id: string, hoursOld: number, reminded = false): PendingConfirmationOrder {
  return {
    id,
    orderNo: `BJ-${id}`,
    resellerId: 'res_1',
    resellerName: 'صادیہ',
    resellerPhone: '923001234567',
    customerName: 'عائشہ',
    total: pkr(3000),
    createdAt: new Date(NOW.getTime() - hoursOld * 3600 * 1000),
    reminderSentAt: reminded ? new Date(NOW.getTime() - 3600 * 1000) : null,
  }
}

/** Raste mein khara order — `days` din pehle bheja gaya, jawab abhi tak koi nahi. */
function inTransit(id: string, days: number, asked = false): StuckInTransitOrder & {
  transitReminderAt: Date | null
} {
  return {
    id,
    orderNo: `BJ-${id}`,
    supplierId: 'sup_1',
    supplierPhone: '923009998877',
    customerName: 'عائشہ',
    dispatchedAt: new Date(NOW.getTime() - days * 86_400_000),
    transitReminderAt: asked ? new Date(NOW.getTime() - 3600 * 1000) : null,
  }
}

class FakeOrders implements Partial<OrderRepository> {
  readonly remindersSent: string[] = []
  readonly transitAsked: string[] = []
  readonly changes: OrderStatusChange[] = []

  constructor(
    private readonly pending: PendingConfirmationOrder[],
    private readonly transit: ReturnType<typeof inTransit>[] = [],
  ) {}

  async findStuckInTransit(options: { olderThan: Date; limit: number }) {
    return this.transit
      .filter((o) => o.dispatchedAt < options.olderThan)
      // Repo ki tarah — jin se ek dafa poochha ja chuka, wo dobara nahi aate
      .filter((o) => o.transitReminderAt === null)
      .slice(0, options.limit)
  }

  async markTransitReminderSent(orderId: string): Promise<void> {
    this.transitAsked.push(orderId)
  }

  async findAwaitingConfirmation(options: {
    olderThan: Date
    onlyWithoutReminder: boolean
    limit: number
  }): Promise<PendingConfirmationOrder[]> {
    return this.pending
      .filter((o) => o.createdAt < options.olderThan)
      .filter((o) => (options.onlyWithoutReminder ? o.reminderSentAt === null : true))
      .slice(0, options.limit)
  }

  async markReminderSent(orderId: string): Promise<void> {
    this.remindersSent.push(orderId)
  }

  async applyStatusChange(change: OrderStatusChange) {
    this.changes.push(change)
    return null as never
  }
}

const CLOCK: Clock = { now: () => NOW }
const NOOP_ANALYTICS: Analytics = { async track() {} }
const NOOP_LOGGER: Logger = { info() {}, warn() {}, error() {} }

function build(
  pending: PendingConfirmationOrder[],
  failFor: string[] = [],
  transit: ReturnType<typeof inTransit>[] = [],
) {
  const orders = new FakeOrders(pending, transit)
  const sent: string[] = []

  const messaging: MessagingProvider = {
    async sendTemplate(message) {
      if (failFor.includes(message.params.orderNo ?? '')) throw new Error('provider down')
      sent.push(message.params.orderNo ?? '')
      return { providerMessageId: 'x' }
    },
    async sendText() {
      return { providerMessageId: 'x' }
    },
  }

  return {
    orders,
    sent,
    service: new OrderReminderService(
      orders as unknown as OrderRepository,
      messaging,
      CLOCK,
      NOOP_ANALYTICS,
      NOOP_LOGGER,
    ),
  }
}

describe('remindStale', () => {
  it('6 ghante se purane orders par reseller ko yaad dilata hai', async () => {
    const { service, sent } = build([order('a', 7), order('b', 2)])

    const result = await service.remindStale()

    expect(result.reminded).toBe(1)
    expect(sent).toEqual(['BJ-a']) // 2 ghante wale ko abhi nahi
  })

  it('🔴 ek order par sirf EK BAAR — roz ka nag nahi', async () => {
    const { service, sent } = build([order('a', 10, true)])

    const result = await service.remindStale()

    expect(result.reminded).toBe(0)
    expect(sent).toEqual([])
  })

  it('message fail ho to reminder "bhej diya" mark nahi hota (agli baar dobara koshish)', async () => {
    const { service, orders } = build([order('a', 7)], ['BJ-a'])

    const result = await service.remindStale()

    expect(result.failed).toBe(1)
    expect(orders.remindersSent).toEqual([])
  })
})

describe('autoCancelStale', () => {
  it('24 ghante ke baad order khud cancel hota hai', async () => {
    const { service, orders } = build([order('a', 30), order('b', 10)])

    const result = await service.autoCancelStale()

    expect(result.cancelled).toBe(1)
    expect(orders.changes[0]).toMatchObject({
      orderId: 'a',
      from: 'PENDING_CONFIRM',
      to: 'CANCELLED',
      actorType: 'system',
    })
  })

  it('cancel ki wajah audit log mein likhi jati hai', async () => {
    const { service, orders } = build([order('a', 30)])
    await service.autoCancelStale()
    expect(orders.changes[0]?.note).toMatch(/24 ghante/)
  })
})

/**
 * Raste mein khare order.
 *
 * 🔴 Ye testein paise ki hain, khabar ki nahi: reseller ka hissa DELIVERED par khulta
 * hai. Dukan ne likha hi na ho to order DISPATCHED par khara reh jata hai aur reseller
 * ka paisa kabhi banta hi nahi — aur usay wajah bhi nazar nahi aati.
 */
describe('remindStuckInTransit', () => {
  it('4 din se raste mein khare order par dukan se poochhta hai', async () => {
    const { service, sent } = build([], [], [inTransit('a', 5), inTransit('b', 2)])

    const result = await service.remindStuckInTransit()

    expect(result.reminded).toBe(1)
    expect(sent).toEqual(['BJ-a']) // do din wala parcel abhi raste mein hi hoga
  })

  it('🔴 ek order par sirf EK BAAR — roz ka nag paighaam parhna band karwa deta hai', async () => {
    const { service, sent } = build([], [], [inTransit('a', 9, true)])

    const result = await service.remindStuckInTransit()

    expect(result.reminded).toBe(0)
    expect(sent).toEqual([])
  })

  it('message fail ho to "poochh liya" mark nahi hota — agli baar dobara koshish', async () => {
    const { service, orders } = build([], ['BJ-a'], [inTransit('a', 6)])

    const result = await service.remindStuckInTransit()

    expect(result.failed).toBe(1)
    expect(orders.transitAsked).toEqual([])
  })

  it('paighaam mein din ki ginti jati hai — "kitne din se" hi asal sawal hai', async () => {
    const days: string[] = []
    const orders = new FakeOrders([], [inTransit('a', 6)])
    const service = new OrderReminderService(
      orders as unknown as OrderRepository,
      {
        async sendTemplate(message) {
          days.push(message.params.days ?? '')
          return { providerMessageId: 'x' }
        },
        async sendText() {
          return { providerMessageId: 'x' }
        },
      },
      CLOCK,
      NOOP_ANALYTICS,
      NOOP_LOGGER,
    )

    await service.remindStuckInTransit()
    expect(days).toEqual(['6'])
  })
})
