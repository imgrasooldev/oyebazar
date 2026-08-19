import { describe, expect, it } from 'vitest'
import { TokenBucketPacer } from './pacer'

/**
 * Ye test asal waqt naapta hai (fake timers se token bucket ka matlab hi nahi rehta).
 * Isliye chhoti raftaar aur chhoti tadaad — chand sau milliseconds mein poora ho jata hai.
 *
 * 🔴 Upar wali haddein jaan boojh kar kushada hain. `pnpm test` par aath package ek saath
 * chalte hain; us dabao mein event loop 10 await par 400ms se aage nikal jata tha aur ye
 * test kabhi kabhi laal ho jata tha. Aisa test khatarnak hai — log usay "flaky" keh kar
 * dekhna chhor dete hain, aur jis din wo asli kharabi par laal hoga us din bhi koi nahi
 * dekhega. Hadd itni rakhi hai ke asli regression (jitter second mein, ya rok hi na
 * lagna) phir bhi pakri jaye.
 */
describe('TokenBucketPacer', () => {
  it('shuru mein poora bucket foran mil jata hai (burst)', async () => {
    const pacer = new TokenBucketPacer(50, 0)
    const startedAt = Date.now()

    for (let i = 0; i < 50; i++) await pacer.wait()

    // Burst foran milna chahiye — 500ms tab bhi bohot hai, magar dabao mein bachao hai
    expect(Date.now() - startedAt).toBeLessThan(500)
  })

  it('🔴 bucket khatam hone par raftaar rok deta hai', async () => {
    const pacer = new TokenBucketPacer(50, 0)
    const startedAt = Date.now()

    // 50 burst + 25 aur = kam az kam ~500ms lagne chahiyen
    for (let i = 0; i < 75; i++) await pacer.wait()

    const elapsed = Date.now() - startedAt
    expect(elapsed).toBeGreaterThan(350)
  })

  it('jitter waqt barhata hai magar messages phir bhi jate hain', async () => {
    const pacer = new TokenBucketPacer(100, 20)
    const startedAt = Date.now()

    let sent = 0
    for (let i = 0; i < 10; i++) {
      await pacer.wait()
      sent += 1
    }

    // Asal baat: jitter kisi message ko rokta nahi
    expect(sent).toBe(10)

    /*
     * 10 messages × 0-20ms jitter = 200ms. Do second ki hadd is liye ke asli kharabi
     * (jitter milliseconds ki jagah second mein lag jaye) yahan bhi pakri jaye, magar
     * mashin ka bojh isay laal na kar sake.
     */
    expect(Date.now() - startedAt).toBeLessThan(2_000)
  })
})
