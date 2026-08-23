/**
 * Hafte mein ek dafa — wo tasveerein mitao jo kisi template ke kaam ki nahi rahin.
 *
 * 🔴 Ye layer hatate hi tasveer mitane ki JAGAH par hai, aur ye faisla ahem hai.
 *
 * Seedha rasta ye lagta hai ke jahan reseller logo wali layer hataye, wahin file bhi
 * mita di jaye. Wo GHALAT hai aur nuqsan wapas nahi aata: wohi tasveer us ke kisi
 * doosre template mein lagi ho sakti hai, ya usi template ke purane revision mein.
 * Layer hatana "ab ye tasveer kisi kaam ki nahi" ka saboot nahi hai — sirf "is jagah
 * se hat gayi" ka hai.
 *
 * Isi liye safai alag chalti hai aur sawal poora poochhti hai: kya ye file KISI bhi
 * template mein hai? Aur us ke saath umar ki shart, kyunke abhi upload hui file kisi
 * spec mein hoti hi nahi (template baad mein mehfooz hota hai).
 */
import { orphanedAssets, type StoredAsset } from '@oyebazar/core'
import type { WorkerContainer } from '../container'

/** Reseller ke apne logo isi folder mein jate hain (dekhen templates/upload ka route). */
const TEMPLATE_ASSET_PREFIX = 'template-assets'

export async function runTemplateAssetSweep(container: WorkerContainer): Promise<{
  scanned: number
  referenced: number
  deleted: number
  failed: number
}> {
  const [listing, referenced] = await Promise.all([
    container.storage.list(TEMPLATE_ASSET_PREFIX),
    container.repositories.resellerTemplates.allImageUrls(),
  ])

  const assets: StoredAsset[] = listing.map((item) => ({
    key: item.key,
    url: item.url,
    createdAt: item.createdAt,
  }))

  const orphans = orphanedAssets({
    assets,
    referencedUrls: new Set(referenced),
    now: new Date(),
  })

  let deleted = 0
  let failed = 0

  for (const orphan of orphans) {
    try {
      await container.storage.remove(orphan.key)
      deleted += 1
    } catch (error) {
      /*
       * Ek file ka na mitna poori safai ko rokna nahi chahiye — agle hafte dobara
       * koshish ho jayegi. Magar khamoshi se bhi nahi guzarna: agar wohi file har
       * hafte nakaam ho rahi hai to wo storage ka masla hai, safai ka nahi.
       */
      failed += 1
      container.logger.error('template_asset_delete_failed', {
        key: orphan.key,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  container.logger.info('template_asset_sweep_done', {
    scanned: assets.length,
    referenced: referenced.length,
    deleted,
    failed,
  })

  return { scanned: assets.length, referenced: referenced.length, deleted, failed }
}
