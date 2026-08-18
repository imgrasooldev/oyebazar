/**
 * Do zubanein: Urdu (default) aur English.
 *
 * Faisle:
 *  · Locale COOKIE mein hai, URL mein nahi (`/ur/...` nahi). Wajah: hamare links
 *    WhatsApp par share hote hain — ek hi URL dono zubanon mein khulna chahiye,
 *    aur SEO ke liye ek hi canonical page behtar hai.
 *  · Default URDU hai. Sadia Urdu parhti hai; English wale ko ek tap se mil jati hai.
 *  · Direction locale ke saath badalti hai — Urdu RTL, English LTR.
 *  · Product ke naam DB mein pehle se dono zubanon mein hain (titleUr / titleEn),
 *    is liye content bhi waqai badalta hai, sirf chrome nahi.
 */
export const LOCALES = ['ur', 'en'] as const
export type Locale = (typeof LOCALES)[number]

export const LOCALE_COOKIE = 'oyebazar_lang'
export const DEFAULT_LOCALE: Locale = 'ur'

export function isLocale(value: string | undefined): value is Locale {
  return value === 'ur' || value === 'en'
}

export function dirOf(locale: Locale): 'rtl' | 'ltr' {
  return locale === 'ur' ? 'rtl' : 'ltr'
}

/** Har string dono zubanon mein — koi bhi jumla adhoora na rahe. */
type Entry = { ur: string; en: string }

