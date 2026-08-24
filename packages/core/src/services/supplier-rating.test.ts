/**
 * 🔴 Zyada tar test ye poochhte hain ke sitare KYUN NAHI dikhaye gaye.
 *
 * Ye number dukan ki rozi par asar daalta hai. Jaldi mein diya hua bura number us se
 * kahin ziyada nuqsan deta hai jitna number na dene se hota hai — is liye "na dikhana"
 * wala rasta utni hi ehtiyat maangta hai jitni ginti khud.
 */
import { describe, expect, it } from 'vitest'
import { MIN_REVIEWS_FOR_STARS, reviewPeriod, supplierRating } from './supplier-rating'

const good = { quality: 5, communication: 5, payoutOnTime: 5 }
const bad = { quality: 1, communication: 1, payoutOnTime: 1 }

describe('dukan ke sitare — reseller ki raye se', () => {
  it('🔴 ek buri raye par sitare BILKUL nahi — ek shakhs dukan khatam na kar de', () => {
    const result = supplierRating([bad])
    expect(result.stars).toBeNull()
    expect(result.count).toBe(1)
  })

  it('🔴 ek achhi raye par bhi nahi — ek dost dukan bana bhi na de', () => {
    expect(supplierRating([good]).stars).toBeNull()
  })

  it('hadd par pohanchte hi dikhte hain', () => {
    const reviews = Array.from({ length: MIN_REVIEWS_FOR_STARS }, () => good)
    expect(supplierRating(reviews).stars).toBe(5)
  })

  it('teenon sawal ka wazan barabar hai', () => {
    const result = supplierRating([
      { quality: 5, communication: 1, payoutOnTime: 3 },
      { quality: 5, communication: 1, payoutOnTime: 3 },
      { quality: 5, communication: 1, payoutOnTime: 3 },
    ])
    expect(result.stars).toBe(3)
  })

  it('har sawal alag bhi milta hai — jorh se zyada kaam ki cheez', () => {
    const result = supplierRating([
      { quality: 5, communication: 2, payoutOnTime: 4 },
      { quality: 5, communication: 2, payoutOnTime: 4 },
      { quality: 5, communication: 2, payoutOnTime: 4 },
    ])
    expect(result.quality).toBe(5)
    expect(result.communication).toBe(2)
    expect(result.payoutOnTime).toBe(4)
  })

  it('ek dashmalav tak — "4.3" parha jata hai', () => {
    const result = supplierRating([
      { quality: 5, communication: 4, payoutOnTime: 4 },
      { quality: 4, communication: 4, payoutOnTime: 4 },
      { quality: 4, communication: 4, payoutOnTime: 5 },
    ])
    expect(String(result.stars)).toMatch(/^\d(\.\d)?$/)
  })
})

describe('mahine ki pehchan', () => {
  it('`YYYY-MM` ki shakal mein', () => {
    expect(reviewPeriod(new Date('2026-08-24T18:00:00Z'))).toBe('2026-08')
  })

  it('do hindson wala mahina', () => {
    expect(reviewPeriod(new Date('2026-01-01T00:00:00Z'))).toBe('2026-01')
  })

  it('🔴 UTC par — warna ek hi mahine ki DO alag qadrein ban jatin', () => {
    // Ye lamha Pakistan mein 1 ستمبر hai magar UTC mein abhi 31 اگست
    const edge = new Date('2026-08-31T20:00:00Z')
    expect(reviewPeriod(edge)).toBe('2026-08')
  })
})
