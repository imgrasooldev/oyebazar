/**
 * Talash — Urdu, Roman aur angrezi ek saath.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Masla kya tha
 *
 * Reseller apne phone par jo likhti hai wo teen shakloin mein hota hai: "بچوں کے کپڑے",
 * "bachon ke kapre", ya "kids wear" — aur teenon ka matlab EK hai. Purani talash sirf
 * `titleUr LIKE %…%` aur `titleEn LIKE %…%` chalati thi, is liye teenon mein se sirf
 * wohi shakl chalti thi jo maal ke naam mein hoo-ba-hoo likhi ho.
 *
 * Nateeja: "bachon ke kapre" par safha khali. Reseller ye nahi sochti ke "shayad mujhe
 * angrezi mein likhna chahiye" — wo ye samajhti hai ke "yahan ye maal hai hi nahi", aur
 * chali jati hai. Ye rozana ka nuqsan hai.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * 🔴 Yahan koi AI nahi. Ye lughat aur normalisation ka kaam hai — aur wo AI se BEHTAR
 * hai, model se nahi: ye har dafa bilkul wohi jawab deta hai, is ka test likha ja
 * sakta hai, is mein ek paisa kharch nahi hota, aur ye 20ms mein chalta hai.
 *
 * (Embeddings ka faida is se AAGE shuru hota hai — "sardiyon wala kapra" jaise jumle
 * par, jahan koi lafz mel nahi khata. Wo agla qadam hai, ye us ki jagah nahi le raha:
 * embeddings ko bhi sawal isi tarah saaf kar ke dena parta hai.)
 */

/**
 * Arabi/Urdu ke wo nishan jo likhte waqt aksar rah jate hain — zabar, zer, pesh, tashdeed.
 *
 * Ye maal ke naam mein kabhi kabhi hote hain aur sawal mein kabhi kabhi. Dono taraf se
 * hata dena hi wahid tareeqa hai ke "کھدّر" aur "کھدر" ek cheez ban jayen.
 */
const DIACRITICS = /[ً-ْٰـ‌‍‎‏]/g

/**
 * Ek hi awaz ke kai huroof — keyboard, font aur aadat par munhasir.
 *
 * Sab se aam: Arabi "ي/ك/ه" bمقابله Urdu "ی/ک/ہ". Windows ka purana Arabic keyboard
 * pehli qism deta hai, phone ka Urdu keyboard doosri — aur donon tarah likha hua maal
 * hamari apni table mein mojood hai.
 */
const LETTER_MAP: Record<string, string> = {
  ي: 'ی',
  ى: 'ی',
  ئ: 'ی',
  ك: 'ک',
  ه: 'ہ',
  ۀ: 'ہ',
  ة: 'ہ',
  أ: 'ا',
  إ: 'ا',
  آ: 'ا',
  ٱ: 'ا',
  ؤ: 'و',
  '٫': '.',
}

/** Urdu ke apne hindsе — "۵۰۰ گرام" likhne wale ko "500 gram" bhi milna chahiye. */
const URDU_DIGITS: Record<string, string> = {
  '۰': '0',
  '۱': '1',
  '۲': '2',
  '۳': '3',
  '۴': '4',
  '۵': '5',
  '۶': '6',
  '۷': '7',
  '۸': '8',
  '۹': '9',
}

/**
 * Wo lafz jo sawal mein hote hain magar us ka matlab nahi bante.
 *
 * "bachon KE kapre" mein "ke" nikal dena zaroori hai: warna hum har us maal mein "ke"
 * dhoondte hain aur natija sifar hota hai. Urdu mein bhi wahi — "کے"، "کا"، "کی".
 */
const STOPWORDS = new Set([
  'ke',
  'ka',
  'ki',
  'kay',
  'k',
  'aur',
  'ya',
  'wala',
  'wali',
  'wale',
  'ke liye',
  'the',
  'for',
  'and',
  'with',
  'کے',
  'کا',
  'کی',
  'اور',
  'یا',
  'والا',
  'والی',
  'والے',
  'میں',
  'سے',
])

/**
 * Lughat — ek matlab, teen zabanein.
 *
 * 🔴 Har qatar hamare APNE category darakht se aayi hai (prisma/seed-data.ts), kisi aam
 * Urdu dictionary se nahi. Wajah: is ka kaam sawal ko HAMARE maal tak pohanchana hai.
 * Aam dictionary mein wo lafz bhi hote jo hamare bazaar mein kabhi nahi bikte, aur wo
 * sirf ghalat natije barhate.
 *
 * Tarteeb: har qatar ek "matlab" hai. Us mein jo bhi lafz hain, un mein se KISI ek par
 * likhne wale ko baqi sab mil jate hain — dono taraf.
 */
