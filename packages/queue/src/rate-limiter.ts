/**
 * Rate limiter — Redis par, sab machinon ke liye ek.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Is se pehle ye limiter machine ki apni memory mein tha (`InMemoryRateLimiter`), aur
 * us ki apni file mein likha hua tha: "sirf DEV ke liye". Do kharabiyan us se nikalti
 * thin, aur dono asli hain:
 *
 *  1. Har deploy aur har restart par SAARI haddein saaf ho jati thin. Yani jo banda
 *     hadd par pohanch chuka ho, wo agle deploy ka intezar kar ke dobara shuru ho jata.
 *  2. Do machine chalane par har machine ka apna counter hota — hadd chup chaap DUGNI
 *     ho jati, aur kisi ko pata bhi na chalta.
 *
 * 🔴 Aur ye us din mehnga ho jata hai jis din WhatsApp ka provider jurta hai: har OTP
 * ek PAID template message hai. Us waqt hadd ka toot na wo cheez nahi rehti jo sirf
 * server ko bachati hai — wo seedha bill par lagti hai.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import type { Redis } from 'ioredis'
import type { RateLimiter } from '@oyebazar/core'

/**
 * INCR + EXPIRE — ek hi chakkar mein, aur atomic.
 *
 * 🔴 `INCR` phir alag se `EXPIRE` likhna wo masla hal nahi karta jo dekhne mein hal lagta
 * hai: do hukmon ke DARMIYAN process mar jaye to key hamesha ke liye baqi reh jati hai
 * aur us banda dobara kabhi andar nahi aata. Isi liye dono ek hi script mein hain —
 * Redis usay poora chalata hai ya bilkul nahi.
 *
 * Jawab: [kitni dafa ho chuka, kitne millisecond baqi hain]
 */
const SCRIPT = `
local hits = redis.call('INCR', KEYS[1])
if hits == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
return { hits, redis.call('PTTL', KEYS[1]) }
`

export class RedisRateLimiter implements RateLimiter {
  constructor(private readonly redis: Redis) {}

  async consume(
    key: string,
    limit: number,
    windowMs: number,
  ): Promise<{ allowed: boolean; retryAfterMs: number }> {
    const [hits, ttl] = (await this.redis.eval(
      SCRIPT,
      1,
      `rl:${key}`,
      String(windowMs),
    )) as [number, number]

    if (hits <= limit) return { allowed: true, retryAfterMs: 0 }

    /*
     * TTL manfi bhi aa sakti hai (key theek us lamhe mari jab hum poochh rahe the). Us
     * soorat mein poora window bata dete hain — thora zyada intezar karwa dena us se
     * behtar hai ke "abhi dobara koshish karen" keh kar phir mana kar diya jaye.
     */
    return { allowed: false, retryAfterMs: ttl > 0 ? ttl : windowMs }
  }
}
