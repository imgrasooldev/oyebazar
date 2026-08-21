import { redirect } from 'next/navigation'
import { requireReseller } from '@/lib/api/session'
import { container } from '@/lib/container'

export const dynamic = 'force-dynamic'

/**
 * Bazaar ke maal se apne catalogue tak — ek chhota sa pul.
 *
 * Bazaar (public) `slug` par chalta hai aur wahan koi rate nahi hota — ye qanooni
 * tahaffuz hai aur waise hi rehna chahiye. Magar jo reseller pehle se logged in hai,
 * usay wahan "rate ke liye rabta karen" likha dikhana bemani tha: rate us ke apne
 * catalogue mein pehle se mojood hai, sirf rasta nahi tha.
 *
 * Ye safha koi cheez dikhata nahi — sirf slug ko id mein badal kar aage bhej deta hai.
 */
export default async function CatalogueBySlugPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  await requireReseller()
  const { slug } = await params

  const productId = await container.repositories.products.findIdBySlug(slug)

  // Maal na mile (archive ho gaya, ya slug purana hai) to poori list — khali 404 se behtar
  redirect(productId ? `/catalogue/${productId}` : '/catalogue')
}
