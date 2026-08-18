/**
 * SupplierAuthService — wholesaler ka WhatsApp OTP login.
 *
 * Reseller wali AuthService se alag kyun: qawaid alag hain. Reseller PENDING ho to bhi
 * chal jati hai, wholesaler ko PENDING par andar nahi aane dena — jab tak ops ne dukan
 * verify nahi ki, order dikhane ka matlab nahi. Dono ko ek class mein rakhte to har
 * method mein "kaun hai" wala `if` chalta rehta, aur wohi jagah hai jahan ghalti hoti hai.
 *
 * Baqi usool wohi hain: opaque token (DB mein hash), JWT nahi, aur logout har device se.
 */
import {
  OTP,
  RateLimitedError,
  SESSION_TTL_MS,
  UnauthenticatedError,
  ValidationError,
} from '@oyebazar/shared'
import type { OtpChallengeRepository, SessionRepository } from '../ports/repositories'
import type {
  SupplierAccountRepository,
  SupplierAccountView,
} from '../ports/supplier-portal-repositories'
import type {
  Analytics,
  Clock,
  Logger,
  MessagingProvider,
  RateLimiter,
  TokenGenerator,
} from '../ports/infrastructure'

export interface SupplierLoginResult {
  readonly sessionToken: string
  readonly expiresAt: Date
  readonly supplier: SupplierAccountView
}

export interface AuthenticatedSupplier {
  readonly sessionId: string
  readonly supplier: SupplierAccountView
}

export class SupplierAuthService {
  constructor(
    private readonly otpRepo: OtpChallengeRepository,
    private readonly sessions: SessionRepository,
    private readonly suppliers: SupplierAccountRepository,
    private readonly messaging: MessagingProvider,
    private readonly tokens: TokenGenerator,
    private readonly clock: Clock,
    private readonly rateLimiter: RateLimiter,
    private readonly analytics: Analytics,
    private readonly logger: Logger,
  ) {}

  /**
   * OTP bhejta hai. Number registered na ho tab bhi jawab wohi — warna koi bhi ye
   * pata kar sakta hai ke kaun si dukan hamare saath hai (enumeration).
   */
  async requestOtp(phoneE164: string, ip: string): Promise<{ sentAt: Date }> {
    const now = this.clock.now()

    const perPhone = await this.rateLimiter.consume(
      `supplier-otp:phone:${phoneE164}`,
      OTP.maxRequestsPerPhonePer15Min,
      15 * 60 * 1000,
    )
    if (!perPhone.allowed) throw new RateLimitedError(undefined, perPhone.retryAfterMs)

    const perIp = await this.rateLimiter.consume(
      `supplier-otp:ip:${ip}`,
      OTP.maxRequestsPerIpPerHour,
      60 * 60 * 1000,
    )
    if (!perIp.allowed) throw new RateLimitedError(undefined, perIp.retryAfterMs)

    const code = this.tokens.numericCode(OTP.length)
    await this.otpRepo.create({
      phone: phoneE164,
      codeHash: this.tokens.hash(code),
      expiresAt: new Date(now.getTime() + OTP.ttlMs),
    })

    await this.messaging.sendTemplate({
      to: phoneE164,
      template: 'baji_login_otp',
      params: { code, minutes: String(Math.round(OTP.ttlMs / 60000)) },
    })

    this.logger.info('supplier_otp_sent', { phone: phoneE164 })
    return { sentAt: now }
  }

  async verifyOtp(
    phoneE164: string,
    code: string,
    meta: { userAgent?: string },
  ): Promise<SupplierLoginResult> {
    const now = this.clock.now()
    const challenge = await this.otpRepo.findLatestActive(phoneE164, now)
    if (!challenge) throw new ValidationError('Code expire ho gaya. Naya code manga lein')

    if (challenge.attempts >= OTP.maxAttempts) {
      throw new RateLimitedError('Bohat zyada ghalat koshishen. Naya code manga lein')
    }

    if (!this.tokens.verifyHash(code, challenge.codeHash)) {
      await this.otpRepo.incrementAttempts(challenge.id)
      throw new ValidationError('Code ghalat hai')
    }

    await this.otpRepo.consume(challenge.id, now)

    const supplier = await this.suppliers.findAccountByPhone(phoneE164)
    if (!supplier) {
      throw new UnauthenticatedError('Ye number kisi dukan se juda nahi. OyeBazar team se rabta karen')
    }
    // 🔴 PENDING par bhi rok — verification se pehle order dikhane ka koi matlab nahi
    if (supplier.status !== 'VERIFIED') {
      throw new UnauthenticatedError(
        supplier.status === 'SUSPENDED'
          ? 'Ye account band hai. OyeBazar team se rabta karen'
          : 'Aap ki dukan abhi verify nahi hui. Team aap se rabta karegi',
      )
    }

    const token = this.tokens.randomToken(32)
    const expiresAt = new Date(now.getTime() + SESSION_TTL_MS)
    await this.sessions.create({
      tokenHash: this.tokens.hash(token),
      supplierId: supplier.id,
      expiresAt,
      ...(meta.userAgent ? { userAgent: meta.userAgent } : {}),
    })

    await this.analytics.track({ name: 'login', actorType: 'ops', actorId: `supplier:${supplier.id}` })
    this.logger.info('supplier_login', { supplierId: supplier.id })

    return { sessionToken: token, expiresAt, supplier }
  }

  /**
   * Har request par: cookie → hash → session → supplier.
   *
   * 🔴 `session.supplierId` ki shart lazmi hai. Reseller ki session cookie yahan chipka
   * kar koi wholesaler portal mein nahi ghus sakta — token to asli hai, magar us par
   * supplierId nahi hoti.
   */
  async authenticate(sessionToken: string | undefined): Promise<AuthenticatedSupplier> {
    if (!sessionToken) throw new UnauthenticatedError()

    const session = await this.sessions.findByTokenHash(this.tokens.hash(sessionToken))
    if (!session) throw new UnauthenticatedError()

    const now = this.clock.now()
    if (session.expiresAt.getTime() <= now.getTime()) {
      await this.sessions.delete(session.id)
      throw new UnauthenticatedError('Session khatam ho gayi. Dobara login karen')
    }
    if (!session.supplierId) throw new UnauthenticatedError()

    const supplier = await this.suppliers.findAccountById(session.supplierId)
    if (!supplier || supplier.status !== 'VERIFIED') throw new UnauthenticatedError()

    return { sessionId: session.id, supplier }
  }

  async logout(sessionToken: string | undefined): Promise<void> {
    if (!sessionToken) return
    const session = await this.sessions.findByTokenHash(this.tokens.hash(sessionToken))
    if (!session) return
    if (session.supplierId) {
      await this.sessions.deleteAllForSupplier(session.supplierId)
    } else {
      await this.sessions.delete(session.id)
    }
  }
}
