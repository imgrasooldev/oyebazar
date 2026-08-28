/**
 * 🔴 Zyada tar test ye poochhte hain ke hum kab kuch NAHI kehte.
 *
 * Ye ishara kisi asli shakhs ke baare mein hai jo kabhi hamare saamne nahi aaya, aur jis
 * ka koi jawab dene ka rasta nahi. Ek jaldbaz "bura record" us ke aage ke har order ko
 * maar deta hai — aur wo faisla hum ne us ki ghair-mojoodgi mein diya hoga.
 */
import { describe, expect, it } from 'vitest'
import {
  MIN_ORDERS_FOR_PHONE_SIGNAL,
  PHONE_RISK_THRESHOLD,
  phoneKey,
  phoneRecord,
} from './phone-record'

describe('number ka record', () => {
  it('🔴 ek wapsi par kuch nahi kehte — parcel courier ki ghalti se bhi wapas aata hai', () => {
    const record = phoneRecord({ delivered: 0, returned: 1 })
    expect(record.rtoRate).toBeNull()
    expect(record.risky).toBe(false)
  })

  it(`🔴 ${MIN_ORDERS_FOR_PHONE_SIGNAL} se kam par bhi khamosh`, () => {
    expect(phoneRecord({ delivered: 1, returned: 1 }).rtoRate).toBeNull()
  })

  it('hadd par pohanchte hi ginti aati hai', () => {
    const record = phoneRecord({ delivered: 2, returned: 1 })
    expect(record.rtoRate).toBe(33)
  })

  it(`${PHONE_RISK_THRESHOLD}% se upar par tanbeeh`, () => {
    expect(phoneRecord({ delivered: 1, returned: 2 }).risky).toBe(true)
  })

  it('🔴 aam RTO par tanbeeh NAHI — warna wo har order par jalti aur dekhi hi na jati', () => {
    // 3 mein se 1 = 33%, jo Pakistan mein COD ka aam hisab hai
    expect(phoneRecord({ delivered: 2, returned: 1 }).risky).toBe(false)
  })

  it('achha record bhi ginta hai — sirf bura nahi', () => {
    const record = phoneRecord({ delivered: 9, returned: 0 })
    expect(record.rtoRate).toBe(0)
    expect(record.risky).toBe(false)
  })

  it('🔴 khamoshi (null) tasalli NAHI hoti — UI ko dono alag dikhane parte hain', () => {
    const anjaan = phoneRecord({ delivered: 0, returned: 0 })
    const achha = phoneRecord({ delivered: 5, returned: 0 })
    expect(anjaan.rtoRate).toBeNull()
    expect(achha.rtoRate).toBe(0)
  })
})

describe('number ki ek shakl', () => {
  it('🔴 teenon shaklein ek hi number banti hain — warna record jama hi na hota', () => {
    const chahiye = '923001234567'
    expect(phoneKey('03001234567')).toBe(chahiye)
    expect(phoneKey('+92 300 1234567')).toBe(chahiye)
    expect(phoneKey('3001234567')).toBe(chahiye)
    expect(phoneKey('0300-1234567')).toBe(chahiye)
  })

  it('anjaan shakl waisi hi rehti hai — badal kar ghalat jorh banane se behtar', () => {
    expect(phoneKey('12345')).toBe('12345')
  })
})
