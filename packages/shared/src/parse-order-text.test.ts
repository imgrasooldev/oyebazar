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

  /*
   * 🔴 Ye asli jaanch mein pakra gaya, production par.
   *
   * "Assalam o alaikum baji" naam ke khaane mein chala jata tha — aur wohi naam courier
   * ki parchi par chhapta. Naam ka qaida "pehli chhoti qatar jis mein hindsay na hon"
   * hai, aur Pakistan mein tqreeban HAR paighaam salam se shuru hota hai: yani ye
   * ghalti aam soorat thi, istisna nahi.
   */
  it('salam ko naam nahi banata — khaali khaana ghalat naam se behtar hai', () => {
    const roman = parseOrderText(
      ['Assalam o alaikum baji', 'Kiran Zahra', '0301-1122233', 'Makan 42-B, Gali 7'].join('\n'),
    )

    expect(roman.name).toBe('Kiran Zahra')
    expect(roman.phone).toBe('03011122233')

    const urdu = parseOrderText(
      ['السلام علیکم', 'کرن زہرا', '0333 4445556', 'گھر نمبر 7، محلہ اقبال'].join('\n'),
    )

    expect(urdu.name).toBe('کرن زہرا')
  })

  it('sirf salam ho to naam khaali rehta hai, salam nahi', () => {
    expect(parseOrderText('Assalam o alaikum baji').name).toBe('')
  })

  /*
   * Hadd: "hi" aur "salam" se SHURU hone wale asli naam na kat jayen. `\b` isi ke
   * liye hai — is ke baghair "Hina" bhi "hi" par match kar ke gir jata.
   */
  it('naam jo salam jaise lafz se shuru hote hain, wo nahi girte', () => {
    expect(parseOrderText(['Hina Aslam', '0300 1112223'].join('\n')).name).toBe('Hina Aslam')
    expect(parseOrderText(['Salamat Bibi', '0300 1112223'].join('\n')).name).toBe('Salamat Bibi')
  })
})
