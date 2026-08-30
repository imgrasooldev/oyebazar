import {
  relativeTime,
  type RelativeUnit,
  ORDER_STATUS_EN,
  ORDER_STATUS_RM,
  ORDER_STATUS_UR,
  type OrderStatusValue,
} from '@oyebazar/shared'

/**
 * Teen zubanein: Urdu (default), Roman Urdu, aur English.
 *
 * Faisle:
 *  · Locale COOKIE mein hai, URL mein nahi (`/ur/...` nahi). Wajah: hamare links
 *    WhatsApp par share hote hain — ek hi URL dono zubanon mein khulna chahiye,
 *    aur SEO ke liye ek hi canonical page behtar hai.
 *  · Default URDU hai. Sadia Urdu parhti hai; baqi do ek tap door hain.
 *  · ROMAN URDU jaan boojh kar alag zaban hai, English ka mutabadil nahi: bohat si
 *    resellers Urdu bolti hain magar Nastaliq parhne mein sust hain — wo WhatsApp par
 *    bhi Roman mein likhti hain. Un ke liye "Aap ka rate" parhna "Your price" se
 *    aasan hai, aur "آپ کا ریٹ" se tez.
 *  · Direction locale ke saath badalti hai — Urdu RTL; Roman aur English LTR
 *    (Roman Urdu Latin haroof mein likhi jati hai, is liye baen se daen).
 *  · Product ke naam DB mein pehle se dono zubanon mein hain (titleUr / titleEn),
 *    is liye content bhi waqai badalta hai, sirf chrome nahi.
 */
export const LOCALES = ['ur', 'rm', 'en'] as const
export type Locale = (typeof LOCALES)[number]

export const LOCALE_COOKIE = 'oyebazar_lang'
export const DEFAULT_LOCALE: Locale = 'ur'

export function isLocale(value: string | undefined): value is Locale {
  return value === 'ur' || value === 'rm' || value === 'en'
}

export function dirOf(locale: Locale): 'rtl' | 'ltr' {
  // Sirf Urdu script RTL hai — Roman Urdu Latin haroof mein likhi jati hai
  return locale === 'ur' ? 'rtl' : 'ltr'
}

/**
 * `<html lang>` ke liye sahi tag.
 *
 * 🔴 'rm' hamara andaruni naam hai — asal mein 'rm' Romansh (Switzerland) ka code hai.
 * Roman Urdu ka sahi BCP-47 tag `ur-Latn` hai: zaban Urdu, likhawat Latin. Screen
 * reader isi se sahi awaz chunta hai aur search engine isi se zaban pehchanta hai.
 */
export function htmlLang(locale: Locale): string {
  return locale === 'rm' ? 'ur-Latn' : locale
}

/** Kaun si zaban Urdu ka font (Nastaliq) mangti hai — sirf Urdu script. */
export function isUrduScript(locale: Locale): boolean {
  return locale === 'ur'
}

/** Zaban badalne wale button par kya likha ho. */
export const LOCALE_LABEL: Record<Locale, string> = {
  ur: 'اردو',
  rm: 'Roman',
  en: 'English',
}

/** Har string teenon zubanon mein — koi bhi jumla adhoora na rahe (TS is ki zamanat deta hai). */
type Entry = { ur: string; rm: string; en: string }

