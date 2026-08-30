import { randomBytes } from 'node:crypto'
import {
  MEDIA_LIMITS,
  RateLimitedError,
  ValidationError,
  formatBytes,
  mediaExtensionOf,
  mediaKindOf,
} from '@oyebazar/shared'
import { resolveMimeType } from '@oyebazar/storage'
import { apiHandler } from '@/lib/api/handler'
import { requireReseller } from '@/lib/api/session'
import { container } from '@/lib/container'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/v1/media — reseller ki tasveer.
 *
 * 🔴 Ye sirf ORDER ki guftagu ke liye hai — "maal aisa aaya hai". Aur wohi ek jumla is
 * poore raste ki wajah hai: jhagre ke din lafz kaam nahi aate. Reseller likhti hai
 * "rang ghalat hai", dukan likhta hai "wohi bheja tha", aur ops ke paas faisla karne ka
 * koi zariya nahi hota. Ek tasveer wo poora jhagra ek lamhe mein khatam kar deti hai.
 *
 * 🔴 `OrderMessage.photoUrl` ka khaana PEHLE SE mojood tha aur usay koi API leti hi
 * nahi thi — yani wo mara hua code tha jo zinda dikhta tha. Ye us khaane ka darwaza hai.
 *
 * Dukan wale ke raste (`/api/v1/supplier/media`) se do farq hain, aur dono jaan boojh
 * kar:
 *
 *  · SIRF TASVEER — video nahi. Wahan video maal ki numaish ke liye hai; yahan baat ek
 *    jhagre ki hai, aur us ke liye tasveer kaafi hai. Video ki ijazat dene ka matlab
 *    3G par ek aisi upload hoti jo aksar mukammal hi nahi hoti, aur reseller samajhti
 *    ke us ne shikayat darj kar di jab ke kuch gaya hi nahi.
 *  · Hadd bohat CHHOTI (12 fi ghanta). Wahan dukan maal chadha rahi hoti hai (60);
 *    yahan ek order par do ya teen tasveerein — us se zyada ki koi asli soorat nahi.
 */

/** Ek reseller, ek ghanta, itni tasveerein. Ek jhagre ke liye ye kushada hai. */
const UPLOADS_PER_HOUR = 12

export async function POST(request: Request) {
  return apiHandler(async () => {
    const { reseller } = await requireReseller()

    const limit = await container.rateLimiter.consume(
      `media:reseller:${reseller.id}`,
      UPLOADS_PER_HOUR,
      60 * 60 * 1000,
    )
    if (!limit.allowed) {
      throw new RateLimitedError(
        'Bohat si tasveerein ek saath. Thori dair baad koshish karen',
        limit.retryAfterMs,
      )
    }

    const form = await request.formData().catch(() => {
      throw new ValidationError('File nahi mili')
    })

    const file = form.get('file')
    if (!(file instanceof File)) throw new ValidationError('File nahi mili')

    // Sab se bari hadd pehle — bari file poori memory mein lene ka koi faida nahi
    if (file.size > MEDIA_LIMITS.IMAGE.maxBytes) {
      throw new ValidationError(
        `Tasveer ${formatBytes(MEDIA_LIMITS.IMAGE.maxBytes)} se bari nahi honi chahiye`,
      )
    }

    const bytes = Buffer.from(await file.arrayBuffer())
    if (bytes.length === 0) throw new ValidationError('File khali hai')

    // 🔴 Qism file ke ANDAR se — naam aur Content-Type dono client ke likhe hue hain
    const resolved = resolveMimeType(bytes, file.type || undefined)
    if (!resolved.ok) throw new ValidationError('Sirf JPG, PNG ya WEBP tasveer chalti hai')

    /*
     * 🔴 Video yahin ruk jata hai — aur ye jaanch MIME ke baad hai, pehle nahi.
     *
     * Client ka bheja hua naam ya Content-Type dekh kar mana karna aasan tha, magar wo
     * dono us ke apne likhe hue hain. `mediaKindOf` file ke ASAL bytes se nikli hui
     * qism par chalta hai — yani `.jpg` naam wali video bhi yahin girti hai.
     */
    const { mime } = resolved
    if (mediaKindOf(mime) !== 'IMAGE') {
      throw new ValidationError('Yahan sirf tasveer bheji ja sakti hai')
    }

    /*
     * Naam hum khud banate hain — client ka bheja hua filename kabhi istemal nahi hota.
     * `resellerId` raste mein hai taake bucket dekh kar hi pata chale ke tasveer kis ki
     * hai, aur wohi cheez us jaanch ko mumkin banati hai jo message wale route par hai.
     */
    const key = `order-photos/${reseller.id}/${randomBytes(16).toString('hex')}.${mediaExtensionOf(mime)}`
    const stored = await container.storage.upload(key, bytes, mime)

    container.logger.info('reseller_media_uploaded', {
      resellerId: reseller.id,
      mime,
      bytes: bytes.length,
    })

    return { url: stored.url }
  })
}
