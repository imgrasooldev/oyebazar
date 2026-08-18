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
 *
 * Poori kit (chaaron naap) dekhne ke liye:
 *   KIT=1 pnpm --filter @oyebazar/worker render:preview -- simple
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { KIT_FORMATS, PACK_FORMATS, pkr, type PackFormatKey } from '@oyebazar/shared'
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
    // KIT=1 par har template chaaron naap mein — ye dekhne ke liye ke chhote canvas par
    // qeemat ya number kat to nahi raha
    const formats: PackFormatKey[] = process.env.KIT === '1' ? KIT_FORMATS : ['story']

    for (const template of templates) {
      for (const format of formats) {
        const result = await renderer.render(template, SAMPLE, format)
        const suffix = process.env.KIT === '1' ? `-${format}` : ''
        const file = resolve(outDir, `${template}${suffix}.${result.extension}`)
        await writeFile(file, result.image)

        timings.push({
          template: `${template}/${format}`,
          ms: result.durationMs,
          kb: Math.round(result.bytes / 1024),
        })

        const size = `${PACK_FORMATS[format].width}×${PACK_FORMATS[format].height}`
        console.log(
          `✓ ${template.padEnd(12)} ${format.padEnd(9)} ${size.padEnd(10)} ${result.durationMs}ms  ${Math.round(result.bytes / 1024)}KB`,
        )
      }
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
