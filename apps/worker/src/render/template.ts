/**
 * Template loading + placeholder filling.
 *
 * 🔴 Fonts aur tasveer dono HTML mein INLINE (data URI) hoti hain.
 *    Wajah: `page.setContent()` ke paas koi base URL nahi hota, aur zyada ahem —
 *    CDN se font aaya to render non-deterministic ho jata hai (kabhi font late, kabhi
 *    screenshot pehle). Visual regression test aise kabhi pass nahi hoga.
 */
import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  DEFAULT_PACK_OPTIONS,
  PACK_FORMATS,
  formatPkr,
  customTemplateId,
  templateSpecToCss,
  type PackFormatKey,
  type PackLang,
  type PackOptions,
  type Pkr,
  type TemplateSpec,
} from '@oyebazar/shared'

const HERE = dirname(fileURLToPath(import.meta.url))

/** repo root se `templates/` — worker kahin se bhi chale, path wohi rahe. */
export const TEMPLATES_DIR = resolve(HERE, '..', '..', '..', '..', 'templates')

const URDU_FONT_DIR = resolve(
  HERE,
  '..',
  '..',
  'node_modules',
  '@fontsource',
  'noto-nastaliq-urdu',
  'files',
)

/** Naskh — reseller ke apne template ka teesra mizaj (chhoti likhai mein zyada saaf). */
const NASKH_FONT_DIR = resolve(
  HERE,
  '..',
  '..',
  'node_modules',
  '@fontsource',
  'noto-naskh-arabic',
  'files',
)

/** Angrezi pack, qeemat aur phone number — sab Inter par. */
const LATIN_FONT_DIR = resolve(HERE, '..', '..', 'node_modules', '@fontsource', 'inter', 'files')

export interface TemplateData {
  readonly titleUr: string
  /** Angrezi pack ke liye. Khali ho to Urdu title hi chalta hai — pack banna zaroori hai. */
  readonly titleEn?: string
  readonly categoryNameUr: string
  readonly price: Pkr
  readonly resellerName: string
  readonly resellerPhone: string
  readonly photoUrl: string | null
}

/** Badge ka text template ke hisaab se — CSS variables se ye nahi ho sakta. */
const BADGE_TEXT_UR: Record<string, string> = {
  simple: 'نیا',
  sale: 'سیل',
  eid: 'عید مبارک',
  ramadan: 'رمضان آفر',
  'new-arrival': 'نیا مال',
  wedding: 'شادی کلیکشن',
  winter: 'سردیوں کا',
  summer: 'گرمیوں کا',
  minimal: 'نیا',
  bold: 'خاص ریٹ',
  dark: 'نیا',
  frame: 'خاص',
}

const BADGE_TEXT_EN: Record<string, string> = {
  simple: 'New',
  sale: 'Sale',
  eid: 'Eid Mubarak',
  ramadan: 'Ramadan Offer',
  'new-arrival': 'New Arrival',
  wedding: 'Wedding',
  winter: 'Winter',
  summer: 'Summer',
  minimal: 'New',
  bold: 'Special Rate',
  dark: 'New',
  frame: 'Premium',
}

const CTA_TEXT: Record<PackLang, string> = {
  ur: 'آرڈر کے لیے میسج کریں',
  en: 'Message to order',
}

let cachedBaseCss: string | null = null
const cachedTemplateCss = new Map<string, string>()
let cachedLayout: string | null = null

async function fontDataUri(dir: string, file: string): Promise<string> {
  const buffer = await readFile(join(dir, file))
  return `data:font/woff2;base64,${buffer.toString('base64')}`
}

async function loadBaseCss(): Promise<string> {
  if (cachedBaseCss) return cachedBaseCss

  const css = await readFile(join(TEMPLATES_DIR, 'base.css'), 'utf8')
  const [urduRegular, urduBold, naskhRegular, naskhBold, latinRegular, latinBold] =
    await Promise.all([
      fontDataUri(URDU_FONT_DIR, 'noto-nastaliq-urdu-arabic-400-normal.woff2'),
      fontDataUri(URDU_FONT_DIR, 'noto-nastaliq-urdu-arabic-700-normal.woff2'),
      fontDataUri(NASKH_FONT_DIR, 'noto-naskh-arabic-arabic-400-normal.woff2'),
      fontDataUri(NASKH_FONT_DIR, 'noto-naskh-arabic-arabic-700-normal.woff2'),
      fontDataUri(LATIN_FONT_DIR, 'inter-latin-400-normal.woff2'),
      fontDataUri(LATIN_FONT_DIR, 'inter-latin-700-normal.woff2'),
    ])

  cachedBaseCss = css
    .replace("url('fonts/noto-nastaliq-urdu-arabic-400-normal.woff2')", `url('${urduRegular}')`)
    .replace("url('fonts/noto-nastaliq-urdu-arabic-700-normal.woff2')", `url('${urduBold}')`)
    .replace("url('fonts/noto-naskh-arabic-arabic-400-normal.woff2')", `url('${naskhRegular}')`)
    .replace("url('fonts/noto-naskh-arabic-arabic-700-normal.woff2')", `url('${naskhBold}')`)
    .replace("url('fonts/inter-latin-400-normal.woff2')", `url('${latinRegular}')`)
    .replace("url('fonts/inter-latin-700-normal.woff2')", `url('${latinBold}')`)

  return cachedBaseCss
}

