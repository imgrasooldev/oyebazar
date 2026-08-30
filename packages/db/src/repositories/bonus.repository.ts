import { Prisma, type PrismaClient } from '@prisma/client'
import type {
  BonusKind,
  BonusRepository,
  PendingBonusRow,
} from '@oyebazar/core'

/**
 * Bonus ka daftar — Prisma.
 *
 * 🔴 Rukawat DB par hai, yahan ki jaanch par nahi. Har qism ke bonus par ek unique index
 * hai (`kind + resellerId + orderId`, aur `fromResellerId`), aur dobara khulne ki koshish
 * wahin girti hai. Pehle "mojood hai ya nahi" poochh kar phir likhne ka matlab ye hota ke
 * do request ek saath aane par dono ko "nahi hai" milta aur dono likh deteen — yani
 * hamara paisa do dafa. Wo ghalti kisi ko nazar bhi nahi aati: dono qatarein bilkul
 * theek dikhti hain.
 */
export class PrismaBonusRepository implements BonusRepository {
  constructor(private readonly db: PrismaClient) {}

  async open(input: {
    resellerId: string
    kind: BonusKind
    amount: number
    orderId: string
    fromResellerId?: string | undefined
  }): Promise<boolean> {
    try {
      await this.db.resellerBonus.create({
        data: {
          resellerId: input.resellerId,
          kind: input.kind,
          amount: input.amount,
          orderId: input.orderId,
          ...(input.fromResellerId ? { fromResellerId: input.fromResellerId } : {}),
        },
      })
      return true
    } catch (error) {
      /*
       * `P2002` = unique index toota — yani bonus PEHLE SE mojood hai.
       *
       * 🔴 Ye ghalti nahi hai aur isay upar nahi bhejna chahiye. Ye rasta
       * `afterDelivered` se chalta hai, jo dobara chal sakta hai (ops ne halat wapas
       * ki, ya koi qadam dobara hua). Us par poora qadam girana us reseller ko rok
       * deta jis ka order waqai pohanch gaya hai.
       *
       * Baqi har ghalti upar jati hai: `P2002` ke ilawa jo bhi ho, wo waqai kharabi hai
       * aur usay chhupana un ghaltiyon ko chhupana hai jin ka pata chalna chahiye.
       */
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return false
      }
      throw error
    }
  }

  async countByKind(kind: BonusKind): Promise<number> {
    /*
     * PAID aur PENDING dono ginte hain.
     *
     * 🔴 Sirf PAID ginne ka matlab ye hota ke jab tak ops paisa na bheje, hadd
     * lagti hi nahi — aur us darmiyan hazaron bonus khul sakte hain. Waada khulte hi
     * ban jata hai, dene ke waqt nahi; hadd bhi wahin lagni chahiye.
     */
    return this.db.resellerBonus.count({ where: { kind } })
  }

  async totalsFor(resellerId: string): Promise<{ earned: number; pending: number }> {
    const groups = await this.db.resellerBonus.groupBy({
      by: ['status'],
      where: { resellerId },
      _sum: { amount: true },
    })

    let earned = 0
    let pending = 0
    for (const group of groups) {
      const amount = group._sum.amount ?? 0
      // "Kamaya" mein dono shamil — jo mil chuka aur jo baqi hai
      earned += amount
      if (group.status === 'PENDING') pending += amount
    }
    return { earned, pending }
  }

  async listPending(limit: number): Promise<readonly PendingBonusRow[]> {
    const rows = await this.db.resellerBonus.findMany({
      where: { status: 'PENDING' },
      // Sab se purana baqaya sab se upar — warna purane hamesha neeche dabe rehte hain
      orderBy: { createdAt: 'asc' },
      take: limit,
      select: {
        id: true,
        resellerId: true,
        kind: true,
        amount: true,
        status: true,
        createdAt: true,
        order: { select: { orderNo: true } },
        reseller: { select: { name: true, whatsappPhone: true } },
      },
    })

    return rows.map((row) => ({
      id: row.id,
      resellerId: row.resellerId,
      kind: row.kind,
      amount: row.amount,
      orderNo: row.order.orderNo,
      status: row.status,
      createdAt: row.createdAt,
      resellerName: row.reseller.name,
      resellerPhone: row.reseller.whatsappPhone,
    }))
  }

  async markPaid(bonusId: string, reference: string, at: Date): Promise<boolean> {
    /*
     * Sirf PENDING se PAID.
     *
     * 🔴 `updateMany` + shart — `update` nahi. Pehle se PAID row par dobara chalne se
     * `paidAt` aur TID badal jate, yani wo tareekh mit jati jis par jhagre ka faisla
     * khara hota hai. Yahan dobara dabane ka anjaam "kuch nahi hua" hai, aur wohi
     * durust jawab hai.
     */
    const { count } = await this.db.resellerBonus.updateMany({
      where: { id: bonusId, status: 'PENDING' },
      data: { status: 'PAID', paidAt: at, paidReference: reference },
    })
    return count > 0
  }
}
