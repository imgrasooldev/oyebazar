/**
 * Ops ki chhanni — kya cheez waqai nazar maangti hai.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Masla kya hai
 *
 * Ops ke paas nau safhe hain aur har safhe par ek list. Sab kuch dekha ja sakta hai,
 * magar KUCH bhi khud saamne nahi aata: jhagre wali payout, do dafa chhapa hua maal,
 * wo rate jis mein ek sifar reh gaya, wo order jis ka jawab dukan ne teen din se nahi
 * diya — ye sab wahin pare rehte hain jab tak koi jaan boojh kar na dhoondhe. Aur ops
 * ka banda subah wo safha kholta hai jo us ne kal khola tha.
 *
 * Ye file wo poochhti hai jo koi nahi poochh raha: "abhi is waqt kya galat hai?"
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * 🔴 Yahan koi AI nahi hai, aur ye kami nahi hai.
 *
 * In mein se saat sawal ginti ke hain — "kitne din guzre", "kitna guna zyada", "kitni
 * dafa badla". Aisi cheez par model lagana usay sirf sust, mehnga aur na-qabil-e-test
 * banata hai. Model ka faida sirf ek jagah hai (be-tuke naam — jahan sawal maani ka
 * hai), aur wahan bhi qaida pehle chalta hai: jo qaide se pakra jaye us par model
 * chalane ka koi matlab nahi.
 *
 * 🔴 Har nishan ke saath us ke NUMBER jate hain, sirf darja nahi. "Zyada ahem" par ops
 * kuch nahi kar sakta; "9 din se baqaya, Rs 4,200" par wo phone utha leta hai. Wahi
 * soch `rto-risk.ts` ke `reasons` par bhi hai.
 */

/** Kis qism ka masla. */
export type FlagKind =
  /** Reseller keh rahi hai paise nahi mile */
  | 'payoutDisputed'
  /** Dukan ki apni shart guzar gayi aur paisa abhi tak nahi gaya */
  | 'payoutOverdue'
  /** Dukan ne order ka jawab hi nahi diya — customer intezar mein hai */
  | 'orderUnanswered'
  /** Ek hi dukan par wohi maal do dafa */
  | 'duplicateProduct'
  /** Maal kisi khaane mein nahi — "باقی مال" mein para hai */
  | 'uncategorised'
  /** Rate apni category se bohat door — aksar ek sifar ka farq */
  | 'oddPrice'
  /** Naam aisa jis se maal pehchana hi nahi ja sakta */
  | 'oddTitle'
  /** Ginti baar baar haath se badli ja rahi hai */
  | 'stockChurn'

export type FlagSeverity = 'high' | 'medium' | 'low'

export type FlagSubject =
  | 'order'
  | 'payout'
  | 'product'
  | 'supplier'
  | 'reseller'
  | 'variant'

export interface OpsFlag {
  readonly kind: FlagKind
  readonly severity: FlagSeverity
  readonly subject: FlagSubject
  /** Kis cheez ki id — safha isi se rasta banata hai */
  readonly id: string
  /** Insan ke parhne ke liye — order ka number, maal ka naam, dukan ka naam */
  readonly label: string
  /** Doosri satar — dukan ka naam, reseller ka naam. Khali ho sakti hai. */
  readonly context: string | null
  /** Jumle mein bharne wale numbers — lafz safhe par bante hain, yahan nahi */
  readonly values: Readonly<Record<string, number | string>>
  /**
   * Kab se ye masla khara hai.
   *
   * 🔴 Tarteeb ka DOOSRA pemana yehi hai (pehla darja). Ek jaise do maslon mein purana
   * pehle — warna nayi cheezein hamesha upar aati rehti hain aur purani hamesha neeche,
   * yani jo cheez sab se zyada nazar-andaz hui hai wo sab se zyada nazar-andaz hoti rehti.
   */
  readonly since: Date
}

// ------------------------------------------------------------------ haddein

