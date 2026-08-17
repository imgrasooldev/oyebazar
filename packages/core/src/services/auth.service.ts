/**
 * AuthService — WhatsApp OTP se login.
 *
 * 🔴 JWT NAHI. Reason: 28% Pakistani aurtein doosre ka phone use karti hain. JWT revoke
 * nahi ho sakta — phone kho jaye ya logout dabaye to session foran khatam honi chahiye.
 * Isliye DB session + opaque token (hash shuda).
 *
 * Rate limits OTP flood aur SMS/WhatsApp cost dono ko rokte hain.
 */
import {
  OTP,
  RateLimitedError,
  SESSION_TTL_MS,
  UnauthenticatedError,
  ValidationError,
} from '@oyebazar/shared'
import type { ResellerView } from '../domain/views'
import type {
  OtpChallengeRepository,
  ResellerRepository,
  SessionRepository,
} from '../ports/repositories'
import type {
  Analytics,
  Clock,
  Logger,
  MessagingProvider,
  RateLimiter,
  TokenGenerator,
} from '../ports/infrastructure'

export interface LoginResult {
  /** plain token — sirf ek baar milta hai, cookie mein jata hai. DB mein hash hai. */
  readonly sessionToken: string
  readonly expiresAt: Date
  readonly reseller: ResellerView
}

export interface AuthenticatedActor {
  readonly sessionId: string
  readonly reseller: ResellerView
}

export class AuthService {
  constructor(
    private readonly otpRepo: OtpChallengeRepository,
    private readonly sessions: SessionRepository,
    private readonly resellers: ResellerRepository,
    private readonly messaging: MessagingProvider,
    private readonly tokens: TokenGenerator,
    private readonly clock: Clock,
    private readonly rateLimiter: RateLimiter,
    private readonly analytics: Analytics,
    private readonly logger: Logger,
  ) {}

  /**
   * OTP bhejta hai. Number registered na ho tab bhi wohi jawab deta hai —
   * warna koi bhi ye pata kar sakta hai ke kaun si reseller hamare saath hai (enumeration).
   */
  async requestOtp(phoneE164: string, ip: string): Promise<{ sentAt: Date }> {
    const now = this.clock.now()

    const perPhone = await this.rateLimiter.consume(
      `otp:phone:${phoneE164}`,
      OTP.maxRequestsPerPhonePer15Min,
      15 * 60 * 1000,
    )
    if (!perPhone.allowed) throw new RateLimitedError(undefined, perPhone.retryAfterMs)

    const perIp = await this.rateLimiter.consume(
      `otp:ip:${ip}`,
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

    this.logger.info('otp_sent', { phone: phoneE164 })
    return { sentAt: now }
  }

  async verifyOtp(
    phoneE164: string,
    code: string,
    meta: { userAgent?: string },
  ): Promise<LoginResult> {
    const now = this.clock.now()
    const challenge = await this.otpRepo.findLatestActive(phoneE164, now)
    if (!challenge) {
      throw new ValidationError('Code expire ho gaya. Naya code manga lein')
    }

    if (challenge.attempts >= OTP.maxAttempts) {
      throw new RateLimitedError('Bohat zyada ghalat koshishen. Naya code manga lein')
    }

    if (!this.tokens.verifyHash(code, challenge.codeHash)) {
      await this.otpRepo.incrementAttempts(challenge.id)
      throw new ValidationError('Code ghalat hai')
    }

    await this.otpRepo.consume(challenge.id, now)

    const reseller = await this.resellers.findByPhone(phoneE164)
    if (!reseller) {
      // Phase 1: onboarding ops team karti hai — self-signup abhi nahi
      throw new UnauthenticatedError('Ye number abhi register nahi hai. Baji team se rabta karen')
    }
    if (reseller.status === 'SUSPENDED') {
      throw new UnauthenticatedError('Ye account band hai. Baji team se rabta karen')
    }

    const token = this.tokens.randomToken(32)
    const expiresAt = new Date(now.getTime() + SESSION_TTL_MS)
    await this.sessions.create({
      tokenHash: this.tokens.hash(token),
      resellerId: reseller.id,
      expiresAt,
      ...(meta.userAgent ? { userAgent: meta.userAgent } : {}),
    })

    await this.resellers.touchLastActive(reseller.id, now)
    await this.analytics.track({ name: 'login', actorType: 'reseller', actorId: reseller.id })

    return { sessionToken: token, expiresAt, reseller }
  }

  /** Har request par: cookie → hash → session → reseller. */
  async authenticate(sessionToken: string | undefined): Promise<AuthenticatedActor> {
    if (!sessionToken) throw new UnauthenticatedError()

    const session = await this.sessions.findByTokenHash(this.tokens.hash(sessionToken))
    if (!session) throw new UnauthenticatedError()

    const now = this.clock.now()
    if (session.expiresAt.getTime() <= now.getTime()) {
      await this.sessions.delete(session.id)
      throw new UnauthenticatedError('Session khatam ho gayi. Dobara login karen')
    }
    if (!session.resellerId) throw new UnauthenticatedError()

    const reseller = await this.resellers.findById(session.resellerId)
    if (!reseller || reseller.status === 'SUSPENDED') throw new UnauthenticatedError()

    return { sessionId: session.id, reseller }
  }

  /** 🔴 Shared phone rule: logout par us reseller ki SAARI sessions khatam. */
  async logout(sessionToken: string | undefined): Promise<void> {
    if (!sessionToken) return
    const session = await this.sessions.findByTokenHash(this.tokens.hash(sessionToken))
    if (!session) return
    if (session.resellerId) {
      await this.sessions.deleteAllForReseller(session.resellerId)
    } else {
      await this.sessions.delete(session.id)
    }
  }
}
