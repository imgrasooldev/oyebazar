/**
 * PORTS — infrastructure.
 *
 * GOLDEN RULE #6: har external call abstraction ke peechay. Koi service seedha
 * WhatsApp/S3/Redis SDK call na kare. Provider badalna ek file ka kaam rehna chahiye
 * (Wati → Meta Cloud API, Supabase Storage → R2).
 *
 * Clock aur IdGenerator bhi ports hain — is se services deterministic test hoti hain.
 */

export interface Clock {
  now(): Date
}

export interface IdGenerator {
  generate(): string
}

/**
 * Order number (BJ-1043) — reseller aur wholesaler dono isi se baat karte hain,
 * isliye chhota aur parhne mein aasan hona chahiye. Atomic hona lazmi hai:
 * do orders ka ek hi number reconciliation tor deta hai.
 */
export interface OrderNumberGenerator {
  next(): Promise<string>
}

export interface TokenGenerator {
  /** URL-safe random token (session) */
  randomToken(bytes?: number): string
  /** OTP ke 6 hindse — crypto-random, Math.random kabhi nahi */
  numericCode(length: number): string
  hash(value: string): string
  verifyHash(value: string, hash: string): boolean
}

// ---------------------------------------------------------------- storage

export interface StoredObject {
  readonly key: string
  readonly url: string
}

export interface ObjectStorage {
  /** Supabase Storage (abhi) / Cloudflare R2 (baad mein) — dono isi interface ke peechay. */
  upload(key: string, body: Buffer, contentType: string): Promise<StoredObject>
  publicUrl(key: string): string
  remove(key: string): Promise<void>
}

// ---------------------------------------------------------------- rendering

import type { PackFormatKey } from '@oyebazar/shared'

export interface RenderStatusPackJob {
  readonly statusPackId: string
  readonly resellerId: string
  readonly productId: string
  /**
   * Kis tasveer par render karna hai. Khali string ya ghair-mojood = product ki cover.
   *
   * Purane job (jo migration se pehle queue mein pare the) par ye field nahi hoti —
   * un sab par cover hi chalti thi, is liye default wohi hai.
   */
  readonly mediaId?: string
  readonly templateKey: string
  readonly priceUsed: number
  /** Naap — purane job (queue mein pehle se pare hue) ke liye story maan liya jata hai. */
  readonly format?: PackFormatKey
}

export interface RenderQueue {
  /** Content Studio ka render worker par jata hai (Playwright long-running process). */
  enqueue(job: RenderStatusPackJob): Promise<{ jobId: string }>
}

// ---------------------------------------------------------------- messaging

export interface OutboundTemplateMessage {
  readonly to: string
  readonly template: string
  readonly params: Record<string, string>
  readonly mediaUrl?: string
}

export interface OutboundTextMessage {
  readonly to: string
  readonly body: string
}

export interface MessagingProvider {
  sendTemplate(message: OutboundTemplateMessage): Promise<{ providerMessageId: string }>
  sendText(message: OutboundTextMessage): Promise<{ providerMessageId: string }>
}

// ---------------------------------------------------------------- cross-cutting

/**
 * Pacer — broadcast ki raftaar.
 *
 * 🔴 Meta ke tiers: 1K → 10K → 100K unique users/din, aur quality rating girne par tier
 * NEECHE aa jata hai. 1,000 logon ko ek saath blast karna number restrict karwa deta hai
 * aur wo jaldi recover nahi hota.
 *
 * Core ko sirf itna pata hai ke "agla message bhejne se pehle rukna hai" — kitna, ye
 * infrastructure ka faisla hai (worker mein token bucket).
 */
export interface Pacer {
  wait(): Promise<void>
}

export interface RateLimiter {
  /**
   * @returns allowed=false ho to `retryAfterMs` bataata hai.
   * OTP flood aur broadcast throttling dono isi ke peechay.
   */
  consume(key: string, limit: number, windowMs: number): Promise<{ allowed: boolean; retryAfterMs: number }>
}

export interface AnalyticsEvent {
  readonly name: string
  /**
   * 🔴 'supplier' yahan hona zaroori hai.
   *
   * Pehle ye union mein nahi tha, is liye dukan wale ke har kaam par `actorType: 'ops'`
   * likha ja raha tha aur asli farq `actorId: 'supplier:<id>'` mein chhupaya gaya tha.
   * Nateeja: analytics mein "hamari team ne maal archive kiya" aur "dukan wale ne khud
   * kiya" ek jaise dikhte the — jab ke ops ki jawabdehi naapna hi is table ka maqsad hai.
   */
  readonly actorType: 'reseller' | 'supplier' | 'ops' | 'system' | 'customer' | 'anonymous'
  readonly actorId?: string
  readonly properties?: Record<string, unknown>
}

export interface Analytics {
  track(event: AnalyticsEvent): Promise<void>
}

export interface Logger {
  info(message: string, meta?: Record<string, unknown>): void
  warn(message: string, meta?: Record<string, unknown>): void
  error(message: string, meta?: Record<string, unknown>): void
}

/**
 * Unit of Work — jahan ek se zyada repository ek hi transaction mein likhni hon
 * (misal: order + fee ledger + order event). Core ko transaction ka matlab pata hai,
 * Prisma ka tareeqa nahi.
 */
export interface UnitOfWork {
  run<T>(work: (repos: TransactionalRepositories) => Promise<T>): Promise<T>
}

/** Transaction ke andar milne wali repositories — implementation package/db mein hai. */
export interface TransactionalRepositories {
  readonly [key: string]: unknown
}
