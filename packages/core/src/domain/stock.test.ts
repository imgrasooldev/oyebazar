/**
 * 🔴 Ye test zyada tar un halaton ke bare mein hain jahan hisab ko CHUP reh jana chahiye:
 * lagat maloom na ho, khep ka rate na bataya gaya ho, ya hadd rakhi hi na gayi ho.
 *
 * Wajah: ye teenon number dukan wale ke paison ke bare mein hain. Ghalat number us se
 * kahin zyada nuqsan deta hai jitna number na dene se hota hai — kyunke ghalat number
 * par wo faisla kar leta hai, aur khali jagah par wo poochh leta hai.
 */
import { describe, expect, it } from 'vitest'
import { nextAvgCost, stockHealth, stockValuation, stockValue } from './stock'

describe('aosat lagat — purana maal aur nayi khep', () => {
  it('dono taraf lagat maloom ho to wazan ke hisab se aosat banti hai', () => {
    // 10 × 100 + 10 × 200 = 3000 / 20 = 150
    expect(
      nextAvgCost({ currentAvg: 100, currentQty: 10, incomingQty: 10, incomingUnitCost: 200 }),
    ).toBe(150)
  })

  it('bari khep chhoti se zyada kheenchti hai — wazan ka yehi matlab hai', () => {
    // 10 × 100 + 90 × 200 = 19000 / 100 = 190
    expect(
      nextAvgCost({ currentAvg: 100, currentQty: 10, incomingQty: 90, incomingUnitCost: 200 }),
    ).toBe(190)
  })

  it('🔴 khep ka rate na bataya jaye to purani lagat chhui tak nahi jati', () => {
    expect(
      nextAvgCost({ currentAvg: 150, currentQty: 10, incomingQty: 50, incomingUnitCost: null }),
    ).toBe(150)
    expect(
      nextAvgCost({ currentAvg: 150, currentQty: 10, incomingQty: 50, incomingUnitCost: 0 }),
    ).toBe(150)
  })

  it('🔴 purani lagat maloom hi na ho to purana maal aosat mein nahi ginta', () => {
    // Warna 20 puraane piece "sifar ke" gine jate aur nayi lagat aadhi nikalti
    expect(
      nextAvgCost({ currentAvg: 0, currentQty: 20, incomingQty: 20, incomingUnitCost: 200 }),
    ).toBe(200)
  })

  it('khali dukan par pehli khep hi lagat ban jati hai', () => {
    expect(
      nextAvgCost({ currentAvg: 0, currentQty: 0, incomingQty: 5, incomingUnitCost: 340 }),
    ).toBe(340)
  })

  it('khep ki tadaad sifar ho to kuch nahi badalta', () => {
    expect(
      nextAvgCost({ currentAvg: 150, currentQty: 10, incomingQty: 0, incomingUnitCost: 900 }),
    ).toBe(150)
  })
})

describe('maal ki sehat — dukan ki apni hadd par', () => {
  it('sifar ya us se neeche = khatam', () => {
    expect(stockHealth(0, 5)).toBe('out')
    expect(stockHealth(-2, 5)).toBe('out')
  })

  it('hadd par aur us se neeche = kam', () => {
    expect(stockHealth(5, 5)).toBe('low')
    expect(stockHealth(3, 5)).toBe('low')
  })

  it('hadd se upar = theek', () => {
    expect(stockHealth(6, 5)).toBe('ok')
  })

  it('🔴 hadd rakhi hi na ho to ishara BAND — sifar ka matlab "hadd sifar" nahi', () => {
    expect(stockHealth(1, 0)).toBe('ok')
    expect(stockHealth(1000, 0)).toBe('ok')
    // Magar khatam hona phir bhi khatam hona hai
    expect(stockHealth(0, 0)).toBe('out')
  })
})

describe('maal ki qeemat', () => {
  it('lagat maloom ho to ginti × lagat', () => {
    expect(stockValue(12, 250)).toBe(3_000)
  })

  it('🔴 lagat maloom na ho to null — "Rs 0" nahi', () => {
    expect(stockValue(12, 0)).toBeNull()
  })

  it('maal hi na ho to null', () => {
    expect(stockValue(0, 250)).toBeNull()
  })
})

describe('poori dukan ke maal ki qeemat', () => {
  const lines = [
    { stockQty: 10, avgCost: 100 }, // 1000
    { stockQty: 5, avgCost: 200 }, //  1000
    { stockQty: 8, avgCost: 0 }, //    lagat maloom nahi
    { stockQty: 0, avgCost: 500 }, //  maal hi nahi
  ]

  it('sirf us maal ki qeemat jorhta hai jis ki lagat maloom hai', () => {
    expect(stockValuation(lines).value).toBe(2_000)
  })

  it('🔴 saath mein ye bhi batata hai ke kitne maal par ye number khara hai', () => {
    const result = stockValuation(lines)
    expect(result.covered).toBe(15)
    expect(result.total).toBe(23)
    // Bina is farq ke dukan wala samajhta ke ye us ke POORE maal ki qeemat hai
    expect(result.covered).toBeLessThan(result.total)
  })

  it('khatam shuda maal ginti mein bhi nahi aata', () => {
    expect(stockValuation([{ stockQty: 0, avgCost: 500 }])).toEqual({
      value: 0,
      covered: 0,
      total: 0,
    })
  })
})
