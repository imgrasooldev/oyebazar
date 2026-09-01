import { describe, expect, it } from 'vitest'
import {
  buildPayoutAccount,
  formatPayoutNumber,
  hasPayoutAccount,
  isWalletMethod,
  normalisePayoutNumber,
} from './payout-account'

describe('normalisePayoutNumber', () => {
  it('wallet ka number har aam shakal se ek hi shakal par aata hai', () => {
    for (const raw of [
      '03001234567',
      '0300-1234567',
      '0300 1234567',
      '+92 300 1234567',
      '923001234567',
      '3001234567',
    ]) {
      expect(normalisePayoutNumber('EASYPAISA', raw)).toBe('03001234567')
    }
  })

  it('landline aur adhoora number wallet par nahi chalta', () => {
    for (const raw of ['0421234567', '0300123456', '030012345678', '', 'salam']) {
      expect(normalisePayoutNumber('JAZZCASH', raw)).toBeNull()
    }
  })

  it('IBAN space aur dash ke saath bhi qabool hai — magar wapas bina space ke', () => {
    expect(normalisePayoutNumber('BANK', 'PK36 SCBL 0000 0011 2345 6702')).toBe(
      'PK36SCBL0000001123456702',
    )
    expect(normalisePayoutNumber('BANK', 'pk36scbl0000001123456702')).toBe(
      'PK36SCBL0000001123456702',
    )
  })

  it('sada khata number bhi chalta hai — har koi IBAN nahi nikaal sakta', () => {
    expect(normalisePayoutNumber('BANK', '0123456789')).toBe('0123456789')
    expect(normalisePayoutNumber('BANK', '01234-567-89')).toBe('0123456789')
  })

  it('bank ka number bohat chhota ya kharab shakal ka ho to nahi', () => {
    for (const raw of ['1234567', 'PK36SCBL', 'ABCD1234', '']) {
      expect(normalisePayoutNumber('BANK', raw)).toBeNull()
    }
  })

  /*
   * 🔴 Wallet aur bank ka farq isi jaanch par khara hai: wohi matn jo bank par jaiz
   * hai, wallet par nahi — aur ulta bhi.
   */
  it('bank ka khata number wallet par nahi chalta', () => {
    expect(normalisePayoutNumber('EASYPAISA', 'PK36SCBL0000001123456702')).toBeNull()
    expect(normalisePayoutNumber('BANK', '0300 1234567')).toBe('03001234567')
  })
})

describe('buildPayoutAccount', () => {
  it('wallet ka poora khata banata hai', () => {
    const result = buildPayoutAccount({
      method: 'EASYPAISA',
      number: '0300-1234567',
      title: '  Sadia   Bibi ',
    })

    expect(result).toEqual({
      ok: true,
      account: {
        method: 'EASYPAISA',
        number: '03001234567',
        title: 'Sadia Bibi',
        bankName: null,
      },
    })
  })

  it('bank par bank ka naam LAZMI hai', () => {
    const without = buildPayoutAccount({
      method: 'BANK',
      number: 'PK36SCBL0000001123456702',
      title: 'Sadia Bibi',
    })
    expect(without).toEqual({ ok: false, problem: 'bankName' })

    const with_ = buildPayoutAccount({
      method: 'BANK',
      number: 'PK36SCBL0000001123456702',
      title: 'Sadia Bibi',
      bankName: 'Standard Chartered',
    })
    expect(with_.ok).toBe(true)
  })

  /*
   * 🔴 "EasyPaisa · Meezan Bank" jaisi qatar dukan wale ko rok deti hai — is liye
   * wallet par bank ka naam khali karne ke bajaye MANA hai.
   */
  it('wallet par bank ka naam mana hai', () => {
    expect(
      buildPayoutAccount({
        method: 'JAZZCASH',
        number: '03001234567',
        title: 'Sadia Bibi',
        bankName: 'Meezan',
      }),
    ).toEqual({ ok: false, problem: 'bankName' })
  })

  it('naam ke baghair khata nahi banta', () => {
    for (const title of ['', '  ', 'ab']) {
      expect(buildPayoutAccount({ method: 'EASYPAISA', number: '03001234567', title })).toEqual({
        ok: false,
        problem: 'title',
      })
    }
  })

  it('anjaana tareeqa mana hai', () => {
    expect(
      buildPayoutAccount({ method: 'PAYPAL', number: '03001234567', title: 'Sadia' }),
    ).toEqual({ ok: false, problem: 'method' })
  })

  it('kharab number par number ki shikayat aati hai, kisi aur khaane ki nahi', () => {
    expect(
      buildPayoutAccount({ method: 'EASYPAISA', number: '0421234567', title: 'Sadia Bibi' }),
    ).toEqual({ ok: false, problem: 'number' })
  })
})

describe('hasPayoutAccount', () => {
  it('adhoora khata bhara hua nahi ginta', () => {
    expect(hasPayoutAccount(null)).toBe(false)
    expect(hasPayoutAccount({ method: 'EASYPAISA', number: '', title: 'Sadia' })).toBe(false)
    expect(hasPayoutAccount({ method: 'EASYPAISA', number: '03001234567', title: '' })).toBe(false)
    expect(
      hasPayoutAccount({ method: 'EASYPAISA', number: '03001234567', title: 'Sadia' }),
    ).toBe(true)
  })
})

describe('formatPayoutNumber', () => {
  it('wallet ka number parhne ke qabil, bank ka jyun ka tyun', () => {
    expect(
      formatPayoutNumber({
        method: 'EASYPAISA',
        number: '03001234567',
        title: 'Sadia',
        bankName: null,
      }),
    ).toBe('0300 1234567')

    expect(
      formatPayoutNumber({
        method: 'BANK',
        number: 'PK36SCBL0000001123456702',
        title: 'Sadia',
        bankName: 'SCB',
      }),
    ).toBe('PK36SCBL0000001123456702')
  })
})

describe('isWalletMethod', () => {
  it('Raast wallet ke saath hai, bank ke saath nahi', () => {
    expect(isWalletMethod('RAAST')).toBe(true)
    expect(isWalletMethod('JAZZCASH')).toBe(true)
    expect(isWalletMethod('EASYPAISA')).toBe(true)
    expect(isWalletMethod('BANK')).toBe(false)
  })
})
