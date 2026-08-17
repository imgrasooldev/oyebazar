import type { PrismaClient } from '@prisma/client'
import type { SessionRecord, SessionRepository } from '@oyebazar/core'

const SESSION_SELECT = {
  id: true,
  resellerId: true,
  opsUserId: true,
  expiresAt: true,
} as const

export class PrismaSessionRepository implements SessionRepository {
  constructor(private readonly db: PrismaClient) {}

  async create(input: {
    tokenHash: string
    resellerId?: string
    opsUserId?: string
    expiresAt: Date
    userAgent?: string
  }): Promise<SessionRecord> {
    return this.db.session.create({
      data: {
        tokenHash: input.tokenHash,
        expiresAt: input.expiresAt,
        ...(input.resellerId ? { resellerId: input.resellerId } : {}),
        ...(input.opsUserId ? { opsUserId: input.opsUserId } : {}),
        ...(input.userAgent ? { userAgent: input.userAgent } : {}),
      },
      select: SESSION_SELECT,
    })
  }

  async findByTokenHash(tokenHash: string): Promise<SessionRecord | null> {
    return this.db.session.findUnique({ where: { tokenHash }, select: SESSION_SELECT })
  }

  async touch(id: string, at: Date): Promise<void> {
    await this.db.session.update({ where: { id }, data: { lastSeenAt: at } })
  }

  async delete(id: string): Promise<void> {
    await this.db.session.delete({ where: { id } }).catch(() => undefined)
  }

  /** 🔴 Shared phone rule — logout har device se hota hai. */
  async deleteAllForReseller(resellerId: string): Promise<void> {
    await this.db.session.deleteMany({ where: { resellerId } })
  }

  async deleteExpired(now: Date): Promise<number> {
    const { count } = await this.db.session.deleteMany({ where: { expiresAt: { lt: now } } })
    return count
  }
}