/**
 * Reseller ke apne template kahan se aate hain.
 *
 * Worker ko DB ka rasta yahan se milta hai (import se nahi) — `template.ts` ka `render:preview`
 * wala rasta bina database ke chalta hai aur usay chalte rehna chahiye.
 */
export type CustomTemplateLoader = (id: string) => Promise<TemplateSpec | null>

let customTemplateLoader: CustomTemplateLoader | null = null

export function setCustomTemplateLoader(loader: CustomTemplateLoader): void {
  customTemplateLoader = loader
}

/** `custom:<id>@<revision>` par spec, warna null (built-in template). */
const cachedSpecs = new Map<string, TemplateSpec>()

async function loadCustomSpec(templateKey: string): Promise<TemplateSpec | null> {
  const cached = cachedSpecs.get(templateKey)
  if (cached) return cached

  const custom = customTemplateId(templateKey)
  if (!custom) return null

  // `custom:<id>@<revision>` — revision sirf cache key ke liye hai, DB lookup id se hoti hai
  const id = custom.split('@')[0] ?? custom
  const spec = await customTemplateLoader?.(id)
  if (!spec) throw new Error(`Custom template "${id}" nahi mila`)

  cachedSpecs.set(templateKey, spec)
  return spec
}

async function loadTemplateCss(templateKey: string): Promise<string> {
  const cached = cachedTemplateCss.get(templateKey)
  if (cached) return cached

  /*
   * Reseller ka apna template — `custom:<id>@<revision>`.
   *
   * Revision key ka hissa hai, is liye cache khud ba khud theek rehta hai: template
   * badalte hi key badal jati hai aur ye purani entry kabhi dobara nahi maangi jati.
   */
  const spec = await loadCustomSpec(templateKey)
  if (spec) {
    const css = templateSpecToCss(spec)
    cachedTemplateCss.set(templateKey, css)
    return css
  }

  const path = join(TEMPLATES_DIR, templateKey, 'template.css')
  if (!existsSync(path)) {
    throw new Error(`Template "${templateKey}" nahi mila: ${path}`)
  }

  const css = await readFile(path, 'utf8')
  cachedTemplateCss.set(templateKey, css)
  return css
}

async function loadLayout(): Promise<string> {
  cachedLayout ??= await readFile(join(TEMPLATES_DIR, 'layout.html'), 'utf8')
  return cachedLayout
}

/**
 * Photo cache — YE SAB SE BARA PERFORMANCE LEVER HAI.
 *
 * Ek hi product ki tasveer 2,000 resellers ke liye render hoti hai (nightly pre-generation),
 * aur har reseller apne price par alag pack banati hai. Bina cache ke hum wohi image
 * hazaron baar download karte — measure kiya to render ka ~95% waqt yehi tha.
 *
 * Bounded LRU: 200 tasveerein (~1080×1440 JPEG ≈ 300KB) ≈ 60MB. Fly ki 2GB memory mein theek.
 */
const PHOTO_CACHE_LIMIT = 200
const photoCache = new Map<string, string>()

function cachePhoto(url: string, dataUri: string): void {
  if (photoCache.size >= PHOTO_CACHE_LIMIT) {
    const oldest = photoCache.keys().next().value
    if (oldest) photoCache.delete(oldest)
  }
  photoCache.set(url, dataUri)
}

/**
 * Product ki tasveer inline. Remote URL fail ho jaye (hotlink block, dheema network)
 * to render bina tasveer ke ho jata hai — poora pack zaya karne se behtar hai.
 */
async function photoDataUri(url: string | null, timeoutMs = 8_000): Promise<string> {
  if (!url) return ''
  if (url.startsWith('data:')) return url

  const cached = photoCache.get(url)
  if (cached !== undefined) {
    // LRU: dobara istemal hone par aakhir mein le jayen
    photoCache.delete(url)
    photoCache.set(url, cached)
    return cached
  }

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) })
    if (!response.ok) return ''
    const contentType = response.headers.get('content-type') ?? 'image/jpeg'
    const buffer = Buffer.from(await response.arrayBuffer())
    const dataUri = `data:${contentType};base64,${buffer.toString('base64')}`
    cachePhoto(url, dataUri)
    return dataUri
  } catch {
    return ''
  }
}

