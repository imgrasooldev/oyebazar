/**
 * BRAND — ek hi naam, har surface par: OyeBazar (oyebazar.com).
 *
 * Faisla: "Baji" reseller ke saath rishta to achha banata, magar wo naam supply side
 * (thok bazaar ke wholesalers) aur aage barhne ke raaston ko tang karta. Ek gender-neutral
 * naam dono taraf chalta hai, aur domain pehle se maujood hai.
 *
 * ⚠ Code ka namespace abhi `@oyebazar/*` hai — wo sirf folder aur package ke naam hain,
 * user ko kahin nazar nahi aate. Unhen badalna ek alag mechanical sweep hai.
 *
 * UI mein naam kahin hard-code na karen — hamesha yahan se lein.
 */
export const BRAND = {
  name: 'OyeBazar',
  nameUr: 'اوئے بازار',
  domain: 'oyebazar.com',
  taglineUr: 'ہر روز نئی تصویر، آپ کے اپنے ریٹ کے ساتھ',
  directoryTaglineUr: 'پاکستان بھر کے تصدیق شدہ ہول سیلرز کی مفت ڈائریکٹری',
} as const

/** Status pack templates — har template `templates/<key>/index.html` se map hota hai. */
/*
 * Tarteeb wohi hai jo UI par patti mein dikhti hai — pehla wala default bhi hai.
 *
 * Pehle aath sab TEHWAR ya mausam ke naam par the (eid, ramadan, shadi, sardi…), yani
 * chunao "kaun sa din hai" par hota tha. Aakhri chaar MIZAJ ke hain — "maal kaisa hai"
 * par: safed card halki tasveer ke liye, gehra electronics ke liye, waghera. Dono
 * qismein ek hi patti mein hain kyunke reseller ke liye ye ek hi sawal hai: "kaun sa
 * achha lagega?"
 */
export const STATUS_PACK_TEMPLATES = [
  'simple',
  'sale',
  'eid',
  'ramadan',
  'new-arrival',
  'wedding',
  'winter',
  'summer',
  'minimal',
  'bold',
  'dark',
  'frame',
] as const

export type StatusPackTemplateKey = (typeof STATUS_PACK_TEMPLATES)[number]

export const DEFAULT_TEMPLATE_KEY: StatusPackTemplateKey = 'simple'

/*
 * STATUS_CANVAS ab yahan nahi — `pack-kit.ts` mein hai, PACK_FORMATS.story ke taur par.
 * Wajah: ab ek se ziyada naap hain (story/square/portrait/wide) aur naap do jagah
 * rakhne ka anjaam yehi hota hai ke ek jagah badlen aur doosri bhool jayen.
 */

/** Session — shared phone ki wajah se 7 din se zyada nahi. */
export const SESSION_TTL_DAYS = 7
export const SESSION_TTL_MS = SESSION_TTL_DAYS * 24 * 60 * 60 * 1000

export const OTP = {
  length: 6,
  ttlMs: 5 * 60 * 1000,
  maxAttempts: 5,
  /** rate limits: per phone / per IP */
  maxRequestsPerPhonePer15Min: 3,
  maxRequestsPerIpPerHour: 10,
} as const

/** Order confirmation timings (docs/BUSINESS-RULES.md §RTO). */
export const ORDER_CONFIRMATION = {
  /** is ke baad reseller ko alert */
  resellerAlertAfterMs: 6 * 60 * 60 * 1000,
  /** is ke baad auto-cancel */
  autoCancelAfterMs: 24 * 60 * 60 * 1000,
} as const

/**
 * Raste mein khare order — kab poochha jaye ke "kya bana?"
 *
 * 🔴 Ye ginti sirf khabar ke liye nahi hai, paise ke liye hai: reseller ka hissa DELIVERED
 * par khulta hai. Order agar DISPATCHED par khara reh jaye (koi likhna bhool jaye) to
 * reseller ka paisa kabhi banta hi nahi — aur usay wajah bhi nazar nahi aati.
 *
 * 4 din: Pakistan mein sheher se sheher courier 2–3 din leta hai. Is se pehle poochhna
 * bekar ka nag hai, aur is se kaafi baad poochhne ka matlab ye ke reseller hafta bhar
 * apne paise ka intezar kar chuki hoti hai.
 */
export const ORDER_TRANSIT = {
  /** Is ke baad dukan se poochha jata hai: pohancha ya wapas aaya? */
  askSupplierAfterMs: 4 * 24 * 60 * 60 * 1000,
} as const

/** Pagination — cursor based, offset kabhi nahi (deep pages par slow ho jata hai). */
export const PAGINATION = {
  defaultLimit: 20,
  maxLimit: 50,
} as const

/** Performance budgets — CI aur monitoring dono inhi numbers par check karte hain. */
export const PERFORMANCE_BUDGET = {
  firstLoadBytes: 1_000_000,
  lcpP75Ms: 3_000,
  apiP95Ms: 400,
  statusPackCachedMs: 200,
  statusPackOnDemandP95Ms: 2_000,
} as const
