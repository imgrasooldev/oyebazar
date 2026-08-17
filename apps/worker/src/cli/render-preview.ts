/**
 * 🔴 URDU RENDER SPIKE — spec ke hafta-1 ka sab se ahem faisla.
 *
 * Bina database aur bina Redis ke saare templates render kar ke PNG file bana deta hai,
 * taake asli phone par dekha ja sake ke Nastaliq theek jur raha hai ya toot raha hai.
 * Poora architecture isi par khara hai (canvas is se fail hota hai).
 *
 * Chalayen:
 *   pnpm --filter @oyebazar/worker render:preview
 *   pnpm --filter @oyebazar/worker render:preview -- sale eid
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pkr } from '@oyebazar/shared'
import { ConsoleLogger } from '../logger'
import { RenderPool } from '../render/pool'
import { StatusPackRenderer } from '../render/render-status-pack'
import { listTemplateKeys } from '../render/template'

const logger = new ConsoleLogger()

/** Asli jaisa data — lamba Urdu title jaan boojh kar, taake shaping ka imtehan ho. */
const SAMPLE = {
  titleUr: 'لان تھری پیس — پھولوں والا، چکن کاری کے ساتھ',
  categoryNameUr: 'لان',
  price: pkr(2850),
  resellerName: 'صادیہ بی بی',
  resellerPhone: '923001234567',
  photoUrl: 'https://picsum.photos/seed/baji-preview/1080/1440',
}

async function main(): Promise<void> {
  const requested = process.argv.slice(2).filter((arg) => !arg.startsWith('-'))
  const templates = requested.length > 0 ? requested : listTemplateKeys()

  const outDir = resolve(process.cwd(), 'preview-out')
  await mkdir(outDir, { recursive: true })

  const pool = new RenderPool(2, logger)
  await pool.init()
  const renderer = new StatusPackRenderer(pool, logger)

  const timings: { template: string; ms: number; kb: number }[] = []

  try {
    for (const template of templates) {
      const result = await renderer.render(template, SAMPLE)
      const file = resolve(outDir, `${template}.${result.extension}`)
      await writeFile(file, result.image)
      timings.push({
        template,
        ms: result.durationMs,
        kb: Math.round(result.bytes / 1024),
      })
      console.log(`✓ ${template.padEnd(12)} ${result.durationMs}ms  ${Math.round(result.bytes / 1024)}KB  → ${file}`)
    }
  } finally {
    await pool.close()
  }

  const avg = Math.round(timings.reduce((sum, t) => sum + t.ms, 0) / (timings.length || 1))
  console.log(`\nAverage: ${avg}ms per pack (budget: on-demand p95 <2000ms)`)
  console.log(`Preview images: ${outDir}`)
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
