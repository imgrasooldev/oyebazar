/**
 * Worker ka composition root — web ki tarah, wahid jagah jahan `new` likha jata hai.
 */
import {
  BroadcastService,
  DailyDropService,
  FeeInvoiceService,
  OrderReminderService,
  PregenerationService,
  type Analytics,
  type Logger,
  type ObjectStorage,
} from '@oyebazar/core'
import { createRepositories, prisma, type Repositories } from '@oyebazar/db'
import { BullMqRenderQueue, createRedisConnection, type Redis } from '@oyebazar/queue'
import { createMessagingProvider } from '@oyebazar/whatsapp'
import type { WorkerConfig } from './config'
import { ConsoleLogger } from './logger'
import { TokenBucketPacer } from './pacer'
import { RenderPool } from './render/pool'
import { StatusPackRenderer } from './render/render-status-pack'
import { LocalDiskStorage } from './storage/local'
import { SupabaseStorage } from './storage/supabase'

/** Analytics DB mein — worker ka koi PostHog client nahi (Phase 2). */
class PrismaAnalytics implements Analytics {
  constructor(private readonly logger: Logger) {}

  async track(event: Parameters<Analytics['track']>[0]): Promise<void> {
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
      // Metric na milne se job fail na ho
      this.logger.warn('analytics_track_failed', {
        event: event.name,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }
}

export interface WorkerContainer {
  readonly repositories: Repositories
  readonly logger: Logger
  readonly connection: Redis
  readonly pool: RenderPool
  readonly renderer: StatusPackRenderer
  readonly storage: ObjectStorage
  readonly dailyDrops: DailyDropService
  readonly pregeneration: PregenerationService
  readonly broadcast: BroadcastService
  readonly reminders: OrderReminderService
  readonly feeInvoices: FeeInvoiceService
}

export async function buildContainer(
  config: WorkerConfig & { redisUrl: string },
  logger: ConsoleLogger,
): Promise<WorkerContainer> {
  const repositories = createRepositories()
  const clock = { now: () => new Date() }
  const analytics = new PrismaAnalytics(logger)
  const connection = createRedisConnection(config.redisUrl)

  const storage: ObjectStorage =
    config.storage.kind === 'supabase'
      ? new SupabaseStorage(config.storage.url, config.storage.serviceKey, config.storage.bucket)
      : new LocalDiskStorage(config.storage.directory, config.storage.publicUrl)

  const pool = new RenderPool(config.renderConcurrency, logger)
  await pool.init()

  const messaging = createMessagingProvider(process.env, logger)
  const renderQueue = new BullMqRenderQueue(connection, logger)

  return {
    repositories,
    logger,
    connection,
    pool,
    storage,
    renderer: new StatusPackRenderer(pool, logger),
    dailyDrops: new DailyDropService(
      repositories.dailyDrops,
      repositories.products,
      repositories.resellerPricing,
      repositories.statusPacks,
      clock,
      logger,
    ),
    pregeneration: new PregenerationService(
      repositories.broadcastAudience,
      repositories.resellerPricing,
      repositories.statusPacks,
      repositories.products,
      renderQueue,
      logger,
    ),
    reminders: new OrderReminderService(
      repositories.orders,
      messaging,
      clock,
      analytics,
      logger,
    ),
    feeInvoices: new FeeInvoiceService(repositories.feeLedger, clock, analytics, logger),
    broadcast: new BroadcastService(
      repositories.broadcastAudience,
      repositories.messageLog,
      messaging,
      // 🔴 20 msg/sec — is se tez bhejna WhatsApp number restrict karwa deta hai
      new TokenBucketPacer(20, 200),
      clock,
      analytics,
      logger,
    ),
  }
}
