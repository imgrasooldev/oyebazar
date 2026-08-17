import { describe, expect, it } from 'vitest'
import { calculateBajiFee, calculateSupplierBase, FEE_RATE_BPS } from './fee'
import { pkr } from './money'

describe('calculateBajiFee', () => {
  it('5% par PKR 2,800 ke order par 140 fee banti hai', () => {
    const fee = calculateBajiFee(
      [{ supplierPriceSnapshot: pkr(2800), qty: 1 }],
      FEE_RATE_BPS.PHASE_1,
    )
    expect(fee).toBe(140)
  })

  it('8% par wohi order 224 deta hai — yehi 5%→8% ka farq hai', () => {
    const fee = calculateBajiFee([{ supplierPriceSnapshot: pkr(2800), qty: 1 }], FEE_RATE_BPS.TARGET)
    expect(fee).toBe(224)
  })

  it('multiple items aur qty jama karta hai', () => {
    const fee = calculateBajiFee(
      [
        { supplierPriceSnapshot: pkr(1500), qty: 2 },
        { supplierPriceSnapshot: pkr(1000), qty: 1 },
      ],
      500,
    )
    expect(calculateSupplierBase([{ supplierPriceSnapshot: pkr(1500), qty: 2 }])).toBe(3000)
    expect(fee).toBe(200) // 4000 ka 5%
  })

  it('hamesha integer deta hai — float kabhi nahi', () => {
    const fee = calculateBajiFee([{ supplierPriceSnapshot: pkr(333), qty: 1 }], 500)
    expect(Number.isInteger(fee)).toBe(true)
    expect(fee).toBe(17) // 16.65 → 17
  })

  it('bemani fee rate reject karta hai', () => {
    expect(() => calculateBajiFee([{ supplierPriceSnapshot: pkr(1000), qty: 1 }], 5000)).toThrow()
    expect(() => calculateBajiFee([{ supplierPriceSnapshot: pkr(1000), qty: 1 }], -100)).toThrow()
  })

  it('khali order par sifar', () => {
    expect(calculateBajiFee([], 500)).toBe(0)
  })
})
