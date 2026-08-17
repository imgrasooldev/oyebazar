/**
 * Render smoke test — asli Chromium chalata hai, isliye opt-in hai:
 *
 *   RUN_RENDER_TESTS=1 pnpm --filter @oyebazar/worker test
 *
 * CI mein ye tab chalega jab `playwright install chromium` step add hoga.
 * Maqsad: Urdu render chup chaap toot na jaye (font path badla, CSS badli, Chromium update hua).
 */
import { describe, expect, it, beforeAll, afterAll } from 'vitest'
import sharp from 'sharp'
import { STATUS_CANVAS, pkr } from '@oyebazar/shared'
import { ConsoleLogger } from '../logger'
import { RenderPool } from './pool'
import { StatusPackRenderer } from './render-status-pack'

const enabled = process.env.RUN_RENDER_TESTS === '1'

describe.skipIf(!enabled)('StatusPackRenderer', () => {
  const logger = new ConsoleLogger()
  const pool = new RenderPool(1, logger)
  let renderer: StatusPackRenderer

  beforeAll(async () => {
    await pool.init()
    renderer = new StatusPackRenderer(pool, logger)
  }, 60_000)

  afterAll(async () => {
    await pool.close()
  })

  const sample = {
    titleUr: 'لان تھری پیس — پھولوں والا',
    categoryNameUr: 'لان',
    price: pkr(2850),
    resellerName: 'صادیہ',
    resellerPhone: '923001234567',
    photoUrl: null,
  }

  it('WhatsApp status ke sahih dimensions deta hai', async () => {
    const result = await renderer.render('simple', sample)
    const meta = await sharp(result.image).metadata()

    expect(meta.width).toBe(STATUS_CANVAS.width)
    expect(meta.height).toBe(STATUS_CANVAS.height)
    expect(meta.format).toBe('jpeg')
  }, 60_000)

  it('har template render hota hai (koi CSS file gum na ho)', async () => {
    for (const template of ['simple', 'sale', 'eid', 'ramadan']) {
      const result = await renderer.render(template, sample)
      expect(result.bytes, `${template} khali aaya`).toBeGreaterThan(10_000)
    }
  }, 120_000)

  it('na-maujood template par saaf error deta hai', async () => {
    await expect(renderer.render('koi-aisa-template-nahi', sample)).rejects.toThrow(/nahi mila/)
  }, 30_000)
})
