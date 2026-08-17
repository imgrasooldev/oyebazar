import type { PrismaClient } from '@prisma/client'
import type { OrderNumberGenerator } from '@oyebazar/core'

/**
 * Order number: BJ-1043
 *
 * Atomic increment — do orders ka ek hi number reconciliation tor deta hai.
 * `update` Postgres mein atomic hai, isliye race condition nahi banti.
 *
 * 1000 se shuru: "BJ-1" naya business hone ka ishara deta hai; wholesaler ke saamne
 * ye ghair-zaroori kamzori hai.
 */
const COUNTER_ID = 'order-number'
const STARTING_VALUE = 1_000

export class PrismaOrderNumberGenerator implements OrderNumberGenerator {
  constructor(private readonly db: PrismaClient) {}

  async next(): Promise<string> {
    const counter = await this.db.counter.upsert({
      where: { id: COUNTER_ID },
      create: { id: COUNTER_ID, value: STARTING_VALUE + 1 },
      update: { value: { increment: 1 } },
      select: { value: true },
    })
    return `BJ-${counter.value}`
  }
}
