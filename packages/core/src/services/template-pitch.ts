/**
 * Template wala `PitchWriter` — port aur domain ke beech ka jorh.
 *
 * `templatePitch` ek saada function hai (domain), aur `PitchWriter` ek port. Ye teen
 * satrein un dono ko milati hain taake container ko andar ki tafseel na dekhni pare.
 *
 * 🔴 Ye "AI na hone ki soorat mein" wala sasta badal NAHI hai — ye bunyad hai. Har waqt
 * chalta hai, ek paisa kharch nahi, har dafa wohi jawab, aur us ka test likha ja sakta
 * hai. Claude wala adapter is ke lafz behtar karta hai, is ki jagah nahi leta.
 */
import { templatePitch } from '../domain/pitch'
import type { PitchInput, PitchWriter } from '../ports/pitch'

export function templatePitchWriter(): PitchWriter {
  return {
    async forProduct(input: PitchInput) {
      return templatePitch(input)
    },
  }
}
