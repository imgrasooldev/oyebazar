/**
 * Categories ka darakht — seed.ts se nikal kar yahan, taake do jagah do alag list na banen.
 *
 * `seed.ts` (poora farzi bazaar) aur `seed-categories.ts` (sirf dhancha, production ke
 * liye) dono isi ek list par chalte hain.
 */
export const CATALOGUE = [
  {
    slug: 'apparel',
    nameUr: 'کپڑا اور ملبوسات',
    nameEn: 'Apparel & Garments',
    children: [
      { slug: 'lawn', nameUr: 'لان', nameEn: 'Lawn' },
      { slug: 'khaddar', nameUr: 'کھدر', nameEn: 'Khaddar' },
      { slug: 'linen', nameUr: 'لینن', nameEn: 'Linen' },
      { slug: 'abaya', nameUr: 'عبایا', nameEn: 'Abaya' },
      { slug: 'kids-wear', nameUr: 'بچوں کے کپڑے', nameEn: 'Kids Wear' },
      { slug: 'bridal', nameUr: 'دلہن کے ملبوسات', nameEn: 'Bridal Wear' },
      { slug: 'menswear', nameUr: 'مردانہ ملبوسات', nameEn: 'Menswear' },
      { slug: 'shawls', nameUr: 'شال اور چادر', nameEn: 'Shawls & Chadar' },
    ],
    products: [
      { ur: 'لان تھری پیس — پھولوں والا', en: 'Lawn 3 Piece — Floral', price: 2400 },
      { ur: 'لان ٹو پیس — سادہ', en: 'Lawn 2 Piece — Plain', price: 1750 },
      { ur: 'کھدر سوٹ — سردیوں کا', en: 'Khaddar Suit — Winter', price: 2100 },
      { ur: 'لینن تھری پیس', en: 'Linen 3 Piece', price: 2900 },
      { ur: 'عبایا — دبئی اسٹائل', en: 'Abaya — Dubai Style', price: 3200 },
      { ur: 'بچوں کا فراک', en: 'Kids Frock', price: 1200 },
    ],
  },
  {
    slug: 'home-textile',
    nameUr: 'گھریلو ٹیکسٹائل',
    nameEn: 'Home Textile',
    children: [
      { slug: 'bedsheets', nameUr: 'بیڈ شیٹ', nameEn: 'Bedsheets' },
      { slug: 'blankets', nameUr: 'کمبل اور رضائی', nameEn: 'Blankets & Quilts' },
      { slug: 'curtains', nameUr: 'پردے', nameEn: 'Curtains' },
      { slug: 'towels', nameUr: 'تولیے', nameEn: 'Towels' },
    ],
    products: [
      { ur: 'بیڈ شیٹ — ڈبل بیڈ', en: 'Bedsheet — Double', price: 2600 },
      { ur: 'کمبل — سنگل', en: 'Blanket — Single', price: 3100 },
      { ur: 'پردے — جوڑی', en: 'Curtains — Pair', price: 2200 },
    ],
  },
  {
    slug: 'cosmetics',
    nameUr: 'کاسمیٹکس اور پرسنل کیئر',
    nameEn: 'Cosmetics & Personal Care',
    children: [
      { slug: 'makeup', nameUr: 'میک اپ', nameEn: 'Makeup' },
      { slug: 'skincare', nameUr: 'اسکن کیئر', nameEn: 'Skin Care' },
      { slug: 'haircare', nameUr: 'ہیئر کیئر', nameEn: 'Hair Care' },
      { slug: 'perfumes', nameUr: 'پرفیوم', nameEn: 'Perfumes' },
    ],
    products: [
      { ur: 'میک اپ کٹ — ۱۲ آئٹم', en: 'Makeup Kit — 12 Items', price: 1850 },
      { ur: 'ہیئر آئل — ۲۰۰ ملی', en: 'Hair Oil — 200ml', price: 320 },
      { ur: 'فیس واش — پیک آف ۳', en: 'Face Wash — Pack of 3', price: 540 },
    ],
  },
  {
    slug: 'food-grocery',
    nameUr: 'کھانے پینے کا سامان',
    nameEn: 'Food & Grocery',
    children: [
      { slug: 'cooking-oil', nameUr: 'کوکنگ آئل اور گھی', nameEn: 'Cooking Oil & Ghee' },
      { slug: 'rice-pulses', nameUr: 'چاول اور دالیں', nameEn: 'Rice & Pulses' },
      { slug: 'tea-beverages', nameUr: 'چائے اور مشروبات', nameEn: 'Tea & Beverages' },
      { slug: 'spices', nameUr: 'مصالحہ جات', nameEn: 'Spices' },
    ],
    products: [
      { ur: 'کوکنگ آئل — ۵ لیٹر', en: 'Cooking Oil — 5 Litre', price: 2450 },
      { ur: 'چاول — باسمتی ۵ کلو', en: 'Basmati Rice — 5kg', price: 1900 },
      { ur: 'چائے کی پتی — ۱ کلو', en: 'Tea Leaves — 1kg', price: 1450 },
    ],
  },
  {
    slug: 'electronics',
    nameUr: 'الیکٹرانکس اور بجلی کا سامان',
    nameEn: 'Electronics & Electrical',
    children: [
      { slug: 'lighting', nameUr: 'لائٹنگ اور ایل ای ڈی', nameEn: 'Lighting & LED' },
      { slug: 'fans', nameUr: 'پنکھے', nameEn: 'Fans' },
      { slug: 'solar', nameUr: 'سولر اور انورٹر', nameEn: 'Solar & Inverters' },
      { slug: 'mobile-accessories', nameUr: 'موبائل ایکسیسریز', nameEn: 'Mobile Accessories' },
      { slug: 'wires-switches', nameUr: 'تار اور سوئچ', nameEn: 'Wires & Switches' },
      { slug: 'home-appliances', nameUr: 'گھریلو آلات', nameEn: 'Home Appliances' },
    ],
    products: [
      { ur: 'ایل ای ڈی بلب — ۱۲ واٹ (۱۰ کا پیک)', en: 'LED Bulb 12W — Pack of 10', price: 1600 },
      { ur: 'ایکسٹینشن بورڈ', en: 'Extension Board', price: 780 },
      { ur: 'وائرلیس ائیر بڈز', en: 'Wireless Earbuds', price: 1350 },
    ],
  },
  {
    slug: 'kitchen',
    nameUr: 'باورچی خانے کا سامان',
    nameEn: 'Kitchen Utensils',
    children: [
      { slug: 'crockery', nameUr: 'کراکری', nameEn: 'Crockery' },
      { slug: 'cookware', nameUr: 'برتن اور پتیلے', nameEn: 'Cookware' },
      { slug: 'kitchen-tools', nameUr: 'کچن ٹولز', nameEn: 'Kitchen Tools' },
    ],
    products: [
      { ur: 'اسٹیل ڈنر سیٹ — ۱۸ پیس', en: 'Steel Dinner Set — 18 Piece', price: 3400 },
      { ur: 'نان اسٹک پین', en: 'Non-stick Pan', price: 1250 },
      { ur: 'چوپر — اسٹینلیس اسٹیل', en: 'Chopper — Stainless Steel', price: 890 },
    ],
  },
  {
    slug: 'jewellery',
    nameUr: 'جیولری اور آرٹیفیشل زیورات',
    nameEn: 'Gems & Jewellery',
    children: [
      { slug: 'artificial-jewellery', nameUr: 'آرٹیفیشل جیولری', nameEn: 'Artificial Jewellery' },
      { slug: 'bridal-sets', nameUr: 'دلہن سیٹ', nameEn: 'Bridal Sets' },
      { slug: 'bangles', nameUr: 'چوڑیاں', nameEn: 'Bangles' },
    ],
    products: [
      { ur: 'آرٹیفیشل جھمکے', en: 'Artificial Jhumkay', price: 450 },
      { ur: 'دلہن سیٹ — گولڈ پلیٹڈ', en: 'Bridal Set — Gold Plated', price: 4200 },
      { ur: 'چوڑیاں — ۱۲ کا سیٹ', en: 'Bangles — Set of 12', price: 380 },
    ],
  },
  {
    slug: 'furniture',
    nameUr: 'فرنیچر اور سامان',
    nameEn: 'Furniture & Supplies',
    children: [
      { slug: 'home-furniture', nameUr: 'گھریلو فرنیچر', nameEn: 'Home Furniture' },
      { slug: 'office-furniture', nameUr: 'آفس فرنیچر', nameEn: 'Office Furniture' },
      { slug: 'plastic-furniture', nameUr: 'پلاسٹک فرنیچر', nameEn: 'Plastic Furniture' },
    ],
    products: [
      { ur: 'اسٹڈی ٹیبل', en: 'Study Table', price: 6800 },
      { ur: 'پلاسٹک کرسی — ۴ کا سیٹ', en: 'Plastic Chairs — Set of 4', price: 5200 },
    ],
  },
  {
    slug: 'auto-parts',
    nameUr: 'گاڑیوں کے پرزے',
    nameEn: 'Automobile Parts & Spares',
    children: [
      { slug: 'bike-parts', nameUr: 'بائیک پارٹس', nameEn: 'Bike Parts' },
      { slug: 'car-accessories', nameUr: 'کار ایکسیسریز', nameEn: 'Car Accessories' },
      { slug: 'tyres', nameUr: 'ٹائر اور ٹیوب', nameEn: 'Tyres & Tubes' },
    ],
    products: [
      { ur: 'بائیک ہیلمٹ', en: 'Bike Helmet', price: 1750 },
      { ur: 'کار سیٹ کور — سیٹ', en: 'Car Seat Covers — Set', price: 4500 },
    ],
  },
  {
    slug: 'pharma',
    nameUr: 'ادویات اور سرجیکل',
    nameEn: 'Drugs & Pharma',
    children: [
      { slug: 'surgical', nameUr: 'سرجیکل سامان', nameEn: 'Surgical Supplies' },
      { slug: 'otc', nameUr: 'او ٹی سی ادویات', nameEn: 'OTC Medicines' },
    ],
    products: [
      { ur: 'سرجیکل ماسک — ۵۰ کا باکس', en: 'Surgical Masks — Box of 50', price: 420 },
      { ur: 'فرسٹ ایڈ کٹ', en: 'First Aid Kit', price: 1150 },
    ],
  },
  {
    slug: 'stationery',
    nameUr: 'اسٹیشنری اور اسکول کا سامان',
    nameEn: 'Stationery & School',
    children: [
      { slug: 'school-supplies', nameUr: 'اسکول کا سامان', nameEn: 'School Supplies' },
      { slug: 'office-stationery', nameUr: 'آفس اسٹیشنری', nameEn: 'Office Stationery' },
      { slug: 'bags', nameUr: 'بیگ', nameEn: 'Bags' },
    ],
    products: [
      { ur: 'رجسٹر — ۱۰ کا پیک', en: 'Registers — Pack of 10', price: 950 },
      { ur: 'اسکول بیگ', en: 'School Bag', price: 1650 },
    ],
  },
  {
    slug: 'toys',
    nameUr: 'کھلونے اور گیمنگ',
    nameEn: 'Toys & Gaming',
    children: [
      { slug: 'kids-toys', nameUr: 'بچوں کے کھلونے', nameEn: 'Kids Toys' },
      { slug: 'gaming', nameUr: 'گیمنگ', nameEn: 'Gaming' },
      { slug: 'sports', nameUr: 'اسپورٹس گڈز', nameEn: 'Sports Goods' },
    ],
    products: [
      { ur: 'ریموٹ کنٹرول کار', en: 'Remote Control Car', price: 1450 },
      { ur: 'پزل سیٹ — بچوں کے لیے', en: 'Puzzle Set — Kids', price: 620 },
    ],
  },
]
