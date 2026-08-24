/**
 * OrderMessageRepository — order ke gird ki baat, aur "masla hua" bhi isi mein.
 *
 * 🔴 EK table, do darje (`NOTE` aur `ISSUE`) — do alag table nahi.
 *
 * Pehli nazar mein "baat karna" aur "shikayat karna" do cheezein lagti hain. Hain nahi:
 * shikayat bhi order ke saath juri hui ek baat hi hai, bas us par nishan laga hota hai.
 * Do table banane ka matlab hota ke ek hi guftagu do jagah bant jaye — aur jab ops ko
 * faisla karna ho to usay dono jagah parhni parti, tarteeb se jorh kar.
 */
import type { PrismaClient } from '@prisma/client'
import type { OrderMessageRepository, OrderMessageView } from '@oyebazar/core'

const SELECT = {
  id: true,
  kind: true,
  authorType: true,
  body: true,
  photoUrl: true,
  resolvedAt: true,
  createdAt: true,
} as const

type Row = {
  id: string
  kind: 'NOTE' | 'ISSUE'
  authorType: string
  body: string
  photoUrl: string | null
  resolvedAt: Date | null
  createdAt: Date
}

function toView(row: Row): OrderMessageView {
  return {
    id: row.id,
    kind: row.kind,
    /*
     * `authorType` DB mein aam string hai (jaisa `OrderEvent` par pehle se hai), magar
     * bahar sirf teen qadrein jati hain. Ghair-mutawaqqe qadar par `ops` — kyunke wo sab
     * se kam ikhtiyar wali soorat hai: paighaam dikhta hai magar kisi ke naam nahi lagta.
     */
    authorType:
      row.authorType === 'reseller' || row.authorType === 'supplier' ? row.authorType : 'ops',
    body: row.body,
    photoUrl: row.photoUrl,
    resolvedAt: row.resolvedAt,
    createdAt: row.createdAt,
  }
}

export class PrismaOrderMessageRepository implements OrderMessageRepository {
  constructor(private readonly db: PrismaClient) {}

  async listForOrder(orderId: string): Promise<OrderMessageView[]> {
    const rows = await this.db.orderMessage.findMany({
      where: { orderId },
      select: SELECT,
      // Purani pehle — guftagu isi tarah parhi jati hai
      orderBy: { createdAt: 'asc' },
    })
    return rows.map(toView)
  }

  async add(input: {
    orderId: string
    kind: 'NOTE' | 'ISSUE'
    authorType: 'reseller' | 'supplier' | 'ops'
    authorId?: string | undefined
    body: string
    photoUrl?: string | undefined
  }): Promise<OrderMessageView> {
    const row = await this.db.orderMessage.create({
      data: {
        orderId: input.orderId,
        kind: input.kind,
        authorType: input.authorType,
        ...(input.authorId ? { authorId: input.authorId } : {}),
        body: input.body,
        ...(input.photoUrl ? { photoUrl: input.photoUrl } : {}),
      },
      select: SELECT,
    })
    return toView(row)
  }

  async resolve(id: string, at: Date): Promise<void> {
    /*
     * `updateMany` + `kind: ISSUE` ki shart — aam baat ko "hal" nahi kiya ja sakta.
     * Us ka koi matlab hi nahi, aur ghalti se aisa hone par ops ki list se cheezein
     * khamoshi se gayab hone lagtin.
     */
    await this.db.orderMessage.updateMany({
      where: { id, kind: 'ISSUE' },
      data: { resolvedAt: at },
    })
  }

  async openIssues(limit: number): Promise<(OrderMessageView & { orderId: string; orderNo: string })[]> {
    const rows = await this.db.orderMessage.findMany({
      where: { kind: 'ISSUE', resolvedAt: null },
      select: { ...SELECT, orderId: true, order: { select: { orderNo: true } } },
      // Naye pehle — ops ke liye tarteeb ulti hai, wahan intezar sab se ahem hai
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
    return rows.map((row) => ({
      ...toView(row),
      orderId: row.orderId,
      orderNo: row.order.orderNo,
    }))
  }
}
