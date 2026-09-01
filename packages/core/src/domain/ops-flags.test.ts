/**
 * 🔴 Zyada tar test ye poochhte hain ke nishan KYUN NAHI laga.
 *
 * Ops ki list par sab se bara khatra ghalat nishan ka NAHI, dher ka hai: jo chhanni
 * rozana bees achhi cheezein pakarti ho, ops us list ko nazar-andaz karna seekh leta
 * hai — aur us ke baad wo cheezein bhi nikal jati hain jo waqai kharab thin. Isi liye
 * "chup rehna" wala rasta utni hi ehtiyat maangta hai jitna nishan lagana.
 */
import { describe, expect, it } from 'vitest'
import {
  CHURN_FIXES,
  countBySeverity,
  oddPriceSeverity,
  orderUnansweredSeverity,
  payoutOverdueSeverity,
  priceTimes,
  sortFlags,
  stockChurnSeverity,
  titleProblem,
  categoryNameProblem,
  type OpsFlag,
} from './ops-flags'

describe('baqaya payout — shart se kitna aage', () => {
  it('shart ke andar par koi nishan nahi', () => {
    expect(payoutOverdueSeverity(0)).toBeNull()
    expect(payoutOverdueSeverity(-2)).toBeNull()
  })

  it('ek din ki der halki hai — dukan ka aadmi chhutti par bhi ho sakta hai', () => {
    expect(payoutOverdueSeverity(1)).toBe('low')
  })

  it('teen din par darmiyana, saat par sar par khara', () => {
    expect(payoutOverdueSeverity(3)).toBe('medium')
    expect(payoutOverdueSeverity(7)).toBe('high')
  })
})

describe('order ka jawab — dukan chup hai', () => {
  it('🔴 pehle din koi nishan nahi — dukan par log 24 ghante nahi baithe hote', () => {
    expect(orderUnansweredSeverity(3)).toBeNull()
    expect(orderUnansweredSeverity(23)).toBeNull()
  })

  it('ek din par darmiyana, do din par sar par khara', () => {
    expect(orderUnansweredSeverity(24)).toBe('medium')
    expect(orderUnansweredSeverity(48)).toBe('high')
  })
})

describe('rate ka shak — category ke darmiyane se', () => {
  it('🔴 aam farq par kuch nahi — har dukan ka rate thora bohat alag hota hi hai', () => {
    expect(oddPriceSeverity(1_200, 1_000)).toBeNull()
    expect(oddPriceSeverity(2_500, 1_000)).toBeNull()
  })

  it('chaar guna par darmiyana', () => {
    expect(oddPriceSeverity(4_000, 1_000)).toBe('medium')
  })

  it('das guna par sar par khara — ek sifar ki ghalti', () => {
    expect(oddPriceSeverity(12_000, 1_200)).toBe('high')
  })

  it('🔴 doosri taraf bhi barabar — "bohat sasta" zyada khatarnak hai', () => {
    // Us par order aa jate hain aur dukan ko nuqsan par bhejna parta hai
    expect(oddPriceSeverity(120, 1_200)).toBe('high')
  })

  it('🔴 nayi category par (darmiyana sifar) kuch nahi — kis se moqabla karen', () => {
    expect(oddPriceSeverity(90_000, 0)).toBeNull()
  })

  it('kitne guna — dono taraf seedha number', () => {
    expect(priceTimes(12_000, 1_200)).toBe(10)
    expect(priceTimes(120, 1_200)).toBe(10)
    expect(priceTimes(1_800, 1_200)).toBe(1.5)
  })
})

describe('ginti baar baar haath se badalna', () => {
  it('chaar dafa tak kuch nahi — ginti theek karna aam kaam hai', () => {
    expect(stockChurnSeverity(4)).toBeNull()
  })

  it('paanch par halka, das par darmiyana', () => {
    expect(stockChurnSeverity(CHURN_FIXES)).toBe('low')
    expect(stockChurnSeverity(CHURN_FIXES * 2)).toBe('medium')
  })
})

