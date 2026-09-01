import { z } from 'zod'
import { buildPayoutAccount, PAYOUT_METHODS } from '@oyebazar/core'
import { ValidationError } from '@oyebazar/shared'
import { apiHandler, parseBody } from '@/lib/api/handler'
import { requireSupplier } from '@/lib/api/supplier-session'
import { container } from '@/lib/container'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/*
 * 🔴 Yahan sirf SHAKAL ki jaanch hai, MATLAB ki nahi.
 *
 * Zod ye tay karta hai ke matn hai aur kitna lamba hai; ye ke `03001234567` ek jaiz
 * EasyPaisa number hai aur `PK36SCBL…` nahi — wo faisla `buildPayoutAccount()` ka hai,
 * yani domain ka. Dono jagah qaida likhna us din phansta hai jis din wo alag ho jate
 * hain, aur wo din hamesha aata hai.
 */
const BodySchema = z
  .object({
    method: z.enum(PAYOUT_METHODS as unknown as [string, ...string[]]),
    number: z.string().trim().min(1).max(40),
    title: z.string().trim().min(1).max(80),
    bankName: z.string().trim().max(80).optional(),
  })
  .strict()

/** Khaana kharab ho to reseller ki apni zaban mein — angrezi "invalid input" bekar hai. */
const PROBLEM_MESSAGE = {
  method: 'یہ طریقہ ہم نہیں جانتے — ایزی پیسہ، جاز کیش، راست یا بینک چنیں',
  number:
    'نمبر ٹھیک نہیں لگ رہا۔ ایزی پیسہ/جاز کیش/راست پر موبائل نمبر لکھیں (مثلاً 03001234567)، بینک پر IBAN یا اکاؤنٹ نمبر۔',
  title: 'اکاؤنٹ کا نام لکھیں — وہی جو آپ کی ایپ میں آتا ہے۔ ہول سیلر یہی نام ملاتا ہے۔',
  bankName: 'بینک کا نام لکھیں۔ (ایزی پیسہ/جاز کیش/راست پر بینک کا نام نہیں لکھنا۔)',
} as const

/**
 * PUT /api/v1/supplier/payout-account — dukan ka apna khata.
 *
 * 🔴 Dukan ko hum paisa BHEJTE nahi (COD mein wo khud wusool karti hai), phir bhi ye
 * khaana hai — aur wajah asli hai: wapsi aur adjustment mein paisa kahin jana hota hai,
 * aur fee ka bill kis khate se aaya ye ops ko chahiye hota hai. Dono baat aaj tak
 * WhatsApp par poochi jati thi.
 *
 * 🔴 Purana `Supplier.bankAccount` khaana isi migration mein MITA diya gaya: wo kabhi
 * likha nahi jata tha aur zinda dikhta tha — CLAUDE.md §5 wali theek wohi soorat jis se
 * ye poora feature shuru hua.
 */
export async function PUT(request: Request) {
  return apiHandler(async () => {
    const { supplier } = await requireSupplier()
    const body = await parseBody(request, BodySchema)

    const built = buildPayoutAccount({
      method: body.method,
      number: body.number,
      title: body.title,
      bankName: body.bankName ?? null,
    })

    if (!built.ok) throw new ValidationError(PROBLEM_MESSAGE[built.problem])

    await container.repositories.suppliers.savePayoutAccount(
      supplier.id,
      built.account,
      container.clock.now(),
    )

    /*
     * 🔴 Sirf KHABAR, khata nahi.
     *
     * `method` jata hai, number kabhi nahi. Analytics ka record der tak rehta hai aur
     * us tak wo log pohanchte hain jinhen khate se koi kaam nahi. Jo sawal is record se
     * poochha jayega wo "kitne logon ne khata bhara" aur "kaun sa tareeqa chalta hai"
     * hai — dono ka jawab bina number ke mil jata hai.
     */
    await container.analytics.track({
      name: 'payout_account_saved',
      actorType: 'supplier',
      actorId: supplier.id,
      properties: { method: built.account.method },
    })

    return { ok: true, account: built.account }
  })
}
