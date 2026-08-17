import { apiHandler } from '@/lib/api/handler'
import { requireReseller } from '@/lib/api/session'
import { container } from '@/lib/container'

export const runtime = 'nodejs'

/**
 * POST /api/v1/status-pack/:packId/downloaded
 *
 * Ye endpoint hamara north-star metric feed karta hai:
 * "weekly active resellers jo ≥3 status packs share karti hain".
 */
export async function POST(_request: Request, ctx: { params: Promise<{ packId: string }> }) {
  return apiHandler(async () => {
    await requireReseller()
    const { packId } = await ctx.params
    await container.statusPacks.markDownloaded(packId)
    return { ok: true }
  })
}
