/**
 * WhatsApp ke paighaam se customer ki tafseel nikalna.
 *
 * 🔴 Ye "AI" nahi hai aur na hone ka dawa karta hai. Ye chand saaf qawaid hain jo us
 * shakl par chalte hain jis mein log Pakistan mein pata bhejte hain.
 *
 * Kyun: reseller ke paas ye maloomat PEHLE SE hoti hai — customer ne WhatsApp par likh
 * kar bheji hoti hai. Us se dobara chaar khaane bharwana is poore raste ka sab se bhaari
 * qadam tha, aur wo bhi phone ki chhoti screen par. Ab wo message paste karti hai aur
 * khaane bhar jate hain.
 *
 * 🔴 Jo nikla wo SEEDHA order nahi banata — khaanon mein bhar kar us ke saamne aata hai
 * aur wo usay theek kar sakti hai. Ye faisla jaan boojh kar hai: ye kisi asli bande ka
 * pata hai aur us par parcel jayega. Ghalat andaza chup chaap chal jaye to wo parcel
 * wapas aata hai — aur us ka nuqsan dukan aur reseller dono uthate hain.
 */

/** Jo mila — jo na mila wo khali, taake UI usay chhoo hi na sake. */
export interface ParsedOrderText {
  readonly name: string
  readonly phone: string
  readonly address: string
  readonly area: string
}

/*
 * Pakistani mobile number ki shaklen: 03001234567, 0300-1234567, +92 300 1234567,
 * 92 300 1234567, 300 1234567. Beech mein space aur dash aam hain.
 */
const PHONE_PATTERN = /(?:\+?92[\s-]?|0)?3\d{2}[\s-]?\d{7}\b/

/** Pate ki pehchan wale lafz — Urdu aur angrezi dono. */
const ADDRESS_WORDS = [
  'گھر',
  'مکان',
  'گلی',
  'محلہ',
  'سٹریٹ',
  'روڈ',
  'بلاک',
  'ٹاؤن',
  'کالونی',
  'سیکٹر',
  'نزد',
  'قریب',
  'house',
  'street',
  'road',
  'block',
  'town',
  'colony',
  'sector',
  'gali',
  'mohalla',
  'near',
  'phase',
  'plot',
  '#',
]

/** Naam ke sath aane wale lafz — "naam: ..." jaisi qatarein. */
const NAME_LABELS = ['نام', 'name']
const ADDRESS_LABELS = ['پتہ', 'پتا', 'ایڈریس', 'address', 'pata']
const AREA_LABELS = ['علاقہ', 'ایریا', 'area', 'ilaqa']

function labelledValue(line: string, labels: readonly string[]): string | null {
  const [head, ...rest] = line.split(/[:：]/)
  if (rest.length === 0 || !head) return null

  const key = head.trim().toLowerCase()
  return labels.some((label) => key === label || key.endsWith(label)) ? rest.join(':').trim() : null
}

/** Sirf hindsay — number ka moqabla karne ke liye. */
function digitsOnly(text: string): string {
  return text.replace(/\D/g, '')
}

/**
 * Number ko usi shakl mein laata hai jo form mein chalti hai (03001234567).
 *
 * Poori tasdeeq yahan NAHI hoti — wo schema ka kaam hai (PakistaniPhoneSchema). Yahan
 * sirf itna ke jo mila wo khaane mein theek shakl mein bathe.
 */
function normalisePhone(raw: string): string {
  const digits = digitsOnly(raw)

  if (digits.startsWith('92') && digits.length === 12) return `0${digits.slice(2)}`
  if (digits.startsWith('0') && digits.length === 11) return digits
  if (digits.startsWith('3') && digits.length === 10) return `0${digits}`

  return digits
}

export function parseOrderText(input: string): ParsedOrderText {
  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  let name = ''
  let phone = ''
  let address = ''
  let area = ''

  // Pehla chakkar: jin qataron par label laga hai, wo sab se pukhta hain
  const unlabelled: string[] = []

  for (const line of lines) {
    const named = labelledValue(line, NAME_LABELS)
    const addressed = labelledValue(line, ADDRESS_LABELS)
    const areaed = labelledValue(line, AREA_LABELS)

    if (named && !name) name = named
    else if (addressed && !address) address = addressed
    else if (areaed && !area) area = areaed
    else if (!named && !addressed && !areaed) unlabelled.push(line)
  }

  // Number poore matan se — label ho ya na ho, ye sab se saaf pehchan hai
  const phoneMatch = input.match(PHONE_PATTERN)
  if (phoneMatch) phone = normalisePhone(phoneMatch[0])

  /*
   * Bachi hui qatarein: sab se lambi (ya pate wale lafzon wali) qatar pata hai, aur
   * pehli chhoti qatar jis mein hindsay na hon, naam.
   *
   * Tarteeb ka faisla: pehle pata dhoondte hain, kyunke naam ki shart "jo bacha" par
   * chalti hai — ulta karte to lamba pata bhi naam ban sakta tha.
   */
  const leftovers = unlabelled.filter((line) => !phone || digitsOnly(line) !== digitsOnly(phone))

  if (!address) {
    const withWords = leftovers.filter((line) =>
      ADDRESS_WORDS.some((word) => line.toLowerCase().includes(word)),
    )
    /*
     * 🔴 Sirf lambai par pata farz karna ghalat nikla: "salam, ye wala suit chahiye"
     * bhi 20 harf se lamba hai aur chup chaap pata ban jata tha — yani parcel ghalat
     * jagah. Is liye doosri shart: pate mein hindsay hote hain (makan/gali ka number),
     * sada guftagu mein nahi.
     */
    const pool =
      withWords.length > 0
        ? withWords
        : leftovers.filter((line) => line.length > 12 && /\d/.test(line))
    address = pool.sort((a, b) => b.length - a.length)[0] ?? ''
  }

  if (!name) {
    name =
      leftovers.find(
        (line) =>
          line !== address &&
          line.length <= 40 &&
          // Naam mein hindsay nahi hote; jis qatar mein number hai wo pata ya phone hai
          !/\d/.test(line),
      ) ?? ''
  }

  return { name, phone, address, area }
}
