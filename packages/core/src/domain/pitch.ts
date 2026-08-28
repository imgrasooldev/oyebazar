/**
 * Status ke lafz — hamare apne khanon se.
 *
 * 🔴 Ye "AI na hone ki soorat mein" wala sasta badal NAHI hai. Ye bunyad hai:
 *
 *  · har waqt chalta hai (na key, na network, na intezar)
 *  · ek paisa kharch nahi
 *  · har dafa wohi jumle — reseller jo kal pasand kar chuki hai wo aaj bhi wahin hai
 *  · aur is ka test likha ja sakta hai
 *
 * Claude wala adapter is se BEHTAR lafz likhta hai — khaas kar us maal par jis ki apni
 * tafseel dukan wale ne likhi ho. Magar wo is ki jagah nahi leta: jis din key khatam ho
 * ya model der kare, us din bhi reseller ke saamne khali jagah nahi aani chahiye.
 *
 * ── Jumle kahan se aate hain
 *
 * Maal ke naam mein wo lafz pehle se mojood hota hai jo usay bechta hai: "ایمبرائیڈرڈ",
 * "سردیوں کا", "کاٹن", "۱ کلو". Seed bhi yehi lawaahiq lagati hai aur asli dukan wale
 * bhi yehi likhte hain, kyunke thok bazaar mein maal isi tarah bola jata hai.
 *
 * Is liye hum naye lafz gharhte nahi — hum wo lafz PEHCHANTE hain jo naam mein already
 * hain, aur us ke gird jumla banate hain.
 */
import type { PitchInput } from '../ports/pitch'

/**
 * Naam mein chhupa hua lafz → us ka apna jumla.
 *
 * 🔴 Tarteeb maani rakhti hai: pehla mel jeet jata hai. Sab se KHAAS lafz upar hain
 * ("چکن کاری" se pehle "ایمبرائیڈرڈ" nahi aana chahiye), kyunke jitna khaas jumla hoga
 * utna hi wo asli lagega.
 */
const CUES: readonly {
  readonly match: readonly string[]
  readonly ur: string
  readonly roman: string
}[] = [
  {
    match: ['چکن کاری', 'chikankari'],
    ur: 'ہاتھ کی چکن کاری — قریب سے دیکھیں تو کام صاف نظر آتا ہے۔',
    roman: 'Haath ki chikankari — qareeb se dekhen to kaam saaf nazar aata hai.',
  },
  {
    match: ['ایمبرائیڈرڈ', 'embroidered'],
    ur: 'کڑھائی والا کام — تصویر سے زیادہ خوبصورت ہاتھ میں لگتا ہے۔',
    roman: 'Karhai wala kaam — tasveer se zyada khoobsurat haath mein lagta hai.',
  },
  {
    match: ['ڈیجیٹل پرنٹ', 'digital print'],
    ur: 'ڈیجیٹل پرنٹ — رنگ پکا، دھونے سے نہیں اترتا۔',
    roman: 'Digital print — rang pakka, dhone se nahi utarta.',
  },
  {
    match: ['شیفون دوپٹہ', 'chiffon'],
    ur: 'ساتھ شیفون دوپٹہ — پورا سوٹ تیار، الگ سے کچھ لینے کی ضرورت نہیں۔',
    roman: 'Saath chiffon dupatta — poora suit tayyar, alag se kuch lene ki zaroorat nahi.',
  },
  {
    match: ['سردیوں', 'winter'],
    ur: 'سردیوں کے لیے — موٹا اور گرم، ابھی سے رکھ لیں۔',
    roman: 'Sardiyon ke liye — mota aur garam, abhi se rakh lein.',
  },
  {
    match: ['کاٹن', 'cotton'],
    ur: 'خالص کاٹن — گرمی میں پہننے کے لیے سب سے آرام دہ۔',
    roman: 'Khaalis cotton — garmi mein pehanne ke liye sab se aaram deh.',
  },
  {
    match: ['ویلوٹ', 'velvet'],
    ur: 'ویلوٹ — دیکھنے میں بھی بھاری اور چلتا بھی سالوں۔',
    roman: 'Velvet — dekhne mein bhi bhaari aur chalta bhi saalon.',
  },
  {
    match: ['ڈبل بیڈ', 'double bed'],
    ur: 'ڈبل بیڈ کا پورا سیٹ — چادر کے ساتھ تکیوں کے غلاف بھی۔',
    roman: 'Double bed ka poora set — chadar ke saath takiyon ke ghilaf bhi.',
  },
  {
    match: ['فیملی پیک', 'family pack'],
    ur: 'فیملی پیک — بڑا ڈبہ، مہینے بھر چلتا ہے۔',
    roman: 'Family pack — bara dabba, mahine bhar chalta hai.',
  },
  {
    match: ['پیک آف', 'pack of'],
    ur: 'ایک ساتھ کئی — الگ الگ لینے سے سستا پڑتا ہے۔',
    roman: 'Ek saath kai — alag alag lene se sasta parta hai.',
  },
  {
    match: ['ہربل', 'herbal'],
    ur: 'ہربل — جلد پر نرم، روز استعمال کے لیے۔',
    roman: 'Herbal — jild par naram, roz istemal ke liye.',
  },
  {
    match: ['پریمیم', 'premium'],
    ur: 'اوپر والی کوالٹی — فرق پہلی بار میں ہی نظر آ جاتا ہے۔',
    roman: 'Ooper wali quality — farq pehli baar mein hi nazar aa jata hai.',
  },
  {
    match: ['سادہ', 'plain'],
    ur: 'سادہ اور صاف — ہر رنگ کے ساتھ چل جاتا ہے۔',
    roman: 'Sada aur saaf — har rang ke saath chal jata hai.',
  },
  {
    match: ['پرنٹڈ', 'printed'],
    ur: 'نیا پرنٹ — بازار میں ابھی ابھی آیا ہے۔',
    roman: 'Naya print — bazaar mein abhi abhi aaya hai.',
  },
]

