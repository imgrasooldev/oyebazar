import { PACK_FORMATS } from '@oyebazar/shared'
import { requireReseller } from '@/lib/api/session'
import { container } from '@/lib/container'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/v1/status-pack/:packId/image — pack ki tasveer, DOWNLOAD ban kar.
 *
 * 🔴 Ye route sirf is liye hai ke `<a download>` cross-origin par kaam NAHI karta.
 *
 * Tasveer Supabase par para hai, yani hamare safhe se alag origin. Browsers `download`
 * ki khasoosiyat ko us soorat mein jaan boojh kar nazar andaz karte hain (warna koi bhi
 * safha kisi doosri site ki file chupke se utarwa sakta). Nateeja ye tha ke reseller
 * "ڈاؤن لوڈ" dabati aur tasveer usi tab mein khul jati — phone par wo wapas aa kar
 * "press and hold" kar ke khud mehfooz karti thi, agar usay pata ho.
 *
 * Ab file HAMARE apne pate se aati hai, aur `Content-Disposition: attachment` khud
 * kehta hai ke ye mehfooz karni hai — yani `download` ki khasoosiyat par bharosa hi
 * nahi karna parta.
 *
 * 🔴 `resellerId` ke saath lookup — dekhen `findOwnedById` ka note. Pack par reseller ka
 * naam aur number chhapa hota hai; sirf id par lookup ka matlab hota ke koi bhi logged-in
 * reseller doosri ka pack utaar le.
 */
export async function GET(_request: Request, ctx: { params: Promise<{ packId: string }> }) {
  const { reseller } = await requireReseller()
  const { packId } = await ctx.params

  const pack = await container.repositories.statusPacks.findOwnedById(reseller.id, packId)
  if (!pack?.imageUrl) {
    return new Response('Not found', { status: 404 })
  }

  const upstream = await fetch(pack.imageUrl).catch(() => null)
  if (!upstream?.ok || !upstream.body) {
    /*
     * Storage jawab na de to 502 — 404 nahi. Farq maani rakhta hai: 404 kehta hai "ye
     * cheez hai hi nahi" aur banda dobara koshish nahi karta, jabke yahan cheez mojood
     * hai aur agli koshish kaamyab ho sakti hai.
     */
    return new Response('Image unavailable', { status: 502 })
  }

  const size = PACK_FORMATS[pack.format]
  const filename = `oyebazar-${pack.format}-${size.width}x${size.height}.jpg`

  return new Response(upstream.body, {
    headers: {
      'Content-Type': upstream.headers.get('content-type') ?? 'image/jpeg',
      ...(upstream.headers.get('content-length')
        ? { 'Content-Length': upstream.headers.get('content-length') as string }
        : {}),
      'Content-Disposition': `attachment; filename="${filename}"`,
      /*
       * `private` — ye reseller ka apna pack hai, koi shared CDN ise rakh na le. Ek
       * ghanta kaafi hai: pack badalta nahi (revision badle to naya pack banta hai),
       * magar lamba cache rakhne ka koi faida bhi nahi — file ek dafa utarti hai.
       */
      'Cache-Control': 'private, max-age=3600',
    },
  })
}
