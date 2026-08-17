import { describe, expect, it } from 'vitest'
import { pkr } from '@oyebazar/shared'
import { OrderReminderService } from './order-reminder.service'
import type { OrderRepository, PendingConfirmationOrder, OrderStatusChange } from '../ports/order-repositories'
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

class FakeOrders implements Partial<OrderRepository> {
  readonly remindersSent: string[] = []
  readonly changes: OrderStatusChange[] = []

  constructor(private readonly pending: PendingConfirmationOrder[]) {}

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

function build(pending: PendingConfirmationOrder[], failFor: string[] = []) {
  const orders = new FakeOrders(pending)
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
