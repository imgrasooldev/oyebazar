import { describe, expect, it } from 'vitest'
import { parseOrderText } from './parse-order-text'

/**
 * Ye testein asli shaklon par likhi gayi hain — wo jo WhatsApp par waqai aati hain,
 * na ke wo jo hamare liye parhna aasan hai.
 */
describe('parseOrderText', () => {
  it('label wali qatarein — sab se aam shakl', () => {
    const parsed = parseOrderText(
      ['نام: عائشہ بی بی', '0300-1234567', 'پتہ: مکان 12، گلی 4، ماڈل ٹاؤن، لاہور', 'علاقہ: ماڈل ٹاؤن'].join(
        '\n',
      ),
    )

    expect(parsed.name).toBe('عائشہ بی بی')
    expect(parsed.phone).toBe('03001234567')
    expect(parsed.address).toBe('مکان 12، گلی 4، ماڈل ٹاؤن، لاہور')
    expect(parsed.area).toBe('ماڈل ٹاؤن')
  })

  it('bina label ke — naam upar, number, phir pata', () => {
    const parsed = parseOrderText(['Ayesha Khan', '+92 321 9876543', 'House 5, Street 9, Gulberg, Lahore'].join('\n'))

    expect(parsed.name).toBe('Ayesha Khan')
    expect(parsed.phone).toBe('03219876543')
    expect(parsed.address).toBe('House 5, Street 9, Gulberg, Lahore')
  })

  it('number ki har shakl ek hi khaane mein aati hai', () => {
    for (const raw of ['03001234567', '0300 1234567', '+923001234567', '92 300 1234567', '3001234567']) {
      expect(parseOrderText(raw).phone).toBe('03001234567')
    }
  })

  it('🔴 naam mein number nahi jata — warna pata hi naam ban jata hai', () => {
    const parsed = parseOrderText(['مکان 12 گلی 4 لاہور', '03001234567'].join('\n'))

    expect(parsed.name).toBe('')
    expect(parsed.address).toBe('مکان 12 گلی 4 لاہور')
  })

  it('kuch na mile to khali — koi andaza nahi', () => {
    /*
     * Ye ahem hai: khali khaana reseller ko khud bharne par majboor karta hai, jab ke
     * ghalat andaza chup chaap chala jata hai aur parcel ghalat pate par. Wapsi ka
     * kharcha dukan aur reseller dono uthate hain.
     */
    const parsed = parseOrderText('salam, ye wala suit chahiye')

    expect(parsed.phone).toBe('')
    expect(parsed.address).toBe('')
  })

  it('lambi guftagu mein se bhi number aur pata nikal aata hai', () => {
    const parsed = parseOrderText(
      [
        'السلام علیکم باجی',
        'مجھے وہ نیلا سوٹ چاہیے',
        'میرا نمبر 0333 4445556 ہے',
        'گھر نمبر 7، محلہ اقبال، فیصل آباد',
      ].join('\n'),
    )

    expect(parsed.phone).toBe('03334445556')
    expect(parsed.address).toBe('گھر نمبر 7، محلہ اقبال، فیصل آباد')
  })
})
