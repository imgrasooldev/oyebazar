import { describe, expect, it } from 'vitest'
import { colourName, variantLabel } from './colour'

describe('colourName', () => {
  /*
   * 🔴 Yehi wo soorat thi jo live safhe par nazar aayi: angrezi UI, aur us ke beech
   * mein variant ka naam Urdu mein — "Curtains — Double Bed سبز · M". Production ke
   * saare 280 variants par sirf yehi do rang hain.
   */
  it('production ke dono rang angrezi par tarjuma hote hain', () => {
    expect(colourName('سبز', 'en')).toBe('Green')
    expect(colourName('نیلا', 'en')).toBe('Blue')
  })

  /*
   * Doosra rukh utna hi zaroori hai: poora UI Urdu-first hai, aur dukan angrezi mein
   * rang likh sakti hai. Us soorat mein Urdu safhe par "Blue" chhapna wohi masla hai,
   * bas ulta.
   */
  it('angrezi se Urdu bhi', () => {
    expect(colourName('Blue', 'ur')).toBe('نیلا')
    expect(colourName('Green', 'rm')).toBe('Sabz')
  })

  it('bara chhota harf maani nahi rakhta', () => {
    expect(colourName('BLUE', 'ur')).toBe('نیلا')
    expect(colourName('  blue  ', 'ur')).toBe('نیلا')
  })

  /*
   * 🔴 Sab se ahem qatar. Dukan koi bhi rang likh sakti hai — "gehra neela",
   * "off-white", "peacock". Un par andaza lagana us se BURA hai ke unhen usi shakl
   * mein rehne diya jaye.
   */
  it('jo lafz lughat mein nahi, wo jyun ka tyun chhapta hai', () => {
    expect(colourName('گہرا نیلا', 'en')).toBe('گہرا نیلا')
    expect(colourName('Peacock', 'ur')).toBe('Peacock')
    expect(colourName('off-white', 'ur')).toBe('off-white')
  })

  it('khali matn khali rehta hai', () => {
    expect(colourName('', 'en')).toBe('')
    expect(colourName('   ', 'ur')).toBe('')
  })

  /*
   * Do Urdu lafz ek hi angrezi rang par jate hain (`کالا` aur `سیاہ` dono Black), magar
   * ulti taraf ek hi jawab aana chahiye — warna wo dukan ka likha hua rang badal deta.
   */
  it('do naam ek rang par — magar wapsi par ek hi', () => {
    expect(colourName('کالا', 'en')).toBe('Black')
    expect(colourName('سیاہ', 'en')).toBe('Black')
    expect(colourName('Black', 'ur')).toBe('کالا')
  })
})

describe('variantLabel', () => {
  it('rang tarjuma hota hai, size ko haath nahi lagta', () => {
    expect(variantLabel({ colour: 'سبز', size: 'M' }, 'en')).toBe('Green · M')
    expect(variantLabel({ colour: 'Blue', size: 'XL' }, 'ur')).toBe('نیلا · XL')
  })

  /*
   * 🔴 Size har zaban mein wohi hai (`S`, `M`, `40`) — us par lughat lagana sirf
   * nuqsan deta: "M" ko kisi lafz par map karne ki koshish har adad par ghalat jawab
   * deti.
   */
  it('sirf size ho to wohi, bina kisi tabdeeli ke', () => {
    expect(variantLabel({ size: '40' }, 'en')).toBe('40')
    expect(variantLabel({ size: 'S' }, 'ur')).toBe('S')
  })

  it('sirf rang ho to sirf rang', () => {
    expect(variantLabel({ colour: 'سبز' }, 'en')).toBe('Green')
  })

  /*
   * Kuch na ho to KHALI — aur safha khud tay kare ke us jagah kya likhna hai. Yahan
   * koi "سادہ"/"Standard" jaisa lafz DAALNA ghalat hota: order form par us ki zaroorat
   * hai (chip khali nahi ho sakti) magar inventory ki fehrist par us ka koi kaam nahi.
   */
  it('na rang na size — khali string', () => {
    expect(variantLabel({}, 'en')).toBe('')
    expect(variantLabel({ colour: null, size: null }, 'ur')).toBe('')
  })
})
