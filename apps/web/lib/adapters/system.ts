import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto'
import type { Clock, IdGenerator, Logger, TokenGenerator } from '@oyebazar/core'

export class SystemClock implements Clock {
  now(): Date {
    return new Date()
  }
}

export class CryptoIdGenerator implements IdGenerator {
  generate(): string {
    return randomBytes(16).toString('hex')
  }
}

/**
 * Session tokens aur OTP codes.
 *
 * · token: 32 random bytes, base64url — guess karna namumkin
 * · DB mein SHA-256 hash jata hai, plain token kabhi nahi
 * · comparison timing-safe hai (warna byte-by-byte timing se code leak ho sakta hai)
 * · OTP ke liye `randomInt` — Math.random() predictable hai, security ke liye mana hai
 */
export class CryptoTokenGenerator implements TokenGenerator {
  randomToken(bytes = 32): string {
    return randomBytes(bytes).toString('base64url')
  }

  numericCode(length: number): string {
    let code = ''
    for (let i = 0; i < length; i++) code += randomInt(0, 10).toString()
    return code
  }

  hash(value: string): string {
    return createHash('sha256').update(value).digest('hex')
  }

  verifyHash(value: string, hash: string): boolean {
    const a = Buffer.from(this.hash(value), 'hex')
    const b = Buffer.from(hash, 'hex')
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  }
}

/** Structured logs — Fly.io par ye JSON lines search ho jati hain. */
export class ConsoleLogger implements Logger {
  info(message: string, meta?: Record<string, unknown>): void {
    console.log(JSON.stringify({ level: 'info', message, ...meta }))
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    console.warn(JSON.stringify({ level: 'warn', message, ...meta }))
  }

  error(message: string, meta?: Record<string, unknown>): void {
    console.error(JSON.stringify({ level: 'error', message, ...meta }))
  }
}
