/**
 * Reseller (aur dukan) ka wo khata jis mein paisa aata hai.
 *
 * 🔴 Ye khaana MAHINON tak mara hua para tha. `Reseller.payoutMethod` aur
 * `payoutAccount` schema mein the, `maskAccount()` se parhe bhi jate the — magar
 * unhen likhne ka koi rasta kahin nahi tha: reseller ka koi settings safha hi nahi,
 * join form mein khaana nahi, admin se bhi nahi.
 *
 * Aur us ka anjaam poore platform par tha: wholesaler ke payouts safhe par "صادیہ ·
 * Rs 750" likha aata tha aur "kahan bhejna hai" kabhi nahi. Yani hamara sab se ahem
 * waada — behen ka munafa us tak pohanchna — app ke BAHAR chalta tha, WhatsApp par
 * "apna easypaisa number bhejo" se.
 *
 * Ye module us khate ke QAWAID hain, aur jaan boojh kar khalis hai: koi DB, koi UI,
 * koi zaban. Number ki shakal ka faisla ek jagah rehta hai — us jagah jise test kiya
 * ja sakta hai.
 */

/**
 * Paisa bhejne ke raste.
 *
 * 🔴 Teen wallet aur ek bank — aur ye taqseem bebunyaad nahi: wallet ka "khata number"
 * MOBILE NUMBER hota hai, bank ka nahi. Isi ek farq par is poore module ki jaanch
 * khari hai.
 *
 * Raast bhi wallet ki tarah mobile number par chalta hai (SBP ka apna nizaam), is liye
 * wo wallet ke saath hai — bank ke saath nahi.
 */
export type PayoutMethod = 'JAZZCASH' | 'EASYPAISA' | 'RAAST' | 'BANK'

export const PAYOUT_METHODS: readonly PayoutMethod[] = ['JAZZCASH', 'EASYPAISA', 'RAAST', 'BANK']

/** Wallet — khata number mobile number hota hai. */
export function isWalletMethod(method: PayoutMethod): boolean {
  return method !== 'BANK'
}

export interface PayoutAccount {
  readonly method: PayoutMethod
  /** Wallet par `03001234567`; bank par IBAN ya khata number (bare bare huroof) */
  readonly number: string
  /**
   * Khate ka naam — jaisa bank/wallet ki app mein chhapta hai.
   *
   * 🔴 Ye MARZI ka nahi hai. EasyPaisa aur JazzCash dono bhejne se pehle wusool
   * karne wale ka naam dikhate hain; dukan wala wohi naam milata hai. Naam na ho to
   * us ke paas milane ko kuch nahi rehta — aur ek hindse ki ghalti ka matlab kisi
   * ajnabi ke khate mein paisa hai, jahan se wo wapas nahi aata.
   */
  readonly title: string
  /** Sirf bank par — wallet par hamesha `null` */
  readonly bankName: string | null
}

/** Kya kuch bhara bhi hai — adhoora khata "bhara hua" nahi ginta. */
export function hasPayoutAccount(
  account: Partial<PayoutAccount> | null | undefined,
): account is PayoutAccount {
  return Boolean(account?.method && account.number && account.title)
}

// ------------------------------------------------------------------ number

/**
 * Pakistani mobile — wallet ka khata number.
 *
 * Wohi shaklen jo `parse-order-text` mein hain: 03001234567, 0300-1234567,
 * +92 300 1234567, 92 300 1234567, 300 1234567.
 */
function normaliseMobile(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')

  const local =
    digits.length === 12 && digits.startsWith('92')
      ? `0${digits.slice(2)}`
      : digits.length === 11 && digits.startsWith('03')
        ? digits
        : digits.length === 10 && digits.startsWith('3')
          ? `0${digits}`
          : null

  return local && /^03\d{9}$/.test(local) ? local : null
}

/**
 * Bank ka khata — IBAN ya sada khata number.
 *
 * IBAN Pakistan mein `PK` + 2 hindse + 4 huroof (bank ka code) + 16 alphanumeric = 24.
 * Us ke ilawa dukan wale aksar sada khata number likhwate hain (bank ke hisab se 8 se
 * 20 hindse tak), aur usay mana kar dena ye feature un logon ke liye bekar kar deta jo
 * IBAN dhoondne bank nahi ja sakte.
 *
 * 🔴 Space aur dash hata diye jate hain magar wapas NAHI lagaye jate. Log IBAN chaar
 * chaar ke tukron mein likhte hain aur wo tukre har jagah ek jaise nahi hote; jo cheez
 * copy ho kar bank ki app mein jani hai, us mein hamari apni khoobsurti ka koi kaam
 * nahi.
 */
