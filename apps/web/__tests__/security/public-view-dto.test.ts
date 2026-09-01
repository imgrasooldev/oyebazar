/**
 * 🔴 View aur DTO ka rishta — CI blocking.
 *
 * Ye test ek asli, MEHNGI ghalti ke baad likha gaya. 1 September ko `PublicProductView`
 * par do naye khaane lage (`seoTitle`, `seoDescription`) magar `PublicProductDTO` par
 * nahi. `toPublicProductDTO` poora view `parse()` karta hai aur DTO `.strict()` hai, is
 * liye wo har asli maal par THROW karne laga — yani Bazaar ke har maal ka safha
 * production mein 500 dene laga.
 *
 * Aur ye sab pakre BAGHAIR live gaya: `tsc` pass, poore repo ke test pass, `next build`
 * pass. Wajah ye hai ke `Schema.parse(view)` ki jagah TypeScript ko koi ghalti nazar
 * nahi aati — `parse` har cheez qabool karta hai; masla RUNTIME par khulta hai, aur wo
 * bhi sirf tab jab koi ASLI qatar us se guzre. Poore test suite mein aisa koi test tha
 * hi nahi.
 *
 * Ab hai. Har public mapper ko yahan ek poora view diya jata hai:
 *
 *  · View par naya khaana lage aur yahan na lage → TypeScript rok deta hai (fixture
 *    adhoora reh jata hai).
 *  · Fixture mein lage magar DTO par na lage → `.strict()` yahan throw karta hai,
 *    production mein nahi.
 *
 * Yani wo faisla — "ye naya khaana public hai ya nahi" — ab CI par lena PARTA hai, aur
 * chup chaap nikal nahi sakta. Yehi baat price-leak test bhi doosri taraf se karta hai.
 */
import { describe, expect, it } from 'vitest'
import type { PublicProductView, PublicSupplierView } from '@oyebazar/core'
import {
  toPublicProductDTO,
  toPublicSupplierDetailDTO,
  toPublicSupplierListDTO,
} from '@/lib/api/mappers'

const NOW = new Date('2026-09-01T12:00:00Z')

/*
 * Poora view — har khaana bhara hua.
 *
 * 🔴 `satisfies` nahi, saaf type annotation: hum chahte hain ke view par naya khaana
 * lagte hi YE FILE toot jaye. `satisfies` ke saath adhoora object bhi guzar sakta hai
 * agar inference narrow ho jaye.
 */
const PRODUCT: PublicProductView = {
  slug: 'khaddar-chikankari-4',
  titleUr: 'کھدر — چکن کاری',
  titleEn: 'Khaddar — Chikankari',
  category: { slug: 'khaddar', nameUr: 'کھدر', nameEn: 'Khaddar' },
  coverImageUrl: 'https://example.com/a.jpg',
  supplierName: 'ملتان ڈرائی فروٹ',
  supplierSlug: 'dukan-6',
  supplierCity: 'Multan',
  listedAt: NOW,
  seoTitle: 'کھدر چکن کاری — تھوک ریٹ',
  seoDescription: 'ملتان کے تصدیق شدہ ہول سیلر سے۔',
}

const SUPPLIER: PublicSupplierView = {
  slug: 'dukan-6',
  businessName: 'ملتان ڈرائی فروٹ',
  city: 'Multan',
  marketName: 'Hussain Agahi',
  bioUr: 'خشک میوہ جات',
  whatsappPublic: '923001000006',
  address: 'Hussain Agahi, Multan',
  logoUrl: null,
  categories: [{ nameUr: 'کھدر', nameEn: 'Khaddar' }],
  productCount: 12,
  memberSince: NOW,
  lastListedAt: NOW,
  deliveryFeeCity: 200,
  deliveryFeeOther: 350,
  payoutTermDays: 3,
  seoTitle: null,
  seoDescription: null,
}

describe('public mappers poore view par chalte hain', () => {
  it('maal — yehi wo ghalti thi jo production mein 500 de rahi thi', () => {
    expect(() => toPublicProductDTO(PRODUCT)).not.toThrow()
  })

  it('dukan — fehrist aur tafseel dono', () => {
    expect(() => toPublicSupplierListDTO(SUPPLIER)).not.toThrow()
    expect(() => toPublicSupplierDetailDTO(SUPPLIER)).not.toThrow()
  })

  /*
   * 🔴 Aur ye test us JAAL ke liye hai jo is poore test ko bekar kar sakta hai: agar
   * kabhi kisi ne DTO se `.strict()` hata diya (ya `.passthrough()` laga diya) to upar
   * wale teenon test hamesha pass karte rahenge — aur us ke saath price-leak ki doosri
   * deewar bhi chup chaap gir jayegi.
   */
  it('maal ki DTO anjaan khaane MANA karti hai', () => {
    expect(() =>
      toPublicProductDTO({ ...PRODUCT, supplierPrice: 1995 } as unknown as PublicProductView),
    ).toThrow()
  })

  /*
   * Dukan ke mapper doosre tareeqe par khare hain aur wo tareeqa ZYADA mazboot hai:
   * wo poora view parse nahi karte, khaane CHUN kar bharte hain. Us ka matlab ye ke
   * view par naya khaana lagne se wo tootte nahi (is liye upar wala jaisa `toThrow`
   * yahan ghalat hoga) — magar wo khaana bahar bhi kabhi nahi jata.
   *
   * Aur asal zamanat wohi doosri baat hai. Ye test usay naapta hai, throw ko nahi:
   * jis din koi mapper mein `...view` likh de, ye qatar foran laal ho jayegi.
   */
  it('dukan ke mapper sirf chune hue khaane bahar bhejte hain', () => {
    const leaky = { ...SUPPLIER, phone: '923001000006', feeRateBps: 500 }

    for (const dto of [
      toPublicSupplierListDTO(leaky as PublicSupplierView),
      toPublicSupplierDetailDTO(leaky as PublicSupplierView),
    ]) {
      expect(Object.keys(dto)).not.toContain('phone')
      expect(Object.keys(dto)).not.toContain('feeRateBps')
    }
  })
})
