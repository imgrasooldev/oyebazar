/**
 * Register ki pehli qatar — jo maal register banne se PEHLE se para tha.
 *
 * 🔴 Is ke baghair har register beech se shuru hota. Pehli qatar "5 nikle" hoti aur us
 * ke upar kuch na hota — jis se ye kabhi sabit na hota ke maal aya kahan se tha, aur
 * `balanceAfter` ka silsila pehli hi qatar par toota hua nazar aata. Wo ek dafa ki
 * kharabi hoti magar hamesha ke liye: purani tareekh dobara nahi banti.
 *
 * Har us variant par ek `OPENING` qatar lagti hai jis mein maal para hai aur jis ka
 * register abhi bilkul khali hai.
 *
 * 🔴 Lagat (`unitCost`) yahan JAAN BOOJH KAR khali chhori jati hai. Hamare paas us ka
 * koi record hai hi nahi — `supplierPrice` bechne ka rate hai, khareedne ka nahi. Koi
 * andaza laga kar bhar dena poori valuation ko ek jhoot par khara kar deta, aur us ke
 * baad wo number kabhi theek na hota kyunke kisi ko pata hi na chalta ke wo andaza tha.
 * Dukan pehli dafa maal daalte waqt apni lagat khud batati hai.
 *
 * Dobara chalane se kuch kharab nahi hota: jis variant ka register pehle se hai wo
 * chhoot jata hai.
 *
 * Chalayen:
 *   node --env-file=<env> node_modules/tsx/dist/cli.mjs prisma/backfill-stock-ledger.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/** Ek saath itne — poori table memory mein uthana bari ginti par theek nahi. */
const BATCH = 200

async function main(): Promise<void> {
  let cursor: string | undefined
  let seen = 0
  let made = 0

  for (;;) {
    const rows = await prisma.productVariant.findMany({
      where: {
        stockQty: { gt: 0 },
        // Jis ka register pehle se chal raha hai us par haath nahi parta
        moves: { none: {} },
      },
      select: {
        id: true,
        productId: true,
        stockQty: true,
        product: { select: { supplierId: true } },
      },
      orderBy: { id: 'asc' },
      take: BATCH,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    })

    if (rows.length === 0) break
    seen += rows.length
    cursor = rows[rows.length - 1]?.id

    await prisma.stockMove.createMany({
      data: rows.map((row) => ({
        supplierId: row.product.supplierId,
        productId: row.productId,
        variantId: row.id,
        delta: row.stockQty,
        balanceAfter: row.stockQty,
        reason: 'OPENING' as const,
        // Ye qatar kisi ne likhi nahi — nizam ne register shuru karte waqt lagayi hai
        actorType: 'system',
        note: 'Register shuru hone se pehle ka maal',
      })),
    })
    made += rows.length

    console.log(`  ${seen} dekhe, ${made} qataren lagin`)
  }

  console.log(`\nregister: ${made} qataren lagin (${seen} variants)`)
  await prisma.$disconnect()
}

void main()
