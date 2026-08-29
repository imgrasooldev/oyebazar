import type { Logger } from '@oyebazar/core'
import { prisma } from '@oyebazar/db'

/**
 * Wo logger jo kharabi ko sirf logs mein nahi chhorta.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Is se pehle har `error()` `console.error` par jata tha — yani Fly ke logs mein, jise
 * koi nahi dekhta. Reseller ko raat das baje bug milta, aur pata us waqt chalta jab wo
 * shikayat karti. Aur is karobar mein wo shikayat aksar aati hi nahi: wo safha band kar
 * ke WhatsApp par wapas chali jati hai, aur hamesha ke liye.
 *
 * Ab har error `Event` table mein bhi likha jata hai, aur ops ke "Needs attention" safhe
 * par apne aap saamne aata hai — us jagah jo wo waise bhi subah kholti hai. Koi naya
 * safha, koi naya nizam, koi bahar ka vendor nahi.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** Isi naam se ops ki chhanni ise dhoondti hai. */
export const APP_ERROR_EVENT = 'app_error'

/**
 * Ek minute mein itni se zyada qataren nahi.
 *
 * 🔴 Ye hadd is poore adapter ki sab se zaroori cheez hai. Jis lamhe DB sust ho jata
 * hai, HAR request error deti hai — aur bina hadd ke un mein se har ek DB par ek AUR
 * likhne ki koshish karti, jis se wohi DB aur bethta jata. Yani ye adapter us kharabi ko
 * badhata jise wo report karne aya tha.
 *
 * Bees kaafi hai: masla dekhne ke liye do qataren bhi kaafi hoti hain, aur baqi console
 * par waise bhi mojood rehti hain.
 */
const MAX_PER_MINUTE = 20

/**
 * Ye lafz jis error mein hon, wo DB par likha hi nahi jata.
 *
 * 🔴 Wajah saaf hai: agar DB hi na chal raha ho to us par "DB nahi chal raha" likhne ki
 * koshish khud nakaam hogi — aur wo nakaami ek aur error banayegi. Ye chakkar wo hai
 * jise rokna is list ka poora maqsad hai.
 */
const NEVER_RECORD = ['prisma', 'econnrefused', 'connection', 'timeout', 'pool']

export class RecordingLogger implements Logger {
  private windowStart = 0
  private countInWindow = 0

  info(message: string, meta?: Record<string, unknown>): void {
    console.log(JSON.stringify({ level: 'info', message, ...meta }))
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    console.warn(JSON.stringify({ level: 'warn', message, ...meta }))
  }

  error(message: string, meta?: Record<string, unknown>): void {
    // Console pehle — DB par likhna is ke ILAWA hai, us ki jagah nahi
    console.error(JSON.stringify({ level: 'error', message, ...meta }))

    /*
     * 🔴 `void` — jaan boojh kar. Request is likhne ka intezar nahi karti.
     *
     * Error pehle hi ho chuka hai; us ke oopar user ko aur der karwana usay do dafa
     * saza dena hai. Aur agar ye likhna khud nakaam ho jaye to bhi kuch nahi bigadta —
     * console par wo baat mojood rehti hai.
     */
    void this.record(message, meta)
  }

  private async record(message: string, meta?: Record<string, unknown>): Promise<void> {
    try {
      if (!this.allow()) return

      const haystack = `${message} ${JSON.stringify(meta ?? {})}`.toLowerCase()
      if (NEVER_RECORD.some((word) => haystack.includes(word))) return

      await prisma.event.create({
        data: {
          name: APP_ERROR_EVENT,
          actorType: 'system',
          properties: {
            message,
            /*
             * Stack ki pehli teen satrein — poora stack Event ki har qatar ko bhaari kar
             * deta hai, aur ops ko us mein se sirf yehi teen kaam ki lagti hain. Baqi
             * console par mojood hai.
             */
            ...(typeof meta?.stack === 'string'
              ? { stack: meta.stack.split('\n').slice(0, 3).join('\n') }
              : {}),
            ...(typeof meta?.error === 'string' ? { detail: meta.error } : {}),
          },
        },
      })
    } catch {
      /*
       * Khamoshi se chhor dena — aur yahan wo bilkul theek hai.
       *
       * Is catch ka matlab ye hai ke DB par likha nahi ja saka. Us par shor machane ka
       * wahid tareeqa ek aur log likhna hota, jo phir isi raste se guzar kar phir nakaam
       * hota. Console par asal error pehle hi likha ja chuka hai.
       */
    }
  }

  /** Ek minute ki khirki — hadd se aage ki qataren chup chaap gir jati hain. */
  private allow(): boolean {
    const now = Date.now()

    if (now - this.windowStart >= 60_000) {
      this.windowStart = now
      this.countInWindow = 1
      return true
    }

    if (this.countInWindow >= MAX_PER_MINUTE) return false

    this.countInWindow += 1
    return true
  }
}
