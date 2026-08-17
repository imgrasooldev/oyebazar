import { describe, expect, it } from 'vitest'
import { addPkr, applyBasisPoints, formatPkr, multiplyPkr, pkr, subtractPkr } from './money'

describe('pkr', () => {
  it('integer qubool karta hai', () => {
    expect(pkr(3000)).toBe(3000)
    expect(pkr(0)).toBe(0)
  })

  it('🔴 float reject karta hai — paisa hamesha integer PKR', () => {
    expect(() => pkr(29.99)).toThrow()
    expect(() => pkr(0.1 + 0.2)).toThrow()
  })

  it('negative reject karta hai', () => {
    expect(() => pkr(-1)).toThrow()
  })
})

describe('arithmetic', () => {
  it('jama, tafreeq, zarb', () => {
    expect(addPkr(pkr(2800), pkr(200))).toBe(3000)
    expect(subtractPkr(pkr(3000), pkr(2800))).toBe(200)
    expect(multiplyPkr(pkr(1500), 2)).toBe(3000)
  })

  it('nateeja negative ho to throw karta hai (khamosh galti nahi)', () => {
    expect(() => subtractPkr(pkr(100), pkr(200))).toThrow()
  })
})

describe('applyBasisPoints', () => {
  it('500 bps = 5%', () => {
    expect(applyBasisPoints(pkr(3000), 500)).toBe(150)
  })

  it('800 bps = 8%', () => {
    expect(applyBasisPoints(pkr(3000), 800)).toBe(240)
  })

  it('10000 bps se upar reject', () => {
    expect(() => applyBasisPoints(pkr(3000), 10_001)).toThrow()
  })
})

describe('formatPkr', () => {
  it('hazaar ka comma lagata hai', () => {
    expect(formatPkr(3000)).toBe('Rs 3,000')
    expect(formatPkr(3000, { withSymbol: false })).toBe('3,000')
  })
})
