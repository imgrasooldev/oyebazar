import { z } from 'zod'
import { RateLimitedError, ValidationError } from '@oyebazar/shared'
import { apiHandler, parseBody } from '@/lib/api/handler'
import { requireSupplier } from '@/lib/api/supplier-session'
import { container } from '@/lib/container'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BodySchema = z
  .object({
    imageUrl: z.string().url().max(500),
    /** Dukan wale ka apna ishara — "lawn 3 piece". Marzi ka. */
    hint: z.string().trim().max(200).optional(),
  })
  .strict()

/**
 * Ek dukan, ek ghanta, itni dafa.
 *
 * 🔴 Ye hadd kharche ki hai, badsaluki ki nahi — aur wo farq yahan ahem hai. Har call
 * ek tasveer model ko bhejti hai, aur wo is app ki sab se mehngi darkhwast hai. Bina
 * hadd ke ek khula hua safha (ya ek loop mein phansa hua button) ek raat mein wo bill
 * bana sakta hai jo poore mahine ke infra se bara ho.
 *
 * 40 us dukan ke liye kaafi se zyada hai jo ek baithak mein maal chadha rahi ho — aur
 * media upload ki hadd (60) se kam, kyunke har tasveer par bayan nahi maanga jata.
 */
const DESCRIBES_PER_HOUR = 40

/**
 * POST /api/v1/supplier/products/describe — tasveer dekh kar khaane bharo.
 *
 * 🔴 Jawab MASHWARA hai. Yahan kuch mehfooz nahi hota: koi product nahi banta, koi
 * khaana DB mein nahi jata. Safha khaane bhar deta hai aur dukan wala unhen badal kar
 * khud "Save" dabata hai. Seedha mehfooz karna do wajah se ghalat hoga — model ghalti
 * karta hai, aur us ghalti par dukan ka apna naam chhapta hai.
 *
 * 🔴 `describer` `null` ho sakta hai (key na ho to). Us surat mein 404 — kyunke feature
 * MOJOOD hi nahi hai, aur "abhi kaam nahi kar raha" kehna jhoot hoga: wo kabhi kaam
 * karta hi nahi jab tak key na lage.
 */
export async function POST(request: Request) {
  return apiHandler(async () => {
    const { supplier } = await requireSupplier()

    const describer = container.describer
    if (!describer) throw new ValidationError('Ye sahulat abhi mojood nahi')

    const body = await parseBody(request, BodySchema)

    /*
     * 🔴 Tasveer ka pata HAMARA hona lazmi hai, aur ISI dukan ka.
     *
     * Bina is jaanch ke ye endpoint ek muft "kisi bhi tasveer ka bayan likho" wali
     * service ban jata — hamare bill par, aur bina kisi hadd ke ke wo tasveer kiski
     * hai. Wohi jaanch payout ki rasid par bhi lagi hui hai, aur wahin wajah likhi hai:
     * `publicUrl` wohi function hai jo upload ke waqt pata banata hai, aur us mein
     * `supplier.id` khud hum lagate hain.
     */
    const mine = container.storage.publicUrl(`products/${supplier.id}/`)
    if (!body.imageUrl.startsWith(mine)) {
      throw new ValidationError('Tasveer isi jagah se upload karen')
    }

    /*
     * Hadd JAANCH ke BAAD — aur ye tarteeb jaan boojh kar hai.
     *
     * Ghalat pate wali darkhwast dukan ka ghanta nahi khani chahiye: wo aksar hamari
     * apni ghalti se aati hai (purana safha, adhoora upload), aur us par hadd kaat
     * dena us bande ko saza deta hai jis ne kuch ghalat kiya hi nahi.
     */
    const limit = await container.rateLimiter.consume(
      `describe:${supplier.id}`,
      DESCRIBES_PER_HOUR,
      60 * 60 * 1000,
    )
    if (!limit.allowed) {
      throw new RateLimitedError('Thori dair baad koshish karen', limit.retryAfterMs)
    }

    const categories = await container.repositories.categories.findAll()

    const draft = await describer.describe({
      imageUrl: body.imageUrl,
      categories: categories.map((category) => ({
        slug: category.slug,
        nameEn: category.nameEn,
      })),
      hint: body.hint ?? null,
    })

    /*
     * Nakaami par `null` — koi ghalti ka paighaam nahi.
     *
     * 🔴 Safhe ka kaam is par KUCH NA karna hai: khaane jaise the waise rehte hain aur
     * dukan wala haath se likhta rehta hai. "AI nakaam ho gaya" likhna us bande ka waqt
     * lene ke siwa kuch nahi karta jo waise bhi khud likhne wala tha.
     */
    return draft
  })
}
