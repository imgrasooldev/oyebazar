/**
 * Muqarrar (static) OTP ko login ke safhe par dikhane ke liye.
 *
 * Ye `dev-otp.ts` se JAAN BOOJH KAR alag hai, aur farq samajhna zaroori hai:
 *
 *   · `devOtpFor` NODE_ENV par bandh hai — production mein hamesha undefined. Wo asli
 *     OTP hai jo bhej diya gaya, aur us ka production mein dikhna hadsa hoga.
 *   · Ye wala `STATIC_OTP` par bandh hai — yani us switch par jo pehle se hifazat ka
 *     darwaza khol chuka hai. Ye koi naya raaz nahi kholta: jo code yahan chhapta hai,
 *     wohi code us switch ki wajah se HAR number par pehle se chal raha hai.
 *
 * 🔴 Phir bhi ye risk barhata hai, aur ye baat chhupani nahi chahiye: pehle code sirf
 * usay pata tha jise team ne khud bataya. Ab wo safhe par hai — yani jo bhi login ka
 * safha khole, wo kisi bhi mojood reseller ya dukan ke number se andar aa sakta hai.
 * Sirf us arse ke liye jab tak site ka pata girey huay logon tak na ho.
 *
 * Do cheezein jaan boojh kar aisi hain:
 *
 *   · `STATIC_OTP` khali karte hi ye khud ba khud gayab ho jata hai. Jo switch khatra
 *     paida karta hai, wohi switch us ka ailan bhi band karta hai — do jagah yaad
 *     rakhne ki zaroorat nahi.
 *   · **Ops (admin) is se BAHAR hai** — dekhen container.ts. Wahan ka code waise hi
 *     random rehta hai, is liye ye value wahan kaam bhi nahi karti aur bheji bhi nahi
 *     jati. Us darwaze ko is tarah kholna bilkul alag darja ka khatra hai.
 */
export function staticOtpHint(): string | undefined {
  const code = process.env.STATIC_OTP?.trim()
  return code ? code : undefined
}
