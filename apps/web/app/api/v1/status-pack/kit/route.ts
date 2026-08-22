import {
  GenerateStatusPackSchema,
  packOptionsFrom,
  packOptionsKey,
  pkr,
} from '@oyebazar/shared'
import { z } from 'zod'
import { apiHandler, parseBody, parseQuery } from '@/lib/api/handler'
import { toPackKitDTO } from '@/lib/api/mappers'
import { requireReseller } from '@/lib/api/session'
import { container } from '@/lib/container'
import { getLocale } from '@/lib/i18n-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * ⭐ POST /api/v1/status-pack/kit — ek product, saare platforms.
 *
 * Chaar naap (story 9:16, chokor 1:1, lamba 4:5, chaura 1.91:1) aur har platform ka
 * apna caption. Jo cache mein hai wo foran READY, baqi RENDERING — UI ko poore kit ka
 * intezar nahi karna parta.
 *
 * Ye endpoint jaan boojh kar API par hai (server action nahi): mobile app baad mein
 * isi ko call karegi, aur tab logic dobara likhne ki zaroorat nahi paregi.
 */
export async function POST(request: Request) {
  return apiHandler(async () => {
    const { reseller } = await requireReseller()
    const body = await parseBody(request, GenerateStatusPackSchema)

    // Caption usi likhawat mein jo reseller ne chuni hai — wo isay copy kar ke apne
    // customers ko bhejti hai, aur Roman likhne wali ke customers Urdu script nahi parhte
    const locale = await getLocale()
    const script = locale === 'ur' ? 'ur' : 'roman'

    const result = await container.statusPacks.generateKit(
      {
        resellerId: reseller.id,
        productId: body.productId,
        ...(body.mediaId ? { mediaId: body.mediaId } : {}),
        templateKey: body.templateKey,
        retailPrice: body.retailPrice !== undefined ? pkr(body.retailPrice) : undefined,
        // Studio ke switch. Na aayen to service reseller ke profile wale default leti hai.
        ...(body.options ? { options: packOptionsFrom(body.options) } : {}),
      },
      reseller,
      script,
    )

    return toPackKitDTO(result, {
      productId: body.productId,
      mediaId: body.mediaId,
      templateKey: body.templateKey,
      // UI isay polling par wapas bhejta hai — dekhen PollQuerySchema
      optionsKey: packOptionsKey(packOptionsFrom(body.options ?? reseller.packDefaults)),
    })
  })
}

const PollQuerySchema = z.object({
  productId: z.string().min(1),
  mediaId: z.string().min(1).max(40).optional(),
  templateKey: z.string().min(1),
  priceUsed: z.coerce.number().int().positive(),
  /*
   * 🔴 optionsKey polling par bhi lazmi hai.
   *
   * Query string mein poora options object bhejne ke bajaye us ka nichor — kyunke
   * lookup ko sirf yehi chahiye, aur reseller ka likha hua naam URL mein nahi jata
   * (wo server ke log mein chala jata, jahan us ka koi kaam nahi).
   */
  optionsKey: z.string().max(200).optional(),
})

/** GET — kit ki halat. Naya render shuru nahi karta, sirf batata hai kya tayyar hai. */
export async function GET(request: Request) {
  return apiHandler(async () => {
    const { reseller } = await requireReseller()
    const query = parseQuery(request, PollQuerySchema)
    const locale = await getLocale()

    const result = await container.statusPacks.getKitStatus(
      reseller,
      {
        productId: query.productId,
        ...(query.mediaId ? { mediaId: query.mediaId } : {}),
        templateKey: query.templateKey,
        priceUsed: pkr(query.priceUsed),
        ...(query.optionsKey !== undefined ? { optionsKey: query.optionsKey } : {}),
      },
      locale === 'ur' ? 'ur' : 'roman',
    )

    return result
      ? toPackKitDTO(result, {
          productId: query.productId,
          mediaId: query.mediaId,
          templateKey: query.templateKey,
          optionsKey: query.optionsKey ?? '',
        })
      : { status: 'NOT_FOUND' as const }
  })
}