const SYNONYMS: readonly (readonly string[])[] = [
  // ── kapra
  ['بچوں کے کپڑے', 'bachon ke kapre', 'bachon', 'bache', 'kids wear', 'kids', 'children'],
  ['کپڑا', 'کپڑے', 'kapra', 'kapre', 'kapray', 'cloth', 'clothes', 'fabric', 'apparel', 'garments'],
  ['لان', 'lawn', 'lan'],
  ['کھدر', 'khaddar', 'khadar'],
  ['لینن', 'linen'],
  ['عبایا', 'abaya', 'abaaya'],
  ['دلہن', 'دلہن کے ملبوسات', 'dulhan', 'bridal', 'shadi', 'wedding'],
  ['مردانہ', 'مردانہ ملبوسات', 'mardana', 'menswear', 'men', 'gents'],
  ['زنانہ', 'zanana', 'ladies', 'women', 'womens'],
  ['شال', 'شال اور چادر', 'shawl', 'shal', 'chadar', 'chaddar'],
  ['سوٹ', 'suit', 'soot', 'three piece', 'تھری پیس'],
  ['دوپٹہ', 'dupatta', 'duppata'],
  ['قمیض', 'qameez', 'kameez', 'shirt'],
  ['شلوار', 'shalwar', 'salwar'],

  // ── ghar ka kapra
  ['بیڈ شیٹ', 'bed sheet', 'bedsheet', 'bedsheets', 'chadar', 'bistar'],
  ['کمبل', 'کمبل اور رضائی', 'kambal', 'blanket', 'quilt', 'razai', 'رضائی'],
  ['پردے', 'parde', 'parday', 'curtain', 'curtains'],
  ['تولیے', 'toliya', 'towel', 'towels'],

  // ── kasmetics
  ['میک اپ', 'makeup', 'make up', 'cosmetics', 'کاسمیٹکس'],
  ['اسکن کیئر', 'skin care', 'skincare', 'cream', 'کریم'],
  ['ہیئر کیئر', 'hair care', 'haircare', 'shampoo', 'شیمپو', 'tel', 'تیل'],
  ['پرفیوم', 'perfume', 'perfumes', 'scent', 'itr', 'عطر'],

  // ── khana peena
  ['کھانے پینے کا سامان', 'grocery', 'kirana', 'kiryana', 'کریانہ', 'food'],
  ['کوکنگ آئل', 'گھی', 'cooking oil', 'oil', 'ghee', 'ghi'],
  ['چاول', 'chawal', 'rice'],
  ['دالیں', 'dal', 'daal', 'dalen', 'pulses', 'lentils'],
  ['چائے', 'chai', 'chae', 'tea'],
  ['مصالحہ', 'مصالحہ جات', 'masala', 'masalajat', 'spices', 'spice'],

  // ── bijli
  ['لائٹنگ', 'ایل ای ڈی', 'light', 'lights', 'lighting', 'led', 'bulb', 'بلب'],
  ['پنکھے', 'پنکھا', 'pankha', 'pankhe', 'fan', 'fans'],
  ['سولر', 'solar', 'inverter', 'انورٹر', 'battery', 'بیٹری'],
  ['موبائل', 'mobile', 'mobail', 'phone', 'charger', 'چارجر', 'accessories', 'ایکسیسریز'],
  ['تار', 'سوئچ', 'wire', 'wires', 'switch', 'switches'],
  ['گھریلو آلات', 'home appliance', 'appliances', 'iron', 'استری'],

  // ── bawarchi khana
  ['کراکری', 'crockery', 'plate', 'plates', 'پلیٹ'],
  ['برتن', 'پتیلے', 'bartan', 'patila', 'patile', 'cookware', 'pateela'],
  ['کچن', 'kitchen', 'kichan', 'kitchen tools'],

  // ── zewar
  ['جیولری', 'زیورات', 'jewellery', 'jewelry', 'zewar', 'zewarat', 'artificial'],
  ['چوڑیاں', 'churiyan', 'choriyan', 'bangles', 'bangle'],

  // ── furniture
  ['فرنیچر', 'furniture', 'farnichar', 'sofa', 'صوفہ', 'bed', 'بیڈ'],
  ['پلاسٹک', 'plastic'],
  ['آفس', 'office', 'aafis'],

  // ── gaari
  ['بائیک پارٹس', 'bike', 'motorcycle', 'موٹر سائیکل', 'parts', 'پرزے'],
  ['کار', 'car', 'gaari', 'گاڑی'],
  ['ٹائر', 'ٹیوب', 'tyre', 'tire', 'tube'],

  // ── dawa
  ['ادویات', 'dawa', 'dawai', 'medicine', 'medicines', 'pharma', 'otc'],
  ['سرجیکل', 'surgical', 'mask', 'ماسک', 'gloves'],

  // ── school
  ['اسکول کا سامان', 'school', 'iskool', 'copy', 'کاپی', 'stationery', 'اسٹیشنری'],
  ['بیگ', 'bag', 'bags', 'basta', 'بستہ'],

  // ── khilone
  ['کھلونے', 'khilone', 'khilona', 'toy', 'toys'],
  ['اسپورٹس', 'sports', 'ball', 'بال', 'cricket', 'کرکٹ'],
  ['گیمنگ', 'gaming', 'game', 'games'],
]

