/**
 * COMPOSITION ROOT — poore app mein wahid jagah jahan `new` likha jata hai.
 *
 * Route handlers yahan se service maangte hain; kabhi khud repository ya Prisma nahi banate.
 * Isi wajah se test mein poori service graph fake ports ke saath khari ho jati hai.
 */
import {
  AdminService,
  AuthService,
  BazaarService,
  CatalogueService,
  DailyDropService,
  FeeInvoiceService,
  InventoryService,
  OpsTriageService,
  CategoryAdminService,
  OrderService,
  PayoutService,
  PriceChangeService,
  PricingService,
  OpsAuthService,
  StatusPackService,
  SupplierAuthService,
  SupplierOnboardingService,
  SupplierCatalogueService,
  type Analytics,
  type Clock,
  type Logger,
  type MessagingProvider,
  type RateLimiter,
  type ObjectStorage,
  type RenderQueue,
  type TokenGenerator,
} from '@oyebazar/core'
import { createRepositories, type Repositories } from '@oyebazar/db'
import { createStorage, storageConfigFrom } from '@oyebazar/storage'
import { BullMqRenderQueue, createRedisConnection } from '@oyebazar/queue'
import { ConsoleLogger, CryptoTokenGenerator, SystemClock } from './adapters/system'
import { InMemoryRateLimiter } from './adapters/rate-limiter'
import { StaticOtpTokens } from './static-otp-tokens'
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
  /** Wholesaler ki upload ki hui tasveerein aur video yahan jate hain. */
  readonly storage: ObjectStorage
  /** Hamari storage ka public prefix — upload ki hui media ki pehchan isi se hoti hai. */
  readonly mediaBaseUrl: string
  readonly bazaar: BazaarService
  readonly catalogue: CatalogueService
  readonly pricing: PricingService
  readonly statusPacks: StatusPackService
  readonly auth: AuthService
  /** Wholesaler portal — reseller wali auth se alag, qawaid alag hain. */
  readonly supplierAuth: SupplierAuthService
  /** Admin portal — ops ka apna login aur website ki management. */
  readonly opsAuth: OpsAuthService
  readonly admin: AdminService
  readonly supplierCatalogue: SupplierCatalogueService
  /** 🔴 Maal ka register aur lagat — dukan ke andar ka hisab, kisi aur ko nahi dikhta. */
  readonly inventory: InventoryService
  /** Ops ki chhanni — kya cheez abhi nazar maangti hai */
  readonly opsTriage: OpsTriageService
  /** 🔴 LIVE maal ka rate — dukan wala maangta hai, ops badalti hai. */
  readonly priceChanges: PriceChangeService
  /** Nayi dukan ki darkhwast — public form se aati hai, chalu ops karti hai. */
  readonly supplierOnboarding: SupplierOnboardingService
  readonly orders: OrderService
  /** 🔴 Reseller ke paise — do taraf ki tasdeeq, tafseel PayoutService mein. */
  readonly payouts: PayoutService
  /** Category ka darakht — ops banati aur tarteeb deti hai. */
  readonly categoryAdmin: CategoryAdminService
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

  /*
   * Muqarrar (static) OTP — sirf tab jab STATIC_OTP saaf tor par set kiya gaya ho.
   *
   * 🔴 Ye khud ba khud kabhi chalu nahi hota, aur chalu hone par LOG mein chillata hai —
   * kyunke asal khatra ye nahi ke koi isay lagaye, khatra ye hai ke lagane ke baad koi
   * usay bhool jaye aur wo asli launch tak chalta rahe.
   */
  const staticOtp = process.env.STATIC_OTP?.trim()
  const loginTokens = staticOtp ? new StaticOtpTokens(tokens, staticOtp) : tokens

  if (staticOtp) {
    logger.warn('static_otp_enabled', {
      // Code khud LOG mein nahi jata — log aksar teesre bande dekh lete hain
      length: staticOtp.length,
      note: 'Reseller aur dukan ka login muqarrar code par hai. Ops is se bahar hai.',
    })
  }
  const analytics = new PrismaAnalytics(logger)
  const rateLimiter = new InMemoryRateLimiter()
  const messaging = createMessagingProvider(process.env, logger)
  const renderQueue = buildRenderQueue(logger)

  /*
   * Dev mein upload seedha `apps/web/public/_dev-media` mein girti hai, jahan se Next
   * usay serve kar deta hai — naya developer bina kisi cloud account ke poora flow
   * chala leta hai. SUPABASE_URL + SUPABASE_SERVICE_KEY set hon to wahi chalti hai.
   */
  const storage = createStorage(storageConfigFrom(process.env, `${process.cwd()}/public/_dev-media`))
  const mediaBaseUrl = storage.publicUrl('')

  const pricing = new PricingService(repositories.products, repositories.resellerPricing, analytics)

  // AdminService bhi isay istemal karti hai, is liye object literal se bahar —
  // literal ke andar se apni hi property reference nahi ho sakti
  const feeInvoices = new FeeInvoiceService(repositories.feeLedger, clock, analytics, logger)

  /*
   * PayoutService OrderService se pehle banti hai — delivery par order hi payout ki row
   * kholta hai. Phone lookup do chhote function hain, poore repositories nahi: service
   * ko sirf number chahiye, `payoutAccount` ya `feeRateBps` tak rasai nahi honi chahiye.
   */
  const payouts = new PayoutService(
    repositories.payouts,
    repositories.moneyLedger,
    {
      reseller: async (id) => (await repositories.resellers.findById(id))?.whatsappPhone ?? '',
      supplier: async (id) => (await repositories.suppliers.findInternal(id))?.phone ?? '',
    },
    messaging,
    clock,
    analytics,
    logger,
  )

  return {
    repositories,
    clock,
    logger,
    tokens,
    analytics,
    rateLimiter,
    messaging,
    renderQueue,
    storage,
    mediaBaseUrl,
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
    feeInvoices,
    dailyDrops: new DailyDropService(
      repositories.dailyDrops,
      repositories.products,
      repositories.resellerPricing,
      repositories.statusPacks,
      clock,
      logger,
    ),
    payouts,
    categoryAdmin: new CategoryAdminService(repositories.categoryAdmin, analytics, logger),
    opsTriage: new OpsTriageService(repositories.opsTriage, clock),
    inventory: new InventoryService(
      repositories.inventory,
      // Wohi Prisma class dono port poore karti hai — port alag hain, adapter ek
      repositories.inventory,
      analytics,
      logger,
    ),
    orders: new OrderService(
      repositories.orders,
      repositories.products,
      repositories.suppliers,
      repositories.resellers,
      repositories.feeLedger,
      payouts,
      repositories.inventory,
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
      loginTokens,
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
      loginTokens,
      clock,
      rateLimiter,
      analytics,
      logger,
    ),
    /*
     * 🔴 Ops ko `loginTokens` NAHI diya jata — jaan boojh kar.
     *
     * Yahan poora paisa hai, har dukan aur har reseller ka data hai, aur team ka
     * ikhtiyar bhi. Us darwaze ko muqarrar code par kholna reseller ke darwaze se
     * bilkul alag darja ka khatra hai. Ops ka code random rehta hai aur logs se parha
     * jata hai (WhatsApp lagne tak).
     */
    opsAuth: new OpsAuthService(
      repositories.otpChallenges,
      repositories.sessions,
      repositories.opsUsers,
      messaging,
      tokens,
      clock,
      rateLimiter,
      analytics,
      logger,
    ),
    admin: new AdminService(
      repositories.admin,
      feeInvoices,
      repositories.feeLedger,
      repositories.opsUsers,
      clock,
      analytics,
      logger,
    ),
    priceChanges: new PriceChangeService(
      repositories.priceChanges,
      repositories.products,
      repositories.suppliers,
      clock,
      analytics,
      logger,
    ),
    supplierCatalogue: new SupplierCatalogueService(
      repositories.supplierProducts,
      repositories.suppliers,
      repositories.inventory,
      analytics,
      logger,
      mediaBaseUrl,
    ),
    supplierOnboarding: new SupplierOnboardingService(
      repositories.suppliers,
      messaging,
      rateLimiter,
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
