/**
 * SEO — ek jagah: site ka pata, canonical, aur structured data.
 *
 * 🔴 Ye file kyun bani: `robots.txt` aur `sitemap.xml` dono 404 de rahe the, aur
 * `metadataBase` kahin set nahi tha — yani har Open Graph tasveer ka pata ADHOORA ja
 * raha tha (`/x.jpg`, `https://oyebazar.com/x.jpg` nahi). WhatsApp aur Facebook adhoore
 * pate par tasveer dikhate hi nahi, aur is karobar mein link WhatsApp par hi share hota
 * hai — yani sab se ahem surface bilkul khaali chal raha tha.
 */
import { BRAND } from '@oyebazar/shared'

/**
 * Site ka apna pata — `APP_URL` se, aur wahi ek jagah hai.
 *
 * 🔴 Aakhri slash HATA di jati hai. Us ke baghair `${SITE_URL}/bazaar` do slash wala
 * pata bana deta hai, aur Google us ko ALAG safha ginta hai — yani har safha do dafa,
 * aur dono aadha aadha wazan lete hain.
 */
export const SITE_URL = (process.env.APP_URL ?? `https://${BRAND.domain}`).replace(/\/+$/, '')

/** Poora pata — `href`, `sitemap` aur JSON-LD teenon ke liye. */
export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`
}

/**
 * Canonical — hamesha BINA query ke.
 *
 * 🔴 Ye is site par khaas ahem hai. Bazaar par chhanni URL mein jati hai (`?city=`,
 * `?category=`, `?cursor=`, `?sort=`) aur har jor ek naya pata banata hai jis par
 * TQREEBAN wohi maal hota hai. Bina canonical ke Google un sab ko alag safhe ginta hai,
 * ek doosre ka moqabla karwata hai, aur aakhir mein kisi ek ko bhi theek se nahi
 * dikhata — is ko "duplicate content" kehte hain aur chhanni wali site par ye sab se
 * aam kharabi hai.
 *
 * Chhanni wale safhe crawl to hon (taake un ke andar ke link mile) magar ginti EK hi
 * safhe ki ho — wo asal safha jis ka pata yahan banta hai.
 */
export function canonical(path: string) {
  return { canonical: absoluteUrl(path) }
}

// ------------------------------------------------------------ structured data

/**
 * JSON-LD — Google ko batata hai ke is safhe par CHEEZ kya hai, sirf matn nahi.
 *
 * 🔴 Ye `<script type="application/ld+json">` ke andar `dangerouslySetInnerHTML` se
 * lagta hai, aur wo tareeqa jaan boojh kar hai: React `<script>` ke andar bacha hua
 * matn escape kar deta hai (`"` → `&quot;`), aur us se JSON toot jata hai. Google phir
 * usay chup chaap nazar-andaz kar deta hai — koi ghalti kahin nazar nahi aati, bas
 * faida milta nahi.
 *
 * Aur isi wajah se `<` ko bhi badla jata hai: agar kisi maal ke naam mein `</script>`
 * jaisa matn aa jaye to wo safhe ka script tag band kar deta hai. Ye XSS ka darwaza
 * hai, aur is site par naam DUKAN likhti hai — yani wo matn hamara likha hua nahi.
 */
export function jsonLd(data: Record<string, unknown>) {
  return {
    __html: JSON.stringify({ '@context': 'https://schema.org', ...data }).replace(
      /</g,
      '\\u003c',
    ),
  }
}

/** Poori site ki pehchan — home par ek dafa. */
export function organisationLd() {
  return {
    '@type': 'Organization',
    name: BRAND.name,
    alternateName: BRAND.nameUr,
    url: SITE_URL,
    logo: absoluteUrl('/icon.svg'),
    areaServed: { '@type': 'Country', name: 'Pakistan' },
  }
}

/**
 * Bazaar ki talash — Google ke natije mein site ka apna search box.
 *
 * `/bazaar/items?q=` wohi safha hai jo site par talash chalata hai.
 */
