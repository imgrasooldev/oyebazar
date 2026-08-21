import type { TokenGenerator } from '@oyebazar/core'

/**
 * Ek muqarrar (static) OTP — sirf soft launch ke liye.
 *
 * 🔴 Ye hifazat ka darwaza thora sa khol deta hai, aur ye baat chhupani nahi chahiye:
 * jo bhi ye code jaan le, wo **kisi bhi mojood number** se andar aa sakta hai. Code
 * badalta bhi nahi, is liye ek dafa leak ho jaye to hamesha ke liye khula rehta hai.
 *
 * Phir bhi is ki jagah hai: WhatsApp abhi laga nahi, aur us ke baghair OTP kisi tak
 * pohanchta hi nahi — yani koi bhi andar nahi aa sakta, na dukan wala na reseller. Ek
 * muqarrar code us se behtar hai, magar sirf us arse ke liye jab tak site ka pata
 * girey huay logon tak na ho.
 *
 * Teen cheezein jaan boojh kar waise hi rehti hain (aur inhen hatana nahi chahiye):
 *
 *  · **Sirf `numericCode` badalta hai.** Session ke token aur dukan ke magic link waise
 *    hi crypto-random rehte hain — un ka andaza lagana ab bhi namumkin hai.
 *  · **Challenge phir bhi asli hai:** us ki mudat (5 minute), ghalat koshishon ki hadd,
 *    aur rate limit — teenon lagti hain. Sirf code ka andaza lagaya ja sakta hai.
 *  · **Ops (admin) is se BAHAR hai** — dekhen container.ts. Wahan poora paisa aur sab
 *    ka data hai; us darwaze ko muqarrar code par kholna us se bilkul alag darja ka
 *    khatra hai. Ops ka code waise hi random rehta hai aur logs se parha jata hai.
 */
export class StaticOtpTokens implements TokenGenerator {
  constructor(
    private readonly inner: TokenGenerator,
    private readonly code: string,
  ) {}

  numericCode(length: number): string {
    /*
     * Lambai ka mel zaroori hai: form 6 khaane dikhata hai. Chhota code diya jaye to
     * banda bhar hi nahi paata, aur wajah usay kabhi nazar nahi aati.
     */
    return this.code.length === length ? this.code : this.inner.numericCode(length)
  }

  randomToken(bytes?: number): string {
    return this.inner.randomToken(bytes)
  }

  hash(value: string): string {
    return this.inner.hash(value)
  }

  verifyHash(value: string, hash: string): boolean {
    return this.inner.verifyHash(value, hash)
  }
}
