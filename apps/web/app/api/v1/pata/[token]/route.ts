import { z } from 'zod'
import { PakistaniPhoneSchema } from '@oyebazar/shared'
import { RateLimitedError } from '@oyebazar/shared'
import { apiHandler, clientIp, parseBody } from '@/lib/api/handler'
import { container } from '@/lib/container'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BodySchema = z
  .object({
    customerName: z.string().trim().min(2).max(60),
    customerPhone: PakistaniPhoneSchema,
    customerAddress: z.string().trim().min(10).max(300),
    area: z.string().trim().min(2).max(60),
    /*
     * Pin lazmi NAHI hai.
     *
     * 🔴 Bohat se log location ki ijazat nahi dete, aur kuch ke phone par wo kaam hi
     * nahi karti. Usay lazmi karne ka natija ye hota ke wo log form chhor kar chale
     * jate — aur phir un ka pata reseller ko WhatsApp par type karna parta, yani hum
     * wahin wapas pohanch jate jahan se chale the.
     */
    locationLat: z.number().min(-90).max(90).optional(),
    locationLng: z.number().min(-180).max(180).optional(),
  })
  .strict()

/**
 * POST /api/v1/pata/:token — customer apna pata bhejti hai.
 *
 * 🔴 Koi login nahi — token hi chabi hai (32 bytes). Safha customer ke phone par khulta
 * hai; us se account banwana poore feature ko be-kaar kar deta.
 *
 * Rate limit IP par: token andaza lagane ke qabil nahi, magar ek khula hua public
 * darwaza bina hadd ke nahi chhora jata.
 */
export async function POST(request: Request, ctx: { params: Promise<{ token: string }> }) {
  return apiHandler(async () => {
    const limit = await container.rateLimiter.consume(
      `pata:${clientIp(request)}`,
      20,
      10 * 60 * 1000,
    )
    if (!limit.allowed) throw new RateLimitedError(undefined, limit.retryAfterMs)

    const { token } = await ctx.params
    const input = await parseBody(request, BodySchema)

    await container.addressRequests.fill(token, input)

    return { ok: true }
  })
}