/** Metrics/tests ke liye. */
export function photoCacheSize(): number {
  return photoCache.size
}

/** HTML escape — product title DB se aata hai, wahan `<` ho sakta hai. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * @param formatKey kaun sa naap — story (9:16), square (1:1), portrait (4:5), wide (1.91:1).
 *   Template wohi rehta hai; sirf canvas aur typography ka paimana badalta hai, warna har
 *   naap ke liye alag template banana parta aur aath template chaar guna ho jate.
 */
export async function buildStatusPackHtml(
  templateKey: string,
  data: TemplateData,
  formatKey: PackFormatKey = 'story',
  options: PackOptions = DEFAULT_PACK_OPTIONS,
): Promise<string> {
  const format = PACK_FORMATS[formatKey]
  const lang = options.lang
  const [layout, baseCss, templateCss, photo, customSpec] = await Promise.all([
    loadLayout(),
    loadBaseCss(),
    loadTemplateCss(templateKey),
    photoDataUri(data.photoUrl),
    loadCustomSpec(templateKey),
  ])

  /*
   * Angrezi title na ho to Urdu wala hi chalta hai (throw nahi karte).
   *
   * Purana maal `titleEn` ke baghair DB mein para hai, aur us soorat mein pack ka na
   * banna reseller ke liye khali jagah chhorta hai — jabke Urdu title wala pack us ke
   * kaam ka hai. Adhoora pack, na-mojood pack se behtar hai.
   */
  const title = lang === 'en' ? (data.titleEn?.trim() || data.titleUr) : data.titleUr
  /*
   * Custom template par badge ka text reseller ka apna likha hua hai — dono zabanon
   * mein wohi. Us ke liye do khaane maangna (Urdu + angrezi) ek aur form field hai jo
   * zyada tar log khali chhor dete hain, aur khali badge poore pack ko adhoora dikhata hai.
   */
  const badge = customSpec
    ? customSpec.badgeText
    : lang === 'en'
      ? (BADGE_TEXT_EN[templateKey] ?? 'New')
      : (BADGE_TEXT_UR[templateKey] ?? data.categoryNameUr)

  /*
   * Chhupane ka kaam CSS karta hai, HTML nahi.
   *
   * Div ko HTML se nikal dena bhi ho sakta tha, magar phir har template ko us khali
   * jagah ka alag hisaab lagana parta (misal: `minimal` ka safed card apne aap chhota
   * ho jata, `frame` ka haashiya waise ka waisa rehta). Class laga dene se har template
   * apne qawaid ke mutabiq khud simat jata hai.
   */
  const hidden = [
    // Custom template ka apna bahao hai — har cheez wahin jahan reseller ne rakhi
    customSpec ? 'custom' : '',
    options.showName ? '' : 'hide-name',
    options.showPhone ? '' : 'hide-phone',
    options.showPrice ? '' : 'hide-price',
    // Dono chhup jayen to us patti ki lakeer bhi jani chahiye — warna tasveer par ek
    // be-maqsad lakeer reh jati hai
    options.showName || options.showPhone ? '' : 'hide-seller',
  ]
    .filter(Boolean)
    .join(' ')

  const replacements: Record<string, string> = {
    formatKey,
    lang,
    dir: lang === 'en' ? 'ltr' : 'rtl',
    hiddenClasses: hidden,
    canvasWidth: String(format.width),
    canvasHeight: String(format.height),
    safeTop: String(format.safeTop),
    safeBottom: String(format.safeBottom),
    scale: String(format.scale),
    baseCss,
    templateCss,
    photoUrl: photo,
    badgeText: escapeHtml(badge),
    titleUr: escapeHtml(title),
    // 🔴 qeemat LTR mein — "Rs 3,000" Urdu ke darmiyan ulta nahi hona chahiye
    priceText: escapeHtml(formatPkr(data.price)),
    resellerName: escapeHtml(data.resellerName),
    resellerPhone: escapeHtml(formatLocalPhone(data.resellerPhone)),
    ctaText: CTA_TEXT[lang],
  }

  return layout.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => replacements[key] ?? '')
}

/** 923001234567 → 0300 1234567 */
function formatLocalPhone(e164: string): string {
  if (!e164.startsWith('92') || e164.length !== 12) return e164
  const local = `0${e164.slice(2)}`
  return `${local.slice(0, 4)} ${local.slice(4)}`
}

export function listTemplateKeys(): string[] {
  return Object.keys(BADGE_TEXT_UR)
}
