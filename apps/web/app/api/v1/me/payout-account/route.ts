import { z } from 'zod'
import { buildPayoutAccount, PAYOUT_METHODS } from '@oyebazar/core'
import { ValidationError } from '@oyebazar/shared'
import { apiHandler, parseBody } from '@/lib/api/handler'
import { requireReseller } from '@/lib/api/session'
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
 * PUT /api/v1/me/payout-account — "میرا پیسہ یہاں بھیجیں".
 *
 * 🔴 Ye endpoint us khaane ko zinda karta hai jo MAHINON se mara hua para tha.
 * `Reseller.payoutAccount` schema mein tha aur `maskAccount()` se parha bhi jata tha —
 * magar likhne ka koi rasta kahin nahi tha. Us ka anjaam dukan ke safhe par tha:
 * "صادیہ · Rs 750" likha aata tha aur "kahan bhejna hai" kabhi nahi.
 *
 * 🔴 DELETE alag se nahi hai, aur ye jaan boojh kar: khata BADALNA aam kaam hai,
 * HATANA nadir. Do endpoint ka matlab hota ke UI ko dono ka farq sambhalna parta, aur
 * "khali kar ke save" wala qudrati amal chup chaap purana khata chhor jata — yani
 * reseller samajhti ke hata diya aur paisa purane, band ho chuke wallet mein jata
 * rehta. Khali `number` bhejna yahan saaf ghalti hai, aur wo usay dikhti hai.
 */
export async function PUT(request: Request) {
  return apiHandler(async () => {
    const { reseller } = await requireReseller()
    const body = await parseBody(request, BodySchema)

    const built = buildPayoutAccount({
      method: body.method,
      number: body.number,
      title: body.title,
      bankName: body.bankName ?? null,
    })

    if (!built.ok) throw new ValidationError(PROBLEM_MESSAGE[built.problem])

    const saved = await container.repositories.resellers.savePayoutAccount(
      reseller.id,
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
      actorType: 'reseller',
      actorId: reseller.id,
      properties: { method: built.account.method },
    })

    return {
      ok: true,
      account: saved.payoutAccount,
      updatedAt: saved.payoutUpdatedAt?.toISOString() ?? null,
    }
  })
}