/** Dukan ke jawab ka intezar — is se aage masla hai. */
export const ORDER_ANSWER_HOURS = 24
/** Aur is se aage sar par khara masla. */
export const ORDER_ANSWER_HOURS_HIGH = 48

/**
 * Rate ka farq — category ke darmiyane se kitna guna.
 *
 * 🔴 Das guna par `high`, aur wo number ittefaqan nahi chuna: rate ki sab se aam ghalti
 * ek sifar ki hoti hai (1200 ki jagah 12000, ya 120). Us ek ghalti ka nuqsan bhi sab se
 * bara hai — reseller apna retail rate us par bandh kar status laga chuki hoti hai.
 */
export const PRICE_ODD_HIGH = 10
export const PRICE_ODD_MEDIUM = 4

/** Tees din mein itni dafa haath se ginti badalna — kuch to hai. */
export const CHURN_FIXES = 5

/** Naam is se chhota ho to us se maal pehchana nahi ja sakta. */
export const MIN_TITLE_LENGTH = 6

// ------------------------------------------------------- har check ka darja

/** Payout ka jhagra — hamesha sab se upar. Yahan do log aur asli paisa phansa hua hai. */
export function payoutDisputedSeverity(): FlagSeverity {
  return 'high'
}

/**
 * Baqaya payout — shart se kitna aage nikal gaya.
 *
 * Shart ka SNAPSHOT (`termDays`) chalta hai, dukan ki mojooda shart nahi — warna 10 din
 * ka baqaya khara hone par dukan apni shart 15 din kar ke apna record saaf kar leti.
 * Wahi wajah `ResellerPayout.termDays` ke wujood ki hai.
 */
export function payoutOverdueSeverity(daysLate: number): FlagSeverity | null {
  if (daysLate <= 0) return null
  if (daysLate >= 7) return 'high'
  if (daysLate >= 3) return 'medium'
  return 'low'
}

export function orderUnansweredSeverity(hoursWaiting: number): FlagSeverity | null {
  if (hoursWaiting < ORDER_ANSWER_HOURS) return null
  return hoursWaiting >= ORDER_ANSWER_HOURS_HIGH ? 'high' : 'medium'
}

/**
 * Rate kitna ajeeb hai — category ke darmiyane ke muqable mein.
 *
 * Dono taraf barabar dekha jata hai (das guna zyada, aur das-wan hissa) kyunke sifar
 * ki ghalti dono taraf hoti hai — aur "bohat sasta" wali ghalti zyada khatarnak hai:
 * us par order aa jate hain aur dukan ko nuqsan par bhejna parta hai.
 */
export function oddPriceSeverity(price: number, categoryMedian: number): FlagSeverity | null {
  // Darmiyana hi na ho to kisi se moqabla nahi — nayi category par har rate ajeeb lagta
  if (categoryMedian <= 0 || price <= 0) return null

  const times = price >= categoryMedian ? price / categoryMedian : categoryMedian / price
  if (times >= PRICE_ODD_HIGH) return 'high'
  if (times >= PRICE_ODD_MEDIUM) return 'medium'
  return null
}

/** Kitne guna — safhe par likhne ke liye, ek dashmalav tak. */
export function priceTimes(price: number, categoryMedian: number): number {
  if (categoryMedian <= 0 || price <= 0) return 0
  const times = price >= categoryMedian ? price / categoryMedian : categoryMedian / price
  return Math.round(times * 10) / 10
}

export function stockChurnSeverity(fixes: number): FlagSeverity | null {
  if (fixes < CHURN_FIXES) return null
  return fixes >= CHURN_FIXES * 2 ? 'medium' : 'low'
}

// --------------------------------------------------------------- naam ki jaanch

/** Naam kyun mashkook hai — safhe par wajah isi se likhi jati hai. */
export type TitleProblem =
  | 'tooShort'
  | 'hasPhone'
  | 'mostlyDigits'
  | 'placeholder'
  | 'repeatedChars'

