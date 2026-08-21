/**
 * Rozana ke do jobs — inhi par reseller ki aadat khari hai.
 *
 *   03:00 PKT  pregenerate-daily-packs — sab packs raat ko bana kar rakh dena
 *   09:00 PKT  daily-broadcast         — "آج کا اسٹیٹس پیک" har reseller ke WhatsApp par
 *
 * Dono idempotent hain: ek din ka drop ek hi baar banta hai, aur bane hue packs
 * dobara render nahi hote.
 */
import { DEFAULT_TEMPLATE_KEY } from '@oyebazar/shared'
import type { WorkerContainer } from '../container'

/** Jo 21 din se nazar nahi aayi — us par roz kharch karna Meta rating bhi khata hai. */
const ACTIVE_WINDOW_DAYS = 21

function activeSince(): Date {
  return new Date(Date.now() - ACTIVE_WINDOW_DAYS * 24 * 3600 * 1000)
}

export async function runNightlyPregeneration(container: WorkerContainer): Promise<{
  dropId: string
  queued: number
  alreadyReady: number
}> {
  // Drop yahin banta hai — broadcast usi list ko bhejta hai jo yahan chuni gayi
  const drop = await container.dailyDrops.ensureTodaysDrop()

  const result = await container.pregeneration.pregenerate(drop, {
    templateKey: DEFAULT_TEMPLATE_KEY,
    activeSince: activeSince(),
  })

  container.logger.info('nightly_pregeneration_done', {
    dropId: drop.id,
    resellers: result.resellers,
    queued: result.queued,
    alreadyReady: result.alreadyReady,
  })

  return { dropId: drop.id, queued: result.queued, alreadyReady: result.alreadyReady }
}

/**
 * Har aadhe ghante — do kaam ek job mein (dono halke hain, alag queue ka faida nahi).
 *   6 ghante  → reseller ko yaad dilao
 *  24 ghante  → order khud cancel
 *   4 din     → raste mein khare order par dukan se poochho
 */
export async function runOrderMaintenance(container: WorkerContainer): Promise<{
  reminded: number
  cancelled: number
  transitAsked: number
}> {
  const reminder = await container.reminders.remindStale()
  const cancel = await container.reminders.autoCancelStale()
  // 4 din se raste mein khare order — dukan se poochho, warna reseller ka paisa atka rehta hai
  const transit = await container.reminders.remindStuckInTransit()

  return {
    reminded: reminder.reminded,
    cancelled: cancel.cancelled,
    transitAsked: transit.reminded,
  }
}

/** Mahine ki 1 tareekh — pichhle mahine ki fee ka invoice har supplier ke liye. */
export async function runMonthlyFeeInvoicing(container: WorkerContainer): Promise<{
  invoices: number
  total: number
}> {
  const invoices = await container.feeInvoices.generateMonthlyInvoices()
  const total = invoices.reduce((sum, invoice) => sum + invoice.amount, 0)

  container.logger.info('monthly_fee_invoicing_done', {
    invoices: invoices.length,
    total,
    // 🔴 Ye number founder ko har mahine dekhna chahiye — yehi hamari kamai hai
    detail: invoices.map((i) => ({ id: i.invoiceId, supplier: i.businessName, amount: i.amount })),
  })

  return { invoices: invoices.length, total }
}

export async function runDailyBroadcast(container: WorkerContainer): Promise<{
  sent: number
  failed: number
  skipped: number
}> {
  const drop = await container.dailyDrops.ensureTodaysDrop()

  // 🔴 Do baar bhejna spam hai — Meta ki quality rating par seedha asar
  if (drop.status === 'SENT') {
    container.logger.warn('broadcast_already_sent', { dropId: drop.id, sentAt: drop.sentAt })
    return { sent: 0, failed: 0, skipped: 0 }
  }

  const result = await container.broadcast.sendDailyDrop(drop, {
    appUrl: process.env.APP_URL ?? 'https://baji.pk',
  })

  await container.dailyDrops.markSent(drop.id, result.sent)
  return result
}
