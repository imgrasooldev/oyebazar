/**
 * @oyebazar/queue — BullMQ ka wahid rasta.
 *
 * Web sirf PRODUCER use karta hai (`BullMqRenderQueue`), worker CONSUMER.
 * Queue names aur job payload dono jagah yahin se aate hain — string typo se bachne ke liye.
 */
import { Queue, type JobsOptions } from 'bullmq'
import IORedis, { type Redis } from 'ioredis'
import type { RenderQueue, RenderStatusPackJob, Logger } from '@oyebazar/core'

export const QUEUE_NAMES = {
  renderStatusPack: 'render-status-pack',
  pregenerateDailyPacks: 'pregenerate-daily-packs',
  dailyBroadcast: 'daily-broadcast',
  orderMaintenance: 'order-maintenance',
  feeInvoicing: 'fee-invoicing',
  processMedia: 'process-media',
  templateAssetSweep: 'template-asset-sweep',
} as const

/**
 * Rozana ka schedule — waqt Pakistan ka hai, server ka nahi.
 *
 * 🔴 03:00 pre-generation aur 09:00 broadcast ke darmiyan 6 ghante ka faasla jaan boojh kar hai:
 * 10,000 renders ~25 minute lete hain, magar agar koi cheez atak jaye to subah tak
 * theek karne ka waqt mil jata hai. Broadcast bhejne ke baad pata chalna bohat dair hai.
 */
export const SCHEDULE = {
  timezone: 'Asia/Karachi',
  pregenerate: '0 3 * * *',
  broadcast: '0 9 * * *',
  /** har aadhe ghante — 6-ghante wale reminder aur 24-ghante wale auto-cancel ke liye */
  orderMaintenance: '*/30 * * * *',
  /** mahine ki 1 tareekh, subah 10 baje — ops ke kaam ke waqt, taake koi dekh sake */
  feeInvoicing: '0 10 1 * *',
  /*
   * Itwar raat 2 baje — beykar pari hui template tasveeron ki safai.
   *
   * 🔴 03:00 wali pre-generation se PEHLE, us ke saath nahi. Safai poore bucket ki
   * list maangti hai aur pre-generation us waqt hazaron render chala rahi hoti hai;
   * dono ek saath chalane ka matlab hai ke safai us kaam ko dheema kare jis par
   * reseller ki subah khari hai. Ek ghante ka faasla kaafi hai — safai chand second
   * ki cheez hai.
   */
  templateAssetSweep: '0 2 * * 0',
} as const

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES]

/**
 * Har job idempotent hona chahiye aur retry backoff ke saath.
 * `removeOnComplete` isliye ke roz 10,000 renders Redis bhar dete hain.
 */
export const DEFAULT_JOB_OPTIONS: JobsOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 2_000 },
  removeOnComplete: { count: 1_000, age: 24 * 3600 },
  removeOnFail: { count: 5_000 },
}

export function createRedisConnection(url: string): Redis {
  return new IORedis(url, {
    // BullMQ ki shart — warna blocking commands par error deta hai
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  })
}

/**
 * Producer — StatusPackService isi ke through render job bhejti hai.
 *
 * jobId = statusPackId: agar reseller do baar "بنائیں" dabaye to ek hi job banti hai
 * (BullMQ duplicate jobId ignore kar deta hai). Ye hamari idempotency hai.
 */
export class BullMqRenderQueue implements RenderQueue {
  private readonly queue: Queue<RenderStatusPackJob>

  constructor(connection: Redis, private readonly logger?: Logger) {
    this.queue = new Queue<RenderStatusPackJob>(QUEUE_NAMES.renderStatusPack, {
      connection,
      defaultJobOptions: DEFAULT_JOB_OPTIONS,
    })
  }

