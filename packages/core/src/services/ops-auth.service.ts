/**
 * OpsAuthService — admin portal ka login.
 *
 * Pehle ops endpoints ek shared API key par chalte the (`x-ops-key`). Wo Phase 1 ke
 * liye theek tha jab ops ek Retool screen thi, magar ab do masle hain:
 *  1. Ek hi key sab ke paas hoti hai — kis ne fee rate badla, kabhi pata nahi chalta
 *  2. Key nikal jaye to sab kuch khul jata hai, aur badalne par sab ka kaam ruk jata hai
 *
 * Ab har ops user ka apna login hai (wohi WhatsApp OTP jo baqi system mein hai) aur
 * har harkat us ke naam par darj hoti hai.
 *
 * 🔴 `isActive` false ho to login foran band — mulazim ke jane par sirf ek switch
 * band karna kaafi hona chahiye, key badal kar sab ko batana nahi.
 */
import {
  OTP,
  RateLimitedError,
  SESSION_TTL_MS,
  UnauthenticatedError,
  ValidationError,
} from '@oyebazar/shared'
import type { OpsUserRepository, OpsUserView } from '../ports/admin-repositories'
import type { OtpChallengeRepository, SessionRepository } from '../ports/repositories'
import type {
  Analytics,
  Clock,
  Logger,
  MessagingProvider,
  RateLimiter,
  TokenGenerator,
} from '../ports/infrastructure'

export interface OpsLoginResult {
  readonly sessionToken: string
  readonly expiresAt: Date
  readonly user: OpsUserView
}

export interface AuthenticatedOpsUser {
  readonly sessionId: string
  readonly user: OpsUserView
}

/** Ops ki session chhoti hai — admin portal se poora karobar chalta hai. */
const OPS_SESSION_TTL_MS = Math.min(SESSION_TTL_MS, 24 * 60 * 60 * 1000)

export class OpsAuthService {
  constructor(
    private readonly otpRepo: OtpChallengeRepository,
    private readonly sessions: SessionRepository,
    private readonly opsUsers: OpsUserRepository,
    private readonly messaging: MessagingProvider,
    private readonly tokens: TokenGenerator,
    private readonly clock: Clock,
    private readonly rateLimiter: RateLimiter,
    private readonly analytics: Analytics,
    private readonly logger: Logger,
  ) {}

  async requestOtp(phoneE164: string, ip: string): Promise<{ sentAt: Date }> {
    const now = this.clock.now()

    const perPhone = await this.rateLimiter.consume(
      `ops-otp:phone:${phoneE164}`,
      OTP.maxRequestsPerPhonePer15Min,
      15 * 60 * 1000,
    )
    if (!perPhone.allowed) throw new RateLimitedError(undefined, perPhone.retryAfterMs)

    const perIp = await this.rateLimiter.consume(
      `ops-otp:ip:${ip}`,
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

    // Jawab hamesha ek jaisa — warna koi bhi numbers aazma kar ops team ki list bana le
    this.logger.info('ops_otp_sent', { phone: phoneE164 })
    return { sentAt: now }
  }

  async verifyOtp(
    phoneE164: string,
    code: string,
    meta: { userAgent?: string },
  ): Promise<OpsLoginResult> {
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

    const user = await this.opsUsers.findByPhone(phoneE164)
    if (!user || !user.isActive) {
      // Wajah nahi batate: "aap ops mein nahi hain" bhi ek maloomat hai
      throw new UnauthenticatedError('Ye number admin portal ke liye manzoor nahi')
    }

    const token = this.tokens.randomToken(32)
    const expiresAt = new Date(now.getTime() + OPS_SESSION_TTL_MS)
    await this.sessions.create({
      tokenHash: this.tokens.hash(token),
      opsUserId: user.id,
      expiresAt,
      ...(meta.userAgent ? { userAgent: meta.userAgent } : {}),
    })

    await this.opsUsers.touchLastSeen(user.id, now)
    await this.analytics.track({ name: 'login', actorType: 'ops', actorId: user.id })
    this.logger.info('ops_login', { opsUserId: user.id, role: user.role })

    return { sessionToken: token, expiresAt, user }
  }

  /**
   * 🔴 `session.opsUserId` ki shart lazmi hai — reseller ya wholesaler ki asli session
   * cookie yahan chipka kar koi admin portal mein nahi ghus sakta.
   */
  async authenticate(sessionToken: string | undefined): Promise<AuthenticatedOpsUser> {
    if (!sessionToken) throw new UnauthenticatedError()

    const session = await this.sessions.findByTokenHash(this.tokens.hash(sessionToken))
    if (!session) throw new UnauthenticatedError()

    const now = this.clock.now()
    if (session.expiresAt.getTime() <= now.getTime()) {
      await this.sessions.delete(session.id)
      throw new UnauthenticatedError('Session khatam ho gayi. Dobara login karen')
    }
    if (!session.opsUserId) throw new UnauthenticatedError()

    const user = await this.opsUsers.findById(session.opsUserId)
    if (!user || !user.isActive) throw new UnauthenticatedError()

    return { sessionId: session.id, user }
  }

  async logout(sessionToken: string | undefined): Promise<void> {
    if (!sessionToken) return
    const session = await this.sessions.findByTokenHash(this.tokens.hash(sessionToken))
    if (session) await this.sessions.delete(session.id)
  }
}
