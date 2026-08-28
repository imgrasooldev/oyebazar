/**
 * @oyebazar/ai — wo adapter jo model se baat karte hain.
 *
 * 🔴 Yahan koi FAISLA nahi hota. Kya likha jana chahiye, kis shart par, aur nakaami par
 * kya — wo sab `packages/core` ke port aur domain mein hai (`ports/pitch.ts`,
 * `domain/pitch.ts`). Ye package sirf us port ko poora karta hai.
 *
 * Wajah wohi jo poore nizam mein hai: core framework se azad rehta hai, aur bahar ki
 * har cheez (Prisma, WhatsApp, storage, aur ab model) apne apne package mein.
 */
export { ClaudePitchWriter, createPitchWriter } from './claude-pitch-writer'
export type { ClaudePitchWriterOptions } from './claude-pitch-writer'
export { hasAmount, withoutAmounts } from './no-amounts'