  /**
   * 🔴 Redis ka masla reseller ki screen tak nahi jana chahiye.
   *
   * Pehle yahan se error seedha upar jata tha aur poori request 500 de kar marti thi —
   * reseller ko "kuch gharbar ho gayi" milta tha aur pack ka safha hi toot jata tha.
   *
   * Aisa asal mein hua: Upstash ka mahane ka quota khatam hua, har enqueue phenkne
   * laga, aur pack banana bilkul band ho gaya.
   *
   * Ab wo soorat waisi hi hai jaisi REDIS_URL na hone par hoti hai (dekhen
   * `LoggingRenderQueue`): pack ki row ban chuki hoti hai aur RENDERING par rehti hai,
   * UI apna "thora waqt lag raha hai" wala paighaam dikhata hai, aur baqi poora safha
   * — maal, rate, order — chalta rehta hai.
   *
   * Log `error` par hai, `warn` par nahi: ye khamoshi se guzar jane wali baat nahi.
   */
  async enqueue(job: RenderStatusPackJob): Promise<{ jobId: string }> {
    try {
      const added = await this.queue.add(QUEUE_NAMES.renderStatusPack, job, {
        jobId: job.statusPackId,
        // reseller intezar kar rahi hai — ye job nightly pre-generation se pehle chale
        priority: 1,
      })
      this.logger?.info('render_job_enqueued', { jobId: added.id, statusPackId: job.statusPackId })
      return { jobId: added.id ?? job.statusPackId }
    } catch (error) {
      this.logger?.error('render_job_enqueue_failed', {
        statusPackId: job.statusPackId,
        error: error instanceof Error ? error.message : String(error),
      })
      return { jobId: job.statusPackId }
    }
  }

  close(): Promise<void> {
    return this.queue.close()
  }
}

/**
 * Rozana jobs ko qatar mein lagata hai.
 *
 * `jobId` mein tareekh hai — is se ek din ka job ek hi baar chalta hai, chahe worker
 * do baar deploy ho ya do machines chal rahi hon.
 */
export async function registerDailySchedules(connection: Redis): Promise<void> {
  const pregenerate = new Queue(QUEUE_NAMES.pregenerateDailyPacks, { connection })
  const broadcast = new Queue(QUEUE_NAMES.dailyBroadcast, { connection })

  await pregenerate.upsertJobScheduler(
    'nightly-pregeneration',
    { pattern: SCHEDULE.pregenerate, tz: SCHEDULE.timezone },
    { name: QUEUE_NAMES.pregenerateDailyPacks, opts: DEFAULT_JOB_OPTIONS },
  )

  await broadcast.upsertJobScheduler(
    'morning-broadcast',
    { pattern: SCHEDULE.broadcast, tz: SCHEDULE.timezone },
    {
      name: QUEUE_NAMES.dailyBroadcast,
      opts: {
        ...DEFAULT_JOB_OPTIONS,
        // 🔴 Broadcast retry NAHI karta. Aadha bhej kar fail hua job dobara chale to
        // aadhi resellers ko do messages jate hain — Meta ki nazar mein ye spam hai.
        attempts: 1,
      },
    },
  )

  const maintenance = new Queue(QUEUE_NAMES.orderMaintenance, { connection })
  await maintenance.upsertJobScheduler(
    'order-maintenance',
    { pattern: SCHEDULE.orderMaintenance, tz: SCHEDULE.timezone },
    { name: QUEUE_NAMES.orderMaintenance, opts: DEFAULT_JOB_OPTIONS },
  )

  const invoicing = new Queue(QUEUE_NAMES.feeInvoicing, { connection })
  await invoicing.upsertJobScheduler(
    'monthly-fee-invoicing',
    { pattern: SCHEDULE.feeInvoicing, tz: SCHEDULE.timezone },
    { name: QUEUE_NAMES.feeInvoicing, opts: { ...DEFAULT_JOB_OPTIONS, attempts: 2 } },
  )

  const sweep = new Queue(QUEUE_NAMES.templateAssetSweep, { connection })
  await sweep.upsertJobScheduler(
    'template-asset-sweep',
    { pattern: SCHEDULE.templateAssetSweep, tz: SCHEDULE.timezone },
    {
      name: QUEUE_NAMES.templateAssetSweep,
      /*
       * 🔴 Retry NAHI. Safai poore bucket ki list maangti hai; aadhe raste mein fail
       * hone par dobara chalana wohi mehnga kaam dohrata hai, aur us ka koi faida nahi
       * — agle hafte wohi files phir bhi wahin hongi. Jo mit gayin wo mit chukin, aur
       * wo faisla har dafa naye sire se hota hai.
       */
      opts: { ...DEFAULT_JOB_OPTIONS, attempts: 1 },
    },
  )

  await Promise.all([
    pregenerate.close(),
    broadcast.close(),
    maintenance.close(),
    invoicing.close(),
    sweep.close(),
  ])
}

export type { RenderStatusPackJob }
export { Queue, Worker, type Job } from 'bullmq'
export type { Redis }
