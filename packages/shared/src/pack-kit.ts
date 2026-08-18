/**
 * Pack kit — ek product, kai platforms.
 *
 * Pehle sirf WhatsApp status (9:16) banta tha. Magar reseller ek hi maal Instagram
 * story par, Instagram feed par, Facebook par aur TikTok par bhi lagati hai — aur har
 * jagah ka naap alag hai. Ghalat naap ka matlab hai kate hue kinare: qeemat ya number
 * hi gayab. Isi liye ek "kit" banti hai: ek dafa banao, har jagah chalo.
 *
 * 🔴 Ye file framework se azad hai (koi React, koi Prisma) — web portal abhi isay use
 *    karta hai, aur jab mobile app banegi to wohi ye file use karegi. Naap aur caption
 *    ka faisla ek jagah rehna chahiye, do jagah nahi.
 */

export const PACK_FORMATS = {
  /** 9:16 — WhatsApp status, Instagram/Facebook story, TikTok. Sab se zyada chalne wala. */
  story: {
    width: 1080,
    height: 1920,
    /** App ka apna UI (profile, reply box) — is area mein content na jaye */
    safeTop: 180,
    safeBottom: 250,
    /** Typography ka paimana — 9:16 asal design hai, is liye 1 */
    scale: 1,
    labelUr: 'اسٹیٹس / اسٹوری',
    labelEn: 'Status / Story',
  },
  /** 1:1 — Instagram aur Facebook feed, FB Marketplace. */
  square: {
    width: 1080,
    height: 1080,
    safeTop: 90,
    safeBottom: 90,
    scale: 0.86,
    labelUr: 'فیڈ پوسٹ (چوکور)',
    labelEn: 'Feed post (square)',
  },
  /** 4:5 — Instagram feed par sab se bari jagah leta hai. */
  portrait: {
    width: 1080,
    height: 1350,
    safeTop: 100,
    safeBottom: 120,
    scale: 0.92,
    labelUr: 'انسٹاگرام فیڈ (لمبا)',
    labelEn: 'Instagram feed (portrait)',
  },
  /** 1.91:1 — Facebook page/link post aur cover jaisi jagahen. */
  wide: {
    width: 1200,
    height: 630,
    safeTop: 50,
    safeBottom: 50,
    scale: 0.58,
    labelUr: 'فیس بک پوسٹ (چوڑا)',
    labelEn: 'Facebook post (wide)',
  },
} as const

export type PackFormatKey = keyof typeof PACK_FORMATS
export const PACK_FORMAT_KEYS = Object.keys(PACK_FORMATS) as PackFormatKey[]

/** Purana naam — pehle sirf yehi ek canvas tha. Naya code PACK_FORMATS use kare. */
export const STATUS_CANVAS = PACK_FORMATS.story

/**
 * Platform → kaun se naap kaam ke hain.
 *
 * Tarteeb maani rakhti hai: pehla wala us platform ka sab se aam istemal hai, aur UI
 * usi ko pehle dikhata hai. Ek hi file kai platforms par chalti hai (story WhatsApp,
 * Instagram, Facebook aur TikTok — chaaron par), is liye kit mein file dobara nahi banti.
 */
export const PACK_PLATFORMS = {
  whatsapp: {
    labelUr: 'واٹس ایپ',
    labelEn: 'WhatsApp',
    formats: ['story', 'square'] as PackFormatKey[],
  },
  instagram: {
    labelUr: 'انسٹاگرام',
    labelEn: 'Instagram',
    formats: ['story', 'portrait', 'square'] as PackFormatKey[],
  },
  facebook: {
    labelUr: 'فیس بک',
    labelEn: 'Facebook',
    formats: ['square', 'story', 'wide'] as PackFormatKey[],
  },
  tiktok: {
    labelUr: 'ٹک ٹاک',
    labelEn: 'TikTok',
    formats: ['story'] as PackFormatKey[],
  },
} as const

