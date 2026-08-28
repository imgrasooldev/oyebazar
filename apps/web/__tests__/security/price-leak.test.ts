/**
 * 🔴 PRICE-LEAK TEST — CI blocking. Ye test din 1 par likha gaya hai, endpoints se pehle.
 *
 * Kyun: agar reseller ko wholesaler ka asli price pata chal gaya, to wo seedha wahan
 * chali jayegi aur hamara poora business model khatam. Ye ek galti kisi din koi junior
 * `findMany()` bina `select` likh kar kar sakta hai — isliye insaan par nahi, CI par bharosa.
 *
 * Teen defence layers, teeno yahan test hoti hain:
 *   Layer 1 — Prisma selectors (packages/db/src/selectors.ts) mein forbidden column na ho
 *   Layer 2 — DTOs `.strict()` hon, taake extra field runtime par THROW kare
 *   Layer 3 — apps/web mein kahin seedha prisma client use na ho (repository bypass)
 *
 * NAYA reseller-facing endpoint banayen to yahan FORBIDDEN list check karen.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  OrderLineDTO,
  PublicProductDTO,
  PublicSupplierDetailDTO,
  ResellerOrderDTO,
  ResellerProductDetailDTO,
  ResellerProductListItemDTO,
} from '@oyebazar/shared'

/**
 * Ye alfaz reseller ya public response mein kabhi nahi ja sakte.
 *
 * 🔴 `avgCost` aur `unitCost` (maal ki LAGAT) `supplierPrice` se bhi zyada hassas hain.
 * `supplierPrice` se sirf hamara margin khulta hai; lagat se dukan ka MUNAFA khulta hai
 * — aur jo bhi ye jaan le ke maal 180 ka aata hai aur 240 ka bikta hai, wo us dukan se
 * mol bhao karne baith jata hai. Ye number sirf dukan ke apne safhe par chhapta hai
 * (`/supplier/inventory`), aur kahin nahi.
 */
const FORBIDDEN = [
  'supplierPrice',
  'supplier_price',
  'supplierId',
  'avgCost',
  'unitCost',
  'ntn',
  'strn',
  'bankAccount',
  'feeRateBps',
]

const REPO_ROOT = join(__dirname, '..', '..', '..', '..')

function walk(dir: string, filter: (path: string) => boolean): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.next' || entry === 'dist') continue
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) out.push(...walk(full, filter))
    else if (filter(full)) out.push(full)
  }
  return out
}

describe('Layer 1 — Prisma selectors', () => {
  const selectors = readFileSync(
    join(REPO_ROOT, 'packages', 'db', 'src', 'selectors.ts'),
    'utf8',
  )

  /** Sirf INTERNAL selector (order pricing / fee ledger) supplierPrice maang sakta hai. */
  function sectionOf(name: string): string {
    const start = selectors.indexOf(`export const ${name}`)
    expect(start, `${name} selectors.ts mein nahi mila`).toBeGreaterThan(-1)
    const rest = selectors.slice(start + 1)
    const end = rest.indexOf('export const')
    return end === -1 ? rest : rest.slice(0, end)
  }

  it('PUBLIC_PRODUCT_SELECT mein koi price column nahi (public par price kabhi nahi)', () => {
    const section = sectionOf('PUBLIC_PRODUCT_SELECT')
    for (const key of [...FORBIDDEN, 'bajiPrice', 'suggestedRetail']) {
      expect(section, `PUBLIC_PRODUCT_SELECT mein ${key} nahi hona chahiye`).not.toMatch(
        new RegExp(`\\b${key}\\s*:\\s*true`),
      )
    }
  })

  it('RESELLER_PRODUCT_SELECT mein supplier ka koi data nahi', () => {
    const section = sectionOf('RESELLER_PRODUCT_SELECT')
    for (const key of FORBIDDEN) {
      expect(section, `RESELLER_PRODUCT_SELECT mein ${key} nahi hona chahiye`).not.toMatch(
        new RegExp(`\\b${key}\\s*:\\s*true`),
      )
    }
  })

  it('RENDER_PRODUCT_SELECT (Content Studio) mein bhi supplier ka data nahi', () => {
    const section = sectionOf('RENDER_PRODUCT_SELECT')
    for (const key of FORBIDDEN) {
      expect(section).not.toMatch(new RegExp(`\\b${key}\\s*:\\s*true`))
    }
  })

  it('PUBLIC_SUPPLIER_SELECT mein NTN/STRN/bank/fee nahi', () => {
    const section = sectionOf('PUBLIC_SUPPLIER_SELECT')
    for (const key of ['ntn', 'strn', 'bankAccount', 'feeRateBps', 'phone']) {
      expect(section).not.toMatch(new RegExp(`\\b${key}\\s*:\\s*true`))
    }
  })
})

