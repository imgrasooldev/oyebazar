/**
 * Register ki pehli qatar — aur maal ki jagah.
 *
 * Do kaam, aur dono ek hi wajah se ek jagah hain: dono us maal ke bare mein hain jo in
 * do nizamon (register aur godown) ke BANNE se pehle se para tha.
 *
 * 1. `OPENING` qatar — us maal par jis ka register bilkul khali hai.
 *
 *    🔴 Is ke baghair har register beech se shuru hota. Pehli qatar "5 nikle" hoti aur
 *    us ke upar kuch na hota — jis se kabhi sabit na hota ke maal aya kahan se tha, aur
 *    `balanceAfter` ka silsila pehli hi qatar par toota hua nazar aata. Wo ek dafa ki
 *    kharabi hoti magar hamesha ke liye: purani tareekh dobara nahi banti.
 *
 * 2. Godown ki qatar — us maal par jo kisi godown mein para hua likha hi nahi.
 *
 *    🔴 Ye us maal ke liye hai jo migration ke BAAD bana (seed, ya koi purana raasta jo
 *    repository se nahi guzra). Bina is ke `reserve` ko maal kisi godown mein milta hi
 *    nahi aur wo default godown ki ginti manfi kar deta — kul ginti theek nazar aati
 *    rehti aur kharabi mahinon chhupi rehti.
 *
 * 🔴 Lagat (`unitCost`) yahan JAAN BOOJH KAR khali chhori jati hai. Hamare paas us ka
 * koi record hai hi nahi — `supplierPrice` bechne ka rate hai, khareedne ka nahi. Koi
 * andaza laga kar bhar dena poori valuation ko ek jhoot par khara kar deta, aur us ke
 * baad wo number kabhi theek na hota kyunke kisi ko pata hi na chalta ke wo andaza tha.
 *
 * Dobara chalane se kuch kharab nahi hota: jo qatar pehle se hai wo chhoot jati hai.
 *
 * Chalayen (seed ke BAAD bhi, har dafa):
 *   node --env-file=<env> node_modules/tsx/dist/cli.mjs prisma/backfill-stock-ledger.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/** Ek saath itne — poori table memory mein uthana bari ginti par theek nahi. */
const BATCH = 200

/** Har dukan ka pehla godown — wohi naam jo migration lagati hai. */
const DEFAULT_NAME = 'دکان'

/**
 * Har dukan ka default godown — na ho to bana kar.
 *
 * Migration har MOJOODA dukan ko ye de chuki hai; ye un ke liye hai jo us ke baad banin
 * (seed, ya nayi asli dukan jo abhi tak stock ke safhe par gayi hi nahi).
 */
async function ensureWarehouses(): Promise<Map<string, string>> {
  const suppliers = await prisma.supplier.findMany({ select: { id: true } })
  const bySupplier = new Map<string, string>()
  let made = 0

  for (const supplier of suppliers) {
    const existing = await prisma.warehouse.findFirst({
      where: { supplierId: supplier.id, isDefault: true },
      select: { id: true },
    })

    if (existing) {
      bySupplier.set(supplier.id, existing.id)
      continue
    }

    const created = await prisma.warehouse.create({
      data: { supplierId: supplier.id, name: DEFAULT_NAME, isDefault: true, sortOrder: 0 },
      select: { id: true },
    })
    bySupplier.set(supplier.id, created.id)
    made += 1
  }

  console.log(`godown: ${made} naye, ${suppliers.length - made} pehle se mojood`)
  return bySupplier
}

async function main(): Promise<void> {
  const warehouses = await ensureWarehouses()

  let cursor: string | undefined
  let seen = 0
  let opened = 0
  let placed = 0

  for (;;) {
    const rows = await prisma.productVariant.findMany({
      where: { stockQty: { gt: 0 } },
      select: {
        id: true,
        productId: true,
        stockQty: true,
        product: { select: { supplierId: true } },
        // Kya is ka register pehle se chal raha hai
        moves: { select: { id: true }, take: 1 },
        // Kya ye kisi godown mein para hua likha hai
        stock: { select: { qty: true } },
      },
      orderBy: { id: 'asc' },
      take: BATCH,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    })

    if (rows.length === 0) break
    seen += rows.length
    cursor = rows[rows.length - 1]?.id

    for (const row of rows) {
      const warehouseId = warehouses.get(row.product.supplierId)
      if (!warehouseId) continue

      /*
       * Godown ki qatar pehle — register ki qatar us ke baad. Ulta karne se ek lamha
       * aisa banta hai jahan register keh raha hai ke maal mojood hai magar wo kisi
       * jagah para hua likha nahi. Us lamhe aya hua order ghalat jawab paata.
       */
      const placedQty = row.stock.reduce((sum, line) => sum + line.qty, 0)
      if (placedQty === 0) {
        await prisma.variantStock.upsert({
          where: { variantId_warehouseId: { variantId: row.id, warehouseId } },
          create: { variantId: row.id, warehouseId, qty: row.stockQty },
          update: { qty: row.stockQty },
        })
        placed += 1
      }

      if (row.moves.length === 0) {
        await prisma.stockMove.create({
          data: {
            supplierId: row.product.supplierId,
            productId: row.productId,
            variantId: row.id,
            warehouseId,
            delta: row.stockQty,
            balanceAfter: row.stockQty,
            reason: 'OPENING',
            // Ye qatar kisi ne likhi nahi — nizam ne register shuru karte waqt lagayi hai
            actorType: 'system',
            note: 'Register shuru hone se pehle ka maal',
          },
        })
        opened += 1
      }
    }

    console.log(`  ${seen} dekhe — ${opened} qataren, ${placed} godown mein rakhe`)
  }

  console.log(`\nregister: ${opened} OPENING qataren`)
  console.log(`godown  : ${placed} cheezein jagah par rakhi gayin`)
  console.log(`(${seen} variants dekhe)`)

  await prisma.$disconnect()
}

void main()