function normaliseBankNumber(raw: string): string | null {
  const cleaned = raw.replace(/[\s-]/g, '').toUpperCase()

  if (/^PK\d{2}[A-Z]{4}[0-9A-Z]{16}$/.test(cleaned)) return cleaned
  if (/^\d{8,20}$/.test(cleaned)) return cleaned

  return null
}

/** Shakal theek karta hai; na ban sake to `null` — bharosemand jhoot se khali behtar hai. */
export function normalisePayoutNumber(method: PayoutMethod, raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  return isWalletMethod(method) ? normaliseMobile(trimmed) : normaliseBankNumber(trimmed)
}

// ------------------------------------------------------------------ poora khata

export type PayoutAccountProblem =
  | 'method'
  | 'number'
  | 'title'
  | 'bankName'

export type PayoutAccountResult =
  | { readonly ok: true; readonly account: PayoutAccount }
  | { readonly ok: false; readonly problem: PayoutAccountProblem }

/** Naam ki hadd — chhota naam ghalti hai, bara naam pate ki tarah chipka hua matn. */
const TITLE_MIN = 3
const TITLE_MAX = 60
const BANK_NAME_MAX = 60

/**
 * Poora khata banata hai — ya batata hai ke kya kharab hai.
 *
 * 🔴 Yahan se `ValidationError` NAHI uthti. Ye domain hai: is ka kaam faisla dena hai,
 * paighaam dena nahi. Paighaam ki zaban service aur UI ki hai, aur wo teen zabanon
 * mein alag hai — us ko yahan laane ka matlab hota ke Urdu ka jumla badalne ke liye
 * khate ka qaida chhoona pare.
 */
export function buildPayoutAccount(input: {
  method: string
  number: string
  title: string
  bankName?: string | null
}): PayoutAccountResult {
  if (!PAYOUT_METHODS.includes(input.method as PayoutMethod)) {
    return { ok: false, problem: 'method' }
  }
  const method = input.method as PayoutMethod

  const number = normalisePayoutNumber(method, input.number)
  if (!number) return { ok: false, problem: 'number' }

  const title = input.title.trim().replace(/\s+/g, ' ')
  if (title.length < TITLE_MIN || title.length > TITLE_MAX) {
    return { ok: false, problem: 'title' }
  }

  /*
   * Bank ka naam sirf bank par — aur wahan LAZMI.
   *
   * 🔴 Bank ke bagair khata number bekar hai: 14 hindse dekh kar dukan wala ye tay
   * nahi kar sakta ke ye Meezan ka hai ya HBL ka, aur ghalat bank mein bheja hua
   * transfer nakaam nahi hota — wo kisi aur ke paas chala jata hai.
   *
   * Wallet par ulta: bank ka naam MANA hai. Khali karne ke bajaye mana karna is liye
   * ke UI ka khaana chhupane par purani likhi hui qadar reh jati hai, aur "EasyPaisa ·
   * Meezan Bank" jaisi qatar dukan wale ko rok deti hai.
   */
  const bankName = (input.bankName ?? '').trim().replace(/\s+/g, ' ')

  if (method === 'BANK') {
    if (bankName.length < TITLE_MIN || bankName.length > BANK_NAME_MAX) {
      return { ok: false, problem: 'bankName' }
    }
    return { ok: true, account: { method, number, title, bankName } }
  }

  if (bankName) return { ok: false, problem: 'bankName' }
  return { ok: true, account: { method, number, title, bankName: null } }
}

// ------------------------------------------------------------------ dikhana

/**
 * Wallet ka number parhne ke qabil — `0300 1234567`.
 *
 * 🔴 Sirf DIKHANE ke liye. Jo cheez copy ho kar bank/wallet ki app mein jani hai wo
 * `number` hai, bina space ke: kai apps space wale number ko qabool nahi karti, aur
 * jis ne copy kiya us ko ye kabhi maloom nahi hota ke kyun nahi chala.
 */
export function formatPayoutNumber(account: PayoutAccount): string {
  if (!isWalletMethod(account.method)) return account.number
  return `${account.number.slice(0, 4)} ${account.number.slice(4)}`
}
