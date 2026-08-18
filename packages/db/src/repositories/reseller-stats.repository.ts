/**
 * ResellerStatsRepository — reseller ke apne dashboard ke number.
 *
 * 🔴 Har query mein `resellerId` shart ke taur par hai. Ye us ka apna dashboard hai,
 * kisi aur ka number yahan se nikal hi nahi sakta.
 *
 * Kamai sirf DELIVERED order par ginti hai. Raste mein para hua order abhi paisa nahi
 * hai — us ko kamai mein dikhana reseller ko jhoota hisab dena hoga, aur RTO hone par
 * number ghat jayega jise wo apni ghalti samjhegi.
 */
import type { PrismaClient } from '@prisma/client'
import type { ResellerStatsRepository, ResellerStatsView } from '@oyebazar/core'
import { pkr } from '@oyebazar/shared'

/** Ye order abhi chal rahe hain — na ruke hue, na khatam. */
const RUNNING = ['CONFIRMED', 'SENT_TO_SUPPLIER', 'ACCEPTED', 'DISPATCHED'] as const

export class PrismaResellerStatsRepository implements ResellerStatsRepository {
  constructor(private readonly db: PrismaClient) {}

  async summary(resellerId: string, now: Date): Promise<ResellerStatsView> {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const [awaiting, running, delivered, packsMade, packsDownloaded, deliveredOrders] =
      await this.db.$transaction([
        this.db.order.count({ where: { resellerId, status: 'PENDING_CONFIRM' } }),
        this.db.order.count({ where: { resellerId, status: { in: [...RUNNING] } } }),
        this.db.order.count({ where: { resellerId, status: 'DELIVERED' } }),
        this.db.statusPack.count({ where: { resellerId, imageUrl: { not: null } } }),
        this.db.statusPack.count({ where: { resellerId, downloadedAt: { not: null } } }),

        // Kamai order lines se banti hai: (mera rate − meri lagat) × tadaad
        this.db.order.findMany({
          where: { resellerId, status: 'DELIVERED' },
          select: {
            createdAt: true,
            items: { select: { retailPriceSnapshot: true, bajiPriceSnapshot: true, qty: true } },
          },
        }),
      ])

    let earnedTotal = 0
    let earnedThisMonth = 0

    for (const order of deliveredOrders) {
      const earned = order.items.reduce(
        (sum, item) => sum + (item.retailPriceSnapshot - item.bajiPriceSnapshot) * item.qty,
        0,
      )
      // Ulta margin (reseller ne lagat se kam par becha) kamai mein manfi nahi jata
      const positive = Math.max(earned, 0)

      earnedTotal += positive
      if (order.createdAt >= startOfMonth) earnedThisMonth += positive
    }

    return {
      ordersAwaitingConfirmation: awaiting,
      ordersRunning: running,
      ordersDelivered: delivered,
      earnedTotal: pkr(earnedTotal),
      earnedThisMonth: pkr(earnedThisMonth),
      packsMade,
      packsDownloaded,
    }
  }
}
