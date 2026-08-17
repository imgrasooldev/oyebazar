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
import { formatPkr, type Pkr } from '@oyebazar/shared'

const HERE = dirname(fileURLToPath(import.meta.url))

/** repo root se `templates/` — worker kahin se bhi chale, path wohi rahe. */
export const TEMPLATES_DIR = resolve(HERE, '..', '..', '..', '..', 'templates')

const FONT_PACKAGE_DIR = resolve(
  HERE,
  '..',
  '..',
  'node_modules',
  '@fontsource',
  'noto-nastaliq-urdu',
  'files',
)

export interface TemplateData {
  readonly titleUr: string
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
}

let cachedBaseCss: string | null = null
const cachedTemplateCss = new Map<string, string>()
let cachedLayout: string | null = null

async function fontDataUri(file: string): Promise<string> {
  const buffer = await readFile(join(FONT_PACKAGE_DIR, file))
  return `data:font/woff2;base64,${buffer.toString('base64')}`
}

async function loadBaseCss(): Promise<string> {
  if (cachedBaseCss) return cachedBaseCss

  const css = await readFile(join(TEMPLATES_DIR, 'base.css'), 'utf8')
  const [regular, bold] = await Promise.all([
    fontDataUri('noto-nastaliq-urdu-arabic-400-normal.woff2'),
    fontDataUri('noto-nastaliq-urdu-arabic-700-normal.woff2'),
  ])

  cachedBaseCss = css
    .replace("url('fonts/noto-nastaliq-urdu-arabic-400-normal.woff2')", `url('${regular}')`)
    .replace("url('fonts/noto-nastaliq-urdu-arabic-700-normal.woff2')", `url('${bold}')`)

  return cachedBaseCss
}

async function loadTemplateCss(templateKey: string): Promise<string> {
  const cached = cachedTemplateCss.get(templateKey)
  if (cached) return cached

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

export async function buildStatusPackHtml(
  templateKey: string,
  data: TemplateData,
): Promise<string> {
  const [layout, baseCss, templateCss, photo] = await Promise.all([
    loadLayout(),
    loadBaseCss(),
    loadTemplateCss(templateKey),
    photoDataUri(data.photoUrl),
  ])

  const replacements: Record<string, string> = {
    baseCss,
    templateCss,
    photoUrl: photo,
    badgeText: escapeHtml(BADGE_TEXT_UR[templateKey] ?? data.categoryNameUr),
    titleUr: escapeHtml(data.titleUr),
    // 🔴 qeemat LTR mein — "Rs 3,000" Urdu ke darmiyan ulta nahi hona chahiye
    priceText: escapeHtml(formatPkr(data.price)),
    resellerName: escapeHtml(data.resellerName),
    resellerPhone: escapeHtml(formatLocalPhone(data.resellerPhone)),
    ctaText: 'آرڈر کے لیے میسج کریں',
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
