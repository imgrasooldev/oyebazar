/**
 * Status ke lafz — tasveer ke saath kya likha jaye.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Ye `buildCaption` se ALAG cheez hai — aur ye farq samajhna zaroori hai.
 *
 * `buildCaption` (shared/pack-kit.ts) wo dhancha likhta hai jo har maal par ek jaisa
 * hota hai: naam, rate, number, delivery, hashtag. Wo kaam mukammal hai aur us mein AI
 * ki koi zaroorat nahi — wo qadrein hamare paas pehle se hain.
 *
 * Ye us KE ANDAR ki cheez hai: wo do-teen jumle jo maal ko BECHTE hain. "سردیوں کے لیے
 * بہترین، رنگ پکا، دھونے سے نہیں اترتا" — ye hamare kisi khane mein likha hua nahi hai,
 * aur yehi wo qadam hai jahan reseller ruk jati hai. Tasveer hum bana dete hain, rate
 * hum likh dete hain, aur phir wo khali jagah dekh kar status lagaye baghair chali jati
 * hai.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * 🔴 Do adapter is port ke peechay hain aur DONO asli hain:
 *
 *   · `TemplateePitchWriter` — hamare apne khanon se (category, naam ka lawaahiq, sheher,
 *     stock). Ye har waqt chalta hai, muft hai, aur ek jaisa jawab deta hai.
 *   · Claude wala — jab `ANTHROPIC_API_KEY` mojood ho. Behtar lafz, magar har tasveer
 *     par paisa aur do second.
 *
 * Pehla khali jagah bharne ke liye kaafi hai; doosra usay achha karta hai. Reseller ko
 * dono soorat mein kuch na kuch milta hai — aur yehi asal shart hai: agar model band ho
 * jaye to safha wahi ka wahi khali nahi hona chahiye.
 */

/** Ek maal ke bare mein wo sab jo lafz likhne ke liye kaafi hai. */
export interface PitchInput {
  readonly titleUr: string
  readonly titleEn: string
  readonly categoryNameUr: string
  readonly categoryNameEn: string
  /** Dukan ka sheher — "لاہور سے" likhna bharosa deta hai */
  readonly city: string
  /** Reseller ka apna rate — lafzon mein raqam kabhi nahi aati, dekhen neeche */
  readonly hasStock: boolean
  /** Maal ki apni tafseel, agar dukan wale ne likhi ho */
  readonly descriptionUr?: string | null | undefined
  /** Kis likhawat mein — reseller ne app mein jo chuni hai */
  readonly script: 'ur' | 'roman'
}

export interface PitchWriter {
  /**
   * Teen jumle — reseller un mein se chunti hai.
   *
   * 🔴 Teen, ek nahi. Ek jumla dene ka matlab hai "yehi likho", aur wo har reseller ke
   * har maal par ek jaisa status bana deta hai — jo us ke customers ko foran mashini
   * lagta hai. Teen mein se chunna us ki apni awaz baqi rakhta hai.
   *
   * 🔴 Jumlon mein RAQAM kabhi nahi. Rate `buildCaption` likhta hai, snapshot se; agar
   * ye bhi rate likhne lage to do jagah do alag raqam ban sakti hain — aur us ki qeemat
   * reseller apne customer ke saamne bhugatti hai.
   */
  forProduct(input: PitchInput): Promise<readonly string[]>
}
