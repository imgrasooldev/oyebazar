import { describe, expect, it } from 'vitest'
import { NotRegisteredError, ValidationError } from '@oyebazar/shared'
import { AuthService } from './auth.service'
import type {
  OtpChallengeRecord,
  OtpChallengeRepository,
  ResellerRepository,
  SessionRecord,
  SessionRepository,
} from '../ports/repositories'
import type { ResellerView } from '../domain/views'
import type {
  Analytics,
  Clock,
  Logger,
  MessagingProvider,
  RateLimiter,
  TokenGenerator,
} from '../ports/infrastructure'

const NOW = new Date('2026-08-18T12:00:00.000Z')
const PHONE = '923337778899'
const CODE = '123456'

function reseller(overrides: Partial<ResellerView> = {}): ResellerView {
  return {
    id: 'res_1',
    name: 'صائمہ',
    whatsappPhone: PHONE,
    city: 'راولپنڈی',
    area: null,
    status: 'ACTIVE',
    tier: 'NEW',
    payoutMethod: null,
    payoutAccount: null,
    createdAt: NOW,
    ...overrides,
  } as ResellerView
}

class FakeOtpRepo implements OtpChallengeRepository {
  consumed: string[] = []
  attempts = 0
  challenge: OtpChallengeRecord | null = {
    id: 'otp_1',
    phone: PHONE,
    codeHash: `hash:${CODE}`,
    attempts: 0,
    expiresAt: new Date(NOW.getTime() + 5 * 60_000),
    consumedAt: null,
  }

  async create(): Promise<OtpChallengeRecord> {
    return this.challenge as OtpChallengeRecord
  }
  async findLatestActive(): Promise<OtpChallengeRecord | null> {
    // Consume ho chuka ho to dobara nahi milta — bilkul asli repository ki tarah
    return this.consumed.includes('otp_1') ? null : this.challenge
  }
  async incrementAttempts(): Promise<number> {
    this.attempts += 1
    return this.attempts
  }
  async consume(id: string): Promise<void> {
    this.consumed.push(id)
  }

  async countRecentRequests(): Promise<number> {
    return 0
  }
}

class FakeResellers implements Partial<ResellerRepository> {
  created: { name: string; city: string }[] = []

  constructor(private existing: ResellerView | null) {}

  async findByPhone(): Promise<ResellerView | null> {
    return this.existing
  }
  async findById(): Promise<ResellerView | null> {
    return this.existing
  }
  async create(input: { name: string; whatsappPhone: string; city: string }): Promise<ResellerView> {
    this.created.push({ name: input.name, city: input.city })
    this.existing = reseller({ name: input.name, city: input.city })
    return this.existing
  }
  async touchLastActive(): Promise<void> {}
}

class FakeSessions implements Partial<SessionRepository> {
  created: string[] = []
  async create(input: { tokenHash: string }): Promise<SessionRecord> {
    this.created.push(input.tokenHash)
    return { id: 'sess_1', resellerId: 'res_1', opsUserId: null, supplierId: null, expiresAt: NOW }
  }
}

const TOKENS: TokenGenerator = {
  randomToken: () => 'tok',
  numericCode: () => CODE,
  hash: (value: string) => `hash:${value}`,
  verifyHash: (value: string, hash: string) => `hash:${value}` === hash,
}

const CLOCK: Clock = { now: () => NOW }
const NOOP_ANALYTICS: Analytics = { async track() {} }
const NOOP_LOGGER: Logger = { info() {}, warn() {}, error() {} }
const NOOP_MESSAGING: MessagingProvider = {
  async sendTemplate() {
    return { providerMessageId: 'x' }
  },
  async sendText() {
    return { providerMessageId: 'x' }
  },
}
const ALLOW_ALL: RateLimiter = {
  async consume() {
    return { allowed: true, retryAfterMs: 0 }
  },
}

function build(existing: ResellerView | null) {
  const otp = new FakeOtpRepo()
  const resellers = new FakeResellers(existing)
  const sessions = new FakeSessions()

  const auth = new AuthService(
    otp,
    sessions as unknown as SessionRepository,
    resellers as unknown as ResellerRepository,
    NOOP_MESSAGING,
    TOKENS,
    CLOCK,
    ALLOW_ALL,
    NOOP_ANALYTICS,
    NOOP_LOGGER,
  )

  return { auth, otp, resellers, sessions }
}

describe('AuthService — nayi reseller ka register', () => {
  /**
   * 🔴 Ye test ek asli bug se paida hua.
   *
   * Pehle verifyOtp code ko FORAN khatam kar deta tha aur uske baad dekhta tha ke account
   * hai ya nahi. Natija: har nayi reseller ke liye login ki koshish us ke code ko kha jati,
   * aur register ke waqt use "code expire ho gaya" milta — jabke us ne abhi wohi code
   * daala hota tha. Browser mein chala kar pakra gaya, curl se nahi.
   */
  it('NOT_REGISTERED par code zinda rehta hai — register usi code se mukammal hota hai', async () => {
    const { auth, otp, resellers } = build(null)

    await expect(auth.verifyOtp(PHONE, CODE, {})).rejects.toBeInstanceOf(NotRegisteredError)
    expect(otp.consumed, 'code khatam nahi hona chahiye tha').toHaveLength(0)

    const result = await auth.register(PHONE, CODE, { name: 'صائمہ', city: 'راولپنڈی' }, {})

    expect(result.reseller.name).toBe('صائمہ')
    expect(resellers.created).toHaveLength(1)
    expect(otp.consumed, 'register par code khatam hona chahiye').toEqual(['otp_1'])
  })

  it('register ke baad wohi code dobara nahi chalta', async () => {
    const { auth } = build(null)

    await auth.register(PHONE, CODE, { name: 'صائمہ', city: 'راولپنڈی' }, {})

    await expect(
      auth.register(PHONE, CODE, { name: 'کوئی اور', city: 'کراچی' }, {}),
    ).rejects.toBeInstanceOf(ValidationError)
  })

  it('pehle se mojood number par naya account nahi banta — usi ki session khulti hai', async () => {
    const { auth, resellers } = build(reseller())

    const result = await auth.register(PHONE, CODE, { name: 'کوئی اور', city: 'کراچی' }, {})

    expect(resellers.created, 'duplicate account nahi banna chahiye').toHaveLength(0)
    expect(result.reseller.name).toBe('صائمہ')
    expect(result.reseller.city).toBe('راولپنڈی')
  })

  it('ghalat code par account nahi banta aur koshish gini jati hai', async () => {
    const { auth, otp, resellers } = build(null)

    await expect(
      auth.register(PHONE, '000000', { name: 'صائمہ', city: 'راولپنڈی' }, {}),
    ).rejects.toBeInstanceOf(ValidationError)

    expect(resellers.created).toHaveLength(0)
    expect(otp.attempts).toBe(1)
  })

  it('login: account mojood ho to code khatam ho jata hai', async () => {
    const { auth, otp } = build(reseller())

    await auth.verifyOtp(PHONE, CODE, {})

    expect(otp.consumed).toEqual(['otp_1'])
  })
})
