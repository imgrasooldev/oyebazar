/**
 * Playwright browser pool.
 *
 * Har render ke liye naya browser launch karna ~1.5s leta hai — 10,000 nightly renders
 * par ye chaar ghante ban jate hain. Isliye ek browser, kai contexts, aur unhen recycle karte hain.
 *
 * Rules (docs/ARCHITECTURE.md):
 *  · pool size = CPU cores × 1.5, max 8
 *  · har 500 renders ke baad context recycle (Chromium memory dheere dheere barhta hai)
 *  · fonts container mein install hon — CDN se load hon to render non-deterministic ho jata hai
 */
import { chromium, type Browser, type BrowserContext } from 'playwright'
import type { Logger } from '@oyebazar/core'
import { STATUS_CANVAS } from '@oyebazar/shared'

const RECYCLE_AFTER_RENDERS = 500

interface PooledContext {
  context: BrowserContext
  renders: number
}

export class RenderPool {
  private browser: Browser | null = null
  private idle: PooledContext[] = []
  private waiters: ((ctx: PooledContext) => void)[] = []
  private closing = false

  constructor(
    private readonly size: number,
    private readonly logger: Logger,
  ) {}

  async init(): Promise<void> {
    this.browser = await chromium.launch({
      args: [
        '--no-sandbox',
        '--disable-dev-shm-usage',
        // hinting off — warna Linux container aur Windows dev par font alag render hota hai
        '--font-render-hinting=none',
      ],
    })

    for (let i = 0; i < this.size; i++) {
      this.idle.push({ context: await this.newContext(), renders: 0 })
    }

    this.logger.info('render_pool_ready', { size: this.size })
  }

  private async newContext(): Promise<BrowserContext> {
    if (!this.browser) throw new Error('Pool init nahi hua')
    return this.browser.newContext({
      viewport: { width: STATUS_CANVAS.width, height: STATUS_CANVAS.height },
      deviceScaleFactor: 1,
      // sab renders par ek hi locale — number formatting deterministic rehti hai
      locale: 'ur-PK',
    })
  }

  /** Context milne tak intezar — busy-wait nahi, promise queue. */
  private acquire(): Promise<PooledContext> {
    const ready = this.idle.pop()
    if (ready) return Promise.resolve(ready)
    return new Promise((resolve) => this.waiters.push(resolve))
  }

  private async release(pooled: PooledContext): Promise<void> {
    if (this.closing) {
      await pooled.context.close().catch(() => undefined)
      return
    }

    if (pooled.renders >= RECYCLE_AFTER_RENDERS) {
      this.logger.info('render_context_recycled', { renders: pooled.renders })
      await pooled.context.close().catch(() => undefined)
      pooled = { context: await this.newContext(), renders: 0 }
    }

    const waiter = this.waiters.shift()
    if (waiter) waiter(pooled)
    else this.idle.push(pooled)
  }

  /** Ek context udhaar le kar kaam karta hai aur hamesha wapas karta hai (error par bhi). */
  async withContext<T>(work: (context: BrowserContext) => Promise<T>): Promise<T> {
    const pooled = await this.acquire()
    try {
      const result = await work(pooled.context)
      pooled.renders += 1
      return result
    } finally {
      await this.release(pooled)
    }
  }

  async close(): Promise<void> {
    this.closing = true
    await Promise.all(this.idle.map((p) => p.context.close().catch(() => undefined)))
    this.idle = []
    await this.browser?.close().catch(() => undefined)
    this.browser = null
  }
}
