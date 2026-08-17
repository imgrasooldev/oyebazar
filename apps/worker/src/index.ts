/**
 * Baji worker — teen queues, ek process.
 *
 *   render-status-pack        on-demand + nightly (Playwright pool)
 *   pregenerate-daily-packs   03:00 PKT
 *   daily-broadcast           09:00 PKT
 *
 * Ye service Vercel par nahi chal sakti: Playwright ko long-running process aur ~1GB
 * memory chahiye. Fly.io par chalti hai (fly.worker.toml).
 *
 * Graceful shutdown ahem hai — Fly deploy par SIGTERM aata hai; adhoore render se
 * status pack hamesha ke liye "RENDERING" par atak jata hai.
 */
import { createServer } from 'node:http'
import { QUEUE_NAMES, Worker, registerDailySchedules, type Job } from '@oyebazar/queue'
import type { RenderStatusPackJob } from '@oyebazar/core'
import { prisma } from '@oyebazar/db'
import { loadConfig } from './config'
import { buildContainer } from './container'
import { ConsoleLogger } from './logger'
import { handleRenderStatusPack } from './jobs/render-status-pack.job'
import {
  runDailyBroadcast,
  runMonthlyFeeInvoicing,
  runNightlyPregeneration,
  runOrderMaintenance,
} from './jobs/daily.jobs'

const logger = new ConsoleLogger()

async function main(): Promise<void> {
  const config = loadConfig(process.cwd())

  if (!config.redisUrl) {
    logger.error('REDIS_URL set nahi — worker start nahi ho sakta', {
      hint: 'dev mein render dekhne ke liye: pnpm --filter @oyebazar/worker render:preview',
    })
    process.exit(1)
  }

  const container = await buildContainer({ ...config, redisUrl: config.redisUrl }, logger)
  logger.info('storage_selected', { kind: config.storage.kind })

  const renderDeps = {
    repositories: container.repositories,
    renderer: container.renderer,
    storage: container.storage,
    logger,
  }

  const workers = [
    new Worker<RenderStatusPackJob>(
      QUEUE_NAMES.renderStatusPack,
      async (job: Job<RenderStatusPackJob>) => handleRenderStatusPack(job.data, renderDeps),
      {
        connection: container.connection,
        // pool size se zyada concurrency ka faida nahi — contexts hi bottleneck hain
        concurrency: config.renderConcurrency,
      },
    ),

    new Worker(QUEUE_NAMES.pregenerateDailyPacks, async () => runNightlyPregeneration(container), {
      connection: container.connection,
      concurrency: 1,
    }),

    // 🔴 concurrency 1 — do broadcast ek saath chalein to har reseller ko do messages
    new Worker(QUEUE_NAMES.dailyBroadcast, async () => runDailyBroadcast(container), {
      connection: container.connection,
      concurrency: 1,
    }),

    new Worker(QUEUE_NAMES.orderMaintenance, async () => runOrderMaintenance(container), {
      connection: container.connection,
      concurrency: 1,
    }),

    // 🔴 Paisa — concurrency 1, warna ek supplier ke do invoice ban sakte hain
    new Worker(QUEUE_NAMES.feeInvoicing, async () => runMonthlyFeeInvoicing(container), {
      connection: container.connection,
      concurrency: 1,
    }),
  ]

  for (const worker of workers) {
    worker.on('failed', (job, error) => {
      logger.error('job_failed', {
        queue: worker.name,
        jobId: job?.id,
        attempts: job?.attemptsMade,
        error: error.message,
      })
    })
  }

  await registerDailySchedules(container.connection)
  logger.info('daily_schedules_registered', { timezone: 'Asia/Karachi' })

  // Fly.io health check
  const health = createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: true, service: 'worker', queues: workers.map((w) => w.name) }))
  })
  health.listen(config.healthPort)

  logger.info('worker_started', {
    queues: workers.map((w) => w.name),
    concurrency: config.renderConcurrency,
    healthPort: config.healthPort,
  })

  const shutdown = async (signal: string): Promise<void> => {
    logger.info('worker_shutting_down', { signal })
    // chalte hue jobs ko poora hone dena
    await Promise.all(workers.map((worker) => worker.close()))
    await container.pool.close()
    await container.connection.quit().catch(() => undefined)
    await prisma.$disconnect().catch(() => undefined)
    health.close()
    process.exit(0)
  }

  process.on('SIGTERM', () => void shutdown('SIGTERM'))
  process.on('SIGINT', () => void shutdown('SIGINT'))
}

main().catch((error: unknown) => {
  logger.error('worker_boot_failed', {
    error: error instanceof Error ? error.message : String(error),
  })
  process.exit(1)
})
