/**
 * BroadcastService — roz subah 9 baje ka "آج کا اسٹیٹس پیک".
 *
 * Ye reseller ki rozana ki aadat hai, aur asal wajah ke wo fee deti hai. Do cheezein
 * yahan ghalat hon to business ruk jata hai:
 *
 *  🔴 1. Raftaar — Meta ka number restrict ho gaya to broadcast band, aur wo jaldi
 *        wapas nahi aata. Isliye har message se pehle Pacer.
 *  🔴 2. Naaghe — ek din na bhejna reseller ki aadat tor deta hai. Isliye ek number ka
 *        fail hona poore broadcast ko nahi rokta.
 */
import type { BroadcastRecipient, DailyDropView } from '../domain/daily-drop'
import type {
  BroadcastAudienceRepository,
  MessageLogRepository,
} from '../ports/daily-drop-repositories'
import type { Analytics, Clock, Logger, MessagingProvider, Pacer } from '../ports/infrastructure'

/** Ek hi number par itne nakaam messages ke baad us par bhejna band. */
const FAILURE_LIMIT = 3
const FAILURE_WINDOW_DAYS = 3
const PAGE_SIZE = 100

/** Jo 21 din se app mein nahi aayi — usay roz bhejna quality rating khata hai. */
const INACTIVE_CUTOFF_DAYS = 21

export interface BroadcastResult {
  readonly sent: number
  readonly failed: number
  readonly skipped: number
}

export class BroadcastService {
  constructor(
    private readonly audience: BroadcastAudienceRepository,
    private readonly messageLog: MessageLogRepository,
    private readonly messaging: MessagingProvider,
    private readonly pacer: Pacer,
    private readonly clock: Clock,
    private readonly analytics: Analytics,
    private readonly logger: Logger,
  ) {}

  async sendDailyDrop(
    drop: DailyDropView,
    options: { appUrl: string; includeInactive?: boolean } = { appUrl: '' },
  ): Promise<BroadcastResult> {
    const now = this.clock.now()
    const failureSince = new Date(now.getTime() - FAILURE_WINDOW_DAYS * 24 * 3600 * 1000)
    const activeSince = options.includeInactive
      ? undefined
      : new Date(now.getTime() - INACTIVE_CUTOFF_DAYS * 24 * 3600 * 1000)

    let sent = 0
    let failed = 0
    let skipped = 0
    let cursor: string | null = null

    do {
      const page = await this.audience.listActive({
        limit: PAGE_SIZE,
        ...(cursor ? { cursor } : {}),
        ...(activeSince ? { activeSince } : {}),
      })

      for (const recipient of page.recipients) {
        const outcome = await this.sendOne(recipient, drop, options.appUrl, failureSince)
        if (outcome === 'sent') sent += 1
        else if (outcome === 'failed') failed += 1
        else skipped += 1
      }

      cursor = page.nextCursor
    } while (cursor)

    await this.analytics.track({
      name: 'daily_broadcast_sent',
      actorType: 'system',
      properties: { dropId: drop.id, sent, failed, skipped, items: drop.productIds.length },
    })

    this.logger.info('daily_broadcast_done', { dropId: drop.id, sent, failed, skipped })
    return { sent, failed, skipped }
  }

  private async sendOne(
    recipient: BroadcastRecipient,
    drop: DailyDropView,
    appUrl: string,
    failureSince: Date,
  ): Promise<'sent' | 'failed' | 'skipped'> {
    // Marra hua number — is par bhejte rehna Meta ki quality rating khata hai
    const failures = await this.messageLog.countRecentFailures(recipient.whatsappPhone, failureSince)
    if (failures >= FAILURE_LIMIT) {
      await this.audience.markLimited(
        recipient.id,
        `${failures} messages nakaam — number check karen`,
      )
      this.logger.warn('broadcast_recipient_limited', { resellerId: recipient.id, failures })
      return 'skipped'
    }

    // 🔴 Har message se pehle — 20/sec se zyada nahi
    await this.pacer.wait()

    const params = {
      name: recipient.name,
      count: String(drop.productIds.length),
      link: `${appUrl}/catalogue`,
    }

    try {
      const result = await this.messaging.sendTemplate({
        to: recipient.whatsappPhone,
        template: 'baji_daily_pack',
        params,
      })

      await this.messageLog.record({
        toPhone: recipient.whatsappPhone,
        template: 'baji_daily_pack',
        resellerId: recipient.id,
        providerMessageId: result.providerMessageId,
        status: 'sent',
        payload: params,
      })
      return 'sent'
    } catch (error) {
      // Ek number ka fail hona poora broadcast na roke — baqi 499 ko pack milna chahiye
      await this.messageLog.record({
        toPhone: recipient.whatsappPhone,
        template: 'baji_daily_pack',
        resellerId: recipient.id,
        status: 'failed',
        errorCode: error instanceof Error ? error.message.slice(0, 120) : 'unknown',
        payload: params,
      })
      this.logger.error('broadcast_send_failed', {
        resellerId: recipient.id,
        error: error instanceof Error ? error.message : String(error),
      })
      return 'failed'
    }
  }
}