/** Aise lafz jo tajurbe ki nishani hain, maal ke naam ki nahi. */
const PLACEHOLDERS = ['test', 'testing', 'demo', 'sample', 'asdf', 'qwerty', 'abc', 'xxx', 'new item', 'untitled']

/**
 * Naam par ek saada jaanch — model se pehle.
 *
 * 🔴 Ye "AI ka sasta badal" nahi hai. Ye wo chhanni hai jo model ko chalane se PEHLE
 * lagti hai: jo naam yahan pakra jaye us par model chalane ka koi matlab nahi (jawab
 * pehle se maloom hai), aur jo yahan se guzar jaye usi par kharcha karna banta hai.
 *
 * 🔴 Aur ye jaan boojh kar TANG hai — sirf wo cheezein jin par koi ikhtilaf nahi ho
 * sakta. "Naam achha nahi lag raha" wali raye yahan nahi aati: aisi chhanni har roz
 * dhairon achhe naam pakarti hai, ops un sab ko nazar-andaz karna seekh leta hai, aur
 * phir wo naam bhi nikal jate hain jo waqai kharab the.
 */
export function titleProblem(title: string): TitleProblem | null {
  const trimmed = title.trim()

  if (trimmed.length < MIN_TITLE_LENGTH) return 'tooShort'

  const lower = trimmed.toLowerCase()
  if (PLACEHOLDERS.some((word) => lower === word || lower.startsWith(`${word} `))) {
    return 'placeholder'
  }

  /*
   * Phone number naam mein — ye rozana hota hai (dukan wala naam ke saath apna number
   * likh deta hai) aur wo naam Bazaar par chhapta hai. Do nuqsan: safha bhadda lagta
   * hai, aur reseller seedha dukan se rabta kar leti hai — jis ke baad na order banta
   * hai, na hisab, na kisi ki hifazat.
   *
   * 🔴 DAS hindse chahiyen, aath nahi. Pakistani number gyarah ka hota hai; hadd is se
   * neeche rakhne par "Bed Sheet 200 TC 180 GSM" jaise asli naam bhi phone ban jate the
   * — aur ops ki list par jhoote nishan hi wo cheez hain jo asli nishanon ko marwa deti
   * hai. Ye kami test ne pakri thi.
   */
  if (/(?:\d[\s-]?){10,}/.test(trimmed)) return 'hasPhone'

  const digits = (trimmed.match(/\d/g) ?? []).length
  if (digits > trimmed.replace(/\s/g, '').length * 0.6) return 'mostlyDigits'

  // "aaaaaa" / "!!!!!!" — keyboard par ungli reh gayi
  if (/(.)\1{4,}/.test(trimmed)) return 'repeatedChars'

  return null
}

// ------------------------------------------------------------------ tarteeb

const SEVERITY_RANK: Record<FlagSeverity, number> = { high: 0, medium: 1, low: 2 }

/**
 * Nishanon ki tarteeb — pehle darja, phir umar.
 *
 * 🔴 Umar ULTI tarteeb mein (purana upar). Naya pehle rakhne se wo cheez sab se neeche
 * chali jati hai jo sab se zyada arse se pari hai — yani jise sab se zyada nazar-andaz
 * kiya gaya wo aur zyada nazar-andaz hoti rehti hai. Ops ki har list par yehi khatra
 * hota hai.
 */
export function sortFlags(flags: readonly OpsFlag[]): OpsFlag[] {
  return [...flags].sort((a, b) => {
    const bySeverity = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]
    if (bySeverity !== 0) return bySeverity
    return a.since.getTime() - b.since.getTime()
  })
}

/** Har darje ki ginti — safhe ke sar par. */
export function countBySeverity(
  flags: readonly OpsFlag[],
): Record<FlagSeverity, number> {
  const counts: Record<FlagSeverity, number> = { high: 0, medium: 0, low: 0 }
  for (const flag of flags) counts[flag.severity] += 1
  return counts
}
