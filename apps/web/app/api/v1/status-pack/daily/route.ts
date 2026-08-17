import { DEFAULT_TEMPLATE_KEY } from '@oyebazar/shared'
import { apiHandler } from '@/lib/api/handler'
import { requireReseller } from '@/lib/api/session'
import { container } from '@/lib/container'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/v1/status-pack/daily — "آج کا اسٹیٹس پیک".
 *
 * Wohi 5 items jo subah 9 baje WhatsApp par gaye. Agar raat ki pre-generation chal chuki
 * hai to `imageUrl` bhara hua aata hai aur reseller ko intezar nahi karna parta.
 */
export async function GET() {
  return apiHandler(async () => {
    const { reseller } = await requireReseller()
    const items = await container.dailyDrops.packsForReseller(reseller.id, DEFAULT_TEMPLATE_KEY)

    return {
      items: items.map((item) => ({
        productId: item.productId,
        titleUr: item.titleUr,
        coverImageUrl: item.coverImageUrl,
        bajiPrice: item.bajiPrice,
        myPrice: item.myPrice,
        imageUrl: item.imageUrl,
        ready: item.imageUrl !== null,
      })),
    }
  })
}
