import { describe, expect, it } from 'vitest'
import {
  REFERRAL_BONUS,
  REFERRAL_BONUS_LIMIT,
  referralBonusFor,
  SIGNUP_BONUS_ORDERS,
  SIGNUP_BONUS_PER_ORDER,
  SIGNUP_BONUS_TOTAL,
  signupBonusFor,
} from './bonus'

describe('signupBonusFor', () => {
  it('pehle order par bonus banta hai', () => {
    expect(signupBonusFor(1)).toBe(SIGNUP_BONUS_PER_ORDER)
  })

  it('aakhri gine hue order tak banta hai', () => {
    expect(signupBonusFor(SIGNUP_BONUS_ORDERS)).toBe(SIGNUP_BONUS_PER_ORDER)
  })

  /*
   * 🔴 Hadd ke FORAN baad sifar — aur yehi is test ki asal wajah hai.
   *
   * Ek se shuru hone wali ginti par "das tak" ki shart likhte waqt ek ka farq reh jana
   * sab se aam ghalti hai (`<` bajaye `<=`). Us ka anjaam yahan paisa hai: har reseller
   * ko ya pachas rupay kam milte, ya pachas zyada — aur dono soorton mein wo farq
   * hazaron par jama hota rehta aur kisi ek qatar par nazar nahi aata.
   */
  it('hadd ke baad kuch nahi', () => {
    expect(signupBonusFor(SIGNUP_BONUS_ORDERS + 1)).toBe(0)
  })

  it('sifar (koi order pohancha hi nahi) par kuch nahi', () => {
    expect(signupBonusFor(0)).toBe(0)
  })

  /*
   * Manfi ginti mumkin nahi honi chahiye, magar us par bhi sifar hi durust hai:
   * paisa dene wale faisle par kabhi "shayad" nahi hona chahiye.
   */
  it('manfi ginti par bhi kuch nahi', () => {
    expect(signupBonusFor(-3)).toBe(0)
  })

  it('poora signup bonus = fi order × ginti', () => {
    const total = Array.from({ length: SIGNUP_BONUS_ORDERS }, (_, index) =>
      signupBonusFor(index + 1),
    ).reduce((sum, amount) => sum + amount, 0)

    expect(total).toBe(SIGNUP_BONUS_TOTAL)
  })
})

describe('raqmen', () => {
  /*
   * 🔴 Ye test raqam ki durusti nahi jaanchta — wo malik ka faisla hai. Ye us ke BADALNE
   * ko nazar mein laata hai: agar koi 500 ko 5000 kar de, ye test girta hai aur wo
   * tabdeeli review mein saamne aati hai. Bees hazar reseller par ye farq ek karor rupay
   * ka hai, aur wo chup chaap nahi guzarna chahiye.
   */
  it('signup 500, referral 100', () => {
    expect(SIGNUP_BONUS_TOTAL).toBe(500)
    expect(REFERRAL_BONUS).toBe(100)
  })
})

describe('referralBonusFor', () => {
  /*
   * 🔴 Ye poori scheme ki bunyad hai: bonus us bikri ki APNI fee se nikalta hai.
   *
   * Agar hum us order par saath rupay kamayen aur sau de den, to wo bonus nahi — wo
   * nuqsan hai, aur wo nuqsan har naye bande ke saath barhta hai. Is shart ke saath
   * scheme khud apna kharcha uthati hai.
   */
  it('fee poori ho to poora bonus', () => {
    expect(referralBonusFor(250, 0)).toBe(REFERRAL_BONUS)
  })

  it('fee kam ho to sirf utna jitna bikri ne diya', () => {
    expect(referralBonusFor(60, 0)).toBe(60)
  })

  it('fee sifar ho to kuch nahi — bikri hui hi nahi', () => {
    expect(referralBonusFor(0, 0)).toBe(0)
  })

  /*
   * 🔴 Hadd ke THEEK par band — us par, us se pehle nahi.
   *
   * `>=` bajaye `>` likhne se ek bonus zyada nikal jata, aur us qism ki ghalti kabhi
   * kisi ek qatar par nazar nahi aati.
   */
  it('hadd tak khula rehta hai', () => {
    expect(referralBonusFor(500, REFERRAL_BONUS_LIMIT - 1)).toBe(REFERRAL_BONUS)
  })

  it('hadd par pohanch kar band', () => {
    expect(referralBonusFor(500, REFERRAL_BONUS_LIMIT)).toBe(0)
  })

  it('hadd se aage bhi band', () => {
    expect(referralBonusFor(500, REFERRAL_BONUS_LIMIT + 50)).toBe(0)
  })

  /*
   * Poori scheme ka sab se bara mumkin kharcha — ek adad mein.
   *
   * 🔴 Ye test us number ko nazar mein rakhta hai. Hadd ya raqam badle to ye girta hai
   * aur naya kharcha review mein saamne aata hai, chup chaap live nahi jata.
   */
  it('kul kharcha 30,000 se zyada nahi', () => {
    expect(REFERRAL_BONUS * REFERRAL_BONUS_LIMIT).toBe(30_000)
  })
})
