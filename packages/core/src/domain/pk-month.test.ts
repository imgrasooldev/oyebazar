import { describe, expect, it } from 'vitest'
import { pkMonthKey, pkMonthStart } from './pk-month'

describe('pkMonthKey', () => {
  /*
   * 🔴 Yehi wo lamha hai jis ne asal kharabi dikhai: 1 September ki subah 4:27 PKT
   * (yani 31 August 23:27 UTC) par ops ka safha "2026-07" chhap raha tha.
   */
  it('1 September ki subah Pakistan mein September hai, August nahi', () => {
    expect(pkMonthKey(new Date('2026-08-31T23:27:00Z'))).toBe('2026-09')
  })

  it('31 August ki raat 11 baje Pakistan mein abhi August hai', () => {
    // 18:59 UTC = 23:59 PKT, 31 August
    expect(pkMonthKey(new Date('2026-08-31T18:59:00Z'))).toBe('2026-08')
  })

  it('mahine ke beech mein dono ek jaise', () => {
    expect(pkMonthKey(new Date('2026-08-15T12:00:00Z'))).toBe('2026-08')
  })
})

describe('pkMonthStart', () => {
  it('mahine ki shuruaat UTC ke lamhe ke tor par wapas aati hai', () => {
    // 1 August 00:00 PKT = 31 July 19:00 UTC
    expect(pkMonthStart(new Date('2026-08-15T12:00:00Z')).toISOString()).toBe(
      '2026-07-31T19:00:00.000Z',
    )
  })

  it('pichhla mahina — offset -1', () => {
    expect(pkMonthStart(new Date('2026-09-01T02:00:00Z'), -1).toISOString()).toBe(
      '2026-07-31T19:00:00.000Z',
    )
  })

  it('agla mahina — offset +1', () => {
    expect(pkMonthStart(new Date('2026-08-15T12:00:00Z'), 1).toISOString()).toBe(
      '2026-08-31T19:00:00.000Z',
    )
  })

  /*
   * Saal ka kinara — 31 December raat 8 baje UTC Pakistan mein PEHLI January hai.
   * Yani mojooda mahina January 2027, pichhla December 2026.
   */
  it('saal ka kinara — December se January', () => {
    const at = new Date('2026-12-31T20:00:00Z')

    expect(pkMonthKey(at)).toBe('2027-01')
    expect(pkMonthStart(at).toISOString()).toBe('2026-12-31T19:00:00.000Z')
    expect(pkMonthStart(at, -1).toISOString()).toBe('2026-11-30T19:00:00.000Z')
  })

  /*
   * 🔴 Poora nuqta yehi hai: paanch ghanton ki khirki jahan UTC aur Pakistan alag
   * mahine mein hote hain. Shuruaat ka lamha DONO taraf wohi rehna chahiye.
   */
  it('us paanch ghanton ki khirki mein bhi mahina wohi rehta hai', () => {
    const early = pkMonthStart(new Date('2026-08-31T19:30:00Z')) // 1 Sept 00:30 PKT
    const later = pkMonthStart(new Date('2026-09-05T10:00:00Z'))
    expect(early.toISOString()).toBe(later.toISOString())
    expect(early.toISOString()).toBe('2026-08-31T19:00:00.000Z')
  })
})