export function websiteLd() {
  return {
    '@type': 'WebSite',
    name: BRAND.name,
    url: SITE_URL,
    inLanguage: 'ur-PK',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: absoluteUrl('/bazaar/items?q={search_term_string}'),
      },
      'query-input': 'required name=search_term_string',
    },
  }
}

/** "صفحۂ اول › بازار › دکان" — Google natije mein isi se rasta chhapta hai. */
export function breadcrumbLd(trail: readonly { name: string; path: string }[]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((step, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: step.name,
      item: absoluteUrl(step.path),
    })),
  }
}

/**
 * Dukan — `Store`, `Organization` nahi.
 *
 * `Store` ka apna pata, sheher aur khulne ka waqt hota hai, aur Google usay maqami
 * karobar ki tarah samajhta hai — jo ye hai bhi: ye Bolton Market ki asli dukan hai.
 *
 * 🔴 `telephone` yahan JAAN BOOJH KAR nahi hai, chahe hamare paas number ho. Dukan ka
 * public WhatsApp us ke apne safhe par button ki shakl mein hai; usay structured data
 * mein daalne ka matlab hai har scraper aur har spam-caller ko wo number ek saaf,
 * machine ke parhne layak shakl mein de dena. Safhe par hona aur JSON mein hona ek
 * baat nahi.
 */
export function storeLd(input: {
  name: string
  slug: string
  city: string
  address: string | null
  logoUrl: string | null
  description: string | null
}) {
  return {
    '@type': 'Store',
    name: input.name,
    url: absoluteUrl(`/bazaar/${input.slug}`),
    ...(input.description ? { description: input.description } : {}),
    ...(input.logoUrl ? { image: input.logoUrl } : {}),
    address: {
      '@type': 'PostalAddress',
      addressLocality: input.city,
      addressCountry: 'PK',
      ...(input.address ? { streetAddress: input.address } : {}),
    },
  }
}

/**
 * Maal — aur yahan sab se ahem baat wo hai jo MOJOOD NAHI.
 *
 * 🔴 `offers` (yani qeemat) yahan kabhi na daalen. Do wajahen, aur dono bhaari hain:
 *
 *  1. Qanooni: Bazaar is liye "online marketplace" ki tareef (Sales Tax Act 2(18A)) se
 *     bahar hai ke us par na qeemat hai na order ka button. Qeemat structured data
 *     mein daal dena wohi cheez public kar dena hai — chahe safhe par nazar na aaye.
 *  2. Karobari: qeemat reseller ki APNI hai, har ek ki alag. Ek "official" rate chhap
 *     jane ka matlab hai ke us ka apna rate jhoot lagne lagta hai.
 *
 * Google `offers` ke baghair "rich result" nahi dikhata — aur ye qeemat qabool hai.
 * `Product` phir bhi jaiz hai, aur us ka asal faida yehi hai ke Google ko pata chale ke
 * ye ek CHEEZ hai, kis khaane ki hai, aur kis dukan ki hai.
 */
export function productLd(input: {
  titleUr: string
  titleEn: string
  slug: string
  imageUrl: string | null
  categoryUr: string
  supplierName: string
  supplierSlug: string
}) {
  return {
    '@type': 'Product',
    name: input.titleUr,
    alternateName: input.titleEn,
    url: absoluteUrl(`/bazaar/item/${input.slug}`),
    category: input.categoryUr,
    ...(input.imageUrl ? { image: input.imageUrl } : {}),
    brand: {
      '@type': 'Organization',
      name: input.supplierName,
      url: absoluteUrl(`/bazaar/${input.supplierSlug}`),
    },
  }
}

/**
 * Fehrist — Bazaar ke safhon par jo kuch nazar aa raha hai.
 *
 * Sirf pate jate hain, poori tafseel nahi: har cheez ka apna safha hai aur Google usay
 * wahin se parhta hai. Yahan dobara likhna sirf safhe ka wazan barhata hai.
 */
export function itemListLd(urls: readonly string[]) {
  return {
    '@type': 'ItemList',
    numberOfItems: urls.length,
    itemListElement: urls.map((url, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: absoluteUrl(url),
    })),
  }
}
