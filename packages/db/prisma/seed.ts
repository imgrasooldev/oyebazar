/**
 * Seed — local development ke liye.
 *
 * Categories poore B2B bazaar ki hain (kapre se aage: electronics, grocery, pharma…)
 * kyunke DIRECTORY har thok wale ke liye hai. Content Studio (status pack) abhi bhi
 * dekhne wale maal — kapra, jewellery, ghar ka saman — par sab se behtar chalta hai.
 *
 * Chalayen: pnpm db:seed
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Har category ke saath us ki subcategories aur maal.
 *
 * Subcategories khareedar ke liye hain: "Electronics" bohat bara lafz hai, "Fans" par
 * wo foran pohanch jata hai. Do darjay se aage nahi jate — teesre darjay ke menu mein
 * log kho jate hain.
 */
const CATALOGUE = [
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
] as const

const SUPPLIERS = [
  { slug: 'al-madina-fabrics', businessName: 'المدینہ فیبرکس', ownerName: 'Kashif Ali', city: 'Karachi', marketName: 'Bolton Market' },
  { slug: 'noor-textiles', businessName: 'نور ٹیکسٹائل', ownerName: 'Adnan Sheikh', city: 'Karachi', marketName: 'Bolton Market' },
  { slug: 'shahzad-cloth-house', businessName: 'شہزاد کلاتھ ہاؤس', ownerName: 'Shahzad Iqbal', city: 'Lahore', marketName: 'Azam Cloth Market' },
  { slug: 'gulberg-collection', businessName: 'گلبرگ کلیکشن', ownerName: 'Farhan Malik', city: 'Lahore', marketName: 'Azam Cloth Market' },
  { slug: 'faisal-fabrics', businessName: 'فیصل فیبرکس', ownerName: 'Imran Butt', city: 'Faisalabad', marketName: 'Rail Bazaar' },
  { slug: 'rehman-traders', businessName: 'رحمان ٹریڈرز', ownerName: 'Abdul Rehman', city: 'Karachi', marketName: 'Jodia Bazaar' },
  { slug: 'khan-electronics', businessName: 'خان الیکٹرانکس', ownerName: 'Wajid Khan', city: 'Rawalpindi', marketName: 'Raja Bazaar' },
]

const RESELLERS = [
  { name: 'صادیہ', whatsappPhone: '923001234567', city: 'Lahore', area: 'Johar Town' },
  { name: 'عائشہ', whatsappPhone: '923009876543', city: 'Karachi', area: 'Gulshan' },
  { name: 'حرا', whatsappPhone: '923331112233', city: 'Rawalpindi', area: 'Satellite Town' },
]

/** Baji price = supplier price + fee. Yehi wo number hai jo reseller dekhti hai. */
function bajiPriceFrom(supplierPrice: number, feeRateBps: number): number {
  return supplierPrice + Math.round((supplierPrice * feeRateBps) / 10_000)
}

/** Dummy tasveer — asli shoot aane tak. Har slug ki apni, taake dobara wohi mile. */
function photo(seed: string, width = 1080, height = 1440): string {
  return `https://picsum.photos/seed/${seed}/${width}/${height}`
}

async function main() {
  console.log('Seeding…')

  await prisma.$transaction([
    prisma.statusPack.deleteMany(),
    prisma.dailyDropItem.deleteMany(),
    prisma.dailyDrop.deleteMany(),
    prisma.resellerPricing.deleteMany(),
    prisma.productMedia.deleteMany(),
    prisma.productVariant.deleteMany(),
    prisma.product.deleteMany(),
    prisma.category.deleteMany(),
    prisma.reseller.deleteMany(),
    prisma.supplier.deleteMany(),
  ])

  const suppliers = []
  for (const [index, supplier] of SUPPLIERS.entries()) {
    suppliers.push(
      await prisma.supplier.create({
        data: {
          ...supplier,
          phone: `9230012000${index}0`,
          whatsappPublic: `9230012000${index}0`,
          address: `${supplier.marketName}, ${supplier.city}`,
          bioUr: 'ہول سیل ریٹ پر مال — سنگل پیس بھی دستیاب۔',
          listedOnBazaar: true,
          status: 'VERIFIED',
          feeRateBps: 500,
          ntn: `12345${index}`,
        },
      }),
    )
  }

  let productIndex = 0

  for (const [categoryIndex, category] of CATALOGUE.entries()) {
    const created = await prisma.category.create({
      data: {
        slug: category.slug,
        nameUr: category.nameUr,
        nameEn: category.nameEn,
        imageUrl: photo(`cat-${category.slug}`, 900, 600),
        sortOrder: categoryIndex,
      },
    })

    const children = []
    for (const [childIndex, child] of category.children.entries()) {
      children.push(
        await prisma.category.create({
          data: {
            slug: child.slug,
            nameUr: child.nameUr,
            nameEn: child.nameEn,
            imageUrl: photo(`cat-${child.slug}`, 900, 600),
            sortOrder: childIndex,
            parentId: created.id,
          },
        }),
      )
    }

    for (const [itemIndex, item] of category.products.entries()) {
      // maal subcategory par lagta hai (agar hai) — warna khaali menu banta hai
      const target = children[itemIndex % children.length] ?? created
      // maal suppliers par baant dete hain, taake har supplier ke paas kuch ho
      const supplier = suppliers[productIndex % suppliers.length]!
      const supplierPrice = item.price
      const bajiPrice = bajiPriceFrom(supplierPrice, supplier.feeRateBps)
      const slug = `${category.slug}-${productIndex + 1}`

      const product = await prisma.product.create({
        data: {
          slug,
          supplierId: supplier.id,
          titleUr: item.ur,
          titleEn: item.en,
          descriptionUr: 'اصلی کوالٹی۔ تھوک ریٹ پر دستیاب۔ سنگل پیس بھی مل سکتا ہے۔',
          categoryId: target.id,
          supplierPrice,
          bajiPrice,
          suggestedRetail: Math.round((bajiPrice * 1.35) / 50) * 50,
          status: 'LIVE',
        },
      })

      await prisma.productVariant.createMany({
        data: ['S', 'M', 'L'].map((size) => ({
          productId: product.id,
          size,
          skuCode: `${slug}-${size}`,
          stockQty: productIndex % 9 === 0 ? 0 : 12,
        })),
      })

      await prisma.productMedia.create({
        data: {
          productId: product.id,
          originalUrl: photo(slug),
          processedUrl: photo(slug),
          isStatusSource: true,
          sortOrder: 0,
        },
      })

      productIndex += 1
    }
  }

  for (const reseller of RESELLERS) {
    await prisma.reseller.create({ data: { ...reseller, status: 'ACTIVE', tier: 'NEW' } })
  }

  console.log('Seed mukammal:', {
    suppliers: await prisma.supplier.count(),
    categories: await prisma.category.count(),
    products: await prisma.product.count(),
    resellers: await prisma.reseller.count(),
  })
  console.log(`Login test ke liye: ${RESELLERS[0]?.whatsappPhone} (OTP terminal par chhapega)`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
