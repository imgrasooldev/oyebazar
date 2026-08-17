import { describe, expect, it } from 'vitest'
import { BroadcastService } from './broadcast.service'
import type { BroadcastRecipient, DailyDropView } from '../domain/daily-drop'
import type {
  BroadcastAudienceRepository,
  MessageLogRepository,
  OutboundMessageLog,
} from '../ports/daily-drop-repositories'
import type { Analytics, Clock, Logger, MessagingProvider, Pacer } from '../ports/infrastructure'

const NOW = new Date('2026-08-18T04:00:00.000Z') // 09:00 PKT

const DROP: DailyDropView = {
  id: 'drop_1',
  dropDate: new Date('2026-08-18T00:00:00.000Z'),
  status: 'SCHEDULED',
  sentAt: null,
  productIds: ['p1', 'p2', 'p3', 'p4', 'p5'],
}

function recipients(count: number): BroadcastRecipient[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `res_${i}`,
    name: `ریسیلر ${i}`,
    whatsappPhone: `92300000${String(i).padStart(4, '0')}`,
  }))
}

class FakeAudience implements BroadcastAudienceRepository {
  readonly limited: { id: string; reason: string }[] = []

  constructor(private readonly people: BroadcastRecipient[], private readonly pageSize = 100) {}

  async listActive(options: { limit: number; cursor?: string }) {
    const start = options.cursor ? this.people.findIndex((p) => p.id === options.cursor) + 1 : 0
    const size = Math.min(options.limit, this.pageSize)
    const slice = this.people.slice(start, start + size)
    const nextIndex = start + size
    return {
      recipients: slice,
      nextCursor: nextIndex < this.people.length ? (slice.at(-1)?.id ?? null) : null,
    }
  }

  async markLimited(resellerId: string, reason: string) {
    this.limited.push({ id: resellerId, reason })
  }
}

class FakeMessageLog implements MessageLogRepository {
  readonly entries: OutboundMessageLog[] = []
  constructor(private readonly failuresByPhone: Record<string, number> = {}) {}

  async record(message: OutboundMessageLog) {
    this.entries.push(message)
  }

  async countRecentFailures(phone: string) {
    return this.failuresByPhone[phone] ?? 0
  }
}

const NOOP_ANALYTICS: Analytics = { async track() {} }
const NOOP_LOGGER: Logger = { info() {}, warn() {}, error() {} }
const CLOCK: Clock = { now: () => NOW }

function build(options: {
  people: BroadcastRecipient[]
  failuresByPhone?: Record<string, number>
  failSendFor?: string[]
}) {
  const audience = new FakeAudience(options.people, 2) // chhota page — pagination test hoti hai
  const log = new FakeMessageLog(options.failuresByPhone ?? {})
  let pacerCalls = 0

  const pacer: Pacer = {
    async wait() {
      pacerCalls += 1
    },
  }

  const messaging: MessagingProvider = {
    async sendTemplate(message) {
      if (options.failSendFor?.includes(message.to)) throw new Error('provider 500')
      return { providerMessageId: `wa_${message.to}` }
    },
    async sendText() {
      return { providerMessageId: 'x' }
    },
  }

  const service = new BroadcastService(
    audience,
    log,
    messaging,
    pacer,
    CLOCK,
    NOOP_ANALYTICS,
    NOOP_LOGGER,
  )

  return { service, audience, log, pacer: () => pacerCalls }
}

describe('BroadcastService', () => {
  it('har active reseller ko EXACTLY ek message — pagination ke baad bhi', async () => {
    const people = recipients(5)
    const { service, log } = build({ people })

    const result = await service.sendDailyDrop(DROP, { appUrl: 'https://baji.pk' })

    expect(result.sent).toBe(5)
    expect(log.entries).toHaveLength(5)
    expect(new Set(log.entries.map((e) => e.toPhone)).size).toBe(5)
  })

  it('🔴 har message se pehle pacer rukta hai (20/sec ki hifazat)', async () => {
    const { service, pacer } = build({ people: recipients(4) })
    await service.sendDailyDrop(DROP, { appUrl: 'https://baji.pk' })
    expect(pacer()).toBe(4)
  })

  it('ek number ka fail hona poora broadcast nahi rokta', async () => {
    const people = recipients(4)
    const failing = people[1]!.whatsappPhone
    const { service, log } = build({ people, failSendFor: [failing] })

    const result = await service.sendDailyDrop(DROP, { appUrl: 'https://baji.pk' })

    expect(result.sent).toBe(3)
    expect(result.failed).toBe(1)
    // nakaam message bhi log hota hai — warna 3 baar fail wali policy chalti hi na
    expect(log.entries.find((e) => e.toPhone === failing)?.status).toBe('failed')
  })

  it('🔴 jis number par 3 messages fail ho chuke, us par bhejna band aur reseller LIMITED', async () => {
    const people = recipients(3)
    const dead = people[0]!.whatsappPhone
    const { service, audience, log } = build({ people, failuresByPhone: { [dead]: 3 } })

    const result = await service.sendDailyDrop(DROP, { appUrl: 'https://baji.pk' })

    expect(result.skipped).toBe(1)
    expect(result.sent).toBe(2)
    expect(audience.limited).toEqual([
      { id: people[0]!.id, reason: '3 messages nakaam — number check karen' },
    ])
    // us number par koi naya message nahi gaya
    expect(log.entries.some((e) => e.toPhone === dead)).toBe(false)
  })

  it('message mein reseller ka naam aur items ki tadaad jati hai', async () => {
    const people = recipients(1)
    const { service, log } = build({ people })

    await service.sendDailyDrop(DROP, { appUrl: 'https://baji.pk' })

    expect(log.entries[0]?.payload).toEqual({
      name: people[0]!.name,
      count: '5',
      link: 'https://baji.pk/catalogue',
    })
  })
})