/**
 * Lafz → us ke saathi lafz. Ek dafa banti hai, module load par.
 *
 * Har lafz ka apna khana hai (khud bhi shamil), taake "lawn" par "لان" mil jaye aur
 * "لان" par "lawn" — dono taraf, bina do alag tableon ke.
 */
const INDEX = ((): ReadonlyMap<string, readonly string[]> => {
  const map = new Map<string, string[]>()
  for (const group of SYNONYMS) {
    const normalised = group.map(normalizeSearch).filter((word) => word.length > 0)
    for (const word of normalised) {
      const bucket = map.get(word) ?? []
      for (const other of normalised) if (!bucket.includes(other)) bucket.push(other)
      map.set(word, bucket)
    }
  }
  return map
})()

/**
 * Sawal ya naam ko ek hi shakl mein le aana.
 *
 * Dono taraf chalti hai — likhne wale ke lafz par bhi, aur lughat banate waqt bhi.
 * Isi liye ye export hai: agar kal koi doosri jagah mel milana ho to wo bhi yehi
 * shakl istemal kare, warna do alag "saaf" shaklein ban jayengi.
 */
export function normalizeSearch(text: string): string {
  let out = ''
  for (const character of text.normalize('NFKC').toLowerCase()) {
    out += LETTER_MAP[character] ?? URDU_DIGITS[character] ?? character
  }

  return out
    .replace(DIACRITICS, '')
    // Ramz (punctuation) hatana — "kids-wear" aur "kids wear" ek hi cheez hain
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

/**
 * Ek sawal → us ke hisse, aur har hisse ke saathi lafz.
 *
 * 🔴 Bahar ki tarteeb AND hai, andar ki OR — aur yehi is poore hisse ki jaan hai:
 *
 *   "lawn suit"  →  [ [lawn, لان] , [suit, سوٹ, soot, …] ]
 *                     ↑ ye chahiye     ↑ AUR ye bhi chahiye
 *
 * Sab kuch OR kar dene se "lawn suit" par saara lawn AUR saare suit aa jate — yani
 * chhanni ulta shor barha deti. AND rakhne se do lafz likhne wala apne natije TANG
 * karta hai, jo us ki niyat hoti hai.
 *
 * @returns khali array agar sawal mein koi kaam ka lafz na ho
 */
export function expandSearch(query: string): readonly (readonly string[])[] {
  const clean = normalizeSearch(query)
  if (clean.length === 0) return []

  const groups: string[][] = []
  const seen = new Set<string>()

  for (const token of clean.split(' ')) {
    /*
     * Ek harf ke lafz chhor dete hain — "a", "k". Ye kuch tang nahi karte magar `LIKE
     * %k%` har cheez se mil jata hai, is liye natije ka matlab khatam kar dete hain.
     */
    if (token.length < 2 || STOPWORDS.has(token) || seen.has(token)) continue
    seen.add(token)
    groups.push([...(INDEX.get(token) ?? [token])])
  }

  /*
   * Sirf stopwords likhe gaye ("ke liye")? To poora sawal jaisa hai waisa hi chala
   * dete hain — kuch na dhoondne se behtar hai.
   */
  return groups.length > 0 ? groups : [[clean]]
}

/**
 * Maal ka apna "talash wala khana" — DB mein isi par mel milta hai.
 *
 * 🔴 Sawal aur maal ko EK hi taraah saaf karna zaroori hai. Pehle sirf sawal saaf hota
 * aur maal ka naam kachcha rehta — aur us soorat mein poori mehnat zaya ho jati: agar
 * dukan wale ne "کھدّر" (zer-zabar ke saath) ya Arabi "ك" wala keyboard istemal kiya ho
 * to "khaddar" likhne wale ko wo maal kabhi nahi milta.
 *
 * Isi liye ye qadar maal ke saath likhi jati hai (create/update par), sawal ke waqt
 * nahi banti. Do faide: mel hamesha saaf-bamuqabla-saaf hota hai, aur DB ko har qatar
 * par kuch calculate nahi karna parta.
 *
 * Category ka naam bhi isi mein hai — is liye "بچوں کے کپڑے" likhne wale ko wo maal bhi
 * milta hai jis ke apne naam mein sirf "لان تھری پیس" likha ho magar wo isi khane mein
 * para ho.
 */
export function buildSearchText(input: {
  titleUr: string
  titleEn: string
  descriptionUr?: string | null | undefined
  categoryNameUr?: string | null | undefined
  categoryNameEn?: string | null | undefined
}): string {
  return normalizeSearch(
    [
      input.titleUr,
      input.titleEn,
      input.descriptionUr ?? '',
      input.categoryNameUr ?? '',
      input.categoryNameEn ?? '',
    ].join(' '),
  )
}
