import { describe, expect, it } from 'vitest'
import { isFresh, relativeTime } from './relative-time'

const NOW = new Date('2026-08-19T12:00:00Z')
const ago = (ms: number) => new Date(NOW.getTime() - ms)

const MIN = 60_000
const HOUR = 60 * MIN
const DAY = 24 * HOUR

describe('relativeTime', () => {
  it('minute se kam ko "abhi abhi" kehta hai', () => {
    expect(relativeTime(ago(30_000), NOW)).toEqual({ unit: 'now', value: 0 })
  })

  it('neeche ki taraf ginti karta hai — 90 minute "1 ghanta" hai, 2 nahi', () => {
    expect(relativeTime(ago(90 * MIN), NOW)).toEqual({ unit: 'hour', value: 1 })
  })

  it('din, hafte, mahine aur saal — har sarhad par', () => {
    expect(relativeTime(ago(4 * HOUR), NOW)).toEqual({ unit: 'hour', value: 4 })
    expect(relativeTime(ago(2 * DAY), NOW)).toEqual({ unit: 'day', value: 2 })
    expect(relativeTime(ago(10 * DAY), NOW)).toEqual({ unit: 'week', value: 1 })
    expect(relativeTime(ago(45 * DAY), NOW)).toEqual({ unit: 'month', value: 1 })
    expect(relativeTime(ago(400 * DAY), NOW)).toEqual({ unit: 'year', value: 1 })
  })

  it('ISO string bhi wesa hi chalta hai jaise Date', () => {
    expect(relativeTime(ago(3 * DAY).toISOString(), NOW)).toEqual({ unit: 'day', value: 3 })
  })

  /**
   * Server aur DB ki ghari mein chand second ka farq aam hai. Us se "-1 minute pehle"
   * jaisa jumla nahi banna chahiye.
   */
  it('mustaqbil ka waqt "abhi abhi" ban jata hai, manfi nahi', () => {
    expect(relativeTime(new Date(NOW.getTime() + 5 * MIN), NOW)).toEqual({ unit: 'now', value: 0 })
  })
})

describe('isFresh', () => {
  it('7 din ke andar naya hai, us ke baad nahi', () => {
    expect(isFresh(ago(6 * DAY), NOW)).toBe(true)
    expect(isFresh(ago(8 * DAY), NOW)).toBe(false)
  })
})
