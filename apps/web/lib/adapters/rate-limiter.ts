import type { RateLimiter } from '@oyebazar/core'

/**
 * In-memory rate limiter — sirf DEV ke liye.
 *
 * ⚠ Production (Fly.io par ek se zyada machine) mein ye kaafi nahi: har machine ka apna
 * counter hoga. Redis wala adapter `packages/queue` ke saath aayega (INFRA-2).
 * Tab tak OTP flood se poori tarah mehfooz nahi — isliye Meta template rate bhi kam rakhi hai.
 */
export class InMemoryRateLimiter implements RateLimiter {
  private readonly buckets = new Map<string, { count: number; resetAt: number }>()

  async consume(
    key: string,
    limit: number,
    windowMs: number,
  ): Promise<{ allowed: boolean; retryAfterMs: number }> {
    const now = Date.now()
    const bucket = this.buckets.get(key)

    if (!bucket || bucket.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + windowMs })
      this.sweep(now)
      return { allowed: true, retryAfterMs: 0 }
    }

    if (bucket.count >= limit) {
      return { allowed: false, retryAfterMs: bucket.resetAt - now }
    }

    bucket.count += 1
    return { allowed: true, retryAfterMs: 0 }
  }

  /** Memory leak se bachne ke liye — purane buckets nikaal dete hain. */
  private sweep(now: number): void {
    if (this.buckets.size < 1_000) return
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) this.buckets.delete(key)
    }
  }
}
