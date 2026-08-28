/**
 * Talash ke khane ka poora bhraav — `Product.searchText`.
 *
 * Migration ne ye khana bana kar us mein ek KACHCHA jawab daal diya tha (sirf
 * lower-case aur category ka naam) — taake migration ke baad talash bilkul band na ho
 * jaye. Ye script wohi khana theek se bharti hai: zer-zabar hat te hain, Arabi "ك/ي/ه"
 * Urdu "ک/ی/ہ" ban jate hain, aur ramz ki jagah khali jagah aa jati hai.
 *
 * 🔴 Dobara chalane se kuch kharab nahi hota — har dafa wohi qadar banti hai. Isay us
 * din bhi chalaya ja sakta hai jis din lughat (search-terms.ts) mein kuch barha ho.
 *
 * Chalayen:
 *   node --env-file=<env> node_modules/tsx/dist/cli.mjs prisma/backfill-search.ts
 */
import { PrismaClient } from '@prisma/client'
import { buildSearchText } from '@oyebazar/shared'

const prisma = new PrismaClient()

/** Ek saath itne — poori table memory mein uthana bari ginti par theek nahi. */
const BATCH = 200

async function main(): Promise<void> {
  let cursor: string | undefined
  let seen = 0
  let changed = 0

  for (;;) {
    const rows = await prisma.product.findMany({
      select: {
        id: true,
        titleUr: true,
        titleEn: true,
        descriptionUr: true,
        searchText: true,
        category: { select: { nameUr: true, nameEn: true } },
      },
      orderBy: { id: 'asc' },
      take: BATCH,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    })
    if (rows.length === 0) break

    for (const row of rows) {
      const next = buildSearchText({
        titleUr: row.titleUr,
        titleEn: row.titleEn,
        descriptionUr: row.descriptionUr,
        categoryNameUr: row.category.nameUr,
        categoryNameEn: row.category.nameEn,
      })
      seen += 1
      // Jo pehle se theek hai us par likhna nahi — `updatedAt` bewajah na hile
      if (next === row.searchText) continue
      await prisma.product.update({ where: { id: row.id }, data: { searchText: next } })
      changed += 1
    }

    cursor = rows[rows.length - 1]?.id
  }

  console.log(`talash ka khana: ${seen} maal dekha, ${changed} par nayi qadar likhi`)
  await prisma.$disconnect()
}

void main()
