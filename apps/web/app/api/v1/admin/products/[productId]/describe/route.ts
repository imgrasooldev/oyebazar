import { NotFoundError, RateLimitedError, ValidationError } from '@oyebazar/shared'
import { apiHandler } from '@/lib/api/handler'
import { requireOpsUser } from '@/lib/api/admin-session'
import { container } from '@/lib/container'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Ops ke liye hadd — poori team ki, ek dukan ki nahi.
 *
 * 🔴 Ops ki chhanni ek waqt mein tees maal par nishan lagati hai, aur ek banda unhen
 * ek baithak mein nipatata hai. 120 fi ghanta us ke liye kushada hai aur us surat se
 * bachata hai jahan koi safha kisi loop mein phans kar raat bhar model ko bulata rahe.
 */
const SUGGESTS_PER_HOUR = 120

/**
 * POST /api/v1/admin/products/:id/describe — is maal ke liye naam aur khaana tajweez karo.
 *
 * 🔴 Dukan wale wale raste se EK bunyadi farq hai: yahan tasveer ka pata client se
 * NAHI aata. Sirf `productId` aata hai aur tasveer hum khud DB se nikalte hain.
 *
 * Wo raste par (`/api/v1/supplier/products/describe`) tasveer abhi kisi product par
 * lagi hi nahi hoti — maal ban hi raha hota hai — is liye pata client se lena parta
 * hai, aur wahan us par sakht jaanch lagi hui hai. Yahan wo majboori nahi hai, aur jo
 * jaanch ki zaroorat hi na pare wo sab se mazboot jaanch hoti hai.
 *
 * 🔴 Yahan bhi kuch MEHFOOZ nahi hota. Ye sirf tajweez deta hai; badalna PATCH par
 * hota hai, jahan ops khud dekh kar bhejti hai. Model ki ghalti seedha catalogue par
 * chali jaye — wo us se bhi buri surat hai jo abhi hai (naam ghalat hai magar kisi
 * INSAAN ne likha hai aur us ka koi zimmedar hai).
 */
export async function POST(_request: Request, ctx: { params: Promise<{ productId: string }> }) {
  return apiHandler(async () => {
    const { user } = await requireOpsUser()
    // Tajweez bhi wohi maang sake jo usay laga bhi sakti ho — warna ek bemani darwaza
    container.admin.assertPermission(user, 'manageProducts')

    const describer = container.describer
    if (!describer) throw new ValidationError('Ye sahulat abhi mojood nahi')

    const { productId } = await ctx.params

    const limit = await container.rateLimiter.consume(
      'describe:ops',
      SUGGESTS_PER_HOUR,
      60 * 60 * 1000,
    )
    if (!limit.allowed) {
      throw new RateLimitedError('Thori dair baad koshish karen', limit.retryAfterMs)
    }

    /*
     * Tasveer maal ki apni.
     *
     * 🔴 Tasveer na ho to 404 nahi, ek saaf jawab — kyunke ye ghalti nahi, ek asli
     * surat hai: `oddTitle` wale maal par aksar tasveer hoti hai, magar hamesha nahi.
     * Aur bina tasveer ke ye kaam ho hi nahi sakta: naam hi wo cheez hai jo kharab hai,
     * to naam se naya naam nikalna apni hi ghalti dobara likhna hai.
     */
    const products = await container.admin.listProducts(user, { limit: 500 })
    const product = products.find((row) => row.id === productId)
    if (!product) throw new NotFoundError('Product', productId)
    if (!product.imageUrl) {
      throw new ValidationError('Is maal ki koi tasveer nahi — naam haath se theek karen')
    }

    const categories = await container.repositories.categories.findAll()

    return describer.describe({
      imageUrl: product.imageUrl,
      categories: categories.map((category) => ({
        slug: category.slug,
        nameEn: category.nameEn,
      })),
      /*
       * Mojooda naam ISHARA ke tor par jata hai, hukm nahi.
       *
       * 🔴 Ye us surat mein bhi theek rehta hai jab naam bilkul bekar ho ("aaa", "1234")
       * — model ko kaha gaya hai ke ishara zaroori nahi ke durust ho, aur tasveer hi
       * asal hai. Aur jab naam adhoora magar sacha ho ("lawn"), tab wo waqai madad
       * karta hai.
       */
      hint: product.titleEn,
    })
  })
}
