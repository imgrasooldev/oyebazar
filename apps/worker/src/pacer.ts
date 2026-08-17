import type { Pacer } from '@oyebazar/core'

/**
 * Token bucket — broadcast ki raftaar ka pehra.
 *
 * 🔴 20 messages/second se zyada nahi. Meta ke tiers (1K → 10K → 100K unique users/din)
 * aur quality rating dono is par asar dete hain; number restrict ho gaya to broadcast
 * band aur wo jaldi wapas nahi aata — poora business rozana ki us aadat par khara hai.
 *
 * Jitter isliye ke bilkul barabar wafqe (exactly 50ms) bot jaisa nazar aata hai.
 */
export class TokenBucketPacer implements Pacer {
  private tokens: number
  private lastRefill: number

  constructor(
    private readonly tokensPerSecond = 20,
    private readonly jitterMs = 200,
  ) {
    this.tokens = tokensPerSecond
    this.lastRefill = Date.now()
  }

  async wait(): Promise<void> {
    for (;;) {
      this.refill()

      if (this.tokens >= 1) {
        this.tokens -= 1
        if (this.jitterMs > 0) await sleep(Math.floor(Math.random() * this.jitterMs))
        return
      }

      // Agla token kab banega
      const waitMs = Math.ceil(1000 / this.tokensPerSecond)
      await sleep(waitMs)
    }
  }

  private refill(): void {
    const now = Date.now()
    const elapsedSeconds = (now - this.lastRefill) / 1000
    if (elapsedSeconds <= 0) return

    this.tokens = Math.min(this.tokensPerSecond, this.tokens + elapsedSeconds * this.tokensPerSecond)
    this.lastRefill = now
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
