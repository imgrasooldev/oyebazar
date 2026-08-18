/**
 * SupplierOnboardingService — nayi dukan ki darkhwast.
 *
 * Wholesaler form bharta hai, ops team dekhti hai, aur phir manzoori deti hai ya rabta
 * kar ke baqi tafseel mukammal karti hai. Ye khud-ba-khud chalu NAHI hota — reseller ke
 * self-signup se yehi bunyadi farq hai:
 *
 *  · Reseller ka ghalat hona sasta hai — us ke paas dikhane ko kuch nahi hota jab tak
 *    order na kare, aur order reseller ki apni tasdeeq ke baghair aage nahi barhta.
 *  · Ghalat wholesaler poori directory ka bharosa le doobta hai: us ka maal resellers
 *    apne status par lagati hain, customer paisa dete hain, aur maal aata hi nahi.
 *
 * Isi liye darkhwast hamesha PENDING banti hai aur bazaar se bahar rehti hai. Chalu
 * karne ka faisla AdminService mein hai (MANAGER ya upar), yahan nahi.
 */
import { RateLimitedError } from '@oyebazar/shared'
import type {
  SupplierAccountRepository,
  SupplierApplication,
} from '../ports/supplier-portal-repositories'
import type { Analytics, Logger, MessagingProvider, RateLimiter } from '../ports/infrastructure'

export interface ApplicationResult {
  /** UI ko hamesha yehi milta hai — chahe nayi darkhwast bani ho ya number pehle se ho. */
  readonly received: true
}

export class SupplierOnboardingService {
  constructor(
    private readonly suppliers: SupplierAccountRepository,
    private readonly messaging: MessagingProvider,
    private readonly rateLimiter: RateLimiter,
    private readonly analytics: Analytics,
    private readonly logger: Logger,
  ) {}

  /**
   * @returns hamesha `received` — chahe darkhwast nayi ho ya number pehle se mojood.
   *
   * 🔴 Jawab dono soorton mein ek jaisa hai. "Ye number pehle se registered hai" batana
   * kisi ko bhi ye maloom karne ka zariya de deta hai ke kaun si dukan hamare saath hai,
   * aur mandi mein wo maloomat muqable ke kaam aati hai.
   */
  async apply(input: SupplierApplication, ip: string): Promise<ApplicationResult> {
    // Ek IP se ginti ki darkhwastein — form khula hua hai, aur khule form par spam aata hai
    const limit = await this.rateLimiter.consume(`supplier-apply:${ip}`, 5, 60 * 60 * 1000)
    if (!limit.allowed) throw new RateLimitedError(undefined, limit.retryAfterMs)

    const existing = await this.suppliers.findAccountByPhone(input.phoneE164)
    if (existing) {
      // Naya row nahi banate (phone unique hai) — magar ops ko pata chalna chahiye ke
      // is number se dobara koshish hui, shayad wo intezar kar rahe hain
      this.logger.info('supplier_application_duplicate', { phone: input.phoneE164 })
      await this.analytics.track({
        name: 'supplier_application_duplicate',
        actorType: 'system',
        properties: { city: input.city },
      })
      return { received: true }
    }

    const created = await this.suppliers.createApplication(input)

    await this.messaging
      .sendText({
        to: input.phoneE164,
        body: `${input.businessName} — aap ki darkhwast mil gayi hai. OyeBazar ki team jald rabta karegi.`,
      })
      // Paighaam na jaye to darkhwast zaya na ho — wo DB mein mehfooz hai aur ops
      // usay portal mein dekh legi
      .catch((error: unknown) => {
        this.logger.warn('supplier_application_sms_failed', {
          supplierId: created.id,
          error: error instanceof Error ? error.message : String(error),
        })
      })

    await this.analytics.track({
      name: 'supplier_application_received',
      actorType: 'system',
      properties: { supplierId: created.id, city: input.city },
    })
    this.logger.info('supplier_application_received', {
      supplierId: created.id,
      businessName: input.businessName,
      city: input.city,
    })

    return { received: true }
  }
}
