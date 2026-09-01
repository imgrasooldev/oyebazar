/**
 * Rang ke naam — teen zabanon mein.
 *
 * 🔴 Ye lughat is liye bani ke `ProductVariant.colour` EK khaana hai, do nahi. Maal ke
 * naam ke do khaane hain (`titleUr`/`titleEn`) magar variant ke rang ka sirf ek — is
 * liye dukan jo likhti hai, wohi har zaban par chhapta hai.
 *
 * Live par wohi nazar aaya: angrezi UI par poora safha angrezi mein tha ("Inventory",
 * "Sold in 30 days", "Change") aur us ke beech mein variant ka naam Urdu mein —
 * "Curtains — Double Bed سبز · M". Production ke saare 280 variants par sirf do rang
 * hain, dono Urdu mein: `نیلا` aur `سبز`.
 *
 * 🔴 Hal do khaane BARHA kar nahi kiya gaya, aur wo faisla soch kar hai:
 *
 *  · Rang ki lughat chhoti aur band hai — bees ke qareeb lafz poore bazaar ko chalate
 *    hain. Do khaane barhane ka matlab har dukan se har rang DO dafa likhwana hai, aur
 *    us ka nateeja "Blue"/"Blue" jaisi qatarein hoti hain, tarjuma nahi.
 *  · Size ka masla hai hi nahi: `S`, `M`, `XL`, `40` har zaban mein wohi hain.
 *
 * Jo lafz lughat mein na ho, wo JYUN KA TYUN chhapta hai. Ye zaroori hai: dukan koi bhi
 * rang likh sakti hai ("gehra neela", "off-white", "peacock"), aur us par tarjume ka
 * andaza lagana us se bura hai ke wo usi ki zaban mein rehne diya jaye.
 */

/** Ek rang, teen shaklon mein. Talash teenon par chalti hai. */
interface Colour {
  readonly ur: string
  readonly en: string
  readonly rm: string
}

/*
 * 🔴 Ye fehrist BAZAAR se aayi hai, rang ke charts se nahi. Yahan wohi lafz hain jo
 * Pakistani kapre ki dukan par waqai bolay jate hain — is liye `سرخ` aur `لال` dono
 * hain, aur `سرمئی` ke saath `گرے` bhi (jo Urdu mein bhi isi shakl mein chalta hai).
 *
 * Is mein lafz barhana bay-zarar hai. Ghalat tarjuma daalna nahi — is liye jo lafz shak
 * wala ho, usay chhor dena behtar hai: bina lughat ke wo waise bhi jyun ka tyun chhapega.
 */
const COLOURS: readonly Colour[] = [
  { ur: 'سفید', en: 'White', rm: 'Safaid' },
  { ur: 'کالا', en: 'Black', rm: 'Kala' },
  { ur: 'سیاہ', en: 'Black', rm: 'Siyah' },
  { ur: 'سرخ', en: 'Red', rm: 'Surkh' },
  { ur: 'لال', en: 'Red', rm: 'Laal' },
  { ur: 'نیلا', en: 'Blue', rm: 'Neela' },
  { ur: 'آسمانی', en: 'Sky blue', rm: 'Aasmani' },
  { ur: 'فیروزی', en: 'Turquoise', rm: 'Firozi' },
  { ur: 'سبز', en: 'Green', rm: 'Sabz' },
  { ur: 'پیلا', en: 'Yellow', rm: 'Peela' },
  { ur: 'گلابی', en: 'Pink', rm: 'Gulabi' },
  { ur: 'نارنجی', en: 'Orange', rm: 'Narangi' },
  { ur: 'جامنی', en: 'Purple', rm: 'Jamni' },
  { ur: 'بھورا', en: 'Brown', rm: 'Bhoora' },
  { ur: 'سرمئی', en: 'Grey', rm: 'Surmai' },
  { ur: 'گرے', en: 'Grey', rm: 'Grey' },
  { ur: 'کریم', en: 'Cream', rm: 'Cream' },
  { ur: 'بیج', en: 'Beige', rm: 'Beige' },
  { ur: 'مہرون', en: 'Maroon', rm: 'Maroon' },
  { ur: 'سنہری', en: 'Golden', rm: 'Sunehri' },
  { ur: 'چاندی', en: 'Silver', rm: 'Chandi' },
  { ur: 'کالی مہندی', en: 'Olive', rm: 'Olive' },
]

export type ColourLocale = 'ur' | 'en' | 'rm'

/*
 * Talash ki mez — har shakl se usi qatar tak.
 *
 * 🔴 Chaabi lowercase hai taake "Blue", "blue" aur "BLUE" teenon mil jayen. Urdu par
 * `toLowerCase()` ka koi asar nahi hota (us mein bara/chhota harf hai hi nahi), is liye
 * wo qadrein waise ki waise chaabi banti hain — aur yehi chahiye.
 */
const INDEX = new Map<string, Colour>()
for (const colour of COLOURS) {
  for (const form of [colour.ur, colour.en, colour.rm]) {
    const key = form.trim().toLowerCase()
    // Pehla jeetta hai: `کالا` aur `سیاہ` dono Black hain, magar en→ur par `کالا` chale
    if (!INDEX.has(key)) INDEX.set(key, colour)
  }
}

/**
 * Rang ka naam is zaban mein — ya jyun ka tyun agar lughat mein na ho.
 *
 * Dono taraf chalta hai: `سبز` + `en` → `Green`, aur `Blue` + `ur` → `نیلا`. Doosra
 * rukh utna hi zaroori hai: poora UI Urdu-first hai, aur dukan angrezi mein rang likh
 * sakti hai.
 */
export function colourName(raw: string, locale: ColourLocale): string {
  const trimmed = raw.trim()
  if (!trimmed) return ''

  const found = INDEX.get(trimmed.toLowerCase())
  return found ? found[locale] : trimmed
}

/**
 * Variant ka poora naam — "Green · M".
 *
 * 🔴 Ye function is liye bana ke `[colour, size].filter(Boolean).join(' · ')` wala
 * jumla PAANCH jagah dohra hua tha (inventory ke do khaane, variants ki fehrist, order
 * form, aur status pack ki tasveer). Rang ka tarjuma un mein se ek jagah lagane ka
 * matlab hota ke baqi chaar par masla waisa hi rehta — aur unhen dhoondne ke liye koi
 * wajah bhi na hoti.
 *
 * Size ko haath nahi lagta: `S`, `M`, `XL`, `40` har zaban mein wohi hain.
 */
export function variantLabel(
  variant: { colour?: string | null; size?: string | null },
  locale: ColourLocale,
): string {
  const colour = variant.colour ? colourName(variant.colour, locale) : ''
  return [colour, variant.size].filter(Boolean).join(' · ')
}
