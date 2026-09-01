import type { MetadataRoute } from 'next'
import { container } from '@/lib/container'
import { absoluteUrl } from '@/lib/seo'

export const dynamic = 'force-dynamic'

/**
 * sitemap.xml — ye bhi mojood nahi tha (404).
 *
 * 🔴 Ye DB se banti hai, haath se likhi hui fehrist se nahi. Haath wali fehrist us din
 * purani ho jati hai jis din pehli nayi dukan aati hai — aur kisi ko pata nahi chalta,
 * kyunke koi cheez tootti nahi. Bas naya maal Google par kabhi nahi aata.
 *
 * 🔴 Aur shart wohi hai jo Bazaar par hai (`VERIFIED` + `listedOnBazaar`). Is ka ek
 * seedha faida hai jo abhi kaam aayega: production par abhi 15 dukanen SEED ki hui
 * hain. Jis din ops un ka "Bazaar par dikhayen" band karti hai, ye sitemap se khud
 * nikal jati hain — SEO ke liye alag koi khaana banane ki zaroorat nahi.
 */

/*
 * Hadd — sitemap ki apni hadd 50,000 pate hai. Ye us se bohat neeche hai aur jaan
 * boojh kar: is se aage jane ka matlab hai ke ye safha ek bhaari query ban jaye, aur
 * wo query har crawler ke aane par chalti hai. Jis din maal is se barh jaye, us din
 * sitemap ko tukron mein baantna hai (`/sitemap/[n].xml`) — hadd barhana hal nahi.
 */
const LIMIT = 5_000

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [suppliers, products] = await Promise.all([
    container.repositories.suppliers.publicSlugs(LIMIT),
    container.repositories.products.publicSlugs(LIMIT),
  ])

  /*
   * Hamare apne safhe — inhen kisi tareekh ki zaroorat nahi.
   *
   * 🔴 `priority` yahan JAAN BOOJH KAR nahi hai. Google ne 2023 mein saaf keh diya
   * tha ke wo `priority` aur `changefreq` dono ko nazar-andaz karta hai. Un ka likhna
   * sirf ye dhoka deta hai ke koi kaam ki cheez lagi hui hai.
   */
  const pages: MetadataRoute.Sitemap = [
    { url: absoluteUrl('/') },
    { url: absoluteUrl('/bazaar') },
    { url: absoluteUrl('/bazaar/items') },
  ]

  return [
    ...pages,
    ...suppliers.map((row) => ({
      url: absoluteUrl(`/bazaar/${row.slug}`),
      lastModified: row.updatedAt,
    })),
    ...products.map((row) => ({
      url: absoluteUrl(`/bazaar/item/${row.slug}`),
      lastModified: row.updatedAt,
    })),
  ]
}
