import { z } from 'zod'
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
    const needle = q.toLowerCase()

    const [categories, suppliers, products] = await Promise.all([
      container.repositories.categories.findAll(),
      container.bazaar.listSuppliers({ search: q, limit: 4 }),
      container.bazaar.listProducts({ search: q, limit: 5 }),
    ])

    return {
      categories: categories
        .filter(
          (category) =>
            category.nameEn.toLowerCase().includes(needle) || category.nameUr.includes(q),
        )
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
        // Public par maal ka apna safha nahi hai — tajweez us ki DUKAN par le jati hai,
        // jahan se reseller seedha WhatsApp par rate poochh sakti hai
        slug: product.supplierSlug,
        nameUr: product.titleUr,
        nameEn: product.titleEn,
        imageUrl: product.coverImageUrl,
        hint: product.supplierName,
      })),
    }
  })
}
