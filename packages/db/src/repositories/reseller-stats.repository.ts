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
import type {
  ResellerStatsRepository,
  ResellerStatsView,
  TopSellingView,
} from '@oyebazar/core'
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

  /**
   * Sab se ziyada bikne wala maal — poore platform par.
   *
   * 🔴 `groupBy` OrderItem par, Order par nahi: ek order mein kai cheezein ho sakti hain,
   * aur "kitne order aaye" us maal ka sahi paimana nahi jo hamesha kisi aur cheez ke
   * saath jata hai.
   *
   * Rad, wapas aaye aur ruke hue order shaamil NAHI — warna wo maal "chal raha hai"
   * dikhta jo asal mein wapas aa raha hota, aur hum reseller ko usi taraf dhakel dete.
   */
  async topSelling(since: Date, limit: number): Promise<TopSellingView[]> {
    const rows = await this.db.orderItem.findMany({
      where: {
        order: {
          createdAt: { gte: since },
          status: { in: ['CONFIRMED', 'SENT_TO_SUPPLIER', 'ACCEPTED', 'DISPATCHED', 'DELIVERED'] },
        },
      },
      /*
       * 🔴 `OrderItem` par `product` ka rishta hai hi nahi — us mein sirf `productId`
       * aur us waqt ki qeematon ke snapshot hain. Ye jaan boojh kar hai: order ke baad
       * maal ka naam ya rate badal jaye to purana order waisa ka waisa rehna chahiye.
       * Naam is liye alag query se aata hai.
       */
      select: { productId: true, order: { select: { resellerId: true } } },
    })

    /*
     * Ginti yahan hoti hai, SQL mein nahi — kyunke "kitni ALAG reseller" ke liye
     * `groupBy` kaafi nahi (wo qatarein ginta hai, alag reseller nahi). Ye list chhoti
     * hai (chand hazar rows tak), is liye yahan ginna sasta hai.
     */
    const byProduct = new Map<string, { orders: number; resellers: Set<string> }>()

    for (const row of rows) {
      const entry = byProduct.get(row.productId) ?? {
        orders: 0,
        resellers: new Set<string>(),
      }
      entry.orders += 1
      entry.resellers.add(row.order.resellerId)
      byProduct.set(row.productId, entry)
    }

    const top = [...byProduct.entries()]
      // Pehle "kitni alag reseller", phir order — do reseller ka maal ek ke maal se behtar
      .sort((a, b) => b[1].resellers.size - a[1].resellers.size || b[1].orders - a[1].orders)
      .slice(0, limit)

    if (top.length === 0) return []

    const ids = top.map(([id]) => id)
    const products = await this.db.product.findMany({
      where: { id: { in: ids } },
      select: { id: true, titleUr: true, titleEn: true },
    })
    const titles = new Map(products.map((p) => [p.id, p]))

    const media = await this.db.productMedia.findMany({
      where: { productId: { in: ids }, type: 'IMAGE' },
      select: { productId: true, processedUrl: true, originalUrl: true, sortOrder: true },
      orderBy: { sortOrder: 'asc' },
    })

    const cover = new Map<string, string>()
    for (const m of media) {
      if (!cover.has(m.productId)) cover.set(m.productId, m.processedUrl ?? m.originalUrl)
    }

    return top
      .filter(([productId]) => titles.has(productId))
      .map(([productId, entry]) => ({
        productId,
        titleUr: titles.get(productId)!.titleUr,
        titleEn: titles.get(productId)!.titleEn,
        coverImageUrl: cover.get(productId) ?? null,
        resellers: entry.resellers.size,
        orders: entry.orders,
      }))
  }
}
