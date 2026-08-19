import { randomBytes } from 'node:crypto'
import {
  MEDIA_LIMITS,
  RateLimitedError,
  ValidationError,
  formatBytes,
  maxBytesFor,
  mediaExtensionOf,
  mediaKindOf,
} from '@oyebazar/shared'
import { resolveMimeType } from '@oyebazar/storage'
import { apiHandler } from '@/lib/api/handler'
import { requireSupplier } from '@/lib/api/supplier-session'
import { container } from '@/lib/container'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/v1/supplier/media — wholesaler ki tasveer ya video.
 *
 * Ek dafa mein EK file. Wajah dukan ki hai, code ki nahi: 3G par chaar tasveerein ek
 * saath bhejne se sab ek saath fail hoti hain aur dobara sab bhejni parti hain. Alag
 * alag bhejne se jo chali gayi wo chali gayi, aur UI har ek ka apna progress dikhata hai.
 *
 * Yahan se sirf URL milta hai — product abhi bana nahi. Wo POST /supplier/products par
 * banta hai jahan ye URLs bheje jate hain.
 *
 * 🔴 Teen jaanchen, teenon zaroori:
 *   1. Login — sirf VERIFIED wholesaler (requireSupplier)
 *   2. Rate limit — warna ek banda hamari disk/bucket bhar sakta hai
 *   3. File ki ASLI qism, us ke pehle bytes se — client ka bataya hua Content-Type nahi
 */

/** Ek dukan, ek ghanta, itni files. Asli maal daalne ke liye ye kaafi se zyada hai. */
const UPLOADS_PER_HOUR = 60

export async function POST(request: Request) {
  return apiHandler(async () => {
    const { supplier } = await requireSupplier()

    const limit = await container.rateLimiter.consume(
      `media:supplier:${supplier.id}`,
      UPLOADS_PER_HOUR,
      60 * 60 * 1000,
    )
    if (!limit.allowed) {
      throw new RateLimitedError('Bohat si files ek saath. Thori dair baad koshish karen', limit.retryAfterMs)
    }

    const form = await request.formData().catch(() => {
      throw new ValidationError('File nahi mili')
    })

    const file = form.get('file')
    if (!(file instanceof File)) throw new ValidationError('File nahi mili')

    // Sab se bari hadd pehle — 200MB ki file poori memory mein lene ka koi faida nahi
    const ceiling = Math.max(MEDIA_LIMITS.IMAGE.maxBytes, MEDIA_LIMITS.VIDEO.maxBytes)
    if (file.size > ceiling) {
      throw new ValidationError(`File ${formatBytes(ceiling)} se bari nahi honi chahiye`)
    }

    const bytes = Buffer.from(await file.arrayBuffer())
    if (bytes.length === 0) throw new ValidationError('File khali hai')

    // 🔴 Qism file ke andar se — naam aur Content-Type dono client ke likhe hue hain
    const resolved = resolveMimeType(bytes, file.type || undefined)
    if (!resolved.ok) {
      throw new ValidationError(
        resolved.reason === 'mismatch'
          ? 'Ye file wo nahi jo bataya gaya. Dobara chunen'
          : 'Sirf JPG, PNG, WEBP tasveer ya MP4, MOV, WEBM video chalti hai',
      )
    }

    const { mime } = resolved
    const kind = mediaKindOf(mime)

    // Har qism ki apni hadd — video ki barhi, tasveer ki chhoti
    const maxBytes = maxBytesFor(mime)
    if (bytes.length > maxBytes) {
      throw new ValidationError(
        kind === 'VIDEO'
          ? `Video ${formatBytes(maxBytes)} se bara nahi ho sakta`
          : `Tasveer ${formatBytes(maxBytes)} se bari nahi ho sakti`,
      )
    }

    /*
     * Naam hum khud banate hain — client ka bheja hua filename kabhi istemal nahi hota.
     *
     * Us mein `../`, unicode ke chhupe hue characters, ya doosri dukan ke naam wala
     * raasta ho sakta hai. supplierId prefix mein hai taake bucket dekh kar hi pata
     * chale ke maal kis ka hai.
     */
    const key = `products/${supplier.id}/${randomBytes(16).toString('hex')}.${mediaExtensionOf(mime)}`
    const stored = await container.storage.upload(key, bytes, mime)

    container.logger.info('supplier_media_uploaded', {
      supplierId: supplier.id,
      kind,
      mime,
      bytes: bytes.length,
    })

    return { url: stored.url, type: kind, bytes: bytes.length }
  })
}
