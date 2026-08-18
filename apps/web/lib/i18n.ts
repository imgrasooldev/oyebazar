import {
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
  orderAccept: { ur: 'قبول کریں', en: 'Accept', rm: 'Qubool karen' },
  orderReject: { ur: 'معذرت، نہیں ہو سکے گا', en: "Can't fulfil", rm: 'Maazrat, nahi ho sakega' },
  rejectReasonAsk: { ur: 'وجہ لکھیں (ریسیلر کو یہی جائے گی)', en: 'Reason (the reseller sees this)', rm: 'Wajah likhen (reseller ko yehi jayegi)' },
  supplierOrdersNav: { ur: 'آرڈرز', en: 'Orders', rm: 'Orders' },
  supplierStockNav: { ur: 'مال', en: 'Stock', rm: 'Maal' },
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
  featuredSuppliers: { ur: 'نمایاں ہول سیلرز', en: 'Featured suppliers', rm: 'Numaya wholesalers' },
  popularProducts: { ur: 'مقبول آئٹمز', en: 'Popular products', rm: 'Maqbool maal' },
  justNow: { ur: 'ابھی ابھی', en: 'just now', rm: 'abhi abhi' },
  minutesAgo: { ur: 'منٹ پہلے', en: 'min ago', rm: 'minute pehle' },
  hoursAgo: { ur: 'گھنٹے پہلے', en: 'h ago', rm: 'ghante pehle' },
  daysAgo: { ur: 'دن پہلے', en: 'd ago', rm: 'din pehle' },
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

/** "۱۲ منٹ پہلے" / "12 min ago" — live patti ke liye. */
export function timeAgo(locale: Locale, date: Date, now = new Date()): string {
  const t = translator(locale)
  const minutes = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 60_000))

  if (minutes < 1) return t('justNow')
  if (minutes < 60) return `${minutes} ${t('minutesAgo')}`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} ${t('hoursAgo')}`

  return `${Math.floor(hours / 24)} ${t('daysAgo')}`
}
