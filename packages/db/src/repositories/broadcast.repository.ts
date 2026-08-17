import type { PrismaClient } from '@prisma/client'
import type {
  BroadcastAudienceRepository,
  BroadcastRecipient,
  MessageLogRepository,
  OutboundMessageLog,
} from '@oyebazar/core'

export class PrismaBroadcastAudienceRepository implements BroadcastAudienceRepository {
  constructor(private readonly db: PrismaClient) {}

  async listActive(options: { activeSince?: Date; limit: number; cursor?: string }): Promise<{
    recipients: BroadcastRecipient[]
    nextCursor: string | null
  }> {
    const rows = await this.db.reseller.findMany({
      where: {
        status: 'ACTIVE', // 🔴 LIMITED aur SUSPENDED broadcast se bahar
        ...(options.activeSince
          ? {
              OR: [
                { lastActiveAt: { gte: options.activeSince } },
                // nayi resellers jo abhi tak login nahi kar payin — unhen mauqa dena hai
                { lastActiveAt: null, createdAt: { gte: options.activeSince } },
              ],
            }
          : {}),
      },
      select: { id: true, name: true, whatsappPhone: true },
      orderBy: { id: 'asc' },
      take: options.limit + 1,
      ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
    })

    const hasMore = rows.length > options.limit
    const recipients = hasMore ? rows.slice(0, options.limit) : rows

    return {
      recipients,
      nextCursor: hasMore ? (recipients.at(-1)?.id ?? null) : null,
    }
  }

  /** SUSPENDED nahi — LIMITED. Number theek ho to ops wapas ACTIVE kar deti hai. */
  async markLimited(resellerId: string, reason: string): Promise<void> {
    await this.db.reseller.update({ where: { id: resellerId }, data: { status: 'LIMITED' } })
    await this.db.event.create({
      data: {
        name: 'reseller_limited',
        actorType: 'system',
        actorId: resellerId,
        properties: { reason },
      },
    })
  }
}

export class PrismaMessageLogRepository implements MessageLogRepository {
  constructor(private readonly db: PrismaClient) {}

  async record(message: OutboundMessageLog): Promise<void> {
    await this.db.whatsappMessage.create({
      data: {
        toPhone: message.toPhone,
        template: message.template,
        resellerId: message.resellerId ?? null,
        waMessageId: message.providerMessageId ?? null,
        status: message.status,
        errorCode: message.errorCode ?? null,
        direction: 'OUT',
        payload: message.payload as object,
      },
    })
  }

  async countRecentFailures(phone: string, since: Date): Promise<number> {
    return this.db.whatsappMessage.count({
      where: { toPhone: phone, status: 'failed', direction: 'OUT', createdAt: { gte: since } },
    })
  }
}