describe('naam ki jaanch', () => {
  it('🔴 aam naam bilkul saaf nikalte hain — warna list bhar jati hai', () => {
    expect(titleProblem('لان تھری پیس — ایمبرائیڈرڈ')).toBeNull()
    expect(titleProblem('Lawn 3 Piece — Embroidered')).toBeNull()
    expect(titleProblem('Basmati Chawal 5 kg')).toBeNull()
    expect(titleProblem('Bed Sheet Double Bed 200 TC')).toBeNull()
  })

  it('bohat chhota naam', () => {
    expect(titleProblem('suit')).toBe('tooShort')
  })

  it('tajurbe wale lafz', () => {
    expect(titleProblem('test product')).toBe('placeholder')
    expect(titleProblem('asdf asdf')).toBe('placeholder')
  })

  it('🔴 naam mein phone number — Bazaar par chhapta hai aur order beech se nikal jata hai', () => {
    expect(titleProblem('Lawn Suit 03001234567')).toBe('hasPhone')
    expect(titleProblem('Suit 0300-123-4567')).toBe('hasPhone')
  })

  it('🔴 aath hindse phone nahi bante — warna asli naam bhi pakre jate hain', () => {
    // Ye kami test ne pakri thi: pehle hadd aath par thi
    expect(titleProblem('Bed Sheet 200 TC 180 GSM')).toBeNull()
  })

  it('zyada tar hindse', () => {
    expect(titleProblem('12345 678')).toBe('mostlyDigits')
  })

  it('ungli keyboard par reh gayi', () => {
    expect(titleProblem('Lawn Suittttttt')).toBe('repeatedChars')
  })

  it('naam ke andar aya hua number masla nahi', () => {
    // "Pack of 3", "500 g", "200 TC" — ye rozana ke asli naam hain
    expect(titleProblem('Cotton Pack of 3')).toBeNull()
    expect(titleProblem('Chai Patti 500 g')).toBeNull()
  })
})

describe('tarteeb', () => {
  const flag = (severity: OpsFlag['severity'], since: string, id: string): OpsFlag => ({
    kind: 'payoutOverdue',
    severity,
    subject: 'payout',
    id,
    label: id,
    context: null,
    values: {},
    since: new Date(since),
  })

  it('darja pehle', () => {
    const sorted = sortFlags([
      flag('low', '2026-08-01', 'a'),
      flag('high', '2026-08-20', 'b'),
      flag('medium', '2026-08-10', 'c'),
    ])
    expect(sorted.map((row) => row.id)).toEqual(['b', 'c', 'a'])
  })

  it('🔴 ek jaise darje mein PURANA upar — warna nazar-andaz shuda aur nazar-andaz hota hai', () => {
    const sorted = sortFlags([
      flag('high', '2026-08-20', 'naya'),
      flag('high', '2026-08-02', 'purana'),
    ])
    expect(sorted.map((row) => row.id)).toEqual(['purana', 'naya'])
  })

  it('har darje ki ginti', () => {
    const counts = countBySeverity([
      flag('high', '2026-08-01', 'a'),
      flag('high', '2026-08-02', 'b'),
      flag('low', '2026-08-03', 'c'),
    ])
    expect(counts).toEqual({ high: 2, medium: 0, low: 1 })
  })
})

describe('categoryNameProblem', () => {
  /*
   * 🔴 Ye poora block us ghalti se aaya jo LIVE safhe par nazar aayi.
   *
   * Pehli koshish mein khaanon par wohi `titleProblem()` chal rahi thi jo maal ke naam
   * par chalti hai. Nateeja: "لان", "کھدر", "لینن", "عبایا" — chaar bilkul theek khaane
   * — "naam bohat chhota" par pakre gaye, aur `sparta` (jis ke liye ye jaanch likhi ja
   * rahi thi) chhoot gaya, kyunke wo poore CHHE huroof ka hai.
   */
  it('Urdu ke aam, chhote khaane theek hain', () => {
    for (const name of ['لان', 'کھدر', 'لینن', 'عبایا', 'بیڈ شیٹ', 'پردے']) {
      expect(categoryNameProblem(name)).toBeNull()
    }
  })

  it('nameUr mein Urdu hi na ho to nishan lagta hai', () => {
    expect(categoryNameProblem('sparta')).toBe('notUrdu')
    expect(categoryNameProblem('Lawn')).toBe('notUrdu')
    expect(categoryNameProblem('  new-category  ')).toBe('notUrdu')
  })

  /*
   * Tarteeb maani rakhti hai: "test" bhi Urdu mein nahi, magar ops ko wo wajah dikhni
   * chahiye jo us ka agla qadam badalti hai — mitana, na ke tarjuma.
   */
  it('tajurbe ka naam "placeholder" hai, "notUrdu" nahi', () => {
    expect(categoryNameProblem('test')).toBe('placeholder')
    expect(categoryNameProblem('Demo category')).toBe('placeholder')
  })

  it('khali aur ek harf ka naam', () => {
    expect(categoryNameProblem('')).toBe('tooShort')
    expect(categoryNameProblem('  ')).toBe('tooShort')
    expect(categoryNameProblem('ل')).toBe('tooShort')
  })

  it('ungli reh gayi keyboard par', () => {
    expect(categoryNameProblem('ااااااا')).toBe('repeatedChars')
  })
})
