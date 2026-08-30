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
import { PrismaPriceChangeRepository } from './repositories/price-change.repository'
import { PrismaSupplierProductRepository } from './repositories/supplier-product.repository'
import {
  PrismaAdminActivityRepository,
  PrismaAdminRepository,
  PrismaOpsUserRepository,
} from './repositories/admin.repository'
import { PrismaResellerRepository } from './repositories/reseller.repository'
import { PrismaResellerStatsRepository } from './repositories/reseller-stats.repository'
import { PrismaResellerPricingRepository } from './repositories/reseller-pricing.repository'
import { PrismaStatusPackRepository } from './repositories/status-pack.repository'
import { PrismaResellerTemplateRepository } from './repositories/reseller-template.repository'
import { PrismaSupplierDemandRepository } from './repositories/supplier-demand.repository'
import { PrismaOrderMessageRepository } from './repositories/order-message.repository'
import { PrismaSupplierReviewRepository } from './repositories/supplier-review.repository'
import { PrismaAddressRequestRepository } from './repositories/address-request.repository'
import { PrismaSessionRepository } from './repositories/session.repository'
import { PrismaOtpChallengeRepository } from './repositories/otp.repository'
import { PrismaCategoryRepository } from './repositories/category.repository'
import { PrismaOrderRepository } from './repositories/order.repository'
import { PrismaInventoryRepository } from './repositories/inventory.repository'
import { PrismaPayoutRepository } from './repositories/payout.repository'
import { PrismaMoneyLedgerRepository } from './repositories/money-ledger.repository'
import { PrismaOpsTriageRepository } from './repositories/ops-triage.repository'
import { PrismaCategoryAdminRepository } from './repositories/category-admin.repository'
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
  supplierProducts: PrismaSupplierProductRepository
  priceChanges: PrismaPriceChangeRepository
  admin: PrismaAdminRepository
  adminActivity: PrismaAdminActivityRepository
  opsUsers: PrismaOpsUserRepository
  resellers: PrismaResellerRepository
  resellerStats: PrismaResellerStatsRepository
  resellerPricing: PrismaResellerPricingRepository
  statusPacks: PrismaStatusPackRepository
  resellerTemplates: PrismaResellerTemplateRepository
  supplierDemand: PrismaSupplierDemandRepository
  orderMessages: PrismaOrderMessageRepository
  supplierReviews: PrismaSupplierReviewRepository
  addressRequests: PrismaAddressRequestRepository
  sessions: PrismaSessionRepository
  otpChallenges: PrismaOtpChallengeRepository
  categories: PrismaCategoryRepository
  orders: PrismaOrderRepository
  inventory: PrismaInventoryRepository
  payouts: PrismaPayoutRepository
  moneyLedger: PrismaMoneyLedgerRepository
  opsTriage: PrismaOpsTriageRepository
  categoryAdmin: PrismaCategoryAdminRepository
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
    supplierProducts: new PrismaSupplierProductRepository(client),
    priceChanges: new PrismaPriceChangeRepository(client),
    admin: new PrismaAdminRepository(client),
    adminActivity: new PrismaAdminActivityRepository(client),
    opsUsers: new PrismaOpsUserRepository(client),
    resellers: new PrismaResellerRepository(client),
    resellerStats: new PrismaResellerStatsRepository(client),
    resellerPricing: new PrismaResellerPricingRepository(client),
    statusPacks: new PrismaStatusPackRepository(client),
    resellerTemplates: new PrismaResellerTemplateRepository(client),
    supplierDemand: new PrismaSupplierDemandRepository(client),
    orderMessages: new PrismaOrderMessageRepository(client),
    supplierReviews: new PrismaSupplierReviewRepository(client),
    addressRequests: new PrismaAddressRequestRepository(client),
    sessions: new PrismaSessionRepository(client),
    otpChallenges: new PrismaOtpChallengeRepository(client),
    categories: new PrismaCategoryRepository(client),
    orders: new PrismaOrderRepository(client),
    inventory: new PrismaInventoryRepository(client),
    payouts: new PrismaPayoutRepository(client),
    moneyLedger: new PrismaMoneyLedgerRepository(client),
    opsTriage: new PrismaOpsTriageRepository(client),
    categoryAdmin: new PrismaCategoryAdminRepository(client),
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
export * from './repositories/supplier-product.repository'
export * from './repositories/admin.repository'
export * from './repositories/reseller.repository'
export * from './repositories/reseller-stats.repository'
export * from './repositories/reseller-pricing.repository'
export * from './repositories/status-pack.repository'
export * from './repositories/reseller-template.repository'
export * from './repositories/session.repository'
export * from './repositories/otp.repository'
export * from './repositories/category.repository'
export * from './repositories/order.repository'
export * from './repositories/inventory.repository'
export * from './repositories/ops-triage.repository'
export * from './repositories/payout.repository'
export * from './repositories/money-ledger.repository'
export * from './repositories/category-admin.repository'
export * from './repositories/fee-ledger.repository'
export * from './repositories/order-number'
export * from './repositories/daily-drop.repository'
export * from './repositories/broadcast.repository'
