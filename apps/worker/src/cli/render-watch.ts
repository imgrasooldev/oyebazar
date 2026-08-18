/**
 * Dev ka render worker — bina Redis ke.
 *
 * Masla: dev mein REDIS_URL nahi hota, is liye container LoggingRenderQueue lagata hai
 * jo sirf log likhti hai. Natija ye ke Content Studio mein "ban raha hai…" hamesha ke
 * liye ruka rehta hai, aur naya banda samajhta hai ke app tooti hui hai.
 *
 * Ye CLI wohi kaam karti hai jo asli worker karta: DB mein jo pack abhi tak render nahi
 * hue, unhen utha kar bana deti hai. Bas isay ek dafa chala kar chhor den:
 *
 *   pnpm --filter @oyebazar/worker exec dotenv -e ../../.env -- tsx src/cli/render-watch.ts
 *
 * Production mein ye nahi chalti — wahan Redis aur asli BullMQ worker hai.
 */
import type { PackFormatKey } from '@oyebazar/shared'
import { prisma, createRepositories } from '@oyebazar/db'
import { loadConfig } from '../config'
import { ConsoleLogger } from '../logger'
import { RenderPool } from '../render/pool'
import { StatusPackRenderer } from '../render/render-status-pack'
import { LocalDiskStorage } from '../storage/local'
import { SupabaseStorage } from '../storage/supabase'
import { handleRenderStatusPack } from '../jobs/render-status-pack.job'

const logger = new ConsoleLogger()
const POLL_MS = Number(process.env.RENDER_WATCH_MS ?? 2000)

async function main(): Promise<void> {
  const config = loadConfig(process.cwd())

  const storage =
    config.storage.kind === 'supabase'
      ? new SupabaseStorage(config.storage.url, config.storage.serviceKey, config.storage.bucket)
      : new LocalDiskStorage(config.storage.directory, config.storage.publicUrl)

  const pool = new RenderPool(2, logger)
  await pool.init()

  const deps = {
    repositories: createRepositories(),
    renderer: new StatusPackRenderer(pool, logger),
    storage,
    logger,
  }

  let running = true
  const stop = () => {
    running = false
  }
  process.on('SIGINT', stop)
  process.on('SIGTERM', stop)

  console.log(`Render watcher chal raha hai — har ${POLL_MS}ms. Band karne ke liye Ctrl+C.`)

  while (running) {
    const pending = await prisma.statusPack.findMany({
      where: { imageUrl: null },
      select: {
        id: true,
        resellerId: true,
        productId: true,
        templateKey: true,
        priceUsed: true,
        format: true,
      },
      orderBy: { createdAt: 'asc' },
      take: 8,
    })

    for (const pack of pending) {
      try {
        const result = await handleRenderStatusPack(
          {
            statusPackId: pack.id,
            resellerId: pack.resellerId,
            productId: pack.productId,
            templateKey: pack.templateKey,
            priceUsed: pack.priceUsed,
            format: pack.format as PackFormatKey,
          },
          deps,
        )
        console.log(`✓ ${pack.templateKey.padEnd(12)} ${pack.format.padEnd(9)} ${result.imageUrl}`)
      } catch (error) {
        // Ek pack ka fail hona baqi ko na roke — warna ek kharab row watcher ko atka deti hai
        console.error(`✗ ${pack.id}:`, error instanceof Error ? error.message : error)
        await prisma.statusPack
          .update({ where: { id: pack.id }, data: { imageUrl: null } })
          .catch(() => undefined)
      }
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_MS))
  }

  await pool.close()
  await prisma.$disconnect()
}

main().catch((error: unknown) => {
  console.error('render watch fail:', error)
  process.exit(1)
})
