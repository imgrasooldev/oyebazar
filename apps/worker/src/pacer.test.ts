import { describe, expect, it } from 'vitest'
import { TokenBucketPacer } from './pacer'

/**
 * Ye test asal waqt naapta hai (fake timers se token bucket ka matlab hi nahi rehta).
 * Isliye chhoti raftaar aur chhoti tadaad — chand sau milliseconds mein poora ho jata hai.
 */
describe('TokenBucketPacer', () => {
  it('shuru mein poora bucket foran mil jata hai (burst)', async () => {
    const pacer = new TokenBucketPacer(50, 0)
    const startedAt = Date.now()

    for (let i = 0; i < 50; i++) await pacer.wait()

    expect(Date.now() - startedAt).toBeLessThan(120)
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

    for (let i = 0; i < 10; i++) await pacer.wait()

    // 10 messages × 0-20ms jitter — 200ms se zyada nahi hona chahiye
    expect(Date.now() - startedAt).toBeLessThan(400)
  })
})
