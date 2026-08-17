import type { PrismaClient } from '@prisma/client'
import type { OtpChallengeRecord, OtpChallengeRepository } from '@oyebazar/core'

const OTP_SELECT = {
  id: true,
  phone: true,
  codeHash: true,
  attempts: true,
  expiresAt: true,
  consumedAt: true,
} as const

export class PrismaOtpChallengeRepository implements OtpChallengeRepository {
  constructor(private readonly db: PrismaClient) {}

  async create(input: {
    phone: string
    codeHash: string
    expiresAt: Date
  }): Promise<OtpChallengeRecord> {
    return this.db.otpChallenge.create({ data: input, select: OTP_SELECT })
  }

  /** Sirf sab se naya, un-consumed, un-expired challenge. Purane apne aap bekaar ho jate hain. */
  async findLatestActive(phone: string, now: Date): Promise<OtpChallengeRecord | null> {
    return this.db.otpChallenge.findFirst({
      where: { phone, consumedAt: null, expiresAt: { gt: now } },
      orderBy: { createdAt: 'desc' },
      select: OTP_SELECT,
    })
  }

  async incrementAttempts(id: string): Promise<number> {
    const row = await this.db.otpChallenge.update({
      where: { id },
      data: { attempts: { increment: 1 } },
      select: { attempts: true },
    })
    return row.attempts
  }

  async consume(id: string, at: Date): Promise<void> {
    await this.db.otpChallenge.update({ where: { id }, data: { consumedAt: at } })
  }

  async countRecentRequests(phone: string, since: Date): Promise<number> {
    return this.db.otpChallenge.count({ where: { phone, createdAt: { gte: since } } })
  }
}
