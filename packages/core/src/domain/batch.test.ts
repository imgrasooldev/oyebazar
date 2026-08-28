/**
 * 🔴 Sab se ahem test wo hai jo ye sabit karta hai ke khep bikri ROKTI NAHI.
 *
 * Khep ki ginti kam par bhi maal bikta hai — `stockQty` hi wahid darwaza hai. Agar kabhi
 * koi is ko "shart" bana de, to `takeFefo` ka `short` sifar na aane par kuch toot jayega
 * aur wo yahan pakra jayega.
 */
import { describe, expect, it } from 'vitest'
import { EXPIRING_DAYS, batchState, daysLeft, sortFefo, takeFefo } from './batch'

const NOW = new Date('2026-08-29T00:00:00Z')
const day = (n: number) => new Date(NOW.getTime() + n * 86_400_000)

const batch = (over: Partial<{ id: string; expiryAt: Date | null; receivedAt: Date; qtyLeft: number }> = {}) => ({
  id: 'b1',
  expiryAt: null as Date | null,
  receivedAt: day(-30),
  qtyLeft: 10,
  ...over,
})

describe('khep ka haal', () => {
  it('maddat guzar chuki', () => {
    expect(batchState(day(-1), NOW)).toBe('expired')
  })

  it('maddat qareeb hai', () => {
    expect(batchState(day(1), NOW)).toBe('expiring')
    expect(batchState(day(EXPIRING_DAYS), NOW)).toBe('expiring')
  })

  it('abhi door hai', () => {
    expect(batchState(day(EXPIRING_DAYS + 1), NOW)).toBe('ok')
  })

  it('🔴 maddat likhi hi na ho to `noExpiry` — `ok` NAHI', () => {
    /*
     * Do alag baatein hain: "dekh liya, theek hai" aur "is cheez par ye sawal banta hi
     * nahi". Dono ko ek keh dene se kapre wali dukan ke saamne bhi maddat ka khana aa
     * jata, jahan us ka koi matlab nahi.
     */
    expect(batchState(null, NOW)).toBe('noExpiry')
  })

  it('kitne din baqi — guzar chuki ho to manfi, aur na ho to null', () => {
    expect(daysLeft(day(5), NOW)).toBe(5)
    expect(daysLeft(day(-3), NOW)).toBe(-3)
    expect(daysLeft(null, NOW)).toBeNull()
  })
})

describe('FEFO — kaunsi khep pehle nikle', () => {
  it('🔴 pehle wo jo pehle KHARAB hogi — jo pehle aayi wo nahi', () => {
    /*
     * FIFO is jagah maal zaya karta hai: baad mein aayi hui khep pehle mar sakti hai
     * (mukhtalif supplier, mukhtalif banane ki tareekh), aur FIFO usay aakhir tak
     * rakhta hai.
     */
    const purani = batch({ id: 'purani', receivedAt: day(-60), expiryAt: day(90) })
    const nayi = batch({ id: 'nayi', receivedAt: day(-2), expiryAt: day(10) })

    expect(sortFefo([purani, nayi]).map((b) => b.id)).toEqual(['nayi', 'purani'])
  })

  it('🔴 jis par maddat hai wo AAKHIR mein nahi — us ka waqt guzar raha hai', () => {
    const koiMaddat = batch({ id: 'be-maddat', expiryAt: null, receivedAt: day(-90) })
    const maddat = batch({ id: 'maddat-wali', expiryAt: day(60), receivedAt: day(-1) })

    expect(sortFefo([koiMaddat, maddat]).map((b) => b.id)).toEqual(['maddat-wali', 'be-maddat'])
  })

  it('maddat barabar ho to purani khep pehle', () => {
    const a = batch({ id: 'purani', expiryAt: day(20), receivedAt: day(-40) })
    const b = batch({ id: 'nayi', expiryAt: day(20), receivedAt: day(-2) })

    expect(sortFefo([b, a]).map((x) => x.id)).toEqual(['purani', 'nayi'])
  })

  it('khali khep tarteeb mein aati hi nahi', () => {
    const khali = batch({ id: 'khali', qtyLeft: 0, expiryAt: day(1) })
    const bhari = batch({ id: 'bhari', qtyLeft: 5, expiryAt: day(50) })

    expect(sortFefo([khali, bhari]).map((b) => b.id)).toEqual(['bhari'])
  })
})

describe('khep se maal nikalna', () => {
  it('pehli khep se poora mil jaye to doosri chhui nahi jati', () => {
    const a = batch({ id: 'a', qtyLeft: 10, expiryAt: day(5) })
    const b = batch({ id: 'b', qtyLeft: 10, expiryAt: day(50) })

    const { taken, short } = takeFefo([a, b], 4)
    expect(taken).toEqual([{ batch: a, qty: 4 }])
    expect(short).toBe(0)
  })

  it('kam pare to agli khep se — FEFO tarteeb mein', () => {
    const a = batch({ id: 'a', qtyLeft: 3, expiryAt: day(5) })
    const b = batch({ id: 'b', qtyLeft: 10, expiryAt: day(50) })

    const { taken, short } = takeFefo([a, b], 7)
    expect(taken).toEqual([
      { batch: a, qty: 3 },
      { batch: b, qty: 4 },
    ])
    expect(short).toBe(0)
  })

  it('🔴 khepon mein poora maal na ho to `short` bachta hai — aur ye KHARABI nahi', () => {
    /*
     * Dukan ne shayad sirf kuch maal khep ke saath daala ho, ya purana maal khep banne
     * se pehle ka ho. Bikri phir bhi hoti hai (`stockQty` us ka faisla karta hai) — bas
     * us hissay par maddat ka ishara nahi milta.
     */
    const a = batch({ id: 'a', qtyLeft: 2, expiryAt: day(5) })

    const { taken, short } = takeFefo([a], 9)
    expect(taken).toEqual([{ batch: a, qty: 2 }])
    expect(short).toBe(7)
  })

  it('koi khep hi na ho to sab kuch `short` — aur kuch nahi tootta', () => {
    const { taken, short } = takeFefo([], 5)
    expect(taken).toEqual([])
    expect(short).toBe(5)
  })
})
