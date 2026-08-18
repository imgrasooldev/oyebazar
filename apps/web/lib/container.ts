/**
 * COMPOSITION ROOT — poore app mein wahid jagah jahan `new` likha jata hai.
 *
 * Route handlers yahan se service maangte hain; kabhi khud repository ya Prisma nahi banate.
 * Isi wajah se test mein poori service graph fake ports ke saath khari ho jati hai.
 */
import {
  AuthService,
  BazaarService,
  CatalogueService,
  DailyDropService,
  FeeInvoiceService,
  OrderService,
  PricingService,
  StatusPackService,
  SupplierAuthService,
  SupplierCatalogueService,
  type Analytics,
  type Clock,
  type Logger,
  type MessagingProvider,
  type RateLimiter,
  type RenderQueue,
  type TokenGenerator,
} from '@oyebazar/core'
import { createRepositories, type Repositories } from '@oyebazar/db'
import { BullMqRenderQueue, createRedisConnection } from '@oyebazar/queue'
import { ConsoleLogger, CryptoTokenGenerator, SystemClock } from './adapters/system'
import { InMemoryRateLimiter } from './adapters/rate-limiter'
import { createMessagingProvider } from '@oyebazar/whatsapp'
import { PrismaAnalytics } from './adapters/analytics'
import { LoggingRenderQueue } from './adapters/render-queue'

export interface Container {
  readonly repositories: Repositories
  readonly clock: Clock
  readonly logger: Logger
  readonly tokens: TokenGenerator
  readonly analytics: Analytics
  readonly rateLimiter: RateLimiter
  readonly messaging: MessagingProvider
  readonly renderQueue: RenderQueue
  readonly bazaar: BazaarService
  readonly catalogue: CatalogueService
  readonly pricing: PricingService
  readonly statusPacks: StatusPackService
  readonly auth: AuthService
  /** Wholesaler portal — reseller wali auth se alag, qawaid alag hain. */
  readonly supplierAuth: SupplierAuthService
  readonly supplierCatalogue: SupplierCatalogueService
  readonly orders: OrderService
  readonly dailyDrops: DailyDropService
  readonly feeInvoices: FeeInvoiceService
}

/**
 * REDIS_URL ho to asli queue (worker render karega), warna sirf log —
 * taake naya developer bina Redis ke bhi app chala sake.
 */
function buildRenderQueue(logger: Logger): RenderQueue {
  const redisUrl = process.env.REDIS_URL
  if (!redisUrl) {
    logger.warn('render_queue_disabled', { reason: 'REDIS_URL set nahi' })
    return new LoggingRenderQueue(logger)
  }
  return new BullMqRenderQueue(createRedisConnection(redisUrl), logger)
}

function build(): Container {
  const repositories = createRepositories()
  const clock = new SystemClock()
  const logger = new ConsoleLogger()
  const tokens = new CryptoTokenGenerator()
  const analytics = new PrismaAnalytics(logger)
  const rateLimiter = new InMemoryRateLimiter()
  const messaging = createMessagingProvider(process.env, logger)
  const renderQueue = buildRenderQueue(logger)

  const pricing = new PricingService(repositories.products, repositories.resellerPricing, analytics)

  return {
    repositories,
    clock,
    logger,
    tokens,
    analytics,
    rateLimiter,
    messaging,
    renderQueue,
    pricing,
    bazaar: new BazaarService(repositories.suppliers, repositories.products),
    catalogue: new CatalogueService(repositories.products, repositories.resellerPricing),
    statusPacks: new StatusPackService(
      repositories.statusPacks,
      repositories.products,
      repositories.resellerPricing,
      pricing,
      renderQueue,
      clock,
      analytics,
    ),
    feeInvoices: new FeeInvoiceService(repositories.feeLedger, clock, analytics, logger),
    dailyDrops: new DailyDropService(
      repositories.dailyDrops,
      repositories.products,
      repositories.resellerPricing,
      repositories.statusPacks,
      clock,
      logger,
    ),
    orders: new OrderService(
      repositories.orders,
      repositories.products,
      repositories.suppliers,
      repositories.resellers,
      repositories.feeLedger,
      repositories.orderNumbers,
      messaging,
      tokens,
      clock,
      analytics,
      logger,
      process.env.APP_URL ?? 'http://localhost:3000',
    ),
    auth: new AuthService(
      repositories.otpChallenges,
      repositories.sessions,
      repositories.resellers,
      messaging,
      tokens,
      clock,
      rateLimiter,
      analytics,
      logger,
    ),
    supplierAuth: new SupplierAuthService(
      repositories.otpChallenges,
      repositories.sessions,
      repositories.suppliers,
      messaging,
      tokens,
      clock,
      rateLimiter,
      analytics,
      logger,
    ),
    supplierCatalogue: new SupplierCatalogueService(
      repositories.supplierProducts,
      analytics,
      logger,
    ),
  }
}

/**
 * Container har module load par naya banta hai — aur ye jaan boojh kar hai.
 *
 * Pehle isay `globalThis` par cache kiya tha, magar dev mein us ka natija ye tha ke
 * hot-reload ke baad bhi PURANA container zinda rehta tha: nayi service ya naya method
 * add karo, aur runtime par "is not a function" milta tha jab tak dev server restart na ho.
 *
 * Yahan cache karne ki zaroorat bhi nahi: mehnga resource sirf Prisma ka connection hai,
 * aur wo `@oyebazar/db` ke andar pehle se globalThis par cached hai. Baqi sab chand `new` hain.
 */
export const container: Container = build()
