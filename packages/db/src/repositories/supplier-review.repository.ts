/**
 * SupplierReviewRepository — reseller ki raye rakhna, ginna, aur agla sawal dhoondhna.
 *
 * 🔴 "Agla sawal" is poore feature ki jaan hai. Form banana aasan hai; log us tak
 * pohanchte nahi. Agar reseller ko khud dhoondhna pare to wo kabhi nahi bharegi — aur
 * bina raye ke sitare bante hi nahi, yani poora feature khali dabba reh jata hai.
 */
import type { PrismaClient } from '@prisma/client'
import type {
  PendingReviewView,
  SupplierRating,
  SupplierReviewRepository,
} from '@oyebazar/core'
import { supplierRating } from '@oyebazar/core'

export class PrismaSupplierReviewRepository implements SupplierReviewRepository {
  constructor(private readonly db: PrismaClient) {}

  async ratingsFor(supplierIds: readonly string[]): Promise<Map<string, SupplierRating>> {
    if (supplierIds.length === 0) return new Map()

    const rows = await this.db.supplierReview.findMany({
      where: { supplierId: { in: [...supplierIds] } },
      select: { supplierId: true, quality: true, communication: true, payoutOnTime: true },
    })

    /*
     * Ginti yahan hoti hai, SQL mein nahi — kyunke "kitni raye se kam par sitare nahi
     * dikhte" wali shart `supplierRating` mein likhi hai, aur wo shart EK jagah honi
     * chahiye. SQL mein `AVG` lene ka matlab hota ke wo hadd yahan dobara likhni parti,
     * aur do jagah likhi hui shart ek din alag ho jati hai.
     */
    const byId = new Map<string, { quality: number; communication: number; payoutOnTime: number }[]>()
    for (const row of rows) {
      const list = byId.get(row.supplierId) ?? []
      list.push({
        quality: row.quality,
        communication: row.communication,
        payoutOnTime: row.payoutOnTime,
      })
      byId.set(row.supplierId, list)
    }

    return new Map([...byId].map(([id, reviews]) => [id, supplierRating(reviews)]))
  }

  async ratingsForSlugs(slugs: readonly string[]): Promise<Map<string, SupplierRating>> {
    if (slugs.length === 0) return new Map()

    const suppliers = await this.db.supplier.findMany({
      where: { slug: { in: [...slugs] } },
      select: { id: true, slug: true },
    })

    const byId = await this.ratingsFor(suppliers.map((s) => s.id))

    return new Map(
      suppliers
        .map((s) => [s.slug, byId.get(s.id)] as const)
        .filter((pair): pair is readonly [string, SupplierRating] => pair[1] !== undefined),
    )
  }

  async pendingFor(resellerId: string, period: string): Promise<PendingReviewView | null> {
    /*
     * 🔴 Sirf POHANCHA HUA order. Jab tak maal customer tak na pohanche, reseller ke paas
     * "maal kaisa nikla" ka jawab hai hi nahi — aur "commission waqt par mila" ka to
     * bilkul nahi, kyunke paisa delivery ke baad aata hai.
     */
    const delivered = await this.db.order.findMany({
      where: { resellerId, status: 'DELIVERED' },
      select: {
        id: true,
        orderNo: true,
        supplierId: true,
        deliveredAt: true,
        supplier: { select: { businessName: true } },
      },
      // Sab se naya pehle — us ka tajurba abhi yaad hai
      orderBy: { deliveredAt: 'desc' },
      take: 50,
    })

    if (delivered.length === 0) return null

    // Is mahine kis kis dukan ki raye pehle hi di ja chuki hai
    const already = await this.db.supplierReview.findMany({
      where: { resellerId, periodMonth: period },
      select: { supplierId: true },
    })
    const done = new Set(already.map((r) => r.supplierId))

    // Kin dukanon ki raye KABHI di hai — "pehli dafa" ka faisla isi se hota hai
    const ever = await this.db.supplierReview.findMany({
      where: { resellerId },
      select: { supplierId: true },
    })
    const seen = new Set(ever.map((r) => r.supplierId))

    for (const order of delivered) {
      if (done.has(order.supplierId)) continue
      return {
        supplierId: order.supplierId,
        supplierName: order.supplier.businessName,
        orderId: order.id,
        orderNo: order.orderNo,
        /*
         * "Pehli dafa" us reseller ke liye sab se ziyada maani rakhta hai jis ne abhi
         * nayi dukan aazmayi hai — aur UI wahan alag lafz istemal karta hai. Mahine wali
         * yaad-dehani us se halki hoti hai.
         */
        reason: seen.has(order.supplierId) ? 'monthly' : 'first',
      }
    }

    return null
  }

  async add(input: {
    supplierId: string
    resellerId: string
    orderId: string
    quality: number
    communication: number
    payoutOnTime: number
    comment?: string | undefined
    periodMonth: string
  }): Promise<void> {
    /*
     * `upsert` — dobara bhejne par phenkta nahi, badal deta hai.
     *
     * 🔴 Wajah: hadd DB par hai (`onePerMonth`), aur reseller ka dobara bhejna aksar
     * ghalti nahi hota — wo apni raye badal rahi hoti hai. Us par error dena usay ye
     * batata hai ke "ho gaya, ab kuch nahi ho sakta", jo sach bhi nahi aur kaam ka bhi
     * nahi. Ek mahine mein ek raye — magar wo apni.
     */
    await this.db.supplierReview.upsert({
      where: {
        onePerMonth: {
          resellerId: input.resellerId,
          supplierId: input.supplierId,
          periodMonth: input.periodMonth,
        },
      },
      create: {
        supplierId: input.supplierId,
        resellerId: input.resellerId,
        orderId: input.orderId,
        quality: input.quality,
        communication: input.communication,
        payoutOnTime: input.payoutOnTime,
        ...(input.comment ? { comment: input.comment } : {}),
        periodMonth: input.periodMonth,
      },
      update: {
        quality: input.quality,
        communication: input.communication,
        payoutOnTime: input.payoutOnTime,
        comment: input.comment ?? null,
      },
    })
  }
}