const DICTIONARY = {
  // ---- chrome
  brandTagline: {
    ur: 'تھوک ریٹ پر مال — تصدیق شدہ ہول سیلرز کی ڈائریکٹری',
    en: 'Wholesale rates — directory of verified wholesalers',
    rm: 'Thok rate par maal — tasdeeq shuda wholesalers ki directory',
  },
  noOrderButton: { ur: 'کوئی آرڈر بٹن نہیں', en: 'No order button', rm: 'Koi order button nahi' },
  directoryFree: { ur: 'ڈائریکٹری مفت ہے', en: 'Directory is free', rm: 'Directory muft hai' },
  searchPlaceholder: {
    ur: 'ہول سیلر یا مارکیٹ تلاش کریں…',
    en: 'Search wholesalers or markets…',
    rm: 'Wholesaler ya market talash karen…',
  },
  search: { ur: 'تلاش', en: 'Search', rm: 'Talash' },
  resellerLogin: { ur: 'ری سیلر لاگ اِن', en: 'Reseller login', rm: 'Reseller log in' },
  myCatalogue: { ur: 'میرا کیٹلاگ', en: 'My catalogue', rm: 'Mera catalogue' },
  all: { ur: 'سب', en: 'All', rm: 'Sab' },
  viewAll: { ur: 'سب دیکھیں', en: 'View all', rm: 'Sab dekhen' },
  resellerPortal: { ur: 'ری سیلر پورٹل', en: 'Reseller portal', rm: 'Reseller portal' },
  // ---- home
  heroTitle: {
    ur: 'ہر روز نئی تصویر، آپ کے اپنے ریٹ کے ساتھ',
    en: 'A fresh post every day — with your own price',
    rm: 'Har roz nayi tasveer, aap ke apne rate ke sath',
  },
  heroBody: {
    ur: 'واٹس ایپ اسٹیٹس پر بیچنے والی بہنوں کے لیے — تیار اسٹیٹس پیک، آپ کا ریٹ، آپ کا نام، آپ کا نمبر۔ ایک ٹیپ میں۔',
    en: 'For women selling on WhatsApp status — ready-made status packs with your price, your name and your number. One tap.',
    rm: 'WhatsApp status par bechne wali behnon ke liye — tayyar status pack, aap ka rate, aap ka naam, aap ka number. Ek tap mein.',
  },
  seeWholesalers: { ur: 'ہول سیلرز دیکھیں', en: 'Browse wholesalers', rm: 'Wholesalers dekhen' },
  propNoOrder: {
    ur: 'کوئی آرڈر بٹن نہیں — رابطہ سیدھا ہول سیلر سے',
    en: 'No order button — you contact the wholesaler directly',
    rm: 'Koi order button nahi — aap seedha wholesaler se baat karti hain',
  },
  propFree: { ur: 'ڈائریکٹری مفت — کوئی فیس نہیں', en: 'Free directory — no fees', rm: 'Directory muft hai — koi fees nahi' },
  propVerified: {
    ur: 'تصدیق شدہ ہول سیلرز — بولٹن، اعظم کلاتھ، ریل بازار',
    en: 'Verified wholesalers — Bolton, Azam Cloth, Rail Bazaar',
    rm: 'Tasdeeq shuda wholesalers — Bolton, Azam Cloth, Rail Bazaar',
  },
  statWholesalers: { ur: 'ہول سیلرز', en: 'Wholesalers', rm: 'Wholesalers' },
  statItems: { ur: 'آئٹمز', en: 'Items', rm: 'Items' },
  statCities: { ur: 'شہر', en: 'Cities', rm: 'Sheher' },
  byCity: { ur: 'شہر کے حساب سے', en: 'By city', rm: 'Sheher ke hisab se' },
  verifiedWholesalers: { ur: 'تصدیق شدہ ہول سیلرز', en: 'Verified wholesalers', rm: 'Tasdeeq shuda wholesalers' },
  newArrivals: { ur: 'نیا مال', en: 'New arrivals', rm: 'Naya maal' },
  howItWorks: { ur: 'کام کیسے کرتا ہے', en: 'How it works', rm: 'Ye chalta kaise hai' },
  step1: {
    ur: 'ہم ہول سیلر کے مال کی تیار تصویریں بناتے ہیں',
    en: 'We create ready-made photos of the wholesaler’s stock',
    rm: 'Hum wholesaler ke maal ki tayyar tasveerein banate hain',
  },
  step2: {
    ur: 'روز صبح ۹ بجے آپ کو واٹس ایپ پر ۵ پیک ملتے ہیں',
    en: 'Every morning at 9 you get 5 packs on WhatsApp',
    rm: 'Roz subah 9 baje aap ko WhatsApp par 5 pack milte hain',
  },
  step3: {
    ur: 'آپ اپنا ریٹ لگاتی ہیں، تصویر دوبارہ بن جاتی ہے',
    en: 'You set your price and the image is regenerated',
    rm: 'Aap apna rate lagati hain aur tasveer dobara ban jati hai',
  },
  step4: {
    ur: 'ڈاؤن لوڈ کریں اور اپنے اسٹیٹس پر لگائیں',
    en: 'Download it and post it on your status',
    rm: 'Download karen aur apne status par laga den',
  },
  // ---- bazaar
  bazaar: { ur: 'بازار', en: 'Bazaar', rm: 'Bazaar' },
  city: { ur: 'شہر', en: 'City', rm: 'Sheher' },
  allCities: { ur: 'سارے شہر', en: 'All cities', rm: 'Saare sheher' },
  results: { ur: 'نتائج', en: 'results', rm: 'nataij' },
  items: { ur: 'آئٹمز', en: 'items', rm: 'items' },
  verified: { ur: 'تصدیق شدہ', en: 'Verified', rm: 'Tasdeeq shuda' },
  noSuppliersFound: {
    ur: 'اس فلٹر پر کوئی ہول سیلر نہیں ملا۔',
    en: 'No wholesaler matched this filter.',
    rm: 'Is filter par koi wholesaler nahi mila.',
  },
  noItemsListed: { ur: 'ابھی کوئی آئٹم لسٹ نہیں ہوا۔', en: 'No items listed yet.', rm: 'Abhi koi maal darj nahi.' },
  askRate: { ur: 'ریٹ کے لیے رابطہ', en: 'Contact for rate', rm: 'Rate ke liye rabta karen' },
  /*
   * Jo reseller pehle se logged in hai us ke liye alag jumla: rate us ke apne catalogue
   * mein mojood hai, us ke liye "rabta karen" likhna usay wahan bhejta hai jahan us ka
   * kaam hai hi nahi.
   */
  seeMyRate: { ur: 'اپنا ریٹ دیکھیں', en: 'See your rate', rm: 'Apna rate dekhen' },
  bazaarPriceNote: {
    ur: 'بازار پر ریٹ نہیں لکھا جاتا۔ لاگ اِن کے بعد آپ کو اپنا ریٹ اور منافع دونوں نظر آتے ہیں۔',
    rm: 'Bazaar par rate nahi likha jata. Login ke baad aap ko apna rate aur munafa dono nazar aate hain.',
    en: 'Rates are never shown on the Bazaar. After login you see your cost and your profit.',
  },
  moreFromShop: {
    ur: 'اسی دکان کا اور مال',
    rm: 'Isi dukan ka aur maal',
    en: 'More from this shop',
  },
  pasteMessage: {
    ur: 'گاہک کا واٹس ایپ میسج یہاں پیسٹ کریں',
    rm: 'Grahak ka WhatsApp message yahan paste karen',
    en: "Paste the customer's WhatsApp message here",
  },
  pasteMessageHint: {
    ur: 'نام، نمبر اور پتہ خود بھر جائیں گے — آپ انہیں ٹھیک بھی کر سکتی ہیں',
    rm: 'Naam, number aur pata khud bhar jayenge — aap unhen theek bhi kar sakti hain',
    en: 'Name, number and address fill in — you can still correct them',
  },
  pasteFilled: { ur: 'خانے بھر گئے', rm: 'khaane bhar gaye', en: 'fields filled' },
  askRateWhatsapp: { ur: 'واٹس ایپ پر ریٹ پوچھیں', en: 'Ask the rate on WhatsApp', rm: 'WhatsApp par rate poochhen' },
  noOrdersHere: {
    ur: 'یہاں سے آرڈر نہیں ہوتا',
    en: 'No ordering here',
    rm: 'Yahan order nahi hota',
  },
  noOrdersHereBody: {
    ur: 'رابطہ براہِ راست ہول سیلر کے واٹس ایپ پر ہوتا ہے۔ ڈائریکٹری بالکل مفت ہے۔',
    en: 'You contact the wholesaler on WhatsApp directly. The directory is completely free.',
    rm: 'Aap seedha wholesaler se WhatsApp par baat karti hain. Directory bilkul muft hai.',
  },
  wholesalerStock: { ur: 'اس ہول سیلر کا مال', en: 'This wholesaler’s stock', rm: 'Is wholesaler ka maal' },
  // ---- login
  login: { ur: 'لاگ اِن', en: 'Login', rm: 'Log in' },
  loginBody: {
    ur: 'اپنا واٹس ایپ نمبر لکھیں — کوڈ واٹس ایپ پر آئے گا۔ پاس ورڈ کی ضرورت نہیں۔',
    en: 'Enter your WhatsApp number — the code arrives on WhatsApp. No password needed.',
    rm: 'Apna WhatsApp number likhen — code WhatsApp par aayega. Password ki zaroorat nahi.',
  },
  sharedPhoneWarning: {
    ur: 'فون کسی اور کا ہو تو کام ختم ہونے کے بعد لاگ آؤٹ ضرور کریں۔',
    en: 'If the phone belongs to someone else, log out when you are done.',
    rm: 'Agar phone kisi aur ka hai to kaam ke baad log out kar den.',
  },
  whatsappNumber: { ur: 'واٹس ایپ نمبر', en: 'WhatsApp number', rm: 'WhatsApp number' },
  sendCode: { ur: 'کوڈ بھیجیں', en: 'Send code', rm: 'Code bhejen' },
  sending: { ur: 'بھیجا جا رہا ہے…', en: 'Sending…', rm: 'Bhej rahe hain…' },
  codeSentTo: { ur: 'کوڈ بھیج دیا گیا ہے', en: 'Code sent to', rm: 'Code bheja gaya' },
  sixDigitCode: { ur: '۶ ہندسوں کا کوڈ', en: '6-digit code', rm: '6 hindson ka code' },
  // ---- Reseller ke apne template ----
  myTemplates: { ur: 'میرے ٹیمپلیٹ', en: 'My templates', rm: 'Mere templates' },
  makeYourOwn: { ur: 'اپنا ڈیزائن بنائیں', en: 'Make your own', rm: 'Apna design banayen' },
  templatesIntro: {
    ur: 'اپنا ڈیزائن بنائیں — چیزیں اٹھا کر جہاں چاہیں رکھیں، رنگ بدلیں، اور اسے ہمیشہ کے لیے اپنا ڈیفالٹ بنا لیں۔',
    en: 'Make your own design — drag things where you want, change the colours, and set it as your default.',
    rm: 'Apna design banayen — cheezein utha kar jahan chahen rakhen, rang badlen, aur usay apna default bana len.',
  },
  myTemplate: { ur: 'میرا ٹیمپلیٹ', en: 'My template', rm: 'Mera template' },
  newTemplate: { ur: '+ نیا', en: '+ New', rm: '+ Naya' },
  noTemplatesYet: {
    ur: 'ابھی کوئی ٹیمپلیٹ نہیں — "نیا" دبا کر بنائیں۔',
    en: 'No templates yet — press "New" to make one.',
    rm: 'Abhi koi template nahi — "Naya" daba kar banayen.',
  },
  isDefault: { ur: 'ڈیفالٹ', en: 'Default', rm: 'Default' },
  deleteTemplate: { ur: 'ہٹا دیں', en: 'Delete', rm: 'Hata den' },
  makeDefault: { ur: 'ڈیفالٹ بنائیں', en: 'Make default', rm: 'Default banayen' },
  templateName: { ur: 'ٹیمپلیٹ کا نام', en: 'Template name', rm: 'Template ka naam' },
  badgeText: { ur: 'بیج پر کیا لکھا ہو', en: 'Badge text', rm: 'Badge par kya likha ho' },
  accentColour: { ur: 'نمایاں رنگ', en: 'Accent colour', rm: 'Numaya rang' },
  accentTextColour: { ur: 'اس پر لکھائی کا رنگ', en: 'Text on accent', rm: 'Us par likhai ka rang' },
  bottomCard: { ur: 'نیچے والی پٹی', en: 'Bottom card', rm: 'Neeche wali patti' },
  cardNone: { ur: 'کچھ نہیں', en: 'None', rm: 'Kuch nahi' },
  cardLight: { ur: 'سفید', en: 'White', rm: 'Safed' },
  cardDark: { ur: 'گہری', en: 'Dark', rm: 'Gehri' },
  scrimStrength: { ur: 'تصویر پر دھند', en: 'Shade on photo', rm: 'Tasveer par dhund' },
  frameWidth: { ur: 'حاشیہ', en: 'Frame', rm: 'Haashiya' },
  cornerRadius: { ur: 'کونوں کی گولائی', en: 'Corner rounding', rm: 'Konon ki golai' },
  elementsTitle: { ur: 'تصویر پر کیا کیا ہے', en: 'On the image', rm: 'Tasveer par kya kya hai' },
  elBadge: { ur: 'بیج', en: 'Badge', rm: 'Badge' },
  elTitle: { ur: 'مال کا نام', en: 'Item name', rm: 'Maal ka naam' },
  elPrice: { ur: 'ریٹ', en: 'Price', rm: 'Rate' },
  elName: { ur: 'آپ کا نام', en: 'Your name', rm: 'Apka naam' },
  elPhone: { ur: 'نمبر', en: 'Number', rm: 'Number' },
  elNote: { ur: 'پیک کی اپنی لائن', en: 'Pack line', rm: 'Pack ki apni line' },
  elStock: { ur: 'سائز اور اسٹاک', en: 'Size and stock', rm: 'Size aur stock' },
  elCta: { ur: 'آرڈر والی لائن', en: 'Order line', rm: 'Order wali line' },
  saveTemplate: { ur: 'محفوظ کریں', en: 'Save', rm: 'Mehfooz karen' },
  savedTick: { ur: '✓ محفوظ ہو گیا', en: '✓ Saved', rm: '✓ Mehfooz ho gaya' },
  templatesNav: { ur: 'ٹیمپلیٹ', en: 'Templates', rm: 'Templates' },
  startFrom: { ur: 'کہاں سے شروع کریں', en: 'Start from', rm: 'Kahan se shuru karen' },
  startFromHint: {
    ur: 'کسی بھی شکل کو پکڑ کر اپنی بنا لیں',
    en: 'Take any look and make it yours',
    rm: 'Kisi bhi shakl ko pakar kar apni bana len',
  },
  fontLabel: { ur: 'لکھائی', en: 'Font', rm: 'Likhai' },
  fontNastaliq: { ur: 'نستعلیق', en: 'Nastaliq', rm: 'Nastaliq' },
  fontNaskh: { ur: 'نسخ', en: 'Naskh', rm: 'Naskh' },
  fontLatin: { ur: 'انٹر (انگریزی)', en: 'Inter', rm: 'Inter' },
  fontAmiri: { ur: 'امیری', en: 'Amiri', rm: 'Amiri' },
  fontCairo: { ur: 'قاہرہ', en: 'Cairo', rm: 'Cairo' },
  fontPoppins: { ur: 'پاپنز', en: 'Poppins', rm: 'Poppins' },
  fontPlayfair: { ur: 'پلے فیئر', en: 'Playfair', rm: 'Playfair' },
  textColour: { ur: 'لکھائی کا رنگ', en: 'Text colour', rm: 'Likhai ka rang' },
  /*
   * Chuni hui cheez ke qatar ke naam — do harf, aur wohi lafz jo reseller bolti hai.
   *
   * 🔴 "رنگ" aur "پیچھے" — "foreground"/"background" ka tarjuma NAHI. Wo do lafz design
   * tool ki zabaan hain; jo banda WhatsApp par maal bechta hai wo ye poochhta hai ke
   * "likhai ka rang" kya ho aur "peechay" kya ho.
   */
  /*
   * 🔴 Rail ke "متن" se ALAG naam.
   *
   * Dono ka naam "Text" tha: rail wala NAYA text daalta hai, toolbar wala chuni hui
   * cheez ke ALFAAZ badalta hai. Ek hi lafz do bilkul alag kaam par lagne se banda
   * andaza lagata hai ke kaun sa kya karega — aur screen reader par to dono bilkul ek
   * jaise bolay jate hain.
   */
  toolText: { ur: 'لکھیں', en: 'Edit', rm: 'Likhen' },
  toolColour: { ur: 'رنگ', en: 'Colour', rm: 'Rang' },
  toolBg: { ur: 'پیچھے', en: 'Behind', rm: 'Peechay' },
  toolFont: { ur: 'لکھائی', en: 'Font', rm: 'Likhai' },
  toolSize: { ur: 'سائز', en: 'Size', rm: 'Size' },
  toolPlace: { ur: 'جگہ', en: 'Place', rm: 'Jagah' },
  toolMore: { ur: 'مزید', en: 'More', rm: 'Mazeed' },
  bgColour: { ur: 'پیچھے کا رنگ', en: 'Background colour', rm: 'Peechay ka rang' },
  bgNone: { ur: 'پیچھے کچھ نہیں', en: 'No background', rm: 'Peechay kuch nahi' },
  nudgeUp: { ur: 'اوپر', en: 'Up', rm: 'Oopar' },
  nudgeDown: { ur: 'نیچے', en: 'Neeche', rm: 'Neeche' },
  opacityLabel: { ur: 'گہرا پن', en: 'Opacity', rm: 'Gehra pan' },
  rotateLabel: { ur: 'ٹیڑھا', en: 'Tilt', rm: 'Terha' },
  pillToggle: { ur: 'رنگ بھرا ڈبہ', en: 'Filled pill', rm: 'Rang bhara dabba' },
  undo: { ur: 'واپس', en: 'Undo', rm: 'Wapas' },
  redo: { ur: 'دوبارہ', en: 'Redo', rm: 'Dobara' },
  zoomIn: { ur: 'بڑا کریں', en: 'Zoom in', rm: 'Bara karen' },
  zoomFit: { ur: 'جتنی جگہ ہے اتنا', en: 'Fit to screen', rm: 'Jitni jagah hai utna' },
  zoomOut: { ur: 'چھوٹا کریں', en: 'Zoom out', rm: 'Chhota karen' },
  smaller: { ur: 'چھوٹا', en: 'Smaller', rm: 'Chhota' },
  bigger: { ur: 'بڑا', en: 'Bigger', rm: 'Bara' },
  alignStart: { ur: 'کنارے پر', en: 'To the edge', rm: 'Kinare par' },
  alignCentre: { ur: 'درمیان میں', en: 'Centre', rm: 'Darmiyan mein' },
  alignEnd: { ur: 'دوسرے کنارے پر', en: 'Other edge', rm: 'Doosre kinare par' },
  hideThis: { ur: 'اسے چھپا دیں', en: 'Hide this', rm: 'Isay chhupa den' },
  showThis: { ur: 'اسے دکھائیں', en: 'Show this', rm: 'Isay dikhayen' },
  addText: { ur: 'اپنا متن', en: 'Your own text', rm: 'Apna matn' },
  myText: { ur: 'میرا متن', en: 'My text', rm: 'Mera matn' },
  addTextHint: {
    ur: 'اپنی لائن لکھیں — جیسے "مفت ڈیلیوری" یا "آخری 2 پیس"۔ ریٹ یہاں نہ لکھیں۔',
    en: 'Write your own line — like "Free delivery" or "Last 2 pieces". Do not write the price here.',
    rm: 'Apni line likhen — jaise "مفت ڈیلیوری" ya "آخری 2 پیس". Rate yahan na likhen.',
  },
  addLogoHint: {
    ur: 'اپنا لوگو یا کوئی چھوٹی تصویر — تصویر پر آ کر جہاں چاہیں رکھ دیں۔',
    en: 'Your logo or a small picture — it lands on the photo, then put it where you want.',
    rm: 'Apna logo ya koi chhoti tasveer — tasveer par aa kar jahan chahen rakh den.',
  },
  myLogo: { ur: 'میرا لوگو', en: 'My logo', rm: 'Mera logo' },
  addLogo: { ur: 'لوگو', en: 'Logo', rm: 'Logo' },
  roundLogo: { ur: 'گول لوگو', en: 'Round logo', rm: 'Gol logo' },
  addShape: { ur: 'شکل', en: 'Shape', rm: 'Shakl' },
  shapeRect: { ur: 'پٹی', en: 'Bar', rm: 'Patti' },
  shapeCircle: { ur: 'دائرہ', en: 'Circle', rm: 'Daira' },
  shapeLine: { ur: 'لکیر', en: 'Line', rm: 'Lakeer' },
  shapeTriangle: { ur: 'تکون', en: 'Triangle', rm: 'Takoon' },
  shapeDiamond: { ur: 'ہیرا', en: 'Diamond', rm: 'Heera' },
  shapeStar: { ur: 'ستارہ', en: 'Star', rm: 'Sitara' },
  shapeArrow: { ur: 'تیر', en: 'Arrow', rm: 'Teer' },
  shapeBurst: { ur: 'چمک', en: 'Burst', rm: 'Chamak' },
  shapeHeart: { ur: 'دل', en: 'Heart', rm: 'Dil' },
  shapeHexagon: { ur: 'چھ کونا', en: 'Hexagon', rm: 'Chhe kona' },
  shapePentagon: { ur: 'پانچ کونا', en: 'Pentagon', rm: 'Paanch kona' },
  shapeRibbon: { ur: 'ربن', en: 'Ribbon', rm: 'Ribbon' },
  shapeTag: { ur: 'قیمت والا لیبل', en: 'Price tag', rm: 'Qeemat wala label' },
  shapeBubble: { ur: 'بات کا غبارہ', en: 'Speech bubble', rm: 'Baat ka ghubara' },
  shapeChevron: { ur: 'رخ', en: 'Chevron', rm: 'Rukh' },
  shapeSeal: { ur: 'مہر', en: 'Seal', rm: 'Mohar' },
  shapeHint: {
    ur: 'کسی بھی شکل پر ایک بار دبائیں — وہ تصویر پر آ جائے گی، پھر اسے گھسیٹ کر جہاں چاہیں رکھ دیں۔',
    en: 'Tap any shape once — it lands on the photo, then drag it where you want.',
    rm: 'Kisi bhi shakl par ek baar dabayen — wo tasveer par aa jayegi, phir usay ghaseet kar jahan chahen rakh den.',
  },
  shapeColour: { ur: 'شکل کا رنگ', en: 'Shape colour', rm: 'Shakl ka rang' },
  shapeHeight: { ur: 'اونچائی', en: 'Height', rm: 'Oonchai' },
  sendBehind: { ur: 'لکھائی کے پیچھے', en: 'Send behind text', rm: 'Likhai ke peechay' },
  sendFront: { ur: 'لکھائی کے اوپر', en: 'Bring in front', rm: 'Likhai ke oopar' },
  showAdvanced: { ur: 'مزید سیٹنگز', en: 'More settings', rm: 'Mazeed settings' },
  showSimple: { ur: 'کم دکھائیں', en: 'Show less', rm: 'Kam dikhayen' },
  doneWithThis: { ur: '✓ ہو گیا', en: '✓ Done', rm: '✓ Ho gaya' },
  deleteLayer: { ur: 'اسے مٹا دیں', en: 'Delete this', rm: 'Isay mita den' },
  confirmDelete: {
    ur: '"{name}" مٹا دیں؟ یہ واپس نہیں آ سکتا۔',
    en: 'Delete "{name}"? This cannot be undone.',
    rm: '"{name}" mita den? Ye wapas nahi aa sakta.',
  },
  /*
   * 🔴 Default wala paighaam alag hai, aur wo nateeja SAAF likhta hai.
   *
   * "Kya aap pakke hain?" us banday ko kuch nahi batata jise ye yaad hi nahi ke yehi
   * template har pack par lag raha hai. Jo cheez rukni chahiye wo ghalat tap hai, aur
   * wo tabhi rukta hai jab paighaam qeemat bataye.
   */
  confirmDeleteDefault: {
    ur: '"{name}" ابھی آپ کے ہر پیک پر لگ رہا ہے۔ مٹانے پر پیک واپس عام ڈیزائن پر چلے جائیں گے۔ مٹا دیں؟',
    en: '"{name}" is on every pack you make right now. Deleting it puts your packs back on the standard design. Delete?',
    rm: '"{name}" abhi aap ke har pack par lag raha hai. Mitane par pack wapas aam design par chale jayenge. Mita den?',
  },
  customColour: { ur: 'اپنی مرضی کا رنگ', en: 'Custom colour', rm: 'Apni marzi ka rang' },
  enterFullscreen: { ur: 'پوری اسکرین', en: 'Full screen', rm: 'Poori screen' },
  exitFullscreen: { ur: 'پوری اسکرین سے نکلیں', en: 'Exit full screen', rm: 'Poori screen se niklen' },
  tryOnPhoto: { ur: 'اپنے مال پر دیکھیں', en: 'See it on your item', rm: 'Apne maal par dekhen' },
  duplicateTemplate: { ur: 'نقل', en: 'Duplicate', rm: 'Naqal' },
  copySuffix: { ur: '(نقل)', en: '(copy)', rm: '(naqal)' },
  ctaPlaceholder: {
    ur: 'آرڈر کے لیے میسج کریں',
    en: 'Message to order',
    rm: 'Order ke liye message karen',
  },
  boundTitle: {
    ur: 'یہ مال کا نام ہے — ہر مال پر خود بدلتا ہے، اس لیے یہاں نہیں لکھا جاتا۔',
    en: 'This is the item name — it changes with each item, so it is not typed here.',
    rm: 'Ye maal ka naam hai — har maal par khud badalta hai, is liye yahan nahi likha jata.',
  },
  boundPrice: {
    ur: 'یہ آپ کا ریٹ ہے — پیک بناتے وقت سلائیڈر سے طے ہوتا ہے۔',
    en: 'This is your price — you set it on the slider when making the pack.',
    rm: 'Ye apka rate hai — pack banate waqt slider se tay hota hai.',
  },
  boundSeller: {
    ur: 'یہ آپ کا نام اور نمبر ہے — پیک بناتے وقت بدلا یا ہٹایا جا سکتا ہے۔',
    en: 'This is your name and number — change or hide it when making the pack.',
    rm: 'Ye apka naam aur number hai — pack banate waqt badla ya hataya ja sakta hai.',
  },
  tabDesign: { ur: 'ڈیزائن', en: 'Design', rm: 'Design' },
  tabText: { ur: 'متن', en: 'Text', rm: 'Matn' },
  tabShapes: { ur: 'شکلیں', en: 'Shapes', rm: 'Shaklen' },
  tabUpload: { ur: 'لوگو', en: 'Logo', rm: 'Logo' },
  tabLayers: { ur: 'پرتیں', en: 'Layers', rm: 'Parten' },
  tabSettings: { ur: 'سیٹنگ', en: 'Settings', rm: 'Setting' },
  myTextSample: { ur: 'مفت ڈیلیوری', en: 'Free delivery', rm: 'Muft delivery' },
  bringForward: { ur: 'آگے لائیں', en: 'Bring forward', rm: 'Aage layen' },
  sendBackward: { ur: 'پیچھے کریں', en: 'Send backward', rm: 'Peechay karen' },
  layerWarning: {
    ur: '⚠ اپنا متن کسی چیز سے بندھا ہوا نہیں۔ یہاں ریٹ نہ لکھیں — سلائیڈر پر ریٹ بدلنے سے یہ خود نہیں بدلے گا، اور تصویر پر پرانا ریٹ چھپتا رہے گا۔',
    en: '⚠ Your own text is not linked to anything. Do not write a price here — changing the price on the slider will not update it, and the image will keep showing the old price.',
    rm: '⚠ Apna matn kisi cheez se bandha hua nahi. Yahan rate na likhen — slider par rate badalne se ye khud nahi badlega, aur tasveer par purana rate chhapta rahega.',
  },
  selectedHint: {
    ur: 'کھینچ کر رکھیں · کونے سے ناپ بدلیں · تیر سے سرکائیں',
    en: 'Drag to move · corner to resize · arrow keys to nudge',
    rm: 'Kheench kar rakhen · kone se naap badlen · teer se sarkayen',
  },
  dragHint: {
    ur: 'کسی بھی چیز کو اٹھا کر جہاں چاہیں رکھ دیں',
    en: 'Drag anything to move it',
    rm: 'Kisi bhi cheez ko utha kar jahan chahen rakh den',
  },
  sampleProductTitle: {
    ur: 'لان تھری پیس — پھولوں والا',
    en: 'Lawn 3-Piece — Floral',
    rm: 'Lawn three piece — phoolon wala',
  },
  padXLabel: { ur: 'دائیں بائیں جگہ', en: 'Space at the sides', rm: 'Daayen baayen jagah' },
  padYLabel: { ur: 'اوپر نیچے جگہ', en: 'Space above and below', rm: 'Oopar neeche jagah' },
  showMarkOnPack: {
    ur: 'کنارے پر OyeBazar کا نشان',
    en: 'OyeBazar mark at the edge',
    rm: 'Kinare par OyeBazar ka nishan',
  },
  packNote: { ur: 'اس پیک کی اپنی لائن', en: 'A line for this pack', rm: 'Is pack ki apni line' },
  packNoteHint: {
    ur: 'صرف اسی پیک پر چھپے گی — ٹیمپلیٹ پر نہیں۔ اگلے پیک پر یہ خود ہی نہیں آئے گی۔',
    en: 'Prints on this pack only — not on the template. It will not carry over to the next pack.',
    rm: 'Sirf isi pack par chhapegi — template par nahi. Agle pack par ye khud nahi aayegi.',
  },
  packNotePlaceholder: { ur: 'مثلاً: صرف آج · آخری 2 پیس', en: 'e.g. Today only · Last 2 pieces', rm: 'Misal: صرف آج · آخری 2 پیس' },
  dismiss: { ur: 'بند کریں', en: 'Dismiss', rm: 'Band karen' },
  draftFound: {
    ur: 'پچھلی بار کا کام محفوظ نہیں ہوا تھا۔ واپس لے آئیں؟',
    en: 'Your last work was not saved. Bring it back?',
    rm: 'Pichhli baar ka kaam mehfooz nahi hua tha. Wapas le aayen?',
  },
  draftRestore: { ur: 'واپس لے آئیں', en: 'Bring it back', rm: 'Wapas le aayen' },
  draftDiscard: { ur: 'رہنے دیں', en: 'Leave it', rm: 'Rehne den' },
  layerLimitReached: {
    ur: 'تصویر پر 6 سے زیادہ چیزیں نہیں لگ سکتیں۔ نئی لگانے کے لیے پہلے کوئی پرانی ہٹا دیں — "پرتیں" میں سے۔',
    en: 'You can put at most 6 things on the photo. To add another, remove one first — from "Layers".',
    rm: 'Tasveer par 6 se zyada cheezein nahi lag saktin. Nayi lagane ke liye pehle koi purani hata den — "Layers" mein se.',
  },
  packLangUrdu: { ur: 'اردو', en: 'Urdu', rm: 'Urdu' },
  packLangEnglish: { ur: 'انگریزی', en: 'English', rm: 'English' },
  sampleSellerName: { ur: 'صادیہ بی بی', en: 'Sadia Bibi', rm: 'Sadia Bibi' },
  sampleCta: { ur: 'آرڈر کے لیے میسج کریں', en: 'Message to order', rm: 'Order ke liye message karen' },

  // ---- Status pack par kya kya chhape (Content Studio) ----
  whatShowsOnPack: {
    ur: 'تصویر پر کیا کیا جائے',
    en: 'What shows on the image',
    rm: 'Tasveer par kya kya jaye',
  },
  packUrdu: { ur: 'اردو', en: 'Urdu', rm: 'Urdu' },
  packEnglish: { ur: 'انگریزی', en: 'English', rm: 'English' },
  showPriceOnPack: { ur: 'ریٹ دکھائیں', en: 'Show price', rm: 'Rate dikhayen' },
  showNameOnPack: { ur: 'نام دکھائیں', en: 'Show name', rm: 'Naam dikhayen' },
  showPhoneOnPack: { ur: 'نمبر دکھائیں', en: 'Show number', rm: 'Number dikhayen' },
  nameOnPackHint: {
    ur: 'خالی چھوڑیں تو آپ کا اپنا نام',
    en: 'Leave empty for your profile name',
    rm: 'Khali chhoren to apka apna naam',
  },
  phoneOnPackHint: {
    ur: 'خالی چھوڑیں تو آپ کا واٹس ایپ نمبر',
    en: 'Leave empty for your WhatsApp number',
    rm: 'Khali chhoren to apka WhatsApp number',
  },
  saveAsDefault: {
    ur: 'یہی ہمیشہ کے لیے رکھیں',
    en: 'Keep these as my default',
    rm: 'Yehi hamesha ke liye rakhen',
  },
  savedAsDefault: {
    ur: '✓ محفوظ ہو گیا — اب ہر پیک اسی طرح بنے گا',
    en: '✓ Saved — every pack starts this way now',
    rm: '✓ Mehfooz ho gaya — ab har pack aise hi banega',
  },

  // Soft launch: muqarrar code safhe par — dekhen lib/api/static-otp-hint.ts
  tempCodeLabel: {
    ur: 'عارضی کوڈ (ابھی واٹس ایپ نہیں لگا)',
    en: 'Temporary code (WhatsApp not connected yet)',
    rm: 'Aarzi code (WhatsApp abhi laga nahi)',
  },
  enter: { ur: 'اندر آئیں', en: 'Continue', rm: 'Andar aayen' },
  checking: { ur: 'دیکھا جا رہا ہے…', en: 'Checking…', rm: 'Dekh rahe hain…' },
  changeNumber: { ur: 'نمبر بدلیں', en: 'Change number', rm: 'Number badlen' },
  logout: { ur: 'لاگ آؤٹ', en: 'Logout', rm: 'Log out' },
  somethingWrong: {
    ur: 'کچھ مسئلہ ہو گیا۔ دوبارہ کوشش کریں',
    en: 'Something went wrong. Please try again',
    rm: 'Kuch gharbar ho gayi. Dobara koshish karen',
  },
  // ---- app
  todaysPack: { ur: 'آج کا اسٹیٹس پیک', en: 'Today’s status pack', rm: 'Aaj ka status pack' },
  packsReady: { ur: 'تصویریں تیار ہیں — بس ڈاؤن لوڈ کریں', en: 'images ready — just download', rm: 'tasveerein tayyar — bas download karen' },
  allStock: { ur: 'سارا مال', en: 'All stock', rm: 'Saara maal' },
  yourCost: { ur: 'آپ کی لاگت', en: 'Your cost', rm: 'Aap ki lagat' },
  yourPrice: { ur: 'آپ کا ریٹ', en: 'Your price', rm: 'Aap ka rate' },
  suggested: { ur: 'تجویز', en: 'suggested', rm: 'tajweez' },
  outOfStock: { ur: 'ابھی ختم ہے', en: 'Out of stock', rm: 'Abhi khatam hai' },
  makeStatusPack: { ur: 'اسٹیٹس پیک بنائیں', en: 'Make status pack', rm: 'Status pack banayen' },
  orders: { ur: 'آرڈرز', en: 'Orders', rm: 'Orders' },
  catalogue: { ur: 'کیٹلاگ', en: 'Catalogue', rm: 'Catalogue' },
  // ---- Reseller dashboard ----
  // Card par chhota lafz — poora jumla ("Status pack banayen") 214px ke card mein
  // do line le leta hai aur toota hua lagta hai. Product ke safhe par poora jumla hai.
  makePackShort: { ur: 'پیک بنائیں', rm: 'Pack banayen', en: 'Status pack' },
  searchStockPlaceholder: {
    ur: 'اپنے مال میں تلاش کریں…',
    rm: 'Apne maal mein talash karen…',
    en: 'Search your stock…',
  },
  dashboardNav: { ur: 'ڈیش بورڈ', rm: 'Dashboard', en: 'Dashboard' },
  hello: { ur: 'السلام علیکم،', rm: 'Assalam-o-alaikum,', en: 'Hello,' },
  dashboardBody: {
    ur: 'آج کا کام ایک نظر میں — پہلے وہ جو رکا ہوا ہے۔',
    rm: 'Aaj ka kaam ek nazar mein — pehle wo jo ruka hua hai.',
    en: 'Today at a glance — what is waiting on you first.',
  },
  earnedThisMonth: { ur: 'اس مہینے کمایا', rm: 'Is mahine kamaya', en: 'Earned this month' },
  earnedTotal: { ur: 'کل کمائی:', rm: 'Kul kamai:', en: 'All time:' },
  ordersRunning: { ur: 'چل رہے آرڈرز', rm: 'Chal rahe orders', en: 'Orders running' },
  ordersRunningHint: {
    ur: 'ابھی راستے میں یا ہول سیلر کے پاس',
    rm: 'Abhi raste mein ya wholesaler ke paas',
    en: 'On the way or with the wholesaler',
  },
  ordersDelivered: { ur: 'پہنچ گئے', rm: 'Pohanch gaye', en: 'Delivered' },
  reviewTitleFirst: { ur: '{shop} کے ساتھ آپ کا پہلا آرڈر کیسا رہا؟', en: 'How was your first order with {shop}?', rm: '{shop} ke saath aap ka pehla order kaisa raha?' },
  reviewTitleMonthly: { ur: '{shop} کے بارے میں آپ کی رائے', en: 'Your view on {shop}', rm: '{shop} ke bare mein aap ki raye' },
  reviewHint: {
    ur: 'آپ کی رائے دوسری ریسیلرز کو دکھائی دے گی۔ آرڈر:',
    en: 'Other resellers will see this. Order:',
    rm: 'Aap ki raye doosri resellers ko dikhai degi. Order:',
  },
  reviewQuality: { ur: 'مال کیسا نکلا؟', en: 'How was the product?', rm: 'Maal kaisa nikla?' },
  reviewCommunication: { ur: 'بات کرنے میں کیسا ہے؟', en: 'How is their communication?', rm: 'Baat karne mein kaisa hai?' },
  reviewPayout: { ur: 'کمیشن وقت پر ملا؟', en: 'Commission paid on time?', rm: 'Commission waqt par mila?' },
  reviewComment: { ur: 'کچھ اور بتانا ہو تو (اختیاری)', en: 'Anything else? (optional)', rm: 'Kuch aur batana ho to (ikhtiyari)' },
  reviewSubmit: { ur: 'رائے بھیجیں', en: 'Send', rm: 'Raye bhejen' },
  reviewThanks: { ur: 'شکریہ — آپ کی رائے محفوظ ہو گئی۔', en: 'Thank you — your view is saved.', rm: 'Shukriya — aap ki raye mehfooz ho gayi.' },
  reviewSkip: { ur: 'بعد میں', en: 'Later', rm: 'Baad mein' },
  myRatingTitle: { ur: 'ریسیلرز آپ کے بارے میں کیا کہتی ہیں', en: 'What resellers say about you', rm: 'Resellers aap ke bare mein kya kehti hain' },
  reviewCount: { ur: 'ریسیلرز کی رائے', en: 'reseller reviews', rm: 'resellers ki raye' },
  reviewNotEnough: { ur: 'ابھی کافی رائے نہیں', en: 'Not enough reviews yet', rm: 'Abhi kaafi raye nahi' },
  threadTitle: { ur: 'اس آرڈر پر بات', en: 'About this order', rm: 'Is order par baat' },
  threadHint: {
    ur: 'یہاں لکھی ہوئی بات آرڈر کے ساتھ محفوظ رہتی ہے۔ کوئی مسئلہ ہو تو بعد میں یہی کام آتی ہے۔',
    en: 'What you write here stays with the order. If something goes wrong later, this is what helps.',
    rm: 'Yahan likhi hui baat order ke saath mehfooz rehti hai. Koi masla ho to baad mein yehi kaam aati hai.',
  },
  threadPlaceholder: { ur: 'اپنی بات لکھیں…', en: 'Write here…', rm: 'Apni baat likhen…' },
  threadSend: { ur: 'بھیجیں', en: 'Send', rm: 'Bhejen' },
  threadRaiseIssue: { ur: 'مسئلہ ہوا', en: 'Report a problem', rm: 'Masla hua' },
  threadIssueBadge: { ur: 'مسئلہ', en: 'Problem', rm: 'Masla' },
  threadEmpty: { ur: 'ابھی کوئی بات نہیں ہوئی۔', en: 'Nothing here yet.', rm: 'Abhi koi baat nahi hui.' },
  threadFailed: { ur: 'بھیجا نہیں جا سکا۔ دوبارہ کوشش کریں۔', en: 'Could not send. Try again.', rm: 'Bheja nahi ja saka. Dobara koshish karen.' },
  threadYou: { ur: 'آپ', en: 'You', rm: 'Aap' },
  threadReseller: { ur: 'ریسیلر', en: 'Reseller', rm: 'Reseller' },
  threadShop: { ur: 'دکان', en: 'Shop', rm: 'Dukan' },
  threadOps: { ur: 'OyeBazar', en: 'OyeBazar', rm: 'OyeBazar' },
  wholesalersNav: { ur: 'دکانیں', en: 'Wholesalers', rm: 'Dukanein' },
  wholesalersTitle: { ur: 'دکانیں', en: 'Wholesalers', rm: 'Dukanein' },
  wholesalersBody: {
    ur: 'دکان چنیں اور اس کا مال اپنے ریٹ کے ساتھ دیکھیں۔',
    en: 'Pick a wholesaler and see their goods with your own price.',
    rm: 'Dukan chunen aur us ka maal apne rate ke saath dekhen.',
  },
  wholesalersSearchHint: { ur: 'دکان یا شہر کا نام', en: 'Shop or city name', rm: 'Dukan ya sheher ka naam' },
  wholesalersEmpty: { ur: 'کوئی دکان نہیں ملی۔', en: 'No wholesalers found.', rm: 'Koi dukan nahi mili.' },
  wholesalerNoGoods: { ur: 'اس دکان کا کوئی مال ابھی دستیاب نہیں۔', en: 'No goods from this shop right now.', rm: 'Is dukan ka koi maal abhi dastyab nahi.' },
  reachTitle: { ur: 'آپ کا مال کہاں تک پہنچا', en: 'How far your goods reached', rm: 'Aap ka maal kahan tak pohancha' },
  reachHint: {
    ur: 'پچھلے 30 دن — آرڈر آنے سے پہلے مال ریسیلرز تک پہنچتا ہے۔',
    en: 'Last 30 days — goods reach resellers before orders arrive.',
    rm: 'Pichhle 30 din — order aane se pehle maal resellers tak pohanchta hai.',
  },
  reachResellers: { ur: 'ریسیلرز نے اٹھایا', en: 'Resellers picked it up', rm: 'Resellers ne uthaya' },
  reachPacks: { ur: 'اسٹیٹس پیک بنے', en: 'Status packs made', rm: 'Status pack bane' },
  reachDownloads: { ur: 'ڈاؤن لوڈ ہوئے', en: 'Downloaded', rm: 'Download hue' },
  reachOrders: { ur: 'آرڈر آئے', en: 'Orders received', rm: 'Order aaye' },
  trendingTitle: { ur: 'اس ہفتے کیا چل رہا ہے', en: 'What is selling this week', rm: 'Is hafte kya chal raha hai' },
  trendingHint: {
    ur: 'یہ آپ کا اپنا حساب نہیں — یہ وہ مال ہے جو باقی ریسیلرز بیچ رہی ہیں۔',
    en: 'Not your own numbers — this is what other resellers are selling.',
    rm: 'Ye aap ka apna hisaab nahi — ye wo maal hai jo baqi resellers bech rahi hain.',
  },
  trendingResellers: { ur: 'ریسیلرز نے بیچا', en: 'resellers sold it', rm: 'resellers ne becha' },
  packsMade: { ur: 'بنائے گئے پیک', rm: 'Banaye gaye pack', en: 'Packs made' },
  packsDownloaded: { ur: 'ڈاؤن لوڈ ہوئے', rm: 'download hue', en: 'downloaded' },
  shortcutCatalogue: {
    ur: 'مال دیکھیں اور اسٹیٹس پیک بنائیں',
    rm: 'Maal dekhen aur status pack banayen',
    en: 'Browse stock and make status packs',
  },
  shortcutOrders: {
    ur: 'اپنے آرڈرز اور کمائی',
    rm: 'Apne orders aur kamai',
    en: 'Your orders and earnings',
  },
  shortcutBazaar: {
    ur: 'ہول سیلرز کی ڈائریکٹری',
    rm: 'Wholesalers ki directory',
    en: 'The wholesaler directory',
  },
  myOrders: { ur: 'میرے آرڈرز', en: 'My orders', rm: 'Mere orders' },
  earnedSoFar: { ur: 'اب تک کمایا', en: 'Earned so far', rm: 'Ab tak kamaya' },
  // ---- Content Studio
  studioTitle: { ur: 'اسٹیٹس پیک بنائیں', en: 'Make a status pack', rm: 'Status pack banayen' },
  studioSteps: { ur: 'ریٹ → ڈیزائن → ڈاؤن لوڈ', en: 'Price → design → download', rm: 'Rate → design → download' },
  design: { ur: 'ڈیزائن', en: 'Design', rm: 'Design' },
  yourProfit: { ur: 'آپ کا منافع', en: 'Your profit', rm: 'Aap ka munafa' },
  building: { ur: 'بن رہا ہے…', en: 'Creating…', rm: 'Ban raha hai…' },
  imageBuilding: { ur: 'تصویر بن رہی ہے… (چند سیکنڈ)', en: 'Creating the image… (a few seconds)', rm: 'Tasveer ban rahi hai… (chand second)' },
  packFailed: {
    ur: 'پیک نہیں بن سکا۔ دوبارہ کوشش کریں',
    en: 'Could not create the pack. Please try again',
    rm: 'Pack nahi ban saka. Dobara koshish karen',
  },
  packSlow: {
    ur: 'تصویر بننے میں دیر ہو رہی ہے۔ تھوڑی دیر بعد دوبارہ کوشش کریں۔',
    en: 'The image is taking too long. Please try again shortly.',
    rm: 'Tasveer mein waqt lag raha hai. Thori der baad dobara koshish karen.',
  },
  download: { ur: 'ڈاؤن لوڈ کریں', en: 'Download', rm: 'Download karen' },
  copyCaption: { ur: 'کیپشن کاپی کریں', en: 'Copy caption', rm: 'Caption copy karen' },
  placeOrderForItem: { ur: 'اس آئٹم کا آرڈر لگائیں', en: 'Place an order for this item', rm: 'Is item ka order lagayen' },
  outOfStockWarning: {
    ur: 'یہ آئٹم ابھی ختم ہے — اسٹیٹس پر لگانے سے پہلے ٹیم سے پوچھ لیں۔',
    en: 'This item is out of stock — check with the team before posting it.',
    rm: 'Ye maal khatam hai — lagane se pehle team se poochh len.',
  },
  // ---- order form
  placeOrder: { ur: 'آرڈر لگائیں', en: 'Place order', rm: 'Order lagayen' },
  customerName: { ur: 'کسٹمر کا نام', en: 'Customer name', rm: 'Customer ka naam' },
  fullAddress: { ur: 'پورا پتہ', en: 'Full address', rm: 'Poora pata' },
  addressHint: {
    ur: 'مکان نمبر، گلی، محلہ، قریبی نشانی',
    en: 'House number, street, area, nearby landmark',
    rm: 'Ghar ka number, gali, ilaqa, paas ki nishani',
  },
  area: { ur: 'علاقہ', en: 'Area', rm: 'Ilaqa' },
  locationPin: { ur: 'لوکیشن پن', en: 'Location pin', rm: 'Location pin' },
  locationPinBody: {
    ur: 'پن لگانے سے پارسل واپس آنے کا خطرہ آدھا رہ جاتا ہے۔ کسٹمر کے گھر کے قریب ہوں تو ابھی لگائیں، ورنہ کسٹمر سے واٹس ایپ پر لوکیشن منگوا لیں۔',
    en: 'A pin halves the risk of the parcel coming back. Capture it if you are near the customer, otherwise ask them for their location on WhatsApp.',
    rm: 'Pin lagane se parcel wapas aane ka khatra aadha ho jata hai. Customer ke paas hon to abhi le len, warna WhatsApp par un se location mang len.',
  },
  locationGot: { ur: '✓ لوکیشن مل گئی', en: '✓ Location captured', rm: '✓ Location mil gayi' },
  locationGetting: { ur: 'لوکیشن لی جا رہی ہے…', en: 'Getting location…', rm: 'Location le rahe hain…' },
  locationRetry: { ur: 'دوبارہ کوشش کریں', en: 'Try again', rm: 'Dobara koshish karen' },
  locationCapture: { ur: 'میری موجودہ لوکیشن لگائیں', en: 'Use my current location', rm: 'Meri abhi ki location len' },
  quantity: { ur: 'تعداد', en: 'Qty', rm: 'Tadaad' },
  delivery: { ur: 'ڈیلیوری', en: 'Delivery', rm: 'Delivery' },
  customerPays: { ur: 'کسٹمر دے گا (COD)', en: 'Customer pays (COD)', rm: 'Customer dega (COD)' },
  placing: { ur: 'لگ رہا ہے…', en: 'Placing…', rm: 'Laga rahe hain…' },
  orderFailed: {
    ur: 'آرڈر نہیں لگ سکا۔ دوبارہ کوشش کریں',
    en: 'Could not place the order. Please try again',
    rm: 'Order nahi lag saka. Dobara koshish karen',
  },
  confirmNote: {
    ur: 'آرڈر لگنے کے بعد آپ کو اسے تصدیق کرنا ہوگا — تصدیق کے بغیر ہول سیلر کو نہیں جاتا۔',
    en: 'After placing it you must confirm the order — without confirmation it never goes to the wholesaler.',
    rm: 'Lagane ke baad aap ko order ki tasdeeq karni hogi — tasdeeq ke baghair ye wholesaler tak jata hi nahi.',
  },
  // ---- orders
  awaitingConfirmation: { ur: 'تصدیق باقی ہے', en: 'Awaiting confirmation', rm: 'Tasdeeq baqi hai' },
  awaitingConfirmationBody: {
    ur: 'تصدیق کے بغیر آرڈر ہول سیلر کو نہیں جاتا۔',
    en: 'Without confirmation the order does not go to the wholesaler.',
    rm: 'Tasdeeq ke baghair order wholesaler tak nahi jata.',
  },
  otherOrders: { ur: 'باقی آرڈرز', en: 'Other orders', rm: 'Baqi orders' },
  noOrdersYet: { ur: 'ابھی کوئی آرڈر نہیں۔', en: 'No orders yet.', rm: 'Abhi koi order nahi.' },
  seeCatalogue: { ur: 'کیٹلاگ دیکھیں', en: 'Browse catalogue', rm: 'Catalogue dekhen' },
  // ---- Nayi reseller ka account ----
  registerTitle: { ur: 'اپنا اکاؤنٹ بنائیں', en: 'Create your account', rm: 'Apna account banayen' },
  registerBody: {
    ur: 'یہ نمبر ابھی رجسٹرڈ نہیں۔ بس نام اور شہر بتا دیں — اکاؤنٹ فوراً بن جائے گا۔',
    en: "This number isn't registered yet. Just your name and city — the account is ready right away.",
    rm: 'Ye number abhi register nahi. Bas naam aur sheher bata den — account foran ban jayega.',
  },
  yourName: { ur: 'آپ کا نام', en: 'Your name', rm: 'Aap ka naam' },
  yourCity: { ur: 'شہر', en: 'City', rm: 'Sheher' },
  createAccount: { ur: 'اکاؤنٹ بنائیں', en: 'Create account', rm: 'Account banayen' },
  // ---- Kit (kai platforms) ----
  kitSubtitle: {
    ur: 'ایک بار بنائیں — واٹس ایپ، انسٹاگرام، فیس بک اور ٹک ٹاک، سب کے ناپ تیار',
    en: 'Make it once — sized for WhatsApp, Instagram, Facebook and TikTok',
    rm: 'Ek bar banayen — WhatsApp, Instagram, Facebook aur TikTok, sab ke naap tayyar',
  },
  makeKit: { ur: 'پورا پیک بنائیں', en: 'Create the pack', rm: 'Poora pack banayen' },
  captionLabel: { ur: 'کیپشن (کاپی کر کے پیسٹ کریں)', en: 'Caption (copy and paste)', rm: 'Caption (copy kar ke paste karen)' },
  copied: { ur: 'کاپی ہو گیا', en: 'Copied', rm: 'Copy ho gaya' },
  sizePreparing: { ur: 'بن رہا ہے…', en: 'Preparing…', rm: 'Ban raha hai…' },
  downloadAll: { ur: 'سب ڈاؤن لوڈ کریں', en: 'Download all', rm: 'Sab download karen' },
  newHereRegister: { ur: 'نئی ہیں؟ نمبر ڈالیں — اکاؤنٹ خود بن جائے گا۔', en: 'New here? Enter your number — the account is created for you.', rm: 'Nayi hain? Number daalen — account khud ban jayega.' },
  // 404 / error — mara hua link ya server ki kharabi
  notFoundTitle: { ur: 'یہ صفحہ نہیں ملا', en: 'Page not found', rm: 'Ye safha nahi mila' },
  notFoundBody: {
    ur: 'ہو سکتا ہے لنک پرانا ہو یا وہ چیز اب بازار میں نہ ہو۔ نیچے سے بازار دیکھ لیں۔',
    en: 'The link may be old, or that item is no longer listed. Browse the bazaar below.',
    rm: 'Ho sakta hai link purana ho ya wo cheez ab bazaar mein na ho. Neeche se bazaar dekh len.',
  },
  goToBazaar: { ur: 'بازار دیکھیں', en: 'Go to bazaar', rm: 'Bazaar dekhen' },
  goHome: { ur: 'صفحۂ اول', en: 'Home', rm: 'Safha-e-awwal' },
  errorTitle: { ur: 'کچھ گڑبڑ ہو گئی', en: 'Something went wrong', rm: 'Kuch gharbar ho gayi' },
  errorBody: {
    ur: 'ہمارے سرور میں مسئلہ ہے، آپ کی غلطی نہیں۔ دوبارہ کوشش کریں۔',
    en: 'A problem on our side, not yours. Please try again.',
    rm: 'Hamare server mein masla hai, aap ki ghalti nahi. Dobara koshish karen.',
  },
  tryAgain: { ur: 'دوبارہ کوشش کریں', en: 'Try again', rm: 'Dobara koshish karen' },
  // ---- Wholesaler portal ----
  // ---- Dukan list karwane ki darkhwast ----
  applyTitle: { ur: 'اپنی دکان لسٹ کروائیں', rm: 'Apni dukan list karwayen', en: 'List your shop' },
  applyBody: {
    ur: 'فارم بھر دیں۔ ہماری ٹیم دیکھ کر آپ سے رابطہ کرے گی اور باقی تفصیل مکمل کرے گی۔ لسٹنگ مفت ہے۔',
    rm: 'Form bhar den. Hamari team dekh kar aap se rabta karegi aur baqi tafseel mukammal karegi. Listing muft hai.',
    en: 'Fill the form. Our team reviews it, contacts you and completes the rest. Listing is free.',
  },
  shopName: { ur: 'دکان کا نام', rm: 'Dukan ka naam', en: 'Shop name' },
  ownerName: { ur: 'مالک کا نام', rm: 'Malik ka naam', en: 'Owner name' },
  marketNameOptional: { ur: 'مارکیٹ (اختیاری)', rm: 'Market (marzi ka)', en: 'Market (optional)' },
  shopAddress: { ur: 'دکان کا پتہ', rm: 'Dukan ka pata', en: 'Shop address' },
  ntnOptional: { ur: 'NTN (اختیاری)', rm: 'NTN (marzi ka)', en: 'NTN (optional)' },
  applySubmit: { ur: 'درخواست بھیجیں', rm: 'Darkhwast bhejen', en: 'Send application' },
  applyNote: {
    ur: 'درخواست بھیجنے سے دکان لائیو نہیں ہوتی — ٹیم پہلے تصدیق کرتی ہے۔',
    rm: 'Darkhwast bhejne se dukan live nahi hoti — team pehle tasdeeq karti hai.',
    en: 'Sending this does not publish your shop — the team verifies it first.',
  },
  applyDoneTitle: { ur: 'درخواست مل گئی', rm: 'Darkhwast mil gayi', en: 'Application received' },
  applyDoneBody: {
    ur: 'ہماری ٹیم آپ کے نمبر پر رابطہ کرے گی۔ تصدیق کے بعد آپ کی دکان بازار میں آ جائے گی۔',
    rm: 'Hamari team aap ke number par rabta karegi. Tasdeeq ke baad aap ki dukan bazaar mein aa jayegi.',
    en: 'Our team will contact you on that number. Once verified, your shop appears in the bazaar.',
  },
  alreadyListed: { ur: 'پہلے سے لسٹڈ ہیں؟', rm: 'Pehle se listed hain?', en: 'Already listed?' },
  forWholesalers: { ur: 'ہول سیلرز کے لیے', rm: 'Wholesalers ke liye', en: 'For wholesalers' },
  wholesalerLogin: { ur: 'ہول سیلر لاگ اِن', rm: 'Wholesaler log in', en: 'Wholesaler login' },
  wholesalerListFree: {
    ur: 'مفت لسٹنگ — کوئی کمیشن نہیں',
    rm: 'Muft listing — koi commission nahi',
    en: 'Free listing — no commission',
  },
  wholesalerManageOrders: {
    ur: 'اپنے آرڈرز اور مال یہیں سے سنبھالیں',
    rm: 'Apne orders aur maal yahin se sanbhalen',
    en: 'Manage your orders and stock here',
  },
  wholesalerPortal: { ur: 'ہول سیلر پورٹل', en: 'Wholesaler portal', rm: 'Wholesaler portal' },
  wholesalerLoginBody: {
    ur: 'اپنا وہی واٹس ایپ نمبر لکھیں جو دکان کے ساتھ رجسٹرڈ ہے۔',
    en: 'Enter the WhatsApp number registered with your shop.',
    rm: 'Apna wohi WhatsApp number likhen jo dukan ke sath registered hai.',
  },
  newOrders: { ur: 'نئے آرڈرز', en: 'New orders', rm: 'Naye orders' },
  newOrdersBody: {
    ur: 'یہ آرڈرز آپ کے جواب کے منتظر ہیں۔ قبول کریں تو ریسیلر کو فوراً پتا چل جاتا ہے۔',
    en: 'These orders are waiting on you. Accepting tells the reseller straight away.',
    rm: 'Ye orders aap ke jawab ke muntazir hain. Qubool karen to reseller ko foran pata chal jata hai.',
  },
  runningOrders: { ur: 'چل رہے آرڈرز', en: 'In progress', rm: 'Chal rahe orders' },
  finishedOrders: { ur: 'مکمل شدہ', en: 'Completed', rm: 'Mukammal shuda' },
  noSupplierOrders: { ur: 'ابھی کوئی آرڈر نہیں آیا۔', en: 'No orders yet.', rm: 'Abhi koi order nahi aaya.' },
  // ---- Wholesaler apna maal daalta hai ----
  addProduct: { ur: 'نیا مال شامل کریں', rm: 'Naya maal shamil karen', en: 'Add product' },
  productNameUr: { ur: 'مال کا نام (اردو)', rm: 'Maal ka naam (Urdu)', en: 'Product name (Urdu)' },
  productNameEn: { ur: 'نام (English)', rm: 'Naam (English)', en: 'Name (English)' },
  category: { ur: 'کیٹگری', rm: 'Category', en: 'Category' },
  optionalHint: { ur: '(اختیاری)', rm: '(ikhtiyari)', en: '(optional)' },
  categoryLater: {
    ur: 'ابھی نہیں — بعد میں لگا لیں',
    rm: 'Abhi nahi — baad mein laga lein',
    en: 'Skip for now',
  },
  inStockQty: { ur: 'موجود:', rm: 'Mojood:', en: 'In stock:' },
  save: { ur: 'محفوظ کریں', rm: 'Save karen', en: 'Save' },
  piecesLeft: { ur: 'پیس باقی', rm: 'piece baqi', en: 'left' },
  stockQty: { ur: 'کتنا مال موجود ہے', rm: 'Kitna maal mojood hai', en: 'How many in stock' },
  yourRate: { ur: 'آپ کا ریٹ', rm: 'Aap ka rate', en: 'Your rate' },
  youGet: { ur: 'آپ کو ملیں گے', rm: 'Aap ko milenge', en: 'You get' },
  ourFee: { ur: 'ہماری فیس', rm: 'Hamari fees', en: 'Our fee' },
  resellerSees: { ur: 'ری سیلر کو دکھے گا', rm: 'Reseller ko dikhega', en: 'Reseller sees' },
  photoUrlOptional: { ur: 'تصویر کا لنک (اختیاری)', rm: 'Tasveer ka link (marzi ka)', en: 'Photo link (optional)' },
  unsupportedFile: {
    ur: 'صرف JPG، PNG، WEBP تصویر یا MP4، MOV، WEBM ویڈیو',
    rm: 'Sirf JPG, PNG, WEBP tasveer ya MP4, MOV, WEBM video',
    en: 'Only JPG, PNG, WEBP photos or MP4, MOV, WEBM videos',
  },
  photosAndVideos: { ur: 'تصویریں اور ویڈیو', rm: 'Tasveerein aur video', en: 'Photos and videos' },
  choosePhotos: { ur: 'فون سے چنیں', rm: 'Phone se chunen', en: 'Choose from phone' },
  uploading: { ur: 'بھیجی جا رہی ہے…', rm: 'Bheji ja rahi hai…', en: 'Uploading…' },
  coverPhoto: { ur: 'سرورق', rm: 'Cover', en: 'Cover' },
  makeCover: { ur: 'سرورق بنائیں', rm: 'Cover banayen', en: 'Make cover' },
  removeMedia: { ur: 'ہٹائیں', rm: 'Hatayen', en: 'Remove' },
  videoLabel: { ur: 'ویڈیو', rm: 'Video', en: 'Video' },
  mediaHelp: {
    ur: 'زیادہ سے زیادہ ۸ چیزیں۔ تصویر ۸ ایم بی تک، ویڈیو ۵۰ ایم بی تک۔ سرورق والی تصویر پر ہی ری سیلر کا اسٹیٹس پیک بنتا ہے۔',
    rm: 'Zyada se zyada 8 cheezein. Tasveer 8 MB tak, video 50 MB tak. Cover wali tasveer par hi reseller ka status pack banta hai.',
    en: 'Up to 8 items. Photos to 8 MB, videos to 50 MB. The cover photo is what resellers see first in the studio.',
  },
  askPriceChange: { ur: 'ریٹ بدلنے کی درخواست', rm: 'Rate badalne ki darkhwast', en: 'Request a price change' },
  newRate: { ur: 'نیا ریٹ', rm: 'Naya rate', en: 'New rate' },
  reasonOptional: { ur: 'وجہ (اختیاری)', rm: 'Wajah (marzi ki)', en: 'Reason (optional)' },
  sendPriceRequest: { ur: 'درخواست بھیجیں', rm: 'Darkhwast bhejen', en: 'Send request' },
  resellerWouldSee: { ur: 'منظوری کے بعد ری سیلر کو دکھے گا', rm: 'Manzoori ke baad reseller ko dikhega', en: 'After approval resellers would see' },
  nowItIs: { ur: 'ابھی ہے', rm: 'Abhi hai', en: 'now' },
  priceRequestSent: {
    ur: 'درخواست بھیج دی گئی — ٹیم دیکھ کر فیصلہ کرے گی۔ تب تک پرانا ریٹ ہی چل رہا ہے۔',
    rm: 'Darkhwast bhej di gayi — team dekh kar faisla karegi. Tab tak purana rate hi chal raha hai.',
    en: 'Request sent — the team will decide. The old price stays live until then.',
  },
  priceRequestPending: {
    ur: 'ریٹ کی درخواست زیرِ غور:',
    rm: 'Rate ki darkhwast zer-e-ghaur:',
    en: 'Price request under review:',
  },
  priceApprovalNote: {
    ur: 'لائیو مال کا ریٹ ٹیم کی منظوری سے بدلتا ہے۔ وجہ یہ ہے کہ ری سیلر پہلے ہی اپنا ریٹ لگا کر اسٹیٹس پیک واٹس ایپ پر لگا چکی ہوتی ہے — ریٹ اچانک بڑھ جائے تو وہ اپنی لاگت سے کم پر بیچ رہی ہوتی ہے اور اسے پتہ بھی نہیں چلتا۔',
    rm: 'Live maal ka rate team ki manzoori se badalta hai. Wajah ye hai ke reseller pehle hi apna rate laga kar status pack WhatsApp par laga chuki hoti hai — rate achanak barh jaye to wo apni lagat se kam par bech rahi hoti hai aur usay pata bhi nahi chalta.',
    en: 'On live products the price changes only with team approval. Resellers have already priced it and put status packs on WhatsApp — a sudden rise means they are selling below their own cost without knowing.',
  },
  editProduct: { ur: 'تفصیل درست کریں', rm: 'Tafseel theek karen', en: 'Edit details' },
  draftEditNote: {
    ur: 'یہ مال ابھی ڈرافٹ ہے — نام، ریٹ، سب کچھ بدلا جا سکتا ہے۔ لائیو ہونے کے بعد صرف ٹیم بدل سکے گی۔',
    rm: 'Ye maal abhi draft hai — naam, rate, sab kuch badla ja sakta hai. Live hone ke baad sirf team badal sakegi.',
    en: 'Still a draft — name, price, everything can change. Once live, only the team can.',
  },
  noPhotosYet: {
    ur: 'اس مال کی کوئی تصویر نہیں — ری سیلر اس کا اسٹیٹس پیک نہیں بنا سکتی',
    rm: 'Is maal ki koi tasveer nahi — reseller is ka status pack nahi bana sakti',
    en: 'No photo on this product — resellers cannot make a status pack for it',
  },
  managePhotos: { ur: 'تصویریں', rm: 'Tasveerein', en: 'Photos' },
  addMore: { ur: 'اور شامل کریں', rm: 'Aur shamil karen', en: 'Add more' },
  choosePhotoForPack: { ur: 'کون سی تصویر؟', rm: 'Kaun si tasveer?', en: 'Which photo?' },
  photoNumber: { ur: 'تصویر', rm: 'Tasveer', en: 'Photo' },
  noVideoPack: {
    ur: 'اسٹیٹس پیک صرف تصویر پر بنتا ہے',
    rm: 'Status pack sirf tasveer par banta hai',
    en: 'Status packs are made from photos only',
  },
  detailsOptional: { ur: 'تفصیل (اختیاری)', rm: 'Tafseel (marzi ka)', en: 'Details (optional)' },
  productAddedDraft: {
    ur: 'مال شامل ہو گیا — ٹیم کی منظوری کے بعد ری سیلرز کو دکھے گا۔',
    rm: 'Maal shamil ho gaya — team ki manzoori ke baad resellers ko dikhega.',
    en: 'Added — it shows to resellers once the team approves it.',
  },
  productDraftNote: {
    ur: 'نیا مال پہلے ٹیم دیکھتی ہے۔ منظوری کے بعد ری سیلرز کے کیٹلاگ میں آ جاتا ہے۔',
    rm: 'Naya maal pehle team dekhti hai. Manzoori ke baad resellers ke catalogue mein aa jata hai.',
    en: 'New stock is reviewed by the team first, then appears in the reseller catalogue.',
  },
  myStock: { ur: 'میرا مال', en: 'My stock', rm: 'Mera maal' },
  noSupplierProducts: { ur: 'ابھی آپ کا کوئی مال درج نہیں۔', en: 'No products listed yet.', rm: 'Abhi aap ka koi maal darj nahi.' },
  stockBody: {
    ur: 'مال ختم ہو تو یہیں سے بند کر دیں — بند کرتے ہی نیا آرڈر آنا رک جاتا ہے۔',
    en: 'Out of stock? Switch it off here — new orders stop immediately.',
    rm: 'Maal khatam ho to yahin se band kar den — band karte hi naya order aana ruk jata hai.',
  },
  inStock: { ur: 'دستیاب ہے', en: 'In stock', rm: 'Dastyab hai' },
  notLiveYet: { ur: 'ابھی لائیو نہیں', en: 'Not live yet', rm: 'Abhi live nahi' },
  openOrdersOnThis: { ur: 'اس پر چل رہے آرڈرز', en: 'Open orders on this', rm: 'Is par chal rahe orders' },
  youWillGet: { ur: 'آپ کو ملیں گے', en: 'You get', rm: 'Aap ko milenge' },
  markPacked: { ur: 'مال تیار ہے', rm: 'Maal tayyar hai', en: 'Packed' },
  markDispatched: { ur: 'بھیج دیا', rm: 'Bhej diya', en: 'Dispatched' },
  markDelivered: { ur: 'پہنچ گیا، پیسے مل گئے', rm: 'Pohanch gaya, paise mil gaye', en: 'Delivered, cash received' },
  markRto: { ur: 'مال واپس آ گیا', rm: 'Maal wapas aa gaya', en: 'Returned (RTO)' },
  markCancelled: { ur: 'آرڈر منسوخ', rm: 'Order mansookh', en: 'Cancel order' },
  reasonAsk: { ur: 'وجہ لکھیں — یہی ری سیلر کو جائے گی', rm: 'Wajah likhen — yehi reseller ko jaye gi', en: 'Reason — the reseller sees this' },
  confirmAction: { ur: 'تصدیق', rm: 'Tasdeeq', en: 'Confirm' },
  backOut: { ur: 'رہنے دیں', rm: 'Rehne den', en: 'Never mind' },
  deliveredOpensMoney: {
    ur: 'یہ دبانے پر ری سیلر کا حصہ آپ کے ذمے لکھا جائے گا',
    rm: 'Ye dabane par reseller ka hissa aap ke zimme likha jaye ga',
    en: "This puts the reseller's share on your account",
  },
  orderAccept: { ur: 'قبول کریں', en: 'Accept', rm: 'Qubool karen' },
  orderReject: { ur: 'معذرت، نہیں ہو سکے گا', en: "Can't fulfil", rm: 'Maazrat, nahi ho sakega' },
  rejectReasonAsk: { ur: 'وجہ لکھیں (ریسیلر کو یہی جائے گی)', en: 'Reason (the reseller sees this)', rm: 'Wajah likhen (reseller ko yehi jayegi)' },
  supplierOrdersNav: { ur: 'آرڈرز', en: 'Orders', rm: 'Orders' },
  supplierStockNav: { ur: 'مال', en: 'Stock', rm: 'Maal' },

  // ---- Maal ka hisab (inventory) — dukan ke andar ka hisab, bahar kabhi nahi
  inventoryNav: { ur: 'مال کا حساب', en: 'Inventory', rm: 'Maal ka hisab' },

  // ---- Status ke lafz — us khali khane ka jawab jahan reseller ruk jati hai
  pitchAsk: { ur: 'کیا لکھوں؟ — تین جملے دیکھیں', en: 'Not sure what to write? — see 3 lines', rm: 'Kya likhoon? — teen jumle dekhen' },
  pitchAsking: { ur: 'جملے بن رہے ہیں…', en: 'Writing…', rm: 'Jumle ban rahe hain…' },
  pitchAgain: { ur: 'اور جملے دکھائیں', en: 'Show me others', rm: 'Aur jumle dikhayen' },
  pitchFailed: { ur: 'ابھی نہیں ہو سکا — دوبارہ کوشش کریں', en: 'Could not do that — try again', rm: 'Abhi nahi ho saka — dobara koshish karen' },
  inventoryBody: {
    ur: 'کیا آیا، کیا گیا، اور ابھی کیا پڑا ہے۔ یہ حساب صرف آپ کو نظر آتا ہے۔',
    en: 'What came in, what went out, and what is left. Only you can see this.',
    rm: 'Kya aaya, kya gaya, aur abhi kya para hai. Ye hisab sirf aap ko nazar aata hai.',
  },
  stockValue: { ur: 'مال کی قیمت', en: 'Stock value', rm: 'Maal ki qeemat' },
  stockValuePartial: {
    ur: 'صرف اُس مال کی جس کی لاگت آپ نے بتائی',
    en: 'Only for stock where you entered a cost',
    rm: 'Sirf us maal ki jis ki lagat aap ne batayi',
  },
  stockValueUnknown: {
    ur: 'ابھی کسی مال کی لاگت نہیں بتائی گئی',
    en: 'No costs entered yet',
    rm: 'Abhi kisi maal ki lagat nahi batayi gayi',
  },
  piecesTotal: { ur: 'کل پیس', en: 'Total pieces', rm: 'Kul pieces' },
  stockOutCount: { ur: 'ختم', en: 'Out of stock', rm: 'Khatam' },
  stockLowCount: { ur: 'کم رہ گیا', en: 'Running low', rm: 'Kam reh gaya' },
  runningLow: { ur: 'ختم اور ختم ہونے والا مال', en: 'Out and running low', rm: 'Khatam aur khatam hone wala maal' },
  runningLowBody: {
    ur: 'پچھلے ۳۰ دن میں سب سے زیادہ چلنے والا مال سب سے اوپر — یہی پہلے منگوانا ہے۔',
    en: 'Fastest-moving in the last 30 days first — order these first.',
    rm: 'Pichhle 30 din mein sab se zyada chalne wala maal sab se upar — yehi pehle mangwana hai.',
  },
  nothingLow: { ur: 'ابھی کچھ ختم نہیں ہو رہا', en: 'Nothing running low', rm: 'Abhi kuch khatam nahi ho raha' },
  soldLast30: { ur: '۳۰ دن میں نکلا', en: 'Sold in 30 days', rm: '30 din mein nikla' },
  stockRegister: { ur: 'مال کا رجسٹر', en: 'Stock register', rm: 'Maal ka register' },
  stockRegisterBody: {
    ur: 'گنتی کب اور کیوں بدلی — ہر قطار، ہمیشہ کے لیے۔',
    en: 'When and why the count changed — every line, kept forever.',
    rm: 'Ginti kab aur kyun badli — har qatar, hamesha ke liye.',
  },
  noMoves: { ur: 'ابھی رجسٹر خالی ہے', en: 'Register is empty', rm: 'Abhi register khali hai' },
  allStockBody: {
    ur: 'یہاں سے کسی بھی مال میں نیا مال ڈالیں — ختم ہونے کا انتظار کیے بغیر۔',
    en: 'Add stock to anything from here — no need to wait until it runs out.',
    rm: 'Yahan se kisi bhi maal mein naya maal daalen — khatam hone ka intezar kiye baghair.',
  },
  stockSearchPlaceholder: {
    ur: 'مال کا نام یا SKU…',
    en: 'Product name or SKU…',
    rm: 'Maal ka naam ya SKU…',
  },
  noStockMatch: { ur: 'اس نام کا کوئی مال نہیں ملا', en: 'No stock matched', rm: 'Is naam ka koi maal nahi mila' },
  stockInAction: { ur: 'نیا مال آیا', en: 'Stock in', rm: 'Naya maal aaya' },
  stockInQty: { ur: 'کتنا آیا', en: 'How many', rm: 'Kitna aaya' },
  stockInCost: { ur: 'فی پیس لاگت (مرضی)', en: 'Cost per piece (optional)', rm: 'Per piece lagat (marzi)' },
  stockInCostNote: {
    ur: 'یہ نمبر صرف آپ دیکھتے ہیں — نہ ری سیلر، نہ ہم اسے کہیں چھاپتے ہیں۔',
    en: 'Only you see this number — never a reseller, never printed anywhere else.',
    rm: 'Ye number sirf aap dekhte hain — na reseller, na hum isay kahin chhapte hain.',
  },
  writeOffAction: { ur: 'ضائع ہوا', en: 'Write off', rm: 'Zaya hua' },
  writeOffQty: { ur: 'کتنا', en: 'How many', rm: 'Kitna' },
  writeOffReason: { ur: 'وجہ (لازمی)', en: 'Reason (required)', rm: 'Wajah (lazmi)' },
  reorderLevelLabel: { ur: 'اتنا رہ جائے تو بتا دیں', en: 'Tell me at', rm: 'Itna reh jaye to bata dein' },
  reorderLevelOff: { ur: '۰ = اشارہ بند', en: '0 = no alert', rm: '0 = ishara band' },
  unitCostShort: { ur: 'لاگت', en: 'Cost', rm: 'Lagat' },
  balanceAfter: { ur: 'بعد میں', en: 'Balance', rm: 'Baad mein' },
  moveOPENING: { ur: 'پہلی گنتی', en: 'Opening', rm: 'Pehli ginti' },
  moveSTOCK_IN: { ur: 'نیا مال آیا', en: 'Stock in', rm: 'Naya maal aaya' },
  moveORDER_RESERVED: { ur: 'آرڈر پر نکلا', en: 'Order placed', rm: 'Order par nikla' },
  moveORDER_RELEASED: { ur: 'آرڈر منسوخ — واپس', en: 'Order cancelled — back', rm: 'Order mansookh — wapas' },
  moveRETURN_TO_SHELF: { ur: 'پارسل واپس آیا', en: 'Parcel returned', rm: 'Parcel wapas aaya' },
  moveMANUAL_FIX: { ur: 'گنتی درست کی', en: 'Count corrected', rm: 'Ginti durust ki' },
  moveDAMAGE: { ur: 'ضائع ہوا', en: 'Written off', rm: 'Zaya hua' },
  moveTRANSFER_OUT: { ur: 'گودام سے نکلا', en: 'Moved out', rm: 'Godown se nikla' },
  moveTRANSFER_IN: { ur: 'گودام میں آیا', en: 'Moved in', rm: 'Godown mein aya' },

  // ---- Godown
  warehouses: { ur: 'گودام', en: 'Locations', rm: 'Godown' },
  warehousesBody: {
    ur: 'دکان، سٹور، یا فیکٹری — مال کہاں پڑا ہے۔ ایک سے زیادہ جگہ ہو تو یہاں سے سنبھالیں۔',
    en: 'Shop, store room, factory — where your stock sits. Manage them here.',
    rm: 'Dukan, store, ya factory — maal kahan para hai. Ek se zyada jagah ho to yahan se sambhalen.',
  },
  warehouseDefault: { ur: 'بنیادی', en: 'Default', rm: 'Bunyadi' },
  warehouseAdd: { ur: 'نیا گودام', en: 'Add location', rm: 'Naya godown' },
  warehouseName: { ur: 'نام', en: 'Name', rm: 'Naam' },
  warehouseClose: { ur: 'بند کریں', en: 'Close', rm: 'Band karen' },
  warehouseOpen: { ur: 'چالو کریں', en: 'Reopen', rm: 'Chalu karen' },
  warehouseClosed: { ur: 'بند', en: 'Closed', rm: 'Band' },
  warehouseNoDelete: {
    ur: 'گودام مٹایا نہیں جاتا — بند کر دیں۔ مٹانے سے اُس کے رجسٹر کی ہر قطار بے معنی ہو جاتی ہے۔',
    en: 'Locations are closed, never deleted — deleting would void every register line that names them.',
    rm: 'Godown mitaya nahi jata — band kar dein. Mitane se us ke register ki har qatar bemani ho jati hai.',
  },
  pieces: { ur: 'پیس', en: 'pieces', rm: 'pieces' },
  transferAction: { ur: 'منتقل کریں', en: 'Move', rm: 'Muntaqil karen' },
  transferFrom: { ur: 'کہاں سے', en: 'From', rm: 'Kahan se' },
  transferTo: { ur: 'کہاں', en: 'To', rm: 'Kahan' },
  inWarehouse: { ur: 'گودام', en: 'Location', rm: 'Godown' },

  // ---- Khep aur maddat — sirf us dukan ke liye jo ye likhti hai
  expiringTitle: { ur: 'میعاد', en: 'Expiry', rm: 'Maddat' },
  expiringBody: {
    ur: 'جس مال کی میعاد گزر چکی یا قریب ہے — پہلے وہی نکالیں۔',
    en: 'Stock that has expired or is close to it — move this first.',
    rm: 'Jis maal ki maddat guzar chuki ya qareeb hai — pehle wohi nikalen.',
  },
  batchNo: { ur: 'کھیپ نمبر (مرضی)', en: 'Batch no. (optional)', rm: 'Khep number (marzi)' },
  batchExpiry: { ur: 'میعاد (مرضی)', en: 'Expiry (optional)', rm: 'Maddat (marzi)' },
  batchExpiryNote: {
    ur: 'صرف اُس مال پر جس کی میعاد ہوتی ہے — کریانہ، کاسمیٹکس۔ کپڑے پر خالی چھوڑ دیں۔',
    en: 'Only for stock that expires — grocery, cosmetics. Leave empty for fabric.',
    rm: 'Sirf us maal par jis ki maddat hoti hai — kirana, cosmetics. Kapre par khali chhor den.',
  },
  batchExpired: { ur: 'میعاد گزر چکی', en: 'Expired', rm: 'Maddat guzar chuki' },
  batchExpiringIn: { ur: 'دن باقی', en: 'days left', rm: 'din baqi' },
  batchExpiredAgo: { ur: 'دن پہلے گزری', en: 'days ago', rm: 'din pehle guzri' },
  batchWriteOff: { ur: 'ضائع لکھیں', en: 'Write off', rm: 'Zaya likhen' },
  batchLeft: { ur: 'باقی', en: 'left', rm: 'baqi' },
  supplierDashboardNav: { ur: 'ہوم', en: 'Home', rm: 'Home' },
  navCollapse: { ur: 'پٹی سمیٹیں', rm: 'Patti sameten', en: 'Collapse' },
  navExpand: { ur: 'پٹی کھولیں', rm: 'Patti kholen', en: 'Expand' },
  supplierDashboardBody: {
    ur: 'آپ کی دکان کا ایک نظر میں حساب — کیا کام رکا ہوا ہے، کس ری سیلر کے کتنے پیسے دینے ہیں، اور کون سا مال چل رہا ہے۔',
    rm: 'Aap ki dukan ka ek nazar mein hisab — kya kaam ruka hua hai, kis reseller ke kitne paise dene hain, aur kaun sa maal chal raha hai.',
    en: 'Your shop at a glance — what is waiting on you, what you owe which reseller, and what is moving.',
  },
  ordersNeedAnswer: {
    ur: 'آرڈرز آپ کے جواب کے منتظر',
    rm: 'Order aap ke jawab ke muntazir',
    en: 'orders waiting on you',
  },
  feeDueLabel: { ur: 'ہماری فیس (باقی)', rm: 'Hamari fee (baqi)', en: 'Our fee (due)' },
  ordersTrend: { ur: 'آرڈرز کی چال', rm: 'Orders ki chaal', en: 'Order trend' },
  ordersTrendCaption: {
    ur: 'ہر ستون ایک دن — بائیں پرانا، دائیں آج',
    rm: 'Har sutoon ek din — baayen purana, daayen aaj',
    en: 'One bar per day — oldest left, today right',
  },
  daysShort: { ur: 'دن', rm: 'din', en: 'days' },
  daysInTransit: { ur: 'دن سے راستے میں', rm: 'din se raste mein', en: 'days in transit' },
  rupees: { ur: 'روپے', rm: 'rupay', en: 'rupees' },
  earningsTrend: { ur: 'کمائی کی چال', rm: 'Kamai ki chaal', en: 'Earnings trend' },
  earningsTrendCaption: {
    ur: 'ہر ستون ایک دن — جس دن مال پہنچا، اسی دن کی کمائی',
    rm: 'Har sutoon ek din — jis din maal pohancha, usi din ki kamai',
    en: 'One bar per day — counted on the day the order landed',
  },
  dashboardOrdersHint: {
    ur: 'آپ کے تازہ آرڈرز اور ہر ایک پر آپ کا منافع',
    rm: 'Aap ke taaza order aur har ek par aap ka munafa',
    en: 'Your latest orders and your profit on each',
  },
  ofFinishedOrders: { ur: 'مکمل ہوئے آرڈرز میں سے', rm: 'mukammal hue orders mein se', en: 'of finished orders' },
  stockLeftShort: { ur: 'باقی:', rm: 'Baqi:', en: 'Left:' },
  confirm: { ur: 'تصدیق کریں', en: 'Confirm', rm: 'Tasdeeq' },
  confirmQuestion: {
    ur: 'کیا کسٹمر سے بات ہو گئی ہے اور اس نے آرڈر پکا کیا ہے؟',
    en: 'Have you spoken to the customer and did they confirm the order?',
    rm: 'Kya aap ne customer se baat kar li aur us ne order confirm kiya?',
  },
  confirmYes: { ur: 'ہاں، تصدیق کریں', en: 'Yes, confirm it', rm: 'Ji haan, tasdeeq karen' },
  notNow: { ur: 'ابھی نہیں', en: 'Not now', rm: 'Abhi nahi' },
  confirmFailed: { ur: 'تصدیق نہیں ہو سکی', en: 'Could not confirm', rm: 'Tasdeeq nahi ho saki' },
  profit: { ur: 'منافع', en: 'Profit', rm: 'Munafa' },
  // ---- home sections (Alahdeen jaisa dhaancha)
  topCategories: { ur: 'اہم کیٹگریز', en: 'Top categories', rm: 'Ahem categories' },
  viewAllCategories: { ur: 'ساری کیٹگریز دیکھیں', en: 'View all categories', rm: 'Saari categories dekhen' },
  liveNow: { ur: 'ابھی', en: 'Live', rm: 'Live' },
  recentlyListed: { ur: 'نیا لسٹ ہوا مال', en: 'Recently listed', rm: 'Abhi abhi laga' },
  trendingCategories: { ur: 'مقبول کیٹگریز', en: 'Trending categories', rm: 'Chalne wali categories' },
  trendingNow: { ur: 'ابھی سب سے زیادہ چل رہا ہے', rm: 'Abhi sab se zyada chal raha hai', en: 'Selling most right now' },
  trendingWindow: { ur: 'پچھلے 30 دن کے آرڈرز سے', rm: 'Pichhle 30 din ke orders se', en: 'From the last 30 days of orders' },
  ordersShort: { ur: 'آرڈر', rm: 'order', en: 'orders' },
  piecesShort: { ur: 'پیس', rm: 'piece', en: 'pcs' },
  onlyLeft: { ur: 'ہی باقی', rm: 'hi baqi', en: 'left' },
  myReturnsLabel: { ur: 'میرا واپسی ریکارڈ', rm: 'Mera wapsi record', en: 'My return rate' },
  returnsHint: {
    ur: 'یہی نمبر ہول سیلر کو بھی دکھتا ہے',
    rm: 'Yehi number wholesaler ko bhi dikhta hai',
    en: 'Wholesalers see this same number',
  },
  yourMovers: { ur: 'آپ کا سب سے زیادہ چلنے والا مال', rm: 'Aap ka sab se zyada chalne wala maal', en: 'Your best movers' },
  featuredSuppliers: { ur: 'نمایاں ہول سیلرز', en: 'Featured suppliers', rm: 'Numaya wholesalers' },
  popularProducts: { ur: 'مقبول آئٹمز', en: 'Popular products', rm: 'Maqbool maal' },
  justNow: { ur: 'ابھی ابھی', en: 'just now', rm: 'abhi abhi' },
  minutesAgo: { ur: 'منٹ پہلے', en: 'min ago', rm: 'minute pehle' },
  hoursAgo: { ur: 'گھنٹے پہلے', en: 'h ago', rm: 'ghante pehle' },
  daysAgo: { ur: 'دن پہلے', en: 'd ago', rm: 'din pehle' },
  weeksAgo: { ur: 'ہفتے پہلے', en: 'w ago', rm: 'hafte pehle' },
  monthsAgo: { ur: 'مہینے پہلے', en: 'mo ago', rm: 'mahine pehle' },
  yearsAgo: { ur: 'سال پہلے', en: 'y ago', rm: 'saal pehle' },
  // ---- wholesaler card ki tafseel
  // ---- reseller ke paise (payout)
  myMoney: { ur: 'میرے پیسے', en: 'My money', rm: 'Mere paise' },
  payoutsNav: { ur: 'ریسیلر کے پیسے', en: 'Reseller payouts', rm: 'Reseller ke paise' },
  moneyReceived: { ur: 'مل چکے', en: 'Received', rm: 'Mil chuke' },
  moneyAwaiting: { ur: 'آنا باقی', en: 'Awaiting', rm: 'Aana baqi' },
  payoutPending: { ur: 'ہول سیلر نے ابھی بھیجے نہیں', en: 'Wholesaler has not sent yet', rm: 'Wholesaler ne abhi bheje nahi' },
  payoutSentClaim: { ur: 'ہول سیلر کا کہنا: بھیج دیے', en: 'Wholesaler says: sent', rm: 'Wholesaler ka kehna: bhej diye' },
  payoutSettled: { ur: 'حساب بند', en: 'Settled', rm: 'Hisab band' },
  payoutDisputed: { ur: 'تنازعہ — ٹیم دیکھ رہی ہے', en: 'Disputed — team is looking', rm: 'Jhagra — team dekh rahi hai' },
  payoutReceived: { ur: 'مل گئے', en: 'Received', rm: 'Mil gaye' },
  payoutNotReceived: { ur: 'نہیں ملے', en: 'Not received', rm: 'Nahi mile' },
  payoutReason: { ur: 'مختصر وجہ', en: 'Short reason', rm: 'Mukhtasir wajah' },
  payoutSend: { ur: 'بھیج دیے', en: 'Sent', rm: 'Bhej diye' },
  payoutReference: { ur: 'ٹرانزیکشن آئی ڈی', en: 'Transaction ID', rm: 'Transaction ID' },
  payoutOverdue: { ur: 'تاخیر', en: 'Overdue', rm: 'Der' },
  payoutEmpty: { ur: 'کوئی حساب باقی نہیں', en: 'Nothing outstanding', rm: 'Koi hisab baqi nahi' },
  payoutNote: {
    ur: 'یہ رقم ہول سیلر کے پاس ہے، ہمارے پاس نہیں۔ ملنے پر تصدیق کریں تاکہ حساب بند ہو۔',
    en: 'This money is with the wholesaler, not with us. Confirm when it arrives so the account closes.',
    rm: 'Ye raqam wholesaler ke paas hai, hamare paas nahi. Milne par tasdeeq karen taake hisab band ho.',
  },
  saving: { ur: 'ہو رہا ہے…', en: 'Saving…', rm: 'Ho raha hai…' },
  cancel: { ur: 'رہنے دیں', en: 'Cancel', rm: 'Rehne den' },
  // ---- money ka safha (dono taraf)
  payoutNoteSupplier: {
    ur: 'یہ رقم ریسیلر کی ہے جو کیش آن ڈیلیوری میں آپ کے پاس آئی۔ بھیجنے پر ٹرانزیکشن آئی ڈی لکھیں — حساب ریسیلر کی تصدیق پر بند ہوتا ہے۔',
    en: 'This is the reseller’s share of the cash you collected. Add the transaction ID when you send it — the account closes when she confirms.',
    rm: 'Ye raqam reseller ki hai jo COD mein aap ke paas aayi. Bhejte waqt transaction ID likhen — hisab reseller ki tasdeeq par band hota hai.',
  },
  // ---- payout ki tareekh (dono taraf ek jaisi)
  tlDelivered: { ur: 'مال پہنچا', en: 'Delivered', rm: 'Maal pohancha' },
  tlClaimedSent: { ur: 'ہول سیلر: بھیج دیے', en: 'Wholesaler: sent', rm: 'Wholesaler: bhej diye' },
  tlConfirmed: { ur: 'ریسیلر: مل گئے', en: 'Reseller: received', rm: 'Reseller: mil gaye' },
  tlDisputed: { ur: 'ریسیلر: نہیں ملے', en: 'Reseller: not received', rm: 'Reseller: nahi mile' },
  tlReference: { ur: 'آئی ڈی', en: 'ID', rm: 'ID' },
  // ---- mahine ka statement (dono taraf ek jaisa)
  statement: { ur: 'ماہانہ گوشوارہ', en: 'Monthly statement', rm: 'Mahane ka gosh-wara' },
  statementPrint: { ur: 'پرنٹ / PDF', en: 'Print / PDF', rm: 'Print / PDF' },
  stOrder: { ur: 'آرڈر', en: 'Order', rm: 'Order' },
  stDate: { ur: 'تاریخ', en: 'Date', rm: 'Tareekh' },
  stAmount: { ur: 'رقم', en: 'Amount', rm: 'Raqam' },
  stStatus: { ur: 'حالت', en: 'Status', rm: 'Halat' },
  stReference: { ur: 'ٹرانزیکشن آئی ڈی', en: 'Transaction ID', rm: 'Transaction ID' },
  stEmpty: { ur: 'اس مہینے کوئی حساب نہیں بنا', en: 'Nothing in this month', rm: 'Is mahine koi hisab nahi bana' },
  stPrev: { ur: 'پچھلا مہینہ', en: 'Previous month', rm: 'Pichhla mahina' },
  stNext: { ur: 'اگلا مہینہ', en: 'Next month', rm: 'Agla mahina' },
  stFootnote: {
    ur: 'یہ رقم ہول سیلر اور ریسیلر کے درمیان ہے۔ اوئے بازار پیسے وصول یا ادا نہیں کرتا — ہم صرف ریکارڈ رکھتے ہیں کہ کس نے کیا کہا اور کب۔',
    en: 'This money moves between the wholesaler and the reseller. OyeBazar neither collects nor pays it — we only record who said what, and when.',
    rm: 'Ye raqam wholesaler aur reseller ke darmiyan hai. OyeBazar paise wasool ya ada nahi karta — hum sirf record rakhte hain ke kis ne kya kaha aur kab.',
  },
  // ---- dukan ka apna waada
  // ---- delivery ka rate
  shopRules: { ur: 'دکان کے قواعد', en: 'Shop rules', rm: 'Dukan ke qawaid' },
  shopRulesBody: {
    ur: 'ڈیلیوری کا ریٹ اور ادائیگی کا وعدہ — یہ دونوں ریسیلر کو آرڈر سے پہلے دکھتے ہیں۔',
    en: 'Delivery charge and payment promise — resellers see both before they order.',
    rm: 'Delivery ka rate aur adaigi ka waada — ye dono reseller ko order se pehle dikhte hain.',
  },
  deliveryTitle: {
    ur: 'ڈیلیوری کا ریٹ — کورئیر کا بل آپ بھرتے ہیں، اس لیے ریٹ بھی آپ کا',
    en: 'Delivery charge — you pay the courier, so you set it',
    rm: 'Delivery ka rate — courier ka bill aap bharte hain, is liye rate bhi aap ka',
  },
  deliveryInCity: { ur: 'اسی شہر میں', en: 'Same city', rm: 'Isi sheher mein' },
  deliveryOutCity: { ur: 'دوسرے شہر', en: 'Other city', rm: 'Doosre sheher' },
  deliverySaved: { ur: 'محفوظ — نئے آرڈرز پر لاگو', en: 'Saved — applies to new orders', rm: 'Mehfooz — naye orders par' },
  deliveryNote: {
    ur: 'ریسیلر کو آرڈر سے پہلے یہی ریٹ دکھتا ہے۔ بدلنے سے پرانے آرڈرز پر اثر نہیں پڑتا۔',
    en: 'Resellers see this before they order. Changing it does not affect existing orders.',
    rm: 'Reseller ko order se pehle yehi rate dikhta hai. Badalne se purane orders par asar nahi parta.',
  },
  termTitle: {
    ur: 'میرا وعدہ — ڈیلیوری کے بعد ریسیلر کو پیسے',
    en: 'My promise — paying the reseller after delivery',
    rm: 'Mera waada — delivery ke baad reseller ko paise',
  },
  termSameDay: { ur: 'اُسی دن', en: 'Same day', rm: 'Usi din' },
  termDays: { ur: 'دن میں', en: 'days', rm: 'din mein' },
  termSaved: { ur: 'محفوظ ہو گیا — نئے آرڈرز پر لاگو', en: 'Saved — applies to new orders', rm: 'Mehfooz — naye orders par' },
  termNote: {
    ur: 'یہ وعدہ ریسیلر کو آرڈر سے پہلے دکھتا ہے، آپ کے اصل ریکارڈ کے ساتھ۔ بدلنے سے پرانے حساب پر اثر نہیں پڑتا۔',
    en: 'Resellers see this before they order, next to your actual record. Changing it does not affect existing payouts.',
    rm: 'Ye waada reseller ko order se pehle dikhta hai, aap ke asal record ke saath. Badalne se purane hisab par asar nahi parta.',
  },
  termPromise: { ur: 'وعدہ', en: 'Promise', rm: 'Waada' },
  // ---- rang / size (variants)
  sameAsEnglish: { ur: 'خالی چھوڑیں تو انگریزی نام ہی چلے گا', en: 'Leave empty — the English name is used', rm: 'Khali chhoren — angrezi naam hi chalega' },
  photoRequired: {
    ur: 'کم از کم ایک تصویر لگائیں — بغیر تصویر کے مال کوئی نہیں لگاتی۔',
    en: 'Add at least one photo — nothing sells here without one.',
    rm: 'Kam az kam ek tasveer lagayen — bina tasveer ke maal koi nahi lagati.',
  },
  sameAsUrdu: { ur: 'خالی چھوڑیں تو اردو نام ہی چلے گا', en: 'Leave empty — the Urdu name is used', rm: 'Khali chhoren — Urdu naam hi chalega' },
  variantNeedsName: {
    ur: 'ایک قطار میں رنگ اور سائز دونوں خالی ہیں — کوئی ایک لکھیں یا وہ قطار ہٹا دیں۔',
    en: 'One row has neither colour nor size — fill one, or remove that row.',
    rm: 'Ek qatar mein rang aur size dono khali hain — koi ek likhen ya wo qatar hata den.',
  },
  optional: { ur: 'اختیاری', en: 'optional', rm: 'ikhtiyari' },
  variantsAddNote: {
    ur: 'اگر ایک ہی قسم ہے تو یہ خالی چھوڑ دیں — اوپر والی گنتی ہی چلے گی۔ بعد میں بھی لگ سکتے ہیں۔',
    en: 'One kind only? Leave this empty — the count above is used. You can add these later too.',
    rm: 'Ek hi qism hai to ye khali chhor den — upar wali ginti chalegi. Baad mein bhi lag sakte hain.',
  },
  variantsTitle: { ur: 'رنگ اور سائز', en: 'Colours and sizes', rm: 'Rang aur size' },
  variantColour: { ur: 'رنگ', en: 'Colour', rm: 'Rang' },
  variantSize: { ur: 'سائز', en: 'Size', rm: 'Size' },
  variantAdd: { ur: 'شامل کریں', en: 'Add', rm: 'Shamil karen' },
  variantRemove: { ur: 'ہٹائیں', en: 'Remove', rm: 'Hatayen' },
  variantTotal: { ur: 'کل', en: 'Total', rm: 'Kul' },
  variantEmpty: {
    ur: 'ابھی کوئی رنگ یا سائز نہیں — پورے مال کی ایک ہی گنتی چل رہی ہے۔',
    en: 'No colours or sizes yet — one count for the whole item.',
    rm: 'Abhi koi rang ya size nahi — poore maal ki ek hi ginti chal rahi hai.',
  },
  // Ginti ke saath alag lafz — "3 رنگ اور سائز" ajeeb parhta hai
  variantCount: { ur: 'جوڑے', en: 'variants', rm: 'jorhe' },
  manage: { ur: 'تفصیل', en: 'Manage', rm: 'Tafseel' },
  photos: { ur: 'تصویریں', en: 'photos', rm: 'tasveerein' },
  variantPhoto: { ur: 'اس رنگ کی تصویر', en: 'Photo for this one', rm: 'Is jorhe ki tasveer' },
  variantPhotoAdd: { ur: 'تصویر لگائیں', en: 'Add photo', rm: 'Tasveer lagayen' },
  variantPick: { ur: 'رنگ / سائز چنیں', en: 'Pick colour / size', rm: 'Rang / size chunen' },
  // ---- filters
  sortNewest: { ur: 'نیا پہلے', en: 'Newest', rm: 'Naya pehle' },
  sortPriceLow: { ur: 'سستا پہلے', en: 'Cheapest', rm: 'Sasta pehle' },
  sortPriceHigh: { ur: 'مہنگا پہلے', en: 'Priciest', rm: 'Mehnga pehle' },
  sortProfit: { ur: 'زیادہ منافع', en: 'Best margin', rm: 'Zyada munafa' },
  viewGrid: { ur: 'گرڈ', en: 'Grid', rm: 'Grid' },
  viewList: { ur: 'قطار', en: 'List', rm: 'Qatar' },
  yourPriceShort: { ur: 'آپ کا ریٹ', en: 'Your price', rm: 'Aap ka rate' },
  filterPrice: { ur: 'ریٹ', en: 'Price', rm: 'Rate' },
  filterFrom: { ur: 'سے', en: 'From', rm: 'Se' },
  filterTo: { ur: 'تک', en: 'To', rm: 'Tak' },
  filterInStock: { ur: 'صرف موجود مال', en: 'In stock only', rm: 'Sirf mojood maal' },
  filterApply: { ur: 'لگائیں', en: 'Apply', rm: 'Lagayen' },
  filterClear: { ur: 'ہٹائیں', en: 'Clear', rm: 'Hatayen' },
  filterFresh: { ur: 'صرف نیا مال', en: 'Fresh stock only', rm: 'Sirf naya maal' },
  filterCity: { ur: 'شہر', en: 'City', rm: 'Sheher' },
  filterResults: { ur: 'نتائج', en: 'results', rm: 'natije' },
  moneyNav: { ur: 'پیسے', en: 'Money', rm: 'Paise' },

  /*
   * Phone ki neeche wali patti ke naam — SIRF us patti ke liye.
   *
   * 🔴 Ye alag is liye hain ke 360px ke phone par saat khane hain, yani har khane ko
   * 51px milte hain. Us mein "Wholesalers" aur "Catalogue" poore nahi aate — wo "Wholesa…"
   * aur "Catalog…" ban jate hain, aur teen nuqton ke sath dono ek jaise lagne lagte hain.
   *
   * Aur ye sirf jagah ka masla nahi tha: patti ka naam FEHRIST ka unwan nahi hota, wo
   * ek lafz ka nishan hota hai. Har app yehi karta hai — safhe par "Wholesalers" likha
   * rehta hai, patti par "Dukanein".
   */
  tabDashboard: { ur: 'ہوم', en: 'Home', rm: 'Home' },
  tabCatalogue: { ur: 'مال', en: 'Stock', rm: 'Maal' },
  tabWholesalers: { ur: 'دکانیں', en: 'Shops', rm: 'Dukan' },
  tabTemplates: { ur: 'ڈیزائن', en: 'Design', rm: 'Design' },
  tabOrders: { ur: 'آرڈر', en: 'Orders', rm: 'Order' },
  tabMoney: { ur: 'پیسے', en: 'Money', rm: 'Paise' },
  tabBazaar: { ur: 'بازار', en: 'Bazaar', rm: 'Bazaar' },

  // Courier aur CN — dukan se dispatch ke waqt
  courierAsk: {
    ur: 'کس کورئیر کے ہاتھ؟',
    en: 'Which courier?',
    rm: 'Kis courier ke haath?',
  },
  cnAsk: { ur: 'CN نمبر', en: 'CN number', rm: 'CN number' },
  cnHint: {
    ur: 'وہی نمبر جو کورئیر کی رسید پر ہے۔ ریسیلر یہی نمبر اپنی گاہک کو بھیجے گی۔',
    en: "The number on the courier receipt. The reseller passes it to her customer.",
    rm: 'Wohi number jo courier ki rasid par hai. Reseller yehi number apni customer ko bhejegi.',
  },
  // Reseller ke order safhe par
  parcelTitle: { ur: 'پارسل', en: 'Parcel', rm: 'Parcel' },
  parcelSelf: {
    ur: 'دکان کے اپنے رائیڈر کے ہاتھ — کوئی CN نمبر نہیں',
    en: 'With the shop’s own rider — no CN number',
    rm: 'Dukan ke apne rider ke haath — koi CN number nahi',
  },
  parcelCopy: { ur: 'کاپی', en: 'Copy', rm: 'Copy' },
  parcelCopied: { ur: 'کاپی ہو گیا', en: 'Copied', rm: 'Copy ho gaya' },
  parcelTrack: { ur: 'کورئیر کی سائٹ', en: 'Courier site', rm: 'Courier ki site' },
  parcelNone: {
    ur: 'دکان نے ابھی کورئیر نہیں لکھا',
    en: 'The shop has not recorded a courier yet',
    rm: 'Dukan ne abhi courier nahi likha',
  },

  // ---- Customer ka safha: apna pata khud likhein (/pata/<token>) ----
  pataIntro: {
    ur: 'اپنا پتہ لکھیں — پارسل اسی پتے پر آئے گا',
    en: 'Write your address — the parcel comes to this address',
    rm: 'Apna pata likhein — parcel isi pate par aayega',
  },
  pataName: { ur: 'آپ کا نام', en: 'Your name', rm: 'Aap ka naam' },
  pataPhone: { ur: 'موبائل نمبر', en: 'Mobile number', rm: 'Mobile number' },
  pataPhoneHint: {
    ur: 'پارسل آنے سے پہلے کورئیر اسی نمبر پر کال کرے گا',
    en: 'The courier calls this number before delivery',
    rm: 'Parcel aane se pehle courier isi number par call karega',
  },
  pataAddress: { ur: 'پورا پتہ', en: 'Full address', rm: 'Poora pata' },
  pataAddressHint: {
    ur: 'گھر/دکان کا نمبر، گلی، اور کوئی نشانی — جتنا تفصیل سے لکھیں گی، پارسل اتنی آسانی سے پہنچے گا',
    en: 'House/shop number, street, and a landmark — the more detail, the easier it arrives',
    rm: 'Ghar/dukan ka number, gali, aur koi nishani — jitna tafseel se likhen gi, parcel utni asani se pohanchega',
  },
  pataArea: { ur: 'علاقہ / شہر', en: 'Area / city', rm: 'Ilaqa / sheher' },
  pataPin: { ur: 'اپنی لوکیشن بھی بھیجیں', en: 'Share your location too', rm: 'Apni location bhi bhejein' },
  pataPinBody: {
    ur: 'لازمی نہیں — مگر لوکیشن بھیجنے سے کورئیر آپ کا گھر آسانی سے ڈھونڈ لیتا ہے',
    en: 'Not required — but it helps the courier find you',
    rm: 'Lazmi nahi — magar location bhejne se courier aap ka ghar asani se dhoondh leta hai',
  },
  pataPinGot: { ur: '✓ لوکیشن لگ گئی', en: '✓ Location added', rm: '✓ Location lag gayi' },
  pataPinGetting: { ur: 'لوکیشن لی جا رہی ہے…', en: 'Getting location…', rm: 'Location li ja rahi hai…' },
  pataPinFailed: { ur: 'دوبارہ کوشش کریں', en: 'Try again', rm: 'Dobara koshish karen' },
  pataSubmit: { ur: 'پتہ بھیجیں', en: 'Send address', rm: 'Pata bhejein' },
  pataSending: { ur: 'بھیجا جا رہا ہے…', en: 'Sending…', rm: 'Bheja ja raha hai…' },
  pataDone: { ur: 'پتہ مل گیا، شکریہ', en: 'Address received, thank you', rm: 'Pata mil gaya, shukriya' },
  pataDoneBody: {
    ur: 'اب دکاندار آپ سے رابطہ کرے گی اور پارسل بھیج دے گی',
    en: 'The seller will get in touch and send the parcel',
    rm: 'Ab dukandar aap se rabta karegi aur parcel bhej degi',
  },
  pataUsedTitle: { ur: 'آرڈر بن چکا ہے', en: 'The order is placed', rm: 'Order ban chuka hai' },
  pataUsedBody: {
    ur: 'اس لنک پر آرڈر بن چکا ہے۔ کوئی مسئلہ ہو تو دکاندار سے واٹس ایپ پر بات کریں۔',
    en: 'This link already has an order. If something is wrong, message the seller on WhatsApp.',
    rm: 'Is link par order ban chuka hai. Koi masla ho to dukandar se WhatsApp par baat karen.',
  },
  pataExpiredTitle: { ur: 'یہ لنک پرانا ہو چکا', en: 'This link has expired', rm: 'Ye link purana ho chuka' },
  pataExpiredBody: {
    ur: 'دکاندار سے نیا لنک منگوا لیں',
    en: 'Ask the seller for a new link',
    rm: 'Dukandar se naya link mangwa len',
  },
  pataFailed: { ur: 'دوبارہ کوشش کریں', en: 'Please try again', rm: 'Dobara koshish karen' },
  pataFooter: {
    ur: 'آپ کا پتہ صرف یہ پارسل بھیجنے کے لیے استعمال ہوگا',
    en: 'Your address is used only to send this parcel',
    rm: 'Aap ka pata sirf ye parcel bhejne ke liye istemal hoga',
  },

  // ---- Reseller ki taraf: link banana aur bhara hua pata ----
  askAddress: {
    ur: 'کسٹمر سے پتہ منگوائیں',
    en: 'Ask the customer for their address',
    rm: 'Customer se pata mangwayen',
  },
  askAddressHint: {
    ur: 'ایک لنک بھیجیں — کسٹمر اپنا پتہ اور لوکیشن خود لکھے گی۔ ہاتھ سے لکھنے میں ایک حرف غلط ہو تو پارسل واپس آ جاتا ہے۔',
    en: 'Send a link — the customer writes their own address and location. One wrong letter typed by hand means the parcel comes back.',
    rm: 'Ek link bhejein — customer apna pata aur location khud likhegi. Haath se likhne mein ek harf ghalat ho to parcel wapas aa jata hai.',
  },
  askAddressMaking: { ur: 'لنک بن رہا ہے…', en: 'Making the link…', rm: 'Link ban raha hai…' },
  askAddressReady: {
    ur: 'لنک تیار — کسٹمر کو بھیج دیں',
    en: 'Link ready — send it to the customer',
    rm: 'Link tayyar — customer ko bhej dein',
  },
  askAddressShare: {
    ur: 'اپنا پتہ یہاں لکھ دیں تاکہ پارسل صحیح جگہ پہنچے:',
    en: 'Please write your address here so the parcel reaches you:',
    rm: 'Apna pata yahan likh dein taake parcel sahi jagah pohanche:',
  },
  pataFromCustomer: {
    ur: '✓ یہ پتہ کسٹمر نے خود لکھا ہے',
    en: '✓ The customer wrote this address themselves',
    rm: '✓ Ye pata customer ne khud likha hai',
  },
  pataWaitingTitle: {
    ur: 'کسٹمر نے پتہ بھیج دیا',
    en: 'A customer sent their address',
    rm: 'Customer ne pata bhej diya',
  },
  pataWaitingHint: {
    ur: 'آرڈر بنانے کے لیے کھولیں',
    en: 'Open to place the order',
    rm: 'Order banane ke liye kholen',
  },

  // ---- Dukan ka safha (reseller portal) ----
  shopDeliveryCity: { ur: 'ڈیلیوری — اسی شہر', en: 'Delivery — same city', rm: 'Delivery — isi sheher' },
  shopDeliveryOther: { ur: 'ڈیلیوری — دوسرا شہر', en: 'Delivery — other city', rm: 'Delivery — doosra sheher' },
  shopPayoutTerm: { ur: 'کمیشن کب ملے گا', en: 'Commission paid in', rm: 'Commission kab milega' },
  shopPayoutSameDay: { ur: 'اسی دن', en: 'Same day', rm: 'Usi din' },
  days: { ur: 'دن', en: 'days', rm: 'din' },
  shopItems: { ur: 'مال', en: 'items', rm: 'maal' },
  shopSince: { ur: 'اوئے بازار پر', en: 'On OyeBazar', rm: 'OyeBazar par' },
  shopLastListed: { ur: 'نیا مال', en: 'New stock', rm: 'Naya maal' },
  shopGoodsTitle: { ur: 'اس دکان کا مال', en: 'What this shop sells', rm: 'Is dukan ka maal' },
  shopSeeAll: { ur: 'سارا مال دیکھیں', en: 'See all stock', rm: 'Sara maal dekhein' },

  /*
   * "Bhejein" — "Share" nahi.
   *
   * Ye button phone ka apna share sheet kholta hai, aur wahan se maal Status par,
   * Instagram par ya Facebook par jata hai. Kisi ek jagah ka naam likhna baqi do ko
   * chhupa deta.
   */
  sharePack: { ur: 'بھیجیں', en: 'Share', rm: 'Bhejein' },

  // Pack ke faislay band halat mein — ek line, aur badalne ka rasta
  packChange: { ur: 'بدلیں', en: 'Change', rm: 'Badlein' },
  packNoPrice: { ur: 'ریٹ نہیں', en: 'no price', rm: 'rate nahi' },
  packNoName: { ur: 'نام نہیں', en: 'no name', rm: 'naam nahi' },
  packNoPhone: { ur: 'نمبر نہیں', en: 'no number', rm: 'number nahi' },

  // Maal ki tafseel aur purana rate — pack par
  showStockOnPack: {
    ur: 'سائز، رنگ اور کتنا باقی',
    en: 'Size, colour and how many left',
    rm: 'Size, rang aur kitna baqi',
  },
  wasPriceLabel: { ur: 'پرانا ریٹ (کٹا ہوا)', en: 'Old price (crossed out)', rm: 'Purana rate (kata hua)' },
  wasPriceHint: {
    ur: 'خالی چھوڑ دیں تو کچھ نہیں چھپے گا',
    en: 'Leave empty and nothing prints',
    rm: 'Khali chhor den to kuch nahi chhapega',
  },
  wasPricePlaceholder: { ur: 'مثلاً 3000', en: 'e.g. 3000', rm: 'misal 3000' },
  packNoStock: { ur: 'سائز نہیں', en: 'no sizes', rm: 'size nahi' },

  // Number ka record — order lagate waqt
  phoneRisky: {
    ur: 'اس نمبر پر {total} میں سے {returned} پارسل واپس آ چکے ہیں',
    en: '{returned} of {total} parcels to this number came back',
    rm: 'Is number par {total} mein se {returned} parcel wapas aa chuke hain',
  },
  phoneRiskyHint: {
    ur: 'بھیجنے سے پہلے کال کر لیں یا ایڈوانس منگوا لیں',
    en: 'Call first, or ask for an advance before shipping',
    rm: 'Bhejne se pehle call kar len ya advance mangwa len',
  },
  phoneClean: {
    ur: 'اس نمبر پر {total} میں سے {n} پارسل پہنچ چکے ہیں',
    en: '{n} of {total} parcels to this number arrived',
    rm: 'Is number par {total} mein se {n} parcel pohanch chuke hain',
  },

  // ---- Nayi reseller ka pehla safha ----
  firstRunTitle: {
    ur: 'شروع یہاں سے کریں',
    en: 'Start here',
    rm: 'Shuru yahan se karen',
  },
  firstRunBody: {
    ur: 'تین قدم، اور آج ہی آپ کا پہلا اسٹیٹس تیار',
    en: 'Three steps, and your first status is ready today',
    rm: 'Teen qadam, aur aaj hi aap ka pehla status tayyar',
  },
  firstRunStep1: {
    ur: 'کیٹلاگ میں سے کوئی مال چنیں',
    en: 'Pick something from the catalogue',
    rm: 'Catalogue mein se koi maal chunen',
  },
  firstRunStep2: {
    ur: 'ایک تپ میں اس کا اسٹیٹس پیک بنائیں',
    en: 'Make its status pack in one tap',
    rm: 'Ek tap mein us ka status pack banayen',
  },
  firstRunStep3: {
    ur: 'وہ تصویر اپنے واٹس ایپ اسٹیٹس پر لگائیں',
    en: 'Put that image on your WhatsApp status',
    rm: 'Wo tasveer apne WhatsApp status par lagayen',
  },
  firstRunStep3Why: {
    ur: 'یہی وہ قدم ہے جس سے آرڈر آتا ہے — پیک بنا لینا کافی نہیں',
    en: 'This is the step that brings orders — making the pack is not enough',
    rm: 'Yehi wo qadam hai jis se order aata hai — pack bana lena kaafi nahi',
  },
  firstRunCta: {
    ur: 'کیٹلاگ کھولیں',
    en: 'Open the catalogue',
    rm: 'Catalogue kholen',
  },

  // Inventory ki qatar — band halat mein sirf ye button
  stockChange: { ur: 'بدلیں', en: 'Change', rm: 'Badlein' },

  // Payout ka sabooot — marzi ka
  payoutProof: { ur: 'رسید لگائیں (اختیاری)', en: 'Add receipt (optional)', rm: 'Rasid lagayen (marzi ka)' },
  payoutProofAdded: { ur: '✓ رسید لگ گئی', en: '✓ Receipt added', rm: '✓ Rasid lag gayi' },
  payoutProofFailed: { ur: 'رسید نہیں لگی — دوبارہ کوشش کریں', en: 'Receipt failed — try again', rm: 'Rasid nahi lagi — dobara koshish karen' },
  payoutProofView: { ur: 'رسید دیکھیں', en: 'View receipt', rm: 'Rasid dekhen' },

  // Bikri ki ginti — 30 din (SALES_WINDOW_DAYS)
  soldRecently: { ur: 'اس مہینے بکے', en: 'sold this month', rm: 'is mahine bikay' },
  moneyByWholesaler: { ur: 'ہول سیلر کے حساب سے', en: 'By wholesaler', rm: 'Wholesaler ke hisab se' },
  moneyByReseller: { ur: 'ریسیلر کے حساب سے', en: 'By reseller', rm: 'Reseller ke hisab se' },
  moneyEarnedTotal: { ur: 'کل کمائی', en: 'Total earned', rm: 'Kul kamai' },
  moneyOwedToResellers: { ur: 'ریسیلرز کو دینے ہیں', en: 'Owed to resellers', rm: 'Resellers ko dene hain' },
  platformFee: { ur: 'اوئے بازار کی فیس', en: 'OyeBazar fee', rm: 'OyeBazar ki fee' },
  feeEarnedLabel: { ur: 'بن چکی', en: 'Earned', rm: 'Ban chuki' },
  feeInvoicedLabel: { ur: 'بل بن گیا', en: 'Invoiced', rm: 'Bill ban gaya' },
  feeCollectedLabel: { ur: 'ادا ہو گئی', en: 'Paid', rm: 'Ada ho gayi' },
  ordersCount: { ur: 'آرڈر', en: 'orders', rm: 'order' },
  ordersDeliveredShort: { ur: 'پہنچے', en: 'delivered', rm: 'pohanche' },
  ordersRunningShort: { ur: 'چل رہے', en: 'running', rm: 'chal rahe' },
  ordersLostShort: { ur: 'ضائع', en: 'lost', rm: 'zaya' },
  lastOrder: { ur: 'آخری آرڈر', en: 'Last order', rm: 'Aakhri order' },
  noDealingsYet: { ur: 'ابھی کوئی لین دین نہیں', en: 'No dealings yet', rm: 'Abhi koi len den nahi' },
  disputedShort: { ur: 'تنازعہ', en: 'disputed', rm: 'jhagra' },
  newStock: { ur: 'نیا مال', en: 'New stock', rm: 'Naya maal' },
  lastListed: { ur: 'آخری لسٹنگ', en: 'Last listed', rm: 'Aakhri listing' },
  noListingYet: { ur: 'ابھی کوئی مال نہیں', en: 'No stock yet', rm: 'Abhi koi maal nahi' },
  onBazaarSince: { ur: 'بازار پر', en: 'On Bazaar', rm: 'Bazaar par' },
  categoriesCount: { ur: 'کیٹگریز', en: 'categories', rm: 'categories' },
  whyUs: { ur: 'یہاں کیا مختلف ہے', en: 'What’s different here', rm: 'Yahan kya alag hai' },
  // ---- value props (Alahdeen jaisi patti, magar hamare apne waade)
  propNoCartTitle: { ur: 'کوئی کارٹ نہیں', en: 'No cart', rm: 'Koi cart nahi' },
  propNoCartBody: {
    ur: 'نہ کارٹ، نہ چیک آؤٹ۔ سودا سیدھا ہول سیلر سے۔',
    en: 'No cart, no checkout. You deal with the wholesaler.',
    rm: 'Na cart, na checkout. Aap seedha wholesaler se maamla karti hain.',
  },
  propNegotiateTitle: { ur: 'ریٹ خود طے کریں', en: 'Negotiate', rm: 'Rate par baat' },
  propNegotiateBody: {
    ur: 'واٹس ایپ پر بات کریں اور بہترین ریٹ لیں۔',
    en: 'Talk on WhatsApp and get the best rate.',
    rm: 'WhatsApp par baat karen aur behtareen rate len.',
  },
  propBulkTitle: { ur: 'تھوک یا سنگل', en: 'Bulk or single', rm: 'Thok ya single' },
  propBulkBody: {
    ur: 'زیادہ مال بھی، ایک پیس بھی — دونوں مل جاتے ہیں۔',
    en: 'Bulk orders or a single piece — both work.',
    rm: 'Thok ka order ho ya ek piece — dono chalte hain.',
  },
  propVerifiedTitle: { ur: 'تصدیق شدہ ہول سیلرز', en: 'Verified wholesalers', rm: 'Tasdeeq shuda wholesalers' },
  propVerifiedBody: {
    ur: 'بولٹن، اعظم کلاتھ اور ریل بازار کے تصدیق شدہ تاجر۔',
    en: 'Checked traders from Bolton, Azam Cloth and Rail Bazaar.',
    rm: 'Bolton, Azam Cloth aur Rail Bazaar ke jaanche parkhe tajir.',
  },
  // ---- stats (asli ginti — banawate numbers nahi)
  statCategories: { ur: 'کیٹگریز', en: 'Categories', rm: 'Categories' },
  statFee: { ur: 'ڈائریکٹری فیس', en: 'Directory fee', rm: 'Directory fees' },
  statFeeValue: { ur: 'صفر', en: 'Zero', rm: 'Zero' },
  statContact: { ur: 'رابطہ', en: 'Contact', rm: 'Rabta' },
  statContactValue: { ur: 'واٹس ایپ', en: 'WhatsApp', rm: 'WhatsApp' },
  // ---- countdown + promo (asli waqiat par, banawate nahi)
  nextDropTitle: { ur: 'کل کا اسٹیٹس پیک', en: 'Tomorrow’s status pack', rm: 'Kal ka status pack' },
  nextDropBody: {
    ur: 'روز صبح ۹ بجے واٹس ایپ پر — ۵ نئے آئٹمز',
    en: 'Every morning at 9 on WhatsApp — 5 fresh items',
    rm: 'Roz subah 9 baje WhatsApp par — 5 naye items',
  },
  hoursShort: { ur: 'گھنٹے', en: 'hrs', rm: 'ghante' },
  minutesShort: { ur: 'منٹ', en: 'min', rm: 'minute' },
  secondsShort: { ur: 'سیکنڈ', en: 'sec', rm: 'second' },
  promoResellerTitle: { ur: 'روزانہ ۵ تیار اسٹیٹس پیک', en: '5 ready status packs, daily', rm: 'Rozana 5 tayyar status pack' },
  promoResellerBody: {
    ur: 'آپ کا ریٹ، آپ کا نام، آپ کا نمبر — ایک ٹیپ میں ڈاؤن لوڈ۔',
    en: 'Your price, your name, your number — one tap to download.',
    rm: 'Aap ka rate, aap ka naam, aap ka number — ek tap mein download.',
  },
  promoResellerCta: { ur: 'مفت شروع کریں', en: 'Start free', rm: 'Muft shuru karen' },
  promoSupplierTitle: { ur: 'ہول سیلر ہیں؟ مفت لسٹ ہوں', en: 'A wholesaler? Get listed free', rm: 'Wholesaler hain? Muft list karwayen' },
  promoSupplierBody: {
    ur: 'سینکڑوں ری سیلرز تک پہنچیں — کوئی فیس نہیں، کوئی کمیشن نہیں۔',
    en: 'Reach hundreds of resellers — no fee, no commission.',
    rm: 'Saikron resellers tak pohanchen — na fees, na commission.',
  },
  promoSupplierCta: { ur: 'رابطہ کریں', en: 'Get in touch', rm: 'Rabta karen' },
  shopByCategory: { ur: 'کیٹگری سے خریدیں', en: 'Shop by category', rm: 'Category se kharidari' },
} as const satisfies Record<string, Entry>

