/**
 * 🔴 Ye test un teen shakloin par khare hain jin mein ek hi cheez likhi jati hai:
 * Urdu, Roman aur angrezi. Jab tak teenon EK maal tak pohanchti hain, talash theek hai.
 *
 * Har test ke saath us ki asal shakayat likhi hai — "kya likh kar kya nahi mila".
 */
import { describe, expect, it } from 'vitest'
import { buildSearchText, expandSearch, normalizeSearch } from './search-terms'

/** Sawal us maal se milta hai ya nahi — wohi hisab jo DB mein AND/OR se hota hai. */
function matches(query: string, text: string): boolean {
  const haystack = normalizeSearch(text)
  const groups = expandSearch(query)
  if (groups.length === 0) return false
  return groups.every((group) => group.some((term) => haystack.includes(term)))
}

const kidsWear = buildSearchText({
  titleUr: 'بچوں کے کپڑے — ایمبرائیڈرڈ',
  titleEn: 'Kids Wear — Embroidered',
  categoryNameUr: 'کپڑا اور ملبوسات',
  categoryNameEn: 'Apparel & Garments',
})

const lawnSuit = buildSearchText({
  titleUr: 'لان — تھری پیس',
  titleEn: 'Lawn — Three Piece',
  categoryNameUr: 'کپڑا اور ملبوسات',
  categoryNameEn: 'Apparel & Garments',
})

describe('talash — teen zabanein, ek maal', () => {
  it('🔴 "bachon ke kapre" — yehi wo shakayat thi jis se ye kaam shuru hua', () => {
    expect(matches('bachon ke kapre', kidsWear)).toBe(true)
  })

  it('Urdu mein wohi sawal', () => {
    expect(matches('بچوں کے کپڑے', kidsWear)).toBe(true)
  })

  it('angrezi mein wohi sawal', () => {
    expect(matches('kids wear', kidsWear)).toBe(true)
  })

  it('🔴 do lafz sawal ko TANG karte hain — sab kuch OR nahi hota', () => {
    // "lawn suit" par bachon ke kapre nahi aane chahiyen
    expect(matches('lawn suit', lawnSuit)).toBe(true)
    expect(matches('lawn suit', kidsWear)).toBe(false)
  })

  it('Arabi keyboard ka "ك" aur Urdu ka "ک" ek hi cheez hain', () => {
    const arabicKeyboard = buildSearchText({ titleUr: 'كھدر سوٹ', titleEn: 'Khaddar Suit' })
    expect(matches('کھدر', arabicKeyboard)).toBe(true)
    expect(matches('khaddar', arabicKeyboard)).toBe(true)
  })

  it('zer-zabar rah jayen to bhi mel hota hai', () => {
    const withHarakat = buildSearchText({ titleUr: 'کھدّر', titleEn: 'Khaddar' })
    expect(matches('کھدر', withHarakat)).toBe(true)
  })

  it('Urdu ke hindse angrezi hindson se mil jate hain', () => {
    expect(normalizeSearch('۵۰۰ گرام')).toContain('500')
  })

  it('🔴 category ke naam par bhi maal milta hai — maal ka apna naam kuch bhi ho', () => {
    // Lawn ke naam mein "کپڑا" kahin nahi hai; wo sirf category mein hai
    expect(matches('کپڑا', lawnSuit)).toBe(true)
  })

  it('ramz se koi farq nahi parta', () => {
    expect(matches('kids-wear', kidsWear)).toBe(true)
  })

  it('sirf "ke liye" jaise lafz likhne par sawal jaisa hai waisa chalta hai', () => {
    expect(expandSearch('ke ka ki')).toEqual([['ke ka ki']])
  })

  it('khali sawal par kuch nahi', () => {
    expect(expandSearch('   ')).toEqual([])
  })

  it('ek harf ka lafz nazar andaz hota hai — "%k%" har cheez se mil jata hai', () => {
    expect(expandSearch('lawn k')).toEqual([expandSearch('lawn')[0]])
  })
})
