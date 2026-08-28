/**
 * 🔴 Sab se ahem test wo hai jo poochhta hai ke jumlon mein RAQAM to nahi aa gayi.
 *
 * Rate `buildCaption` likhta hai, order ke snapshot se. Agar ye jumle bhi rate likhne
 * lagen to ek hi status par do alag raqam ja sakti hain — aur us ki qeemat reseller
 * apne customer ke saamne bhugatti hai, hum nahi.
 */
import { describe, expect, it } from 'vitest'
import { templatePitch } from './pitch'
import type { PitchInput } from '../ports/pitch'

const base: PitchInput = {
  titleUr: 'لان تھری پیس — پرنٹڈ',
  titleEn: 'Lawn Three Piece — Printed',
  categoryNameUr: 'کپڑا اور ملبوسات',
  categoryNameEn: 'Apparel & Garments',
  // Sheher DB mein Latin likhe hain (seed-accounts.ts) — asli qadar wohi hai
  city: 'Faisalabad',
  hasStock: true,
  script: 'ur',
}

const withInput = (patch: Partial<PitchInput>): PitchInput => ({ ...base, ...patch })

describe('status ke lafz — hamare apne khanon se', () => {
  it('teen jumle milte hain — ek nahi', () => {
    expect(templatePitch(base)).toHaveLength(3)
  })

  it('🔴 kisi jumle mein raqam nahi hoti', () => {
    const messy = withInput({
      titleUr: 'لان تھری پیس ۲۵۰۰ روپے',
      descriptionUr: 'صرف Rs 2500 میں',
    })
    for (const line of templatePitch(messy)) {
      expect(line).not.toMatch(/\d|Rs|روپے/)
    }
  })

  it('maal ke apne lafz se jumla banta hai — naya lafz gharha nahi jata', () => {
    const [first] = templatePitch(withInput({ titleUr: 'لان — چکن کاری' }))
    expect(first).toContain('چکن کاری')
  })

  it('zyada khaas lafz jeetta hai — chikankari, embroidered se pehle', () => {
    const [first] = templatePitch(
      withInput({ titleUr: 'کھدر — چکن کاری', descriptionUr: 'ایمبرائیڈرڈ کام' }),
    )
    expect(first).toContain('چکن کاری')
  })

  it('🔴 khali maal par "aaj hi nikle ga" nahi likha jata', () => {
    const lines = templatePitch(withInput({ hasStock: false }))
    expect(lines.join(' ')).not.toContain('آج ہی')
  })

  it('stock hone par sheher ka naam aata hai', () => {
    expect(templatePitch(base).join(' ')).toContain('Faisalabad')
  })

  it('Roman chunne wali ko Urdu script nahi milti', () => {
    for (const line of templatePitch(withInput({ script: 'roman' }))) {
      expect(line).not.toMatch(/[؀-ۿ]/)
    }
  })

  /*
   * Sheher wali qadar DB se aati hai aur hum us ki shakl tay nahi karte. Ye test us
   * cheez ko qaid karta hai jo hum tay karte hain: HAMARE apne lafz.
   */
  it('sheher ka naam jaisa DB mein hai waisa hi jata hai — hum use tarjuma nahi karte', () => {
    expect(templatePitch(withInput({ city: 'Mingora' })).join(' ')).toContain('Mingora')
  })

  it('bilkul saade naam par bhi teen jumle bante hain — khali jagah nahi chhorte', () => {
    const plain = withInput({ titleUr: 'کرسی', titleEn: 'Chair', hasStock: false })
    const lines = templatePitch(plain)
    expect(lines).toHaveLength(3)
    expect(lines.every((line) => line.trim().length > 0)).toBe(true)
  })

  it('har dafa wohi jawab — reseller jo kal pasand kar chuki hai wo aaj bhi wahin hai', () => {
    expect(templatePitch(base)).toEqual(templatePitch(base))
  })
})