/**
 * Wo jumle jo har maal par sach hain — aur reseller ke customer ke liye sab se ahem.
 *
 * Ye "bharti" nahi hain: Pakistan mein online kharidne wala pehla sawal yehi poochhta
 * hai — "maal dekh kar paise doon ge?" aur "kitne din mein aayega?". Un ka jawab status
 * par likha hona kai sawal bacha deta hai.
 */
const ALWAYS = {
  ur: [
    'مال دیکھ کر پیسے دیں — کیش آن ڈیلیوری۔',
    'محدود مال ہے — جس نے لینا ہے پیغام کر دے۔',
  ],
  roman: [
    'Maal dekh kar paise den — cash on delivery.',
    'Mehdood maal hai — jis ne lena hai paighaam kar de.',
  ],
} as const

/**
 * Teen jumle — pehla maal ke apne lafz se, phir sheher, phir hamesha wali baat.
 *
 * 🔴 Yahan RAQAM kabhi nahi aati (dekhen `PitchWriter` ka comment). Rate `buildCaption`
 * likhta hai, snapshot se — do jagah do alag raqam reseller apne customer ke saamne
 * bhugatti hai.
 */
export function templatePitch(input: PitchInput): readonly string[] {
  const roman = input.script === 'roman'
  const haystack = `${input.titleUr} ${input.titleEn} ${input.descriptionUr ?? ''}`.toLowerCase()

  const lines: string[] = []

  const cue = CUES.find((row) => row.match.some((word) => haystack.includes(word.toLowerCase())))
  if (cue) lines.push(roman ? cue.roman : cue.ur)

  /*
   * Sheher wala jumla — sirf jab stock mojood ho.
   *
   * "لاہور سے، آج ہی نکل جائے گا" un logon par asar karta hai jo waqt ki fikar karte
   * hain; magar wohi jumla khali maal par likh dena reseller ko us ke customer ke
   * saamne jhoota bana deta hai. Ye ghalti mehngi hai aur wo dobara nahi poochhti.
   */
  if (input.hasStock) {
    lines.push(
      roman
        ? `${input.city} se — order aaj ka, nikle ga aaj hi.`
        : `${input.city} سے — آرڈر آج کا، نکلے گا آج ہی۔`,
    )
  }

  const always = roman ? ALWAYS.roman : ALWAYS.ur
  for (const line of always) {
    if (lines.length >= 3) break
    lines.push(line)
  }

  /*
   * Ek bhi cue na mila (maal ka naam sada tha) — to category ka naam hi jumla ban jata
   * hai. Ye kamzor hai, magar khali se behtar: reseller usay apne alfaz mein badal
   * sakti hai, aur khali jagah wo hai jahan wo ruk jati hai.
   */
  if (lines.length < 3) {
    const name = roman ? input.categoryNameEn : input.categoryNameUr
    lines.push(roman ? `${name} — thok rate par, seedha dukan se.` : `${name} — تھوک ریٹ پر، سیدھا دکان سے۔`)
  }

  return lines.slice(0, 3)
}
