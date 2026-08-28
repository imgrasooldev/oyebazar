/**
 * 🔴 Ye test us EK cheez ki hifazat karta hai jis ka nuqsan hamara nahi, RESELLER ka hai.
 *
 * Tasveer par rate `buildCaption` likhta hai (us ke apne save shuda rate ke snapshot se).
 * Agar model ke jumlon mein bhi koi raqam aa jaye to ek hi status par do alag number
 * chhap jate hain — reseller "1,800" keh chuki hoti hai aur tasveer par kuch aur likha
 * hota hai. Us ke baad wo customer dobara nahi aata.
 *
 * Prompt mein bhi likha hai ke raqam na likhe, magar prompt ek DARKHWAST hai. Ye jaanch
 * ek SHART hai.
 */
import { describe, expect, it } from 'vitest'
import { hasAmount, withoutAmounts } from './no-amounts'

describe('raqam ki jaanch', () => {
  it('saaf jumla guzar jata hai', () => {
    expect(hasAmount('مال دیکھ کر پیسے دیں — کیش آن ڈیلیوری۔')).toBe(false)
    expect(hasAmount('Rang pakka hai, dhone se nahi utarta')).toBe(false)
  })

  it('angrezi hindse pakre jate hain', () => {
    expect(hasAmount('Sirf 1800 mein')).toBe(true)
  })

  it('🔴 URDU hindse bhi pakre jate hain — model Urdu jawab mein wohi likhta hai', () => {
    /*
     * Sirf `\d` par bharosa karne se ye taala khula reh jata: JavaScript ka `\d` Urdu
     * ke hindse pakarta hi nahi.
     */
    expect(hasAmount('صرف ۱۸۰۰ میں')).toBe(true)
    expect(hasAmount('٥٠٠ روپے')).toBe(true)
  })

  it('hindson ke baghair bhi qeemat ka zikr pakra jata hai', () => {
    expect(hasAmount('بہت اچھے ریٹ پر')).toBe(true)
    expect(hasAmount('Best rate in market')).toBe(true)
    expect(hasAmount('Sirf kuch rupay mein')).toBe(true)
  })

  it('🔴 be-zarar hindsa bhi girta hai — aur ye qeemat qubool hai', () => {
    /*
     * "3 پیس" mein koi qeemat nahi, phir bhi ye jumla gir jata hai. Do mein se ek ghalti
     * chunni thi: ek achha jumla kho dena, ya ek ghalat raqam chhap jana. Pehli ka
     * nuqsan hamara hai, doosri ka reseller ka — aur teen jumle waise bhi baqi rehte
     * hain (kam par poora jawab chhor kar template par chale jate hain).
     */
    expect(hasAmount('پیک میں ۳ پیس')).toBe(true)
  })

  it('list se sirf raqam wale jumle nikalte hain, baqi tarteeb mein rehte hain', () => {
    const lines = ['رنگ پکا ہے', 'صرف ۱۸۰۰ میں', 'کیش آن ڈیلیوری']
    expect(withoutAmounts(lines)).toEqual(['رنگ پکا ہے', 'کیش آن ڈیلیوری'])
  })

  it('khali list par khali list', () => {
    expect(withoutAmounts([])).toEqual([])
  })
})
