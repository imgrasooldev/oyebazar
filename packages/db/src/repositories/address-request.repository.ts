import type { Prisma, PrismaClient } from '@prisma/client'
import type {
  AddressRequestRepository,
  FilledAddressRequestView,
  PublicAddressRequestView,
} from '@oyebazar/core'

/**
 * Pata mangwane wali darkhwast.
 *
 * 🔴 Do jagah hifazat DB par hai, code par nahi — aur dono jagah wajah ek hi hai: ye
 * link WhatsApp par jata hai, aur WhatsApp par cheezein FORWARD hoti hain. Do log ek hi
 * lamhe mein khol sakte hain, aur us soorat mein code ki "pehle parho phir likho" wali
 * jaanch dono ko guzar deti hai.
 */
export class PrismaAddressRequestRepository implements AddressRequestRepository {
  constructor(private readonly db: PrismaClient) {}

  async create(input: {
    token: string
    resellerId: string
    productId: string
    variantId: string | null
    qty: number
    retailPrice: number
    expiresAt: Date
  }): Promise<void> {
    await this.db.addressRequest.create({ data: input })
  }

  async findPublicByToken(token: string): Promise<PublicAddressRequestView | null> {
    const row = await this.db.addressRequest.findUnique({
      where: { token },
      select: {
        token: true,
        qty: true,
        retailPrice: true,
        expiresAt: true,
        filledAt: true,
        usedAt: true,
        /*
         * 🔴 Reseller ka NAAM, us ka phone nahi — aur dukan ka to zikr tak nahi.
         *
         * Customer reseller ko jaanti hai, hamein nahi, aur dukan ko to bilkul nahi. Is
         * safhe par dukan ka naam dikhana poore karobar ka raasta khol deta: customer
         * seedha wahan chali jati aur reseller beech se nikal jati — jabke ye link us ne
         * khud bheja hota.
         */
        reseller: { select: { name: true } },
        product: {
          select: {
            titleUr: true,
            titleEn: true,
            media: {
              where: { type: 'IMAGE' },
              select: { processedUrl: true, originalUrl: true },
              orderBy: [{ isStatusSource: 'desc' }, { sortOrder: 'asc' }],
              take: 1,
            },
          },
        },
      },
    })

    if (!row) return null

    const image = row.product.media[0]

    return {
      token: row.token,
      shopName: row.reseller.name,
      productTitleUr: row.product.titleUr,
      productTitleEn: row.product.titleEn,
      imageUrl: image?.processedUrl ?? image?.originalUrl ?? null,
      qty: row.qty,
      retailPrice: row.retailPrice,
      expiresAt: row.expiresAt,
      filledAt: row.filledAt,
      usedAt: row.usedAt,
    }
  }

  async fill(
    token: string,
    input: {
      customerName: string
      customerPhone: string
      customerAddress: string
      area: string
      locationLat: number | null
      locationLng: number | null
      at: Date
    },
  ): Promise<boolean> {
    /*
     * `updateMany` + `filledAt: null` — ek hi hukm mein "dekho aur likho".
     *
     * 🔴 `update` se ye kaam NAHI ho sakta: wo sirf id/unique par chalta hai aur shart
     * nahi le sakta, is liye pehle parhna parta — aur us parhne aur likhne ke darmiyan
     * doosra shakhs apna pata likh deta. `count === 0` ka matlab hai: kisi aur ne pehle
     * likh diya, aur hum ne us ka pata MITAYA NAHI.
     */
    const { count } = await this.db.addressRequest.updateMany({
      where: { token, filledAt: null, usedAt: null },
      data: {
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        customerAddress: input.customerAddress,
        area: input.area,
        locationLat: input.locationLat,
        locationLng: input.locationLng,
        filledAt: input.at,
      },
    })

    return count === 1
  }

  async listFilledFor(resellerId: string, limit: number): Promise<FilledAddressRequestView[]> {
    const rows = await this.db.addressRequest.findMany({
      // Bhara hua, magar order abhi nahi bana — yehi wo qatar hai jis par kaam baqi hai
      where: { resellerId, filledAt: { not: null }, usedAt: null },
      orderBy: { filledAt: 'desc' },
      take: limit,
      select: FILLED_SELECT,
    })

    return rows.map(toFilled).filter((row): row is FilledAddressRequestView => row !== null)
  }

  async findFilledForReseller(
    resellerId: string,
    token: string,
  ): Promise<FilledAddressRequestView | null> {
    const row = await this.db.addressRequest.findFirst({
      // 🔴 resellerId shart mein hai — doosri reseller ka token yahan se kuch nahi deta
      where: { token, resellerId, filledAt: { not: null }, usedAt: null },
      select: FILLED_SELECT,
    })

    return row ? toFilled(row) : null
  }

  async markUsed(
    resellerId: string,
    token: string,
    orderId: string,
    at: Date,
  ): Promise<boolean> {
    /*
     * `usedAt: null` shart mein — dobara band karne ki koshish yahin girti hai.
     *
     * `orderId` par DB ki unique hadd alag se lagi hui hai: agar kabhi do alag token ek
     * hi order par band karne ki koshish karen to wo wahan rukta hai.
     */
    const { count } = await this.db.addressRequest.updateMany({
      // 🔴 resellerId shart mein — doosri reseller ka link yahan se band nahi hota
      where: { token, resellerId, usedAt: null },
      data: { orderId, usedAt: at },
    })

    return count === 1
  }
}

const FILLED_SELECT = {
  token: true,
  productId: true,
  variantId: true,
  qty: true,
  retailPrice: true,
  customerName: true,
  customerPhone: true,
  customerAddress: true,
  area: true,
  locationLat: true,
  locationLng: true,
  filledAt: true,
  product: {
    select: {
      titleUr: true,
      titleEn: true,
      media: {
        where: { type: 'IMAGE' as const },
        select: { processedUrl: true, originalUrl: true },
        orderBy: [{ isStatusSource: 'desc' as const }, { sortOrder: 'asc' as const }],
        take: 1,
      },
    },
  },
} satisfies Prisma.AddressRequestSelect

type FilledRow = Prisma.AddressRequestGetPayload<{ select: typeof FILLED_SELECT }>

/**
 * Adhoore row ko `null` — aur ye chup chaap chhorna NAHI hai.
 *
 * DB par ye khaane alag alag `NULL` ho sakte hain (kyunke unfilled halat mein sab null
 * hote hain), magar karobari taur par ya to poora pata hai ya kuch bhi nahi. TypeScript
 * ko ye baat sirf yahan bathai ja sakti hai. Aisa row banta hi nahi — aur agar kabhi
 * bana, to usay "pata mil gaya" keh kar order banane se rok dena hi theek hai.
 */
function toFilled(row: FilledRow): FilledAddressRequestView | null {
  if (
    !row.customerName ||
    !row.customerPhone ||
    !row.customerAddress ||
    !row.area ||
    !row.filledAt
  ) {
    return null
  }

  const image = row.product.media[0]

  return {
    token: row.token,
    productId: row.productId,
    variantId: row.variantId,
    qty: row.qty,
    retailPrice: row.retailPrice,
    customerName: row.customerName,
    customerPhone: row.customerPhone,
    customerAddress: row.customerAddress,
    area: row.area,
    locationLat: row.locationLat,
    locationLng: row.locationLng,
    filledAt: row.filledAt,
    productTitleUr: row.product.titleUr,
    productTitleEn: row.product.titleEn,
    imageUrl: image?.processedUrl ?? image?.originalUrl ?? null,
  }
}
