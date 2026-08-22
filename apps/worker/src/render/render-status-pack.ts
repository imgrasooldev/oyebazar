/**
 * ⭐ Asal render — HTML → PNG.
 *
 * Ye function hamare poore product ka dil hai: wo image jo Sadia ke WhatsApp status,
 * Instagram, Facebook ya TikTok par jati hai. Isi ka render time hamara #1 performance
 * number hai. Naap `format` se aata hai — template ek hi rehta hai.
 */
import sharp from 'sharp'
import type { Logger } from '@oyebazar/core'
import { DEFAULT_PACK_OPTIONS, PACK_FORMATS, type PackFormatKey, type PackOptions } from '@oyebazar/shared'
import type { RenderPool } from './pool'
import { buildStatusPackHtml, type TemplateData } from './template'

export interface RenderResult {
  readonly image: Buffer
  readonly contentType: 'image/jpeg'
  readonly extension: 'jpg'
  readonly bytes: number
  readonly durationMs: number
}

/**
 * 🔴 JPEG, PNG nahi.
 *
 * Status pack ek TASVEER hai (kapre ki photo + text overlay), screenshot nahi. PNG is par
 * ~620KB deta hai, JPEG q88 ~150KB — chaar guna chhota. Sadia ka data mehnga hai aur
 * WhatsApp waise bhi apni compression lagata hai, to PNG ka faida sirf theory mein hai.
 * Encode bhi kaafi tez hai.
 */
const JPEG_QUALITY = 88

export class StatusPackRenderer {
  constructor(
    private readonly pool: RenderPool,
    private readonly logger: Logger,
  ) {}

  async render(
    templateKey: string,
    data: TemplateData,
    formatKey: PackFormatKey = 'story',
    options: PackOptions = DEFAULT_PACK_OPTIONS,
  ): Promise<RenderResult> {
    const startedAt = Date.now()
    const format = PACK_FORMATS[formatKey]
    const html = await buildStatusPackHtml(templateKey, data, formatKey, options)
    // HTML banane ka waqt (photo download + font inline) alag se — warna pata hi nahi
    // chalta ke dheema render browser hai ya network
    const htmlMs = Date.now() - startedAt

    const raw = await this.pool.withContext(async (context) => {
      const page = await context.newPage()
      try {
        // 🔴 Viewport bhi naap ke sath badalna zaroori hai. Context ka viewport 1080 ka
        // hai; chaure canvas (1200) par body viewport se bari ho jati hai aur RTL mein
        // poora stage khisak kar kinare se kat jata hai — qeemat aur number dono gayab.
        await page.setViewportSize({ width: format.width, height: format.height })

        // fonts/photo dono inline hain, isliye 'load' kaafi hai — network ka intezar nahi
        await page.setContent(html, { waitUntil: 'load' })

        // 🔴 Font load hone se pehle screenshot = toota hua Nastaliq. Ye line lazmi hai.
        await page.evaluate(() => document.fonts.ready)

        return await page.screenshot({
          type: 'jpeg',
          quality: 95, // yahan zyada rakhte hain; aakhri compression sharp karti hai
          clip: { x: 0, y: 0, width: format.width, height: format.height },
        })
      } finally {
        await page.close().catch(() => undefined)
      }
    })
    const screenshotMs = Date.now() - startedAt - htmlMs

    const image = await sharp(raw)
      .jpeg({ quality: JPEG_QUALITY, mozjpeg: true, progressive: true })
      .toBuffer()

    const durationMs = Date.now() - startedAt

    this.logger.info('status_pack_rendered', {
      templateKey,
      formatKey,
      lang: options.lang,
      bytes: image.byteLength,
      durationMs,
      htmlMs,
      screenshotMs,
      encodeMs: durationMs - htmlMs - screenshotMs,
    })

    return {
      image,
      contentType: 'image/jpeg',
      extension: 'jpg',
      bytes: image.byteLength,
      durationMs,
    }
  }
}
