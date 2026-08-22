/**
 * 🔴 Ye tests do cheezon ki hifazat karte hain, aur dono mehngi hain:
 *
 *  1. **Default par key KHALI rehni chahiye.** Ye tootne par pehle se bane hue har pack
 *     ki cache key badal jati hai — yani laakhon tasveerein "gum" ho jati hain aur agli
 *     raat sab dobara render hoti hain. Ek raat ka poora render budget.
 *
 *  2. **Alag faislon ki alag key honi chahiye.** Ye tootne par reseller ka switch
 *     KHAMOSHI se bekar ho jata hai: wo "number hata den" dabati hai aur usay wohi
 *     purani (number wali) tasveer wapas milti hai.
 */
import { describe, expect, it } from 'vitest'
import { DEFAULT_PACK_OPTIONS, packOptionsFrom, packOptionsKey } from './pack-options'

describe('packOptionsKey', () => {
  it('🔴 default par khali — purane packs ki key nahi badalti', () => {
    expect(packOptionsKey(DEFAULT_PACK_OPTIONS)).toBe('')
    expect(packOptionsKey(packOptionsFrom())).toBe('')
    expect(packOptionsKey(packOptionsFrom({}))).toBe('')
    // Wohi qadrein saaf tor par likhi jayen tab bhi khali — warna UI se aaya hua poora
    // object har pack ko naya bana deta
    expect(
      packOptionsKey(
        packOptionsFrom({ lang: 'ur', showName: true, showPhone: true, showPrice: true }),
      ),
    ).toBe('')
  })

  it('har faisla key badalta hai', () => {
    const keys = [
      packOptionsFrom({ lang: 'en' }),
      packOptionsFrom({ showName: false }),
      packOptionsFrom({ showPhone: false }),
      packOptionsFrom({ showPrice: false }),
      packOptionsFrom({ name: 'صادیہ کلیکشن' }),
      packOptionsFrom({ phone: '03211234567' }),
    ].map(packOptionsKey)

    expect(new Set(keys).size).toBe(keys.length)
    for (const key of keys) expect(key).not.toBe('')
  })

  it('tarteeb par bharosa nahi — wohi faislay, wohi key', () => {
    const a = packOptionsKey(packOptionsFrom({ showPhone: false, lang: 'en' }))
    const b = packOptionsKey(packOptionsFrom({ lang: 'en', showPhone: false }))
    expect(a).toBe(b)
  })

  it('chhupa hua naam key mein nahi jata — wohi tasveer do dafa na bane', () => {
    const hidden = packOptionsFrom({ showName: false, name: 'کوئی نام' })
    const hiddenWithoutName = packOptionsFrom({ showName: false })
    expect(packOptionsKey(hidden)).toBe(packOptionsKey(hiddenWithoutName))
  })

  it('khali/space wala naam profile ke naam jaisa hi hai', () => {
    expect(packOptionsKey(packOptionsFrom({ name: '   ' }))).toBe('')
    expect(packOptionsFrom({ name: '  صادیہ  ' }).name).toBe('صادیہ')
  })
})
