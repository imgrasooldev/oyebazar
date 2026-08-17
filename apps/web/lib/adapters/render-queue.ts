import type { Logger, RenderQueue, RenderStatusPackJob } from '@oyebazar/core'

/**
 * Fallback render queue — sirf tab chalti hai jab REDIS_URL set na ho.
 *
 * Naya developer bina Redis ke app chala sake, is liye. Is halat mein status pack
 * "RENDERING" par ruk jata hai aur UI ye saaf batati hai — fake image dikhana
 * reseller ka bharosa torta hai.
 *
 * Asli queue: `BullMqRenderQueue` (@oyebazar/queue) → apps/worker render karta hai.
 */
export class LoggingRenderQueue implements RenderQueue {
  constructor(private readonly logger: Logger) {}

  async enqueue(job: RenderStatusPackJob): Promise<{ jobId: string }> {
    this.logger.warn('render_job_dropped', {
      statusPackId: job.statusPackId,
      productId: job.productId,
      templateKey: job.templateKey,
      priceUsed: job.priceUsed,
      reason: 'REDIS_URL set nahi — worker tak job nahi ja sakti',
    })
    return { jobId: `noop-${job.statusPackId}` }
  }
}
