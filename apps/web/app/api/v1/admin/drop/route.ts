import { apiHandler } from '@/lib/api/handler'
import { requireOpsUser } from '@/lib/api/admin-session'
import { container } from '@/lib/container'

export const runtime = 'nodejs'

/**
 * POST /api/v1/admin/drop — aaj ka drop banao.
 *
 * Idempotent: drop pehle se ho to wohi wapas aata hai, naya nahi banta (ek din ka ek hi
 * drop — ye shart DB mein bhi hai). Is liye do dafa dabana ghalti nahi.
 *
 * Ye kaam ab tak sirf worker ki CLI se hota tha. Amal mein us ka matlab ye tha ke jis
 * subah cron kisi wajah se na chale, ops ke paas koi rasta hi nahi tha — aur us din
 * poore platform ki resellers ke paas lagane ko kuch naya nahi hota.
 */
export async function POST() {
  return apiHandler(async () => {
    const { user } = await requireOpsUser()
    container.admin.assertPermission(user, 'buildDailyDrop')

    const drop = await container.dailyDrops.ensureTodaysDrop()
    return { id: drop.id, items: drop.productIds.length, status: drop.status }
  })
}