export type MessageKey = keyof typeof DICTIONARY

/** `t('search')` — locale ke hisaab se jumla. */
export function translator(locale: Locale) {
  return (key: MessageKey): string => DICTIONARY[key][locale]
}

/**
 * Product/category ke naam DB mein sirf DO zubanon mein hain (nameUr / nameEn).
 *
 * Roman Urdu par angrezi naam dikhta hai — Roman parhne wala Latin haroof parhta hai,
 * aur "Lawn 3 Piece" us ke liye "لان تھری پیس" se aasan hai. Ye jhoot nahi bolta:
 * jab DB mein roman naam aayenge (nameRm), yehi function un par chala jayega.
 */
export function pickName(locale: Locale, value: { nameUr: string; nameEn: string }): string {
  return locale === 'ur' ? value.nameUr : value.nameEn
}

export function pickTitle(locale: Locale, value: { titleUr: string; titleEn: string }): string {
  return locale === 'ur' ? value.titleUr : value.titleEn
}

/**
 * Order ka status — teenon zubanon mein.
 *
 * Ek hi jagah, warna har safhe par `locale === 'ur' ? ... : ...` ka ternary banta hai
 * aur teesri zaban add karte waqt koi ek jagah reh jati hai.
 */
export function orderStatusLabel(locale: Locale, status: OrderStatusValue): string {
  if (locale === 'ur') return ORDER_STATUS_UR[status]
  if (locale === 'rm') return ORDER_STATUS_RM[status]
  return ORDER_STATUS_EN[status]
}

/**
 * "۱۲ منٹ پہلے" / "12 min ago" / "3 din pehle".
 *
 * Ginti `relativeTime` karta hai (shared, be-zaban), yahan sirf alfaz lagte hain.
 * Hafte se upar bhi jata hai — directory par "45 din pehle" se "6 hafte pehle" jaldi
 * samajh aata hai, aur purani dukan ka purana hona chhupana nahi chahiye.
 */
const UNIT_KEY = {
  minute: 'minutesAgo',
  hour: 'hoursAgo',
  day: 'daysAgo',
  week: 'weeksAgo',
  month: 'monthsAgo',
  year: 'yearsAgo',
} as const satisfies Record<Exclude<RelativeUnit, 'now'>, MessageKey>

export function timeAgo(locale: Locale, date: Date | string, now = new Date()): string {
  const t = translator(locale)
  const { unit, value } = relativeTime(date, now)

  if (unit === 'now') return t('justNow')
  return `${value} ${t(UNIT_KEY[unit])}`
}
