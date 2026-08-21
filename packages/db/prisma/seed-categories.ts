/**
 * Sirf categories — production ke pehle din ke liye.
 *
 * `seed.ts` poora bazaar banata hai: farzi dukanen, farzi maal, farzi resellers. Wo
 * local par theek hai magar asli site par zeher — banda pehle din khol kar farzi maal
 * dekhta hai aur bharosa wahin khatam ho jata hai.
 *
 * Ye script sirf darakht daalti hai: categories aur un ki shaakhen. Ye "farzi data"
 * nahi, dhancha hai — us ke baghair pehla wholesaler apna maal kis khane mein daale?
 *
 * Dobara chalane par kuch kharab nahi hota: jo slug pehle se mojood ho wo chhoot jati
 * hai (`skipDuplicates` nahi — hum khud dekh kar chhorte hain, taake sortOrder aur
 * path bhi theek rahen).
 *
 * Chalayen:
 *   node --env-file=.env.production packages/db/node_modules/.bin/tsx packages/db/prisma/seed-categories.ts
 */
import { PrismaClient } from '@prisma/client'
import { CATALOGUE } from './seed-data'

const prisma = new PrismaClient()

async function main(): Promise<void> {
  let made = 0
  let skipped = 0

  for (const [index, category] of CATALOGUE.entries()) {
    const existing = await prisma.category.findUnique({ where: { slug: category.slug } })

    const parent =
      existing ??
      (await prisma.category.create({
        data: {
          slug: category.slug,
          nameUr: category.nameUr,
          nameEn: category.nameEn,
          sortOrder: index,
        },
      }))

    if (existing) skipped += 1
    else {
      // Materialized path — "is shaakh ka saara maal" isi par chalta hai
      await prisma.category.update({
        where: { id: parent.id },
        data: { path: `/${parent.id}/`, depth: 0 },
      })
      made += 1
    }

    for (const [childIndex, child] of category.children.entries()) {
      const childExists = await prisma.category.findUnique({ where: { slug: child.slug } })
      if (childExists) {
        skipped += 1
        continue
      }

      const created = await prisma.category.create({
        data: {
          slug: child.slug,
          nameUr: child.nameUr,
          nameEn: child.nameEn,
          sortOrder: childIndex,
          parentId: parent.id,
        },
      })

      await prisma.category.update({
        where: { id: created.id },
        data: { path: `/${parent.id}/${created.id}/`, depth: 1 },
      })
      made += 1
    }
  }

  console.log(`categories: ${made} nayi, ${skipped} pehle se mojood`)
  await prisma.$disconnect()
}

void main()