describe('Layer 2 — DTOs strict hain', () => {
  const leaky = {
    supplierPrice: 2000,
    supplierId: 'sup_1',
    ntn: '1234567',
  }

  it('ResellerProductListItemDTO extra supplier field par THROW karta hai', () => {
    expect(() =>
      ResellerProductListItemDTO.parse({
        id: 'p1',
        titleUr: 'لان تھری پیس',
        titleEn: 'Lawn 3 piece',
        category: { slug: 'lawn', nameUr: 'لان', nameEn: 'Lawn' },
        coverImageUrl: null,
        bajiPrice: 2100,
        suggestedRetail: 2800,
        myRetailPrice: null,
        inStock: true,
        ...leaky,
      }),
    ).toThrow()
  })

  it('ResellerProductDetailDTO bhi strict hai', () => {
    expect(() =>
      ResellerProductDetailDTO.parse({
        id: 'p1',
        titleUr: 'ت',
        titleEn: 't',
        descriptionUr: null,
        category: { slug: 'lawn', nameUr: 'لان', nameEn: 'Lawn' },
        coverImageUrl: null,
        bajiPrice: 2100,
        suggestedRetail: 2800,
        myRetailPrice: null,
        inStock: true,
        media: [],
        variants: [],
        ...leaky,
      }),
    ).toThrow()
  })

  it('🔴 PublicProductDTO mein koi price field maujood hi nahi (login se pehle price nahi)', () => {
    const shape = Object.keys(PublicProductDTO.shape)
    for (const key of ['bajiPrice', 'suggestedRetail', 'supplierPrice', 'retailPrice']) {
      expect(shape, `public product par ${key} nahi hona chahiye`).not.toContain(key)
    }
  })

  it('PublicSupplierDetailDTO par fee ya tax fields nahi', () => {
    const shape = Object.keys(PublicSupplierDetailDTO.shape)
    for (const key of FORBIDDEN) expect(shape).not.toContain(key)
  })

  it('🔴 ResellerOrderDTO mein supplier cost aur hamari fee nahi', () => {
    const shape = Object.keys(ResellerOrderDTO.shape)
    for (const key of [...FORBIDDEN, 'bajiFee', 'supplierPriceSnapshot']) {
      expect(shape, `order par ${key} nahi hona chahiye`).not.toContain(key)
    }
  })

  it('order ke items par sirf reseller ke apne numbers hain', () => {
    const itemShape = Object.keys(OrderLineDTO.shape)
    expect(itemShape).toContain('bajiPrice')
    expect(itemShape).toContain('retailPrice')
    expect(itemShape).not.toContain('supplierPriceSnapshot')
    expect(itemShape).not.toContain('supplierPrice')
  })
})

describe('Layer 3 — apps/web repository ko bypass nahi karta', () => {
  const webFiles = walk(join(REPO_ROOT, 'apps', 'web'), (p) => p.endsWith('.ts') || p.endsWith('.tsx'))

  it('koi route/page seedha prisma client use nahi karta', () => {
    const offenders = webFiles.filter((file) => {
      if (file.includes('__tests__')) return false
      // analytics adapter jaan boojh kar Event table par likhta hai (business data nahi)
      if (file.endsWith(join('adapters', 'analytics.ts'))) return false
      return /\bprisma\.(product|supplier|reseller|order|statusPack|feeLedger)\b/.test(
        readFileSync(file, 'utf8'),
      )
    })

    expect(
      offenders.map((f) => f.replace(REPO_ROOT, '')),
      'apps/web mein Prisma seedha use hua — repository ke through jayen',
    ).toEqual([])
  })

  it('public zone (logged-out) mein koi order button nahi — qanooni shart', () => {
    const publicFiles = webFiles.filter((f) => f.includes(join('app', '(public)')))
    expect(publicFiles.length).toBeGreaterThan(0)

    for (const file of publicFiles) {
      const source = readFileSync(file, 'utf8')
      expect(source, `${file} mein order API call nahi honi chahiye`).not.toMatch(
        /\/api\/v1\/orders/,
      )
    }
  })
})
