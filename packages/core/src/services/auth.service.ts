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
  NotRegisteredError,
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

  /**
   * Code jaanchta hai magar KHATAM NAHI karta — challenge ki id wapas deta hai.
   *
   * 🔴 Jaanchna aur khatam karna alag hain, aur ye jaan boojh kar hai: naya number login
   * ki koshish karta hai to code sahih hota hai magar account mojood nahi. Agar hum wahin
   * code khatam kar dete to agle qadam (register) ke paas kuch bachta hi nahi aur har nayi
   * reseller ko "code expire ho gaya" milta — jabke us ne abhi abhi wohi code daala hai.
   */
  private async assertOtpValid(phoneE164: string, code: string, now: Date): Promise<string> {
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

    return challenge.id
  }

  /** Session banati hai — login aur register dono ka aakhri qadam. */
  private async startSession(
    reseller: ResellerView,
    now: Date,
    meta: { userAgent?: string },
  ): Promise<LoginResult> {
    const token = this.tokens.randomToken(32)
    const expiresAt = new Date(now.getTime() + SESSION_TTL_MS)
    await this.sessions.create({
      tokenHash: this.tokens.hash(token),
      resellerId: reseller.id,
      expiresAt,
      ...(meta.userAgent ? { userAgent: meta.userAgent } : {}),
    })

    await this.resellers.touchLastActive(reseller.id, now)
    return { sessionToken: token, expiresAt, reseller }
  }

  /**
   * Nayi reseller — number OTP se tasdeeq hota hai aur usi qadam mein account ban jata hai.
   *
   * 🔴 Code yahan bhi consume hota hai, is liye register ka apna alag rasta hai, "pehle
   * verify phir register" nahi: warna code ek dafa verify par khatam ho jata aur register
   * ke waqt uske paas kuch na hota.
   *
   * Number pehle se mojood ho to naya account nahi banta — usi ki session khul jati hai.
   * Do wajah: (1) whatsappPhone unique hai, (2) shared phone par doosri bahen ka account
   * ghalti se banane se behtar hai ke wohi khul jaye.
   */
  async register(
    phoneE164: string,
    code: string,
    profile: { name: string; city: string; area?: string; referredById?: string | undefined },
    meta: { userAgent?: string },
  ): Promise<LoginResult> {
    const now = this.clock.now()
    const challengeId = await this.assertOtpValid(phoneE164, code, now)
    await this.otpRepo.consume(challengeId, now)

    const existing = await this.resellers.findByPhone(phoneE164)
    if (existing) {
      if (existing.status === 'SUSPENDED') {
        throw new UnauthenticatedError('Ye account band hai. OyeBazar team se rabta karen')
      }
      await this.analytics.track({ name: 'login', actorType: 'reseller', actorId: existing.id })
      return this.startSession(existing, now, meta)
    }

    /*
     * Bulane wali ki tasdeeq — aur na milne par CHUP CHAAP aage.
     *
     * 🔴 Ghalat ya purana `ref` par register ROKNA nahi chahiye. Ye id pate mein
     * hoti hai: link WhatsApp par forward hota hai, kat jata hai, purana ho jata hai.
     * Us par "ghalat link" keh kar naye bande ko rok dena hamara sab se qeemti lamha
     * zaya kar dena hai — wo wapas nahi aata.
     *
     * Aur khud ko bulana bhi yahin rukta hai: ye us surat mein hota hai jab koi apna
     * hi link kholta hai, aur us par rishta banane ka koi matlab nahi.
     */
    let referredById: string | undefined
    if (profile.referredById) {
      const referrer = await this.resellers.findById(profile.referredById)
      if (referrer && referrer.whatsappPhone !== phoneE164) referredById = referrer.id
    }

    const reseller = await this.resellers.create({
      name: profile.name,
      whatsappPhone: phoneE164,
      city: profile.city,
      ...(profile.area ? { area: profile.area } : {}),
      ...(referredById ? { referredById } : {}),
    })

    await this.analytics.track({
      name: 'reseller_registered',
      actorType: 'reseller',
      actorId: reseller.id,
      properties: { city: profile.city, referred: referredById ? 'yes' : 'no' },
    })
    this.logger.info('reseller_registered', { resellerId: reseller.id, city: profile.city })

    return this.startSession(reseller, now, meta)
  }

  async verifyOtp(
    phoneE164: string,
    code: string,
    meta: { userAgent?: string },
  ): Promise<LoginResult> {
    const now = this.clock.now()
    const challengeId = await this.assertOtpValid(phoneE164, code, now)

    const reseller = await this.resellers.findByPhone(phoneE164)
    if (!reseller) {
      // 🔴 Ye ghalti nahi, nayi user hai — safha isi code par register ka form kholta hai.
      // Code yahan KHATAM nahi kiya: agla qadam (register) usi code se mukammal hota hai.
      throw new NotRegisteredError()
    }

    await this.otpRepo.consume(challengeId, now)
    if (reseller.status === 'SUSPENDED') {
      throw new UnauthenticatedError('Ye account band hai. OyeBazar team se rabta karen')
    }

    await this.analytics.track({ name: 'login', actorType: 'reseller', actorId: reseller.id })
    return this.startSession(reseller, now, meta)
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
