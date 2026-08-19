/**
 * Pending status packs ko seedha render karta hai — bina Redis ke.
 *
 * Kis ke liye: local development. Naye developer ke paas Redis nahi hota, magar
 * Content Studio hamara asal product hai — usay chala kar dekhe baghair kaam samajh nahi aata.
 *
 * Chalayen:
 *   pnpm --filter @oyebazar/worker render:pending
 *
 * ⚠ Production mein ye kabhi na chalayen — wahan BullMQ queue hai, jo retry, throttling
 * aur order sambhalti hai. Ye sirf ek seedha loop hai.
 */
import { createRepositories, prisma } from '@oyebazar/db'
import { loadConfig } from '../config'
import { ConsoleLogger } from '../logger'
import { RenderPool } from '../render/pool'
import { StatusPackRenderer } from '../render/render-status-pack'
import { createStorage } from '@oyebazar/storage'
import type { PackFormatKey } from '@oyebazar/shared'
import { handleRenderStatusPack } from '../jobs/render-status-pack.job'

const logger = new ConsoleLogger()

async function main(): Promise<void> {
  const config = loadConfig(process.cwd())
  const limit = Number(process.argv[2] ?? 20)

  const pending = await prisma.statusPack.findMany({
    where: { imageUrl: null },
    select: {
      id: true,
      resellerId: true,
      productId: true,
      // 🔴 mediaId bhi — warna ek hi product ki do tasveeron ke pack ek doosre ko
      // storage par overwrite kar dete hain (key mein mediaId shamil hai)
      mediaId: true,
      templateKey: true,
      priceUsed: true,
      // 🔴 Naap bhi — warna chaaron naap 'story' bana kar ek doosre ko overwrite kar dete
      format: true,
    },
    orderBy: { createdAt: 'asc' },
    take: limit,
  })

  if (pending.length === 0) {
    console.log('Koi pending pack nahi hai.')
    await prisma.$disconnect()
    return
  }

  console.log(`${pending.length} pack render ho rahe hain…`)

  const storage = createStorage(config.storage)
  const pool = new RenderPool(2, logger)
  await pool.init()

  const deps = {
    repositories: createRepositories(),
    renderer: new StatusPackRenderer(pool, logger),
    storage,
    logger,
  }

  try {
    for (const pack of pending) {
      const result = await handleRenderStatusPack(
        {
          statusPackId: pack.id,
          resellerId: pack.resellerId,
          productId: pack.productId,
          mediaId: pack.mediaId,
          templateKey: pack.templateKey,
          priceUsed: pack.priceUsed,
          format: pack.format as PackFormatKey,
        },
        deps,
      )
      console.log(`✓ ${pack.templateKey.padEnd(12)} ${pack.format.padEnd(9)} ${result.imageUrl}`)
    }
  } finally {
    await pool.close()
    await prisma.$disconnect()
  }
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
