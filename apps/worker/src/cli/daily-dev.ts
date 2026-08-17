/**
 * Rozana ka poora loop — ek command mein, bina Redis ke.
 *
 *   1. Aaj ka drop banao (5 items, category-wise, 14 din mein na dohraya gaya)
 *   2. Har active reseller ke liye status pack rows banao
 *   3. Sab pending packs render kar ke storage par rakho
 *
 * Production mein ye teen alag jobs hain (03:00 pre-generation, queue, worker). Ye CLI
 * sirf local development ke liye hai — naya developer poora chakkar 30 second mein dekh le.
 *
 *   pnpm --filter @oyebazar/worker daily:dev
 */
import { DailyDropService, PregenerationService, type RenderQueue } from '@oyebazar/core'
import { createRepositories, prisma } from '@oyebazar/db'
import { DEFAULT_TEMPLATE_KEY } from '@oyebazar/shared'
import { loadConfig } from '../config'
import { ConsoleLogger } from '../logger'
import { RenderPool } from '../render/pool'
import { StatusPackRenderer } from '../render/render-status-pack'
import { LocalDiskStorage } from '../storage/local'
import { SupabaseStorage } from '../storage/supabase'
import { handleRenderStatusPack } from '../jobs/render-status-pack.job'

const logger = new ConsoleLogger()

/** Queue ki jagah — rows ban jati hain, render hum khud yahin kar lete hain. */
class InlineQueue implements RenderQueue {
  readonly jobs: { statusPackId: string; resellerId: string; productId: string; templateKey: string; priceUsed: number }[] = []

  async enqueue(job: {
    statusPackId: string
    resellerId: string
    productId: string
    templateKey: string
    priceUsed: number
  }) {
    this.jobs.push(job)
    return { jobId: job.statusPackId }
  }
}

async function main(): Promise<void> {
  const config = loadConfig(process.cwd())
  const repositories = createRepositories()
  const clock = { now: () => new Date() }

  const drops = new DailyDropService(
    repositories.dailyDrops,
    repositories.products,
    repositories.resellerPricing,
    repositories.statusPacks,
    clock,
    logger,
  )

  const drop = await drops.ensureTodaysDrop()
  console.log(`Aaj ka drop: ${drop.productIds.length} items (${drop.dropDate.toDateString()})`)

  const queue = new InlineQueue()
  const pregeneration = new PregenerationService(
    repositories.broadcastAudience,
    repositories.resellerPricing,
    repositories.statusPacks,
    repositories.products,
    queue,
    logger,
  )

  const result = await pregeneration.pregenerate(drop, { templateKey: DEFAULT_TEMPLATE_KEY })
  console.log(`Resellers: ${result.resellers} · naye packs: ${result.queued} · pehle se tayyar: ${result.alreadyReady}`)

  if (queue.jobs.length === 0) {
    await prisma.$disconnect()
    return
  }

  const storage =
    config.storage.kind === 'supabase'
      ? new SupabaseStorage(config.storage.url, config.storage.serviceKey, config.storage.bucket)
      : new LocalDiskStorage(config.storage.directory, config.storage.publicUrl)

  const pool = new RenderPool(config.renderConcurrency, logger)
  await pool.init()
  const deps = { repositories, renderer: new StatusPackRenderer(pool, logger), storage, logger }

  const startedAt = Date.now()
  try {
    for (const job of queue.jobs) {
      await handleRenderStatusPack(job, deps)
    }
  } finally {
    await pool.close()
    await prisma.$disconnect()
  }

  const seconds = Math.round((Date.now() - startedAt) / 100) / 10
  console.log(`${queue.jobs.length} packs render ho gaye — ${seconds}s`)
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