export type PackPlatformKey = keyof typeof PACK_PLATFORMS
export const PACK_PLATFORM_KEYS = Object.keys(PACK_PLATFORMS) as PackPlatformKey[]

/** Kit mein yehi naap bante hain — chaaron platforms ki zarooraton ka ittehad. */
export const KIT_FORMATS: PackFormatKey[] = ['story', 'square', 'portrait', 'wide']

/** Caption kis likhawat mein — Urdu script ya Latin (Roman/English). */
export type CaptionScript = 'ur' | 'roman'

export interface CaptionInput {
  readonly titleUr: string
  /** Roman/English zaban par yehi naam jata hai — Urdu script wahan ajnabi lagti hai */
  readonly titleEn: string
  readonly priceText: string
  readonly resellerName: string
  readonly resellerPhone: string
  readonly city?: string | undefined
}

/**
 * Caption — tasveer se kam ahem nahi.
 *
 * Har platform ka mizaj alag hai, is liye ek hi caption sab jagah chipkana ghalti hai:
 *  · WhatsApp — koi hashtag nahi, bas seedhi bat aur number (wahan search nahi hoti)
 *  · Instagram/TikTok — hashtag se nayi customer milti hai, wahan zaroori hain
 *  · Facebook — log tafseel parhte hain aur comment mein poochhte hain, is liye lamba
 *
 * Number har jagah likha jata hai: reseller ka poora karobar isi ek line par chalta hai.
 *
 * 🔴 Caption us zaban mein banta hai jo reseller ne app mein chuni hai. Wajah: wo isay
 * copy kar ke apne customers ko bhejti hai — jo Roman mein likhti hai, us ke customer
 * bhi Roman parhte hain. Urdu script ka caption us ke liye bekar hai.
 */
export function buildCaption(
  platform: PackPlatformKey,
  input: CaptionInput,
  script: CaptionScript = 'ur',
): string {
  const roman = script === 'roman'
  const { priceText, resellerName, resellerPhone, city } = input
  const order = roman
    ? `Order ke liye WhatsApp karen: ${resellerPhone}`
    : `آرڈر کے لیے واٹس ایپ کریں: ${resellerPhone}`

  const title = roman ? input.titleEn : input.titleUr
  const priceLine = roman ? `Rate: ${priceText}` : `قیمت: ${priceText}`
  const delivery = roman
    ? city
      ? `Delivery: ${city} aur poore Pakistan mein`
      : 'Delivery poore Pakistan mein'
    : city
      ? `ڈیلیوری: ${city} اور پورے پاکستان میں`
      : 'ڈیلیوری پورے پاکستان میں'

  switch (platform) {
    case 'whatsapp':
      return [title, priceLine, '', order].join('\n')

    case 'instagram':
      return [title, priceLine, '', order, delivery, '', hashtags(city)].join('\n')

    case 'tiktok':
      return [`${title} — ${priceText}`, order, '', hashtags(city)].join('\n')

    case 'facebook':
      return [
        title,
        priceLine,
        '',
        roman
          ? 'Cash on delivery — maal dekh kar paise den.'
          : 'کیش آن ڈیلیوری — مال دیکھ کر پیسے دیں۔',
        delivery,
        '',
        order,
        `— ${resellerName}`,
      ].join('\n')
  }
}

/**
 * Hashtags.
 *
 * Angrezi mein jaan boojh kar: Pakistan mein online kharidne wale zyadatar Roman/angrezi
 * mein search karte hain, aur Urdu hashtag par trafik na hone ke barabar hai. Sheher ka
 * hashtag sab se kaam ka hai — kharidar apne shehr se lena chahta hai (delivery jaldi).
 */
function hashtags(city?: string): string {
  const base = ['#Pakistan', '#OnlineShoppingPakistan', '#CashOnDelivery', '#Wholesale']
  const cityTag = city ? `#${city.replace(/\s+/g, '')}` : null
  return [...(cityTag ? [cityTag] : []), ...base].join(' ')
}
