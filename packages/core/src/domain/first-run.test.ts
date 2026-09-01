import { describe, expect, it } from 'vitest'
import { isBrandNewReseller, type FirstRunSignals } from './first-run'

const NOTHING: FirstRunSignals = {
  packsDownloaded: 0,
  ordersRunning: 0,
  ordersDelivered: 0,
  ordersAny: 0,
}

describe('isBrandNewReseller', () => {
  it('kuch bhi na kiya ho to nayi hai', () => {
    expect(isBrandNewReseller(NOTHING)).toBe(true)
  })

  /*
   * 🔴 Yehi wo qatar hai jo asal bug ko wapas nahi aane deti.
   *
   * Purani shart `packsMade === 0` par thi — aur `packsMade` wo ginti hai jo RAAT KA
   * JOB bharta hai. Pehli raat ke baad har reseller ke paas 40 pack ho jate the, is
   * liye "shuru yahan se karen" wala card KISI KO kabhi nazar nahi aaya.
   *
   * Ab wo ginti is faisle mein aati hi nahi — is signal mein us ka koi khaana hai hi
   * nahi. Jo koi usay wapas laane ki koshish karega, usay pehle ye type badalni paregi.
   */
  it('nizam ke banaye hue pack usay "purani" nahi bana dete', () => {
    // 40 pack raat ke job ne banaye, us ne ek bhi nahi uthaya
    expect(isBrandNewReseller({ ...NOTHING })).toBe(true)
  })

  it('ek pack bhi utha liya to nayi nahi rahi — wo pehla qadam hai', () => {
    expect(isBrandNewReseller({ ...NOTHING, packsDownloaded: 1 })).toBe(false)
  })

  /*
   * Order doosre raste se bhi aa sakta hai: customer public Bazaar par us ka link dekh
   * kar bhi aa sakta hai, bina us ke koi pack utha'e. Us soorat mein bhi wo nayi nahi.
   */
  it('order kisi bhi shakl mein aaya ho to nayi nahi', () => {
    expect(isBrandNewReseller({ ...NOTHING, ordersAny: 1 })).toBe(false)
    expect(isBrandNewReseller({ ...NOTHING, ordersRunning: 1 })).toBe(false)
    expect(isBrandNewReseller({ ...NOTHING, ordersDelivered: 1 })).toBe(false)
  })
})
