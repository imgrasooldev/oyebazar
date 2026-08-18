/**
 * Asli tasveerein — category ke mutabiq.
 *
 * Pehle picsum.photos se be-tuki tasveerein aati thin (face wash par railway line),
 * jis se poori site demo jaisi lagti thi aur status pack bhi bekar dikhta tha —
 * halanke pack hi hamara product hai.
 *
 * Ye sab Unsplash ki muft tasveerein hain (Unsplash License: tijarati istemal ki
 * ijazat, attribution zaroori nahi). Asli shoot aane par sirf ye file badlegi.
 *
 * 🔴 Tasveer product ke slug se chuni jati hai, random se nahi — wohi product,
 * hamesha wohi tasveer. Warna har seed par tasveer badal jati aur pehle se bane
 * hue status packs (jo cache mein hain) product se mel khana chhor dete.
 */

const UNSPLASH = 'https://images.unsplash.com'

/** Har category ke liye chand tasveerein — product slug se ek chun li jati hai. */
const BY_CATEGORY: Record<string, string[]> = {
  apparel: [
    'photo-1524404794194-16bae22718c0',
    'photo-1556905055-8f358a7a47b2',
    'photo-1567113463300-102a7eb3cb26',
    'photo-1542219550-2da790bf52e9',
    'photo-1504198458649-3128b932f49e',
    'photo-1625471592808-3b848a6e9ffd',
  ],
  'home-textile': [
    'photo-1564019472231-4586c552dc27',
    'photo-1598535746036-87d13382f6a6',
    'photo-1587614977104-693ef4e858e4',
    'photo-1534973098198-6b2de48816b7',
    'photo-1605459437907-541c4e2c0ed1',
  ],
  cosmetics: [
    'photo-1596462502278-27bfdc403348',
    'photo-1583209814683-c023dd293cc6',
    'photo-1522335789203-aabd1fc54bc9',
    'photo-1608979048467-6194dabc6a3d',
    'photo-1598460880248-71ec6d2d582b',
  ],
  'food-grocery': [
    'photo-1586201375761-83865001e31c',
    'photo-1581600140682-d4e68c8cde32',
    'photo-1591272216626-b09e38519371',
    'photo-1529517986296-847580704921',
    'photo-1517646458010-ea6bd9f4a75f',
  ],
  electronics: [
    'photo-1529310399831-ed472b81d589',
    'photo-1532007271951-c487760934ae',
    'photo-1495291916458-c12f594151e7',
    'photo-1556401615-c909c3d67480',
    'photo-1590845947698-8924d7409b56',
  ],
  kitchen: [
    'photo-1556909211-36987daf7b4d',
    'photo-1518291344630-4857135fb581',
    'photo-1586969593928-1c87c1f9c2ef',
    'photo-1584990347193-6bebebfeaeee',
    'photo-1580929753603-10519c6e480a',
  ],
  jewellery: [
    'photo-1651160670627-2896ddf7822f',
    'photo-1626784215021-2e39ccf971cd',
    'photo-1626784215013-13322cb0e471',
    'photo-1589095053205-8fc842336f4a',
    'photo-1653227907864-560dce4c252d',
  ],
  furniture: [
    'photo-1640938776314-4d303f8a1380',
    'photo-1565307586367-2c27d915cc8e',
    'photo-1601392740426-907c7b028119',
    'photo-1620003039413-b519b3c12e4d',
  ],
  'auto-parts': [
    'photo-1494030575520-dd03dd6aeb04',
    'photo-1556570508-121c77af2a75',
    'photo-1603799091901-f0034ac3e7fa',
    'photo-1583912736562-6086dedde74b',
  ],
  pharma: [
    'photo-1624638760852-8ede1666ab07',
    'photo-1600091474842-83bb9c05a723',
    'photo-1563260324-5ebeedc8af7c',
    'photo-1564144573017-8dc932e0039e',
  ],
  stationery: [
    'photo-1631173716529-fd1696a807b0',
    'photo-1615988938302-bd2a5a7023bc',
    'photo-1599081595476-75608b796d52',
    'photo-1566869112473-77c4fb94359c',
  ],
  toys: [
    'photo-1596461404969-9ae70f2830c1',
    'photo-1515488042361-ee00e0ddd4e4',
    'photo-1599623560574-39d485900c95',
    'photo-1545558014-8692077e9b5c',
    'photo-1541692641319-981cc79ee10a',
  ],
}

/** Slug se ek sthir (stable) number — wohi slug, hamesha wohi tasveer. */
function hash(value: string): number {
  let total = 0
  for (let i = 0; i < value.length; i += 1) total = (total * 31 + value.charCodeAt(i)) >>> 0
  return total
}

/**
 * Product ki tasveer.
 *
 * @param categorySlug top-level category — usi se maal se milti julti tasveer chunti hai
 * @param slug product ka slug — isi se tay hota hai ke kaun si tasveer milegi
 * @param width status pack 1080 chaura hai; 3:4 nisbat (1080×1440) sab se aam product shape
 */
export function productPhoto(categorySlug: string, slug: string, width = 1080, height = 1440): string {
  const pool = BY_CATEGORY[categorySlug] ?? BY_CATEGORY.apparel!
  const id = pool[hash(slug) % pool.length]!

  // fit=crop + q=80: asli tasveer bari hoti hai (4000px+), aur hamein 1080 chahiye —
  // Unsplash ka CDN yahin resize kar deta hai, warna har render par 5MB download hota
  return `${UNSPLASH}/${id}?auto=format&fit=crop&w=${width}&h=${height}&q=80`
}

/** Category tile ki tasveer — chaurai zyada, lambai kam. */
export function categoryPhoto(categorySlug: string, width = 900, height = 600): string {
  return productPhoto(categorySlug, `cat-${categorySlug}`, width, height)
}