const DICTIONARY = {
  // ---- chrome
  brandTagline: {
    ur: 'تھوک ریٹ پر مال — تصدیق شدہ ہول سیلرز کی ڈائریکٹری',
    en: 'Wholesale rates — directory of verified wholesalers',
  },
  noOrderButton: { ur: 'کوئی آرڈر بٹن نہیں', en: 'No order button' },
  directoryFree: { ur: 'ڈائریکٹری مفت ہے', en: 'Directory is free' },
  searchPlaceholder: {
    ur: 'ہول سیلر یا مارکیٹ تلاش کریں…',
    en: 'Search wholesalers or markets…',
  },
  search: { ur: 'تلاش', en: 'Search' },
  resellerLogin: { ur: 'ری سیلر لاگ اِن', en: 'Reseller login' },
  myCatalogue: { ur: 'میرا کیٹلاگ', en: 'My catalogue' },
  all: { ur: 'سب', en: 'All' },
  viewAll: { ur: 'سب دیکھیں', en: 'View all' },
  resellerPortal: { ur: 'ری سیلر پورٹل', en: 'Reseller portal' },

  // ---- home
  heroTitle: {
    ur: 'ہر روز نئی تصویر، آپ کے اپنے ریٹ کے ساتھ',
    en: 'A fresh post every day — with your own price',
  },
  heroBody: {
    ur: 'واٹس ایپ اسٹیٹس پر بیچنے والی بہنوں کے لیے — تیار اسٹیٹس پیک، آپ کا ریٹ، آپ کا نام، آپ کا نمبر۔ ایک ٹیپ میں۔',
    en: 'For women selling on WhatsApp status — ready-made status packs with your price, your name and your number. One tap.',
  },
  seeWholesalers: { ur: 'ہول سیلرز دیکھیں', en: 'Browse wholesalers' },
  propNoOrder: {
    ur: 'کوئی آرڈر بٹن نہیں — رابطہ سیدھا ہول سیلر سے',
    en: 'No order button — you contact the wholesaler directly',
  },
  propFree: { ur: 'ڈائریکٹری مفت — کوئی فیس نہیں', en: 'Free directory — no fees' },
  propVerified: {
    ur: 'تصدیق شدہ ہول سیلرز — بولٹن، اعظم کلاتھ، ریل بازار',
    en: 'Verified wholesalers — Bolton, Azam Cloth, Rail Bazaar',
  },
  statWholesalers: { ur: 'ہول سیلرز', en: 'Wholesalers' },
  statItems: { ur: 'آئٹمز', en: 'Items' },
  statCities: { ur: 'شہر', en: 'Cities' },
  byCity: { ur: 'شہر کے حساب سے', en: 'By city' },
  verifiedWholesalers: { ur: 'تصدیق شدہ ہول سیلرز', en: 'Verified wholesalers' },
  newArrivals: { ur: 'نیا مال', en: 'New arrivals' },
  howItWorks: { ur: 'کام کیسے کرتا ہے', en: 'How it works' },
  step1: {
    ur: 'ہم ہول سیلر کے مال کی تیار تصویریں بناتے ہیں',
    en: 'We create ready-made photos of the wholesaler’s stock',
  },
  step2: {
    ur: 'روز صبح ۹ بجے آپ کو واٹس ایپ پر ۵ پیک ملتے ہیں',
    en: 'Every morning at 9 you get 5 packs on WhatsApp',
  },
  step3: {
    ur: 'آپ اپنا ریٹ لگاتی ہیں، تصویر دوبارہ بن جاتی ہے',
    en: 'You set your price and the image is regenerated',
  },
  step4: {
    ur: 'ڈاؤن لوڈ کریں اور اپنے اسٹیٹس پر لگائیں',
    en: 'Download it and post it on your status',
  },

  // ---- bazaar
  bazaar: { ur: 'بازار', en: 'Bazaar' },
  city: { ur: 'شہر', en: 'City' },
  allCities: { ur: 'سارے شہر', en: 'All cities' },
  results: { ur: 'نتائج', en: 'results' },
  items: { ur: 'آئٹمز', en: 'items' },
  verified: { ur: 'تصدیق شدہ', en: 'Verified' },
  noSuppliersFound: {
    ur: 'اس فلٹر پر کوئی ہول سیلر نہیں ملا۔',
    en: 'No wholesaler matched this filter.',
  },
  noItemsListed: { ur: 'ابھی کوئی آئٹم لسٹ نہیں ہوا۔', en: 'No items listed yet.' },
  askRate: { ur: 'ریٹ کے لیے رابطہ', en: 'Contact for rate' },
  askRateWhatsapp: { ur: 'واٹس ایپ پر ریٹ پوچھیں', en: 'Ask the rate on WhatsApp' },
  noOrdersHere: {
    ur: 'یہاں سے آرڈر نہیں ہوتا',
    en: 'No ordering here',
  },
  noOrdersHereBody: {
    ur: 'رابطہ براہِ راست ہول سیلر کے واٹس ایپ پر ہوتا ہے۔ ڈائریکٹری بالکل مفت ہے۔',
    en: 'You contact the wholesaler on WhatsApp directly. The directory is completely free.',
  },
  wholesalerStock: { ur: 'اس ہول سیلر کا مال', en: 'This wholesaler’s stock' },

  // ---- login
  login: { ur: 'لاگ اِن', en: 'Login' },
  loginBody: {
    ur: 'اپنا واٹس ایپ نمبر لکھیں — کوڈ واٹس ایپ پر آئے گا۔ پاس ورڈ کی ضرورت نہیں۔',
    en: 'Enter your WhatsApp number — the code arrives on WhatsApp. No password needed.',
  },
  sharedPhoneWarning: {
    ur: 'فون کسی اور کا ہو تو کام ختم ہونے کے بعد لاگ آؤٹ ضرور کریں۔',
    en: 'If the phone belongs to someone else, log out when you are done.',
  },
  whatsappNumber: { ur: 'واٹس ایپ نمبر', en: 'WhatsApp number' },
  sendCode: { ur: 'کوڈ بھیجیں', en: 'Send code' },
  sending: { ur: 'بھیجا جا رہا ہے…', en: 'Sending…' },
  codeSentTo: { ur: 'کوڈ بھیج دیا گیا ہے', en: 'Code sent to' },
  sixDigitCode: { ur: '۶ ہندسوں کا کوڈ', en: '6-digit code' },
  enter: { ur: 'اندر آئیں', en: 'Continue' },
  checking: { ur: 'دیکھا جا رہا ہے…', en: 'Checking…' },
  changeNumber: { ur: 'نمبر بدلیں', en: 'Change number' },
  logout: { ur: 'لاگ آؤٹ', en: 'Logout' },
  somethingWrong: {
    ur: 'کچھ مسئلہ ہو گیا۔ دوبارہ کوشش کریں',
    en: 'Something went wrong. Please try again',
  },

  // ---- app
  todaysPack: { ur: 'آج کا اسٹیٹس پیک', en: 'Today’s status pack' },
  packsReady: { ur: 'تصویریں تیار ہیں — بس ڈاؤن لوڈ کریں', en: 'images ready — just download' },
  allStock: { ur: 'سارا مال', en: 'All stock' },
  yourCost: { ur: 'آپ کی لاگت', en: 'Your cost' },
  yourPrice: { ur: 'آپ کا ریٹ', en: 'Your price' },
  suggested: { ur: 'تجویز', en: 'suggested' },
  outOfStock: { ur: 'ابھی ختم ہے', en: 'Out of stock' },
  makeStatusPack: { ur: 'اسٹیٹس پیک بنائیں', en: 'Make status pack' },
  orders: { ur: 'آرڈرز', en: 'Orders' },
  catalogue: { ur: 'کیٹلاگ', en: 'Catalogue' },
  myOrders: { ur: 'میرے آرڈرز', en: 'My orders' },
  earnedSoFar: { ur: 'اب تک کمایا', en: 'Earned so far' },

  // ---- Content Studio
  studioTitle: { ur: 'اسٹیٹس پیک بنائیں', en: 'Make a status pack' },
  studioSteps: { ur: 'ریٹ → ڈیزائن → ڈاؤن لوڈ', en: 'Price → design → download' },
  design: { ur: 'ڈیزائن', en: 'Design' },
  yourProfit: { ur: 'آپ کا منافع', en: 'Your profit' },
  building: { ur: 'بن رہا ہے…', en: 'Creating…' },
  imageBuilding: { ur: 'تصویر بن رہی ہے… (چند سیکنڈ)', en: 'Creating the image… (a few seconds)' },
  packFailed: {
    ur: 'پیک نہیں بن سکا۔ دوبارہ کوشش کریں',
    en: 'Could not create the pack. Please try again',
  },
  packSlow: {
    ur: 'تصویر بننے میں دیر ہو رہی ہے۔ تھوڑی دیر بعد دوبارہ کوشش کریں۔',
    en: 'The image is taking too long. Please try again shortly.',
  },
  download: { ur: 'ڈاؤن لوڈ کریں', en: 'Download' },
  copyCaption: { ur: 'کیپشن کاپی کریں', en: 'Copy caption' },
  placeOrderForItem: { ur: 'اس آئٹم کا آرڈر لگائیں', en: 'Place an order for this item' },
  outOfStockWarning: {
    ur: 'یہ آئٹم ابھی ختم ہے — اسٹیٹس پر لگانے سے پہلے ٹیم سے پوچھ لیں۔',
    en: 'This item is out of stock — check with the team before posting it.',
  },

  // ---- order form
  placeOrder: { ur: 'آرڈر لگائیں', en: 'Place order' },
  customerName: { ur: 'کسٹمر کا نام', en: 'Customer name' },
  fullAddress: { ur: 'پورا پتہ', en: 'Full address' },
  addressHint: {
    ur: 'مکان نمبر، گلی، محلہ، قریبی نشانی',
    en: 'House number, street, area, nearby landmark',
  },
  area: { ur: 'علاقہ', en: 'Area' },
  locationPin: { ur: 'لوکیشن پن', en: 'Location pin' },
  locationPinBody: {
    ur: 'پن لگانے سے پارسل واپس آنے کا خطرہ آدھا رہ جاتا ہے۔ کسٹمر کے گھر کے قریب ہوں تو ابھی لگائیں، ورنہ کسٹمر سے واٹس ایپ پر لوکیشن منگوا لیں۔',
    en: 'A pin halves the risk of the parcel coming back. Capture it if you are near the customer, otherwise ask them for their location on WhatsApp.',
  },
  locationGot: { ur: '✓ لوکیشن مل گئی', en: '✓ Location captured' },
  locationGetting: { ur: 'لوکیشن لی جا رہی ہے…', en: 'Getting location…' },
  locationRetry: { ur: 'دوبارہ کوشش کریں', en: 'Try again' },
  locationCapture: { ur: 'میری موجودہ لوکیشن لگائیں', en: 'Use my current location' },
  quantity: { ur: 'تعداد', en: 'Qty' },
  delivery: { ur: 'ڈیلیوری', en: 'Delivery' },
  customerPays: { ur: 'کسٹمر دے گا (COD)', en: 'Customer pays (COD)' },
  placing: { ur: 'لگ رہا ہے…', en: 'Placing…' },
  orderFailed: {
    ur: 'آرڈر نہیں لگ سکا۔ دوبارہ کوشش کریں',
    en: 'Could not place the order. Please try again',
  },
  confirmNote: {
    ur: 'آرڈر لگنے کے بعد آپ کو اسے تصدیق کرنا ہوگا — تصدیق کے بغیر ہول سیلر کو نہیں جاتا۔',
    en: 'After placing it you must confirm the order — without confirmation it never goes to the wholesaler.',
  },

  // ---- orders
  awaitingConfirmation: { ur: 'تصدیق باقی ہے', en: 'Awaiting confirmation' },
  awaitingConfirmationBody: {
    ur: 'تصدیق کے بغیر آرڈر ہول سیلر کو نہیں جاتا۔',
    en: 'Without confirmation the order does not go to the wholesaler.',
  },
  otherOrders: { ur: 'باقی آرڈرز', en: 'Other orders' },
  noOrdersYet: { ur: 'ابھی کوئی آرڈر نہیں۔', en: 'No orders yet.' },
  seeCatalogue: { ur: 'کیٹلاگ دیکھیں', en: 'Browse catalogue' },

  // 404 / error — mara hua link ya server ki kharabi
  notFoundTitle: { ur: 'یہ صفحہ نہیں ملا', en: 'Page not found' },
  notFoundBody: {
    ur: 'ہو سکتا ہے لنک پرانا ہو یا وہ چیز اب بازار میں نہ ہو۔ نیچے سے بازار دیکھ لیں۔',
    en: 'The link may be old, or that item is no longer listed. Browse the bazaar below.',
  },
  goToBazaar: { ur: 'بازار دیکھیں', en: 'Go to bazaar' },
  goHome: { ur: 'صفحۂ اول', en: 'Home' },
  errorTitle: { ur: 'کچھ گڑبڑ ہو گئی', en: 'Something went wrong' },
  errorBody: {
    ur: 'ہمارے سرور میں مسئلہ ہے، آپ کی غلطی نہیں۔ دوبارہ کوشش کریں۔',
    en: 'A problem on our side, not yours. Please try again.',
  },
  tryAgain: { ur: 'دوبارہ کوشش کریں', en: 'Try again' },

  // ---- Wholesaler portal ----
  wholesalerPortal: { ur: 'ہول سیلر پورٹل', en: 'Wholesaler portal' },
  wholesalerLoginBody: {
    ur: 'اپنا وہی واٹس ایپ نمبر لکھیں جو دکان کے ساتھ رجسٹرڈ ہے۔',
    en: 'Enter the WhatsApp number registered with your shop.',
  },
  newOrders: { ur: 'نئے آرڈرز', en: 'New orders' },
  newOrdersBody: {
    ur: 'یہ آرڈرز آپ کے جواب کے منتظر ہیں۔ قبول کریں تو ریسیلر کو فوراً پتا چل جاتا ہے۔',
    en: 'These orders are waiting on you. Accepting tells the reseller straight away.',
  },
  runningOrders: { ur: 'چل رہے آرڈرز', en: 'In progress' },
  finishedOrders: { ur: 'مکمل شدہ', en: 'Completed' },
  noSupplierOrders: { ur: 'ابھی کوئی آرڈر نہیں آیا۔', en: 'No orders yet.' },
  myStock: { ur: 'میرا مال', en: 'My stock' },
  noSupplierProducts: { ur: 'ابھی آپ کا کوئی مال درج نہیں۔', en: 'No products listed yet.' },
  stockBody: {
    ur: 'مال ختم ہو تو یہیں سے بند کر دیں — بند کرتے ہی نیا آرڈر آنا رک جاتا ہے۔',
    en: 'Out of stock? Switch it off here — new orders stop immediately.',
  },
  inStock: { ur: 'دستیاب ہے', en: 'In stock' },
  notLiveYet: { ur: 'ابھی لائیو نہیں', en: 'Not live yet' },
  openOrdersOnThis: { ur: 'اس پر چل رہے آرڈرز', en: 'Open orders on this' },
  youWillGet: { ur: 'آپ کو ملیں گے', en: 'You get' },
  orderAccept: { ur: 'قبول کریں', en: 'Accept' },
  orderReject: { ur: 'معذرت، نہیں ہو سکے گا', en: "Can't fulfil" },
  rejectReasonAsk: { ur: 'وجہ لکھیں (ریسیلر کو یہی جائے گی)', en: 'Reason (the reseller sees this)' },
  supplierOrdersNav: { ur: 'آرڈرز', en: 'Orders' },
  supplierStockNav: { ur: 'مال', en: 'Stock' },
  confirm: { ur: 'تصدیق کریں', en: 'Confirm' },
  confirmQuestion: {
    ur: 'کیا کسٹمر سے بات ہو گئی ہے اور اس نے آرڈر پکا کیا ہے؟',
    en: 'Have you spoken to the customer and did they confirm the order?',
  },
  confirmYes: { ur: 'ہاں، تصدیق کریں', en: 'Yes, confirm it' },
  notNow: { ur: 'ابھی نہیں', en: 'Not now' },
  confirmFailed: { ur: 'تصدیق نہیں ہو سکی', en: 'Could not confirm' },
  profit: { ur: 'منافع', en: 'Profit' },

  // ---- home sections (Alahdeen jaisa dhaancha)
  topCategories: { ur: 'اہم کیٹگریز', en: 'Top categories' },
  viewAllCategories: { ur: 'ساری کیٹگریز دیکھیں', en: 'View all categories' },
  liveNow: { ur: 'ابھی', en: 'Live' },
  recentlyListed: { ur: 'نیا لسٹ ہوا مال', en: 'Recently listed' },
  trendingCategories: { ur: 'مقبول کیٹگریز', en: 'Trending categories' },
  featuredSuppliers: { ur: 'نمایاں ہول سیلرز', en: 'Featured suppliers' },
  popularProducts: { ur: 'مقبول آئٹمز', en: 'Popular products' },
  justNow: { ur: 'ابھی ابھی', en: 'just now' },
  minutesAgo: { ur: 'منٹ پہلے', en: 'min ago' },
  hoursAgo: { ur: 'گھنٹے پہلے', en: 'h ago' },
  daysAgo: { ur: 'دن پہلے', en: 'd ago' },
  whyUs: { ur: 'یہاں کیا مختلف ہے', en: 'What’s different here' },

  // ---- value props (Alahdeen jaisi patti, magar hamare apne waade)
  propNoCartTitle: { ur: 'کوئی کارٹ نہیں', en: 'No cart' },
  propNoCartBody: {
    ur: 'نہ کارٹ، نہ چیک آؤٹ۔ سودا سیدھا ہول سیلر سے۔',
    en: 'No cart, no checkout. You deal with the wholesaler.',
  },
  propNegotiateTitle: { ur: 'ریٹ خود طے کریں', en: 'Negotiate' },
  propNegotiateBody: {
    ur: 'واٹس ایپ پر بات کریں اور بہترین ریٹ لیں۔',
    en: 'Talk on WhatsApp and get the best rate.',
  },
  propBulkTitle: { ur: 'تھوک یا سنگل', en: 'Bulk or single' },
  propBulkBody: {
    ur: 'زیادہ مال بھی، ایک پیس بھی — دونوں مل جاتے ہیں۔',
    en: 'Bulk orders or a single piece — both work.',
  },
  propVerifiedTitle: { ur: 'تصدیق شدہ ہول سیلرز', en: 'Verified wholesalers' },
  propVerifiedBody: {
    ur: 'بولٹن، اعظم کلاتھ اور ریل بازار کے تصدیق شدہ تاجر۔',
    en: 'Checked traders from Bolton, Azam Cloth and Rail Bazaar.',
  },

  // ---- stats (asli ginti — banawate numbers nahi)
  statCategories: { ur: 'کیٹگریز', en: 'Categories' },
  statFee: { ur: 'ڈائریکٹری فیس', en: 'Directory fee' },
  statFeeValue: { ur: 'صفر', en: 'Zero' },
  statContact: { ur: 'رابطہ', en: 'Contact' },
  statContactValue: { ur: 'واٹس ایپ', en: 'WhatsApp' },

  // ---- countdown + promo (asli waqiat par, banawate nahi)
  nextDropTitle: { ur: 'کل کا اسٹیٹس پیک', en: 'Tomorrow’s status pack' },
  nextDropBody: {
    ur: 'روز صبح ۹ بجے واٹس ایپ پر — ۵ نئے آئٹمز',
    en: 'Every morning at 9 on WhatsApp — 5 fresh items',
  },
  hoursShort: { ur: 'گھنٹے', en: 'hrs' },
  minutesShort: { ur: 'منٹ', en: 'min' },
  secondsShort: { ur: 'سیکنڈ', en: 'sec' },

  promoResellerTitle: { ur: 'روزانہ ۵ تیار اسٹیٹس پیک', en: '5 ready status packs, daily' },
  promoResellerBody: {
    ur: 'آپ کا ریٹ، آپ کا نام، آپ کا نمبر — ایک ٹیپ میں ڈاؤن لوڈ۔',
    en: 'Your price, your name, your number — one tap to download.',
  },
  promoResellerCta: { ur: 'مفت شروع کریں', en: 'Start free' },

  promoSupplierTitle: { ur: 'ہول سیلر ہیں؟ مفت لسٹ ہوں', en: 'A wholesaler? Get listed free' },
  promoSupplierBody: {
    ur: 'سینکڑوں ری سیلرز تک پہنچیں — کوئی فیس نہیں، کوئی کمیشن نہیں۔',
    en: 'Reach hundreds of resellers — no fee, no commission.',
  },
  promoSupplierCta: { ur: 'رابطہ کریں', en: 'Get in touch' },

  shopByCategory: { ur: 'کیٹگری سے خریدیں', en: 'Shop by category' },
} as const satisfies Record<string, Entry>

export type MessageKey = keyof typeof DICTIONARY

/** `t('search')` — locale ke hisaab se jumla. */
export function translator(locale: Locale) {
  return (key: MessageKey): string => DICTIONARY[key][locale]
}

/** Product/category ke naam DB mein dono zubanon mein hain. */
export function pickName(locale: Locale, value: { nameUr: string; nameEn: string }): string {
  return locale === 'ur' ? value.nameUr : value.nameEn
}

export function pickTitle(locale: Locale, value: { titleUr: string; titleEn: string }): string {
  return locale === 'ur' ? value.titleUr : value.titleEn
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
