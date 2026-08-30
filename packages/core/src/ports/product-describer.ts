/**
 * Tasveer se maal ka bayan — dukan wale ka sab se bhaari kaam.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔴 Ye feature kis MASLE ke liye hai, ye samajhna zaroori hai — warna ye sirf ek
 * chamakdaar cheez ban kar reh jayega.
 *
 * Bolton Market ka thok wala tasveer khainchna jaanta hai. Us ke phone mein sau
 * tasveerein pari hain. Jo cheez wo NAHI karta wo hai: har maal ka Urdu naam likhna,
 * angrezi naam likhna, tafseel likhna, aur category chunna — chaar khaane, chalees maal,
 * ek sau saath khaane. Wo teesre maal par safha band kar deta hai.
 *
 * Yehi wo lamha hai jahan hamari supply ruk jati hai. Reseller ke liye hum ne bohat kuch
 * banaya; dukan wale ke liye is se bara masla koi nahi.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * 🔴 Jawab MASHWARA hai, faisla nahi. Har khaana dukan wale ke saamne bharaa hua aata
 * hai aur wo usay badal sakta hai. Seedha mehfooz kar dena do wajah se ghalat hoga:
 * model ghalti karta hai (aur wo ghalti reseller ke customer tak jati hai), aur dukan
 * wale ka apna ilm hamare model se hamesha behtar hai — wo maal us ke haath mein hai.
 */
export interface ProductDraftInput {
  /**
   * Maal ki tasveer — poora, publicly khulne wala pata.
   *
   * 🔴 Hamari apni storage ka hona lazmi hai, aur wo jaanch bulane wale par hai. Bahar
   * ka pata lene ka matlab hota ke koi hamare kharche par kisi bhi tasveer ka bayan
   * likhwa le — yani ek muft "tasveer ka bayan" wali service, hamare bill par.
   */
  readonly imageUrl: string
  /**
   * Kaunsi categories mojood hain — model inhi mein se chun sakta hai.
   *
   * 🔴 Model ko khula chhorne ka matlab ye hota ke wo "Kids Toys" jaisi nayi category
   * gharh deta jo hamare paas hai hi nahi, aur us ka maal kisi chhanni mein na aata.
   * Fehrist dene se jawab HAMESHA un mein se ek hota hai — ya koi nahi.
   */
  readonly categories: readonly { slug: string; nameEn: string }[]
  /** Dukan wale ka apna ishara, agar us ne kuch likha ho — "lawn 3 piece" */
  readonly hint?: string | null | undefined
}

export interface ProductDraft {
  readonly titleUr: string
  readonly titleEn: string
  readonly descriptionUr: string
  /**
   * Chuni hui category ka slug — ya `null`.
   *
   * 🔴 `null` ki ijazat jaan boojh kar hai. Model ko har haal mein kuch chunne par
   * majboor karne ka matlab ye hota ke wo aandhe mein bhi ek chun leta, aur ghalat
   * category ka nuqsan khali category se BARA hai: maal ghalat chhanni mein chala jata
   * hai aur wahan koi usay dhoondh hi nahi raha.
   */
  readonly categorySlug: string | null
}

export interface ProductDescriber {
  /**
   * Tasveer dekh kar khaane bharo — ya `null`.
   *
   * 🔴 `null` ka matlab "kuch nahi hua", aur safhe par bhi bilkul kuch nahi hona
   * chahiye: dukan wala waise hi haath se likhta rahe jaise pehle likhta tha. Yahan
   * `PitchWriter` wala template-fallback mumkin hi nahi — status ke jumle bina maal
   * dekhe bhi likhe ja sakte hain, magar maal ka naam nahi. Jo cheez andaze se nahi
   * banti, us ka koi badal nahi hota; us ka sahi jawab khamoshi hai.
   */
  describe(input: ProductDraftInput): Promise<ProductDraft | null>
}
