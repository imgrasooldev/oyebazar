import type { Analytics, AnalyticsEvent, Logger } from '@oyebazar/core'
import { prisma } from '@oyebazar/db'

/**
 * Events DB mein jate hain (PostHog Phase 2 mein aayega).
 *
 * ⚠ Analytics kabhi request ko fail na kare — track() ka error swallow hota hai.
 * Ye jaan boojh kar hai: metric na milne se reseller ka kaam nahi rukna chahiye.
 */
export class PrismaAnalytics implements Analytics {
  constructor(private readonly logger: Logger) {}

  async track(event: AnalyticsEvent): Promise<void> {
    try {
      await prisma.event.create({
        data: {
          name: event.name,
          actorType: event.actorType,
          actorId: event.actorId ?? null,
          properties: (event.properties ?? {}) as object,
        },
      })
    } catch (error) {
      this.logger.warn('analytics_track_failed', {
        event: event.name,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }
}
