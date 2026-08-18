/**
 * Mojooda DB ki tasveerein badal deta hai — bina reseed ke.
 *
 * Reseed sab kuch uda deta (orders, resellers, packs). Ye sirf tasveerein badalta hai,
 * baqi data wahin rehta hai. Purane status packs (jin par purani tasveer chhapi hai)
 * jaan boojh kar hata diye jate hain, warna app naya maal aur purani tasveer dikhati.
 *
 * Chalayen: pnpm --filter @oyebazar/db exec dotenv -e ../../.env -- tsx prisma/refresh-photos.ts
 */
import { PrismaClient } from '@prisma/client'
import { categoryPhoto, productPhoto } from './photos'

const prisma = new PrismaClient()

async function main() {
  // Har product apni TOP-LEVEL category se tasveer leta hai — maal usi ka hai
  const products = await prisma.product.findMany({
    select: {
      id: true,
      slug: true,
      category: { select: { slug: true, parent: { select: { slug: true } } } },
    },
  })

  let updated = 0
  for (const product of products) {
    const top = product.category.parent?.slug ?? product.category.slug
    const url = productPhoto(top, product.slug)

    const { count } = await prisma.productMedia.updateMany({
      where: { productId: product.id },
      data: { originalUrl: url, processedUrl: url },
    })
    updated += count
  }

  const categories = await prisma.category.findMany({
    select: { id: true, slug: true, parent: { select: { slug: true } } },
  })
  for (const category of categories) {
    const top = category.parent?.slug ?? category.slug
    await prisma.category.update({
      where: { id: category.id },
      data: { imageUrl: categoryPhoto(top) },
    })
  }

  // Purane pack ab ghalat hain — un par purani tasveer chhapi hui hai
  const { count: dropped } = await prisma.statusPack.deleteMany({})

  console.log(`tasveerein badli — ${updated} media, ${categories.length} categories`)
  console.log(`purane status packs hataye: ${dropped} (naye maang par ban jayenge)`)
  await prisma.$disconnect()
}

main().catch(async (error) => {
  console.error(error)
  await prisma.$disconnect()
  process.exit(1)
})
