import { randomBytes } from 'node:crypto'
import { RateLimitedError, ValidationError, formatBytes, mediaExtensionOf } from '@oyebazar/shared'
import { resolveMimeType } from '@oyebazar/storage'
import { apiHandler } from '@/lib/api/handler'
import { requireReseller } from '@/lib/api/session'
import { container } from '@/lib/container'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/v1/templates/upload — reseller ka apna logo (ya koi chhoti tasveer).
 *
 * Ye `/supplier/media` se milta julta hai magar jaan boojh kar ALAG aur zyada tang:
 *
 *  · **Sirf tasveer.** Video par template lagane ka raasta hai hi nahi.
 *  · **2MB, 8MB nahi.** Ye logo hai, maal ki tasveer nahi. Aur ye tasveer HAR pack
 *    mein inline ho kar jati hai — bari file har render ko dheema karti hai aur har
 *    pack ka naap barha deti hai, jo reseller ke customer ka data kharch karta hai.
 *  · **Ghanta bhar mein 10.** Logo mahine mein ek dafa lagta hai; 60 ki koi wajah nahi.
 *
 * 🔴 Teen jaanchen, teenon zaroori:
 *   1. Login — sirf reseller
 *   2. Rate limit — warna ek banda hamari storage bhar sakta hai
 *   3. File ki ASLI qism, us ke pehle bytes se — client ka bataya hua Content-Type nahi
 */

/** Ek reseller, ek ghanta, itni files. Logo lagane ke liye ye kaafi se zyada hai. */
const UPLOADS_PER_HOUR = 10

/** 2MB — logo ke liye kushada, aur har pack mein inline hone ke lehaz se mehfooz. */
const MAX_BYTES = 2 * 1024 * 1024

export async function POST(request: Request) {
  return apiHandler(async () => {
    const { reseller } = await requireReseller()

    const limit = await container.rateLimiter.consume(
      `template-asset:${reseller.id}`,
      UPLOADS_PER_HOUR,
      60 * 60 * 1000,
    )
    if (!limit.allowed) {
      throw new RateLimitedError(
        'Bohat si files ek saath. Thori dair baad koshish karen',
        limit.retryAfterMs,
      )
    }

    const form = await request.formData().catch(() => {
      throw new ValidationError('File nahi mili')
    })

    const file = form.get('file')
    if (!(file instanceof File)) throw new ValidationError('File nahi mili')

    // Hadd pehle — bari file poori memory mein lene ka koi faida nahi
    if (file.size > MAX_BYTES) {
      throw new ValidationError(`Tasveer ${formatBytes(MAX_BYTES)} se bari nahi honi chahiye`)
    }

    const bytes = Buffer.from(await file.arrayBuffer())
    if (bytes.length === 0) throw new ValidationError('File khali hai')

    // 🔴 Qism file ke andar se — naam aur Content-Type dono client ke likhe hue hain
    const resolved = resolveMimeType(bytes, file.type || undefined)
    if (!resolved.ok) {
      throw new ValidationError(
        resolved.reason === 'mismatch'
          ? 'Ye file wo nahi jo bataya gaya. Dobara chunen'
          : 'Sirf JPG, PNG ya WEBP tasveer chalti hai',
      )
    }

    const { mime } = resolved
    if (!mime.startsWith('image/')) {
      throw new ValidationError('Template par sirf tasveer lag sakti hai, video nahi')
    }

    if (bytes.length > MAX_BYTES) {
      throw new ValidationError(`Tasveer ${formatBytes(MAX_BYTES)} se bari nahi honi chahiye`)
    }

    /*
     * Naam hum khud banate hain — client ka bheja hua filename kabhi istemal nahi hota.
     * Us mein `../` ya kisi doosre ka raasta ho sakta hai. resellerId prefix mein hai
     * taake storage dekh kar hi pata chale ke ye kis ka hai.
     */
    const key = `template-assets/${reseller.id}/${randomBytes(16).toString('hex')}.${mediaExtensionOf(mime)}`
    const stored = await container.storage.upload(key, bytes, mime)

    container.logger.info('template_asset_uploaded', {
      resellerId: reseller.id,
      mime,
      bytes: bytes.length,
    })

    return { url: stored.url, bytes: bytes.length }
  })
}
