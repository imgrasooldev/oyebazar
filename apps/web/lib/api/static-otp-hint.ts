/**
 * Muqarrar (static) OTP ko login ke safhe par dikhane ke liye.
 *
 * 🔴 PRODUCTION MEIN AB YE KUCH NAHI DETA — aur wajah is file ke apne purane comment
 * mein likhi hui thi: ye rasta sirf "us arse ke liye" tha "jab tak site ka pata girey
 * huay logon tak na ho".
 *
 * Wo arsa khatam ho chuka. Site `oyebazar.com` par live hai, bazaar bina login ke khula
 * hai aur Google par jata hai. Live jaanch kar dekha:
 *
 *     POST /api/v1/auth/otp/request  {"phone": "<koi bhi number>"}
 *     → {"ok":true, ..., "staticOtp":"112233"}
 *
 * Yani koi bhi shakhs, kisi bhi reseller ya dukan ke number par, code MAANG kar sakta
 * tha — aur hum khud usay de rahe the.
 *
 * 🔴 Ye hifazat `STATIC_OTP` ke saath NAHI bandhi gayi, `NODE_ENV` ke saath bandhi hai.
 *
 * Purana tareeqa ye tha ke "switch khali karte hi ailan bhi band". Wo saaf lagta hai
 * magar us ka matlab ye hai ke jab tak switch laga hai, ailan bhi laga hai — yani theek
 * us waqt jab khatra mojood ho, us ka pata bhi aam ho. Ab dono alag hain: switch team ki
 * sahulat hai, ailan bilkul band.
 *
 * Ye MASLE KA HAL NAHI, sirf us ka aelan band karna hai. Asal hal do qadam hai, aur
 * dono is code se bahar:
 *
 *   1. `WHATSAPP_PROVIDER` set ho, taake asli OTP waqai pohanche
 *   2. Us ke BAAD `STATIC_OTP` hataya jaye
 *
 * 🔴 Tarteeb ulti karna khud ko bahar kar dena hai: bina provider ke `STATIC_OTP` hatate
 * hi kisi ko koi code nahi milega — team ko bhi nahi.
 *
 * Ye `dev-otp.ts` se alag hai: `devOtpFor` ASLI bheja hua code dikhata hai (aur wo
 * production mein hamesha undefined hai). **Ops (admin) is se BAHAR hai** — dekhen
 * container.ts; wahan ka code waise hi random rehta hai.
 */
export function staticOtpHint(): string | undefined {
  if (process.env.NODE_ENV === 'production') return undefined

  const code = process.env.STATIC_OTP?.trim()
  return code ? code : undefined
}
