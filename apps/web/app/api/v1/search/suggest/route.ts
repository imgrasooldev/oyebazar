import { z } from 'zod'
import { expandSearch, normalizeSearch } from '@oyebazar/shared'
import { apiHandler, parseQuery } from '@/lib/api/handler'
import { container } from '@/lib/container'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const QuerySchema = z.object({
  q: z.string().trim().min(1).max(60),
})

/**
 * GET /api/v1/search/suggest — PUBLIC search ki tajaweez (Amazon jaisi patti).
 *
 * 🔴 Yahan qeemat ka koi khaana nahi. Ye endpoint bina login ke khulta hai; ek bhi
 * price field yahan aa gayi to poora business model khul jata hai. Isi liye ye
 * `bazaar` service se guzarta hai, jo PUBLIC views hi wapas karti hai.
 *
 * Teen qism ki tajweez, isi tarteeb mein:
 *  1. Categories — sab se kaam ki, kyunke ek category poori list khol deti hai
 *  2. Wholesalers — naam se dhoondne wale seedha dukan chahte hain
 *  3. Maal — akhir mein, kyunke public par ye sirf naam hai, rate nahi
 */
export async function GET(request: Request) {
  return apiHandler(async () => {
    const { q } = parseQuery(request, QuerySchema)

    /*
     * Category ki chhanni bhi wohi lughat istemal karti hai jo maal ki talash karti hai.
     *
     * Pehle ye seedha `toLowerCase().includes()` thi — yani "bachon ke kapre" likhne
     * wale ko "بچوں کے کپڑے" wali category patti mein nazar hi nahi aati thi, halanke
     * neeche us ka maal aa raha hota tha. Do alag chhanniyan rakhna hamesha isi tarah
     * toot ta hai.
     */
    const groups = expandSearch(q)
    const matchesQuery = (row: { nameUr: string; nameEn: string }): boolean => {
      const haystack = normalizeSearch(`${row.nameUr} ${row.nameEn}`)
      return groups.length > 0 && groups.every((group) => group.some((w) => haystack.includes(w)))
    }

    const [categories, suppliers, products] = await Promise.all([
      container.repositories.categories.findAll(),
      container.bazaar.listSuppliers({ search: q, limit: 4 }),
      container.bazaar.listProducts({ search: q, limit: 5 }),
    ])

    return {
      categories: categories
        .filter(matchesQuery)
        .slice(0, 4)
        .map((category) => ({
          type: 'category' as const,
          slug: category.slug,
          nameUr: category.nameUr,
          nameEn: category.nameEn,
        })),

      suppliers: suppliers.items.map((supplier) => ({
        type: 'supplier' as const,
        slug: supplier.slug,
        nameUr: supplier.businessName,
        nameEn: supplier.businessName,
        city: supplier.city,
      })),

      products: products.items.map((product) => ({
        type: 'product' as const,
        /*
         * Maal ka apna slug — us ke APNE safhe ke liye (`/bazaar/item/<slug>`).
         *
         * Pehle yahan dukan ka slug jata tha, kyunke maal ka apna safha tha hi nahi.
         * Ab hai — aur purani soorat wahi shakayat thi jo safhe par nazar aati thi:
         * banda ek cheez par ungli rakhta tha aur us ke saamne poori dukan khul jati
         * thi, phir wo cheez dobara dhoondni parti thi.
         */
        slug: product.slug,
        nameUr: product.titleUr,
        nameEn: product.titleEn,
        imageUrl: product.coverImageUrl,
        hint: product.supplierName,
      })),
    }
  })
}
