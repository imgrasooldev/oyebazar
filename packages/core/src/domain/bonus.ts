/**
 * Bonus ke qaide — POORE system ka wahid sach.
 *
 * 🔴 Ye raqmen yahan is liye hain ke ye HAMARA KHARCHA hain, aur kharche ka faisla ek
 * jagah dikhna chahiye. Bees hazar reseller par signup bonus ek karor rupay ka waada
 * hai; wo number kisi service ke andar chhupa hua nahi hona chahiye jahan usay badalne
 * ke liye pehle dhoondna pare.
 */

/**
 * Nayi reseller ko har POHANCHE hue order par.
 *
 * 🔴 "Pohanche hue" par — lagaye hue par NAHI, aur ye shart is poore feature ki jaan
 * hai. Lagaye hue order par dena ye rasta khol deta hai: account banao, apne hi number
 * par das order lagao, cancel kar do, paanch sau le lo. Ye koi farzi khadsha nahi — ye
 * pehli cheez hai jo koi bhi aazmayega.
 *
 * DELIVERED ka matlab hai courier gaya, customer ne maal liya, aur cash wasool hua. Us
 * par bonus dena ek asli bikri ka inaam hai, ek button dabane ka nahi.
 */
export const SIGNUP_BONUS_PER_ORDER = 50

/** Itne orderon tak — us ke baad signup bonus khatam (50 × 10 = 500). */
export const SIGNUP_BONUS_ORDERS = 10

/** Poora signup bonus — sirf dikhane ke liye ("Rs 500 tak kama sakti hain"). */
export const SIGNUP_BONUS_TOTAL = SIGNUP_BONUS_PER_ORDER * SIGNUP_BONUS_ORDERS

/**
 * Bulane wali ko — bulai hui behen ke PEHLE pohanche hue order par, ek dafa.
 *
 * 🔴 Us ke register karne par nahi. Register karna muft hai aur ek phone number ki baat
 * hai; us par paisa dene ka matlab hota ke log number khareed kar account banate. Pehla
 * DELIVERED order wo sab se sasti sharat hai jo jhoot se poori nahi ki ja sakti: us ke
 * liye ek asli customer, asli maal aur asli cash chahiye.
 */
export const REFERRAL_BONUS = 100

/**
 * Is order par signup bonus banta hai ya nahi.
 *
 * `deliveredCount` mein ye order KHUD shamil hai — yani pehle delivered order par ye 1
 * hota hai. Alag rakhne se har bulane wali jagah ek jama/tafreeq karni parti, aur wohi
 * jagah hai jahan ek din ek jagah galti reh jati hai.
 */
export function signupBonusFor(deliveredCount: number): number {
  return deliveredCount >= 1 && deliveredCount <= SIGNUP_BONUS_ORDERS ? SIGNUP_BONUS_PER_ORDER : 0
}
