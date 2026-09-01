import { describe, expect, it } from 'vitest'
import {
  SEO_DESCRIPTION_IDEAL,
  SEO_TITLE_IDEAL,
  SEO_TITLE_MAX,
  cleanSeoText,
  resolveSeoText,
  seoLength,
} from './seo-text'

describe('cleanSeoText', () => {
  /*
   * 🔴 Khali matn `null` banta hai, khali string NAHI — aur ye farq safhe par nazar
   * aata hai: `null` par safha khud apna unwan bana leta hai, khali string par wo
   * bilkul be-naam chhap jata.
   */
  it('khali matn null banta hai', () => {
    expect(cleanSeoText('', SEO_TITLE_MAX)).toBeNull()
    expect(cleanSeoText('   ', SEO_TITLE_MAX)).toBeNull()
    expect(cleanSeoText(null, SEO_TITLE_MAX)).toBeNull()
    expect(cleanSeoText(undefined, SEO_TITLE_MAX)).toBeNull()
  })

  it('nayi line aur dohri jagah ek space ban jati hain', () => {
    expect(cleanSeoText('  ملتان   ڈرائی\nفروٹ  ', SEO_TITLE_MAX)).toBe('ملتان ڈرائی فروٹ')
  })

  it('hadd se lamba matn kaat diya jata hai', () => {
    const long = 'a'.repeat(SEO_TITLE_MAX + 40)
    expect(cleanSeoText(long, SEO_TITLE_MAX)).toHaveLength(SEO_TITLE_MAX)
  })
})

describe('seoLength', () => {
  it('khali, chhota, theek, lamba aur bohat lamba — paanch alag haal', () => {
    expect(seoLength('', SEO_TITLE_IDEAL)).toBe('empty')
    expect(seoLength('لان', SEO_TITLE_IDEAL)).toBe('short')
    expect(seoLength('a'.repeat(50), SEO_TITLE_IDEAL)).toBe('good')
    expect(seoLength('a'.repeat(65), SEO_TITLE_IDEAL)).toBe('long')
    expect(seoLength('a'.repeat(90), SEO_TITLE_IDEAL)).toBe('tooLong')
  })

  /*
   * 🔴 `short` ka `good` se alag hona ahem hai. Teen lafz ka unwan Google ko us safhe
   * ke bare mein kuch nahi batata, aur natije mein wo khali khali lagta hai — magar
   * "khaana bhara hua hai" ki wajah se koi usay masla nahi samajhta.
   */
  it('theek hadd par abhi bhi theek hai, ek harf aage lamba', () => {
    expect(seoLength('a'.repeat(SEO_TITLE_IDEAL), SEO_TITLE_IDEAL)).toBe('good')
    expect(seoLength('a'.repeat(SEO_TITLE_IDEAL + 1), SEO_TITLE_IDEAL)).toBe('long')
  })

  it('tafseel ki apni hadd', () => {
    expect(seoLength('a'.repeat(150), SEO_DESCRIPTION_IDEAL)).toBe('good')
    expect(seoLength('a'.repeat(190), SEO_DESCRIPTION_IDEAL)).toBe('tooLong')
  })
})

describe('resolveSeoText', () => {
  it('dukandar ka apna matn jeetta hai', () => {
    expect(resolveSeoText('میرا اپنا عنوان', 'hamara bana hua')).toBe('میرا اپنا عنوان')
  })

  it('khali ya sirf space par hamara bana hua chalta hai', () => {
    expect(resolveSeoText(null, 'hamara bana hua')).toBe('hamara bana hua')
    expect(resolveSeoText('', 'hamara bana hua')).toBe('hamara bana hua')
    expect(resolveSeoText('   ', 'hamara bana hua')).toBe('hamara bana hua')
  })
})
