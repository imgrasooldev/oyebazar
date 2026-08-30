import type { PrismaClient } from '@prisma/client'
import type { CustomerRepository, CustomerView } from '@oyebazar/core'
import { phoneKey } from '@oyebazar/core'

/**
 * Reseller ki apni customer fehrist — Prisma.
 *
 * 🔴 Number hamesha `phoneKey()` se guzarta hai, dono taraf. Bina is ke `03001234567`
 * aur `+92 300 1234567` do alag customer ban jate hain, aur reseller ko "dobara aane
 * wali" kabhi dikhti hi nahi — yani feature bana rehta hai aur kaam kabhi nahi karta.
 * Wohi function order ke record par bhi chalta hai, is liye dono jagah ek hi shakl.
 */
export class PrismaCustomerRepository implements CustomerRepository {
  constructor(private readonly db: PrismaClient) {}

  async findByPhone(resellerId: string, phone: string): Promise<CustomerView | null> {
    const key = phoneKey(phone)
    const row = await this.db.customer.findUnique({
      where: { resellerId_phone: { resellerId, phone: key } },
      select: {
        id: true,
        phone: true,
        name: true,
        address: true,
        area: true,
        lastOrderAt: true,
        _count: { select: { orders: true } },
      },
    })
    if (!row) return null

    const { _count, ...rest } = row
    return { ...rest, orderCount: _count.orders }
  }

  async upsertForOrder(input: {
    resellerId: string
    phone: string
    name: string
    address: string
    area: string
    at: Date
  }): Promise<string> {
    const key = phoneKey(input.phone)
    const row = await this.db.customer.upsert({
      where: { resellerId_phone: { resellerId: input.resellerId, phone: key } },
      /*
       * Naam aur pata har dafa tazaa — aur `lastOrderAt` bhi.
       *
       * 🔴 `create` aur `update` mein wohi qadrein jani chahiyen. Do alag shakal rakhne
       * ka matlab ye hota ke pehla order aur doosra order do alag record banate, aur wo
       * farq sirf usi din nazar aata jis din koi us par sawal karta.
       */
      update: {
        name: input.name,
        address: input.address,
        area: input.area,
        lastOrderAt: input.at,
      },
      create: {
        resellerId: input.resellerId,
        phone: key,
        name: input.name,
        address: input.address,
        area: input.area,
        lastOrderAt: input.at,
      },
      select: { id: true },
    })
    return row.id
  }
}
