/**
 * @oyebazar/db — Prisma adapters. Ye package core ke ports IMPLEMENT karta hai.
 *
 * apps/* mein kabhi `prisma` client seedha use na karen — hamesha repository ke through.
 * Warna price-leak ki teeno defence layers bypass ho jati hain.
 */
import type { PrismaClient } from '@prisma/client'
import { prisma } from './client'
import { PrismaProductRepository } from './repositories/product.repository'
import { PrismaSupplierRepository } from './repositories/supplier.repository'
import { PrismaResellerRepository } from './repositories/reseller.repository'
import { PrismaResellerPricingRepository } from './repositories/reseller-pricing.repository'
import { PrismaStatusPackRepository } from './repositories/status-pack.repository'
import { PrismaSessionRepository } from './repositories/session.repository'
import { PrismaOtpChallengeRepository } from './repositories/otp.repository'
import { PrismaCategoryRepository } from './repositories/category.repository'
import { PrismaOrderRepository } from './repositories/order.repository'
import { PrismaFeeLedgerRepository } from './repositories/fee-ledger.repository'
import { PrismaOrderNumberGenerator } from './repositories/order-number'
import { PrismaDailyDropRepository } from './repositories/daily-drop.repository'
import {
  PrismaBroadcastAudienceRepository,
  PrismaMessageLogRepository,
} from './repositories/broadcast.repository'

export interface Repositories {
  products: PrismaProductRepository
  suppliers: PrismaSupplierRepository
  resellers: PrismaResellerRepository
  resellerPricing: PrismaResellerPricingRepository
  statusPacks: PrismaStatusPackRepository
  sessions: PrismaSessionRepository
  otpChallenges: PrismaOtpChallengeRepository
  categories: PrismaCategoryRepository
  orders: PrismaOrderRepository
  feeLedger: PrismaFeeLedgerRepository
  orderNumbers: PrismaOrderNumberGenerator
  dailyDrops: PrismaDailyDropRepository
  broadcastAudience: PrismaBroadcastAudienceRepository
  messageLog: PrismaMessageLogRepository
}

export function createRepositories(client: PrismaClient = prisma): Repositories {
  return {
    products: new PrismaProductRepository(client),
    suppliers: new PrismaSupplierRepository(client),
    resellers: new PrismaResellerRepository(client),
    resellerPricing: new PrismaResellerPricingRepository(client),
    statusPacks: new PrismaStatusPackRepository(client),
    sessions: new PrismaSessionRepository(client),
    otpChallenges: new PrismaOtpChallengeRepository(client),
    categories: new PrismaCategoryRepository(client),
    orders: new PrismaOrderRepository(client),
    feeLedger: new PrismaFeeLedgerRepository(client),
    orderNumbers: new PrismaOrderNumberGenerator(client),
    dailyDrops: new PrismaDailyDropRepository(client),
    broadcastAudience: new PrismaBroadcastAudienceRepository(client),
    messageLog: new PrismaMessageLogRepository(client),
  }
}

export { prisma, createPrismaClient } from './client'
export * from './selectors'
export * from './repositories/product.repository'
export * from './repositories/supplier.repository'
export * from './repositories/reseller.repository'
export * from './repositories/reseller-pricing.repository'
export * from './repositories/status-pack.repository'
export * from './repositories/session.repository'
export * from './repositories/otp.repository'
export * from './repositories/category.repository'
export * from './repositories/order.repository'
export * from './repositories/fee-ledger.repository'
export * from './repositories/order-number'
export * from './repositories/daily-drop.repository'
export * from './repositories/broadcast.repository'
