/**
 * Seed — local development ke liye.
 *
 * Categories poore B2B bazaar ki hain (kapre se aage: electronics, grocery, pharma…)
 * kyunke DIRECTORY har thok wale ke liye hai. Content Studio (status pack) abhi bhi
 * dekhne wale maal — kapra, jewellery, ghar ka saman — par sab se behtar chalta hai.
 *
 * Chalayen: pnpm db:seed
 */
import { categoryPhoto, productPhoto } from './photos'
import { CATALOGUE as SEED_CATALOGUE } from './seed-data'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Har category ke saath us ki subcategories aur maal.
 *
 * Subcategories khareedar ke liye hain: "Electronics" bohat bara lafz hai, "Fans" par
 * wo foran pohanch jata hai. Do darjay se aage nahi jate — teesre darjay ke menu mein
 * log kho jate hain.
 */
const CATALOGUE = SEED_CATALOGUE

/*
 * Naam wohi jo dukan wale ne khud likha — kuch Urdu mein, kuch angrezi mein.
 * Ye asal soorat-e-haal hai: Bolton Market ki purani dukanen apna naam Urdu mein
 * likhwati hain, jabke Sialkot/Karachi ke naye exporters angrezi mein. App kisi ek
 * zaban par majboor nahi karti — businessName ek hi khaana hai.
 */
const SUPPLIERS = [
  { slug: 'al-madina-fabrics', businessName: 'المدینہ فیبرکس', ownerName: 'Kashif Ali', city: 'Karachi', marketName: 'Bolton Market' },
  { slug: 'noor-textiles', businessName: 'نور ٹیکسٹائل', ownerName: 'Adnan Sheikh', city: 'Karachi', marketName: 'Bolton Market' },
  { slug: 'shahzad-cloth-house', businessName: 'شہزاد کلاتھ ہاؤس', ownerName: 'Shahzad Iqbal', city: 'Lahore', marketName: 'Azam Cloth Market' },
  { slug: 'gulberg-collection', businessName: 'گلبرگ کلیکشن', ownerName: 'Farhan Malik', city: 'Lahore', marketName: 'Azam Cloth Market' },
  { slug: 'faisal-fabrics', businessName: 'فیصل فیبرکس', ownerName: 'Imran Butt', city: 'Faisalabad', marketName: 'Rail Bazaar' },
  { slug: 'rehman-traders', businessName: 'رحمان ٹریڈرز', ownerName: 'Abdul Rehman', city: 'Karachi', marketName: 'Jodia Bazaar' },
  { slug: 'khan-electronics', businessName: 'خان الیکٹرانکس', ownerName: 'Wajid Khan', city: 'Rawalpindi', marketName: 'Raja Bazaar' },
  { slug: 'sialkot-sports-co', businessName: 'Sialkot Sports Co.', ownerName: 'Bilal Nadeem', city: 'Sialkot', marketName: 'Small Industrial Estate' },
  { slug: 'metro-home-supplies', businessName: 'Metro Home Supplies', ownerName: 'Hamza Tariq', city: 'Lahore', marketName: 'Hall Road' },
  { slug: 'crescent-cosmetics', businessName: 'Crescent Cosmetics', ownerName: 'Ayesha Siddiqui', city: 'Karachi', marketName: 'Empress Market' },
  { slug: 'multan-dry-fruits', businessName: 'Multan Dry Fruits & Spices', ownerName: 'Zahid Hussain', city: 'Multan', marketName: 'Hussain Agahi' },
  { slug: 'peshawar-crockery', businessName: 'Peshawar Crockery House', ownerName: 'Noor Zaman', city: 'Peshawar', marketName: 'Qissa Khwani' },
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

/*
 * Tasveerein ab `photos.ts` se aati hain — category ke mutabiq asli product photos.
 * Pehle picsum se be-tuki tasveerein aati thin (face wash par railway line), jis se
 * status pack — jo hamara asal product hai — bekar dikhta tha.
 */

/**
 * Seed ka maal ek hi lamhe mein banta hai — is liye har card par "abhi abhi" likha aata
 * tha aur "kitna purana hai" wali saari UI bekaar lagti thi.
 *
 * Ye har product ko pichhle ~70 din mein bikher deta hai (thora naya, kaafi purana) taake
 * demo asli directory jaisi lage. Random nahi — index se banta hai, taake do baar seed
 * karne par wohi natija aaye.
 */
function listedAt(index: number): Date {
  const hours = [3, 9, 27, 50, 96, 170, 340, 700, 1_100, 1_680][index % 10]!
  return new Date(Date.now() - hours * 60 * 60 * 1000)
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
        imageUrl: categoryPhoto(category.slug),
        sortOrder: categoryIndex,
      },
    })

    /*
     * 🔴 `path` yahan LAZMI hai — aur pehle chhoot gaya tha.
     *
     * Column ka default "/" hai, aur chhanni `path startsWith <us category ka path>`
     * par chalti hai. Sab ka path "/" hone ka matlab tha ke har chhanni SAB kuch dikha
     * deti thi. Koi error nahi, koi khali safha nahi — bas chhanni ka koi asar hi nahi.
     * Ye us kism ki kharabi hai jo mahino nazar nahi aati.
     *
     * Id `create` ke BAAD hi milti hai, is liye ye alag `update` hai — wohi tareeqa jo
     * ops ke safhe par bhi hai (dekhen CategoryAdminService).
     */
    await prisma.category.update({
      where: { id: created.id },
      data: { path: `/${created.id}/`, depth: 0 },
    })

    const children = []
    for (const [childIndex, child] of category.children.entries()) {
      children.push(
        await prisma.category.create({
          data: {
            slug: child.slug,
            nameUr: child.nameUr,
            nameEn: child.nameEn,
            // Sub-category ki tasveer bhi apni bari category se — maal wohi hai
            imageUrl: categoryPhoto(category.slug, 900, 600),
            sortOrder: childIndex,
            parentId: created.id,
            // Jarh ka path + apni id — wahi shakl jo CategoryAdminService banati hai
            depth: 1,
          },
        }),
      )
    }

    for (const child of children) {
      await prisma.category.update({
        where: { id: child.id },
        data: { path: `/${created.id}/${child.id}/` },
      })
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
          createdAt: listedAt(productIndex),
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
          originalUrl: productPhoto(category.slug, slug),
          processedUrl: productPhoto(category.slug, slug),
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
