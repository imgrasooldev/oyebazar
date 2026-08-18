/**
 * Naye wholesalers mojooda DB mein daalta hai — bina reseed ke.
 *
 * Reseed sab kuch uda deta (orders, resellers, packs). Ye sirf wo dukanen add karta hai
 * jo abhi nahi hain, aur har ek ko thora maal deta hai taake directory khali na lage.
 *
 * Chalayen:
 *   pnpm --filter @oyebazar/db exec dotenv -e ../../.env -- tsx prisma/add-suppliers.ts
 */
import { PrismaClient } from '@prisma/client'
import { productPhoto } from './photos'

const prisma = new PrismaClient()

/**
 * 🔴 Naam wohi jo dukan wale ne khud likha — kuch angrezi, kuch Urdu. App kisi zaban
 * par majboor nahi karti; businessName ek hi khaana hai aur wahi jaisa ka taisa dikhta hai.
 */
const NEW_SUPPLIERS = [
  {
    slug: 'sialkot-sports-co',
    businessName: 'Sialkot Sports Co.',
    ownerName: 'Bilal Nadeem',
    city: 'Sialkot',
    marketName: 'Small Industrial Estate',
    category: 'toys',
    products: [
      { ur: 'فٹ بال — سلائی شدہ', en: 'Football — Hand Stitched', price: 1450 },
      { ur: 'جم گلوز', en: 'Gym Gloves', price: 780 },
    ],
  },
  {
    slug: 'metro-home-supplies',
    businessName: 'Metro Home Supplies',
    ownerName: 'Hamza Tariq',
    city: 'Lahore',
    marketName: 'Hall Road',
    category: 'home-textile',
    products: [
      { ur: 'کمبل — ڈبل بیڈ', en: 'Blanket — Double Bed', price: 3800 },
      { ur: 'تولیہ سیٹ — ۴ پیس', en: 'Towel Set — 4 Piece', price: 1250 },
    ],
  },
  {
    slug: 'crescent-cosmetics',
    businessName: 'Crescent Cosmetics',
    ownerName: 'Ayesha Siddiqui',
    city: 'Karachi',
    marketName: 'Empress Market',
    category: 'cosmetics',
    products: [
      { ur: 'لپ اسٹک سیٹ — ۶ شیڈز', en: 'Lipstick Set — 6 Shades', price: 950 },
      { ur: 'پرفیوم — ۵۰ ملی', en: 'Perfume — 50ml', price: 1650 },
    ],
  },
  {
    slug: 'multan-dry-fruits',
    businessName: 'Multan Dry Fruits & Spices',
    ownerName: 'Zahid Hussain',
    city: 'Multan',
    marketName: 'Hussain Agahi',
    category: 'food-grocery',
    products: [
      { ur: 'خشک میوہ جات — مکس ۱ کلو', en: 'Mixed Dry Fruit — 1kg', price: 2900 },
      { ur: 'مصالحہ باکس — ۱۰ آئٹم', en: 'Spice Box — 10 Items', price: 1350 },
    ],
  },
  {
    slug: 'peshawar-crockery',
    businessName: 'Peshawar Crockery House',
    ownerName: 'Noor Zaman',
    city: 'Peshawar',
    marketName: 'Qissa Khwani',
    category: 'kitchen',
    products: [
      { ur: 'چائے سیٹ — ۱۲ پیس', en: 'Tea Set — 12 Piece', price: 2100 },
      { ur: 'پریشر ککر — ۵ لیٹر', en: 'Pressure Cooker — 5 Litre', price: 4200 },
    ],
  },
] as const

/** Hamara rate = supplier ka rate + fee. Wohi hisab jo seed mein hai. */
function bajiPriceFrom(supplierPrice: number, feeRateBps: number): number {
  return supplierPrice + Math.round((supplierPrice * feeRateBps) / 10_000)
}

async function main() {
  for (const entry of NEW_SUPPLIERS) {
    const existing = await prisma.supplier.findUnique({ where: { slug: entry.slug } })
    if (existing) {
      console.log(`· ${entry.businessName} — pehle se mojood`)
      continue
    }

    const supplier = await prisma.supplier.create({
      data: {
        slug: entry.slug,
        businessName: entry.businessName,
        ownerName: entry.ownerName,
        phone: `9230012${String(Math.abs(hash(entry.slug)) % 100000).padStart(5, '0')}`,
        whatsappPublic: '923001234567',
        address: `${entry.marketName}, ${entry.city}`,
        city: entry.city,
        marketName: entry.marketName,
        // Verified + listed — ye demo data hai, aur directory khali nahi dikhni chahiye
        status: 'VERIFIED',
        listedOnBazaar: true,
      },
    })

    // Maal SUB-category par lagta hai (jaise asli seed mein) — warna filter ka imtihan adhoora
    const parent = await prisma.category.findUnique({
      where: { slug: entry.category },
      select: { id: true, children: { select: { id: true }, take: 1 } },
    })
    const categoryId = parent?.children[0]?.id ?? parent?.id
    if (!categoryId) {
      console.log(`✗ ${entry.businessName} — category "${entry.category}" nahi mili`)
      continue
    }

    for (const [index, item] of entry.products.entries()) {
      const slug = `${entry.slug}-${index + 1}`
      const bajiPrice = bajiPriceFrom(item.price, supplier.feeRateBps)
      const photo = productPhoto(entry.category, slug)

      const product = await prisma.product.create({
        data: {
          slug,
          supplierId: supplier.id,
          titleUr: item.ur,
          titleEn: item.en,
          descriptionUr: 'اصلی کوالٹی۔ تھوک ریٹ پر دستیاب۔',
          categoryId,
          supplierPrice: item.price,
          bajiPrice,
          suggestedRetail: Math.round((bajiPrice * 1.35) / 50) * 50,
          status: 'LIVE',
        },
      })

      await prisma.productVariant.create({
        data: { productId: product.id, size: 'M', skuCode: `${slug}-M`, stockQty: 15 },
      })

      await prisma.productMedia.create({
        data: {
          productId: product.id,
          originalUrl: photo,
          processedUrl: photo,
          isStatusSource: true,
          sortOrder: 0,
        },
      })
    }

    console.log(`✓ ${entry.businessName} — ${entry.products.length} items`)
  }

  await prisma.$disconnect()
}

/** Phone number banane ke liye — wohi slug, hamesha wohi number. */
function hash(value: string): number {
  let total = 0
  for (let i = 0; i < value.length; i += 1) total = (total * 31 + value.charCodeAt(i)) | 0
  return total
}

main().catch(async (error) => {
  console.error(error)
  await prisma.$disconnect()
  process.exit(1)
})
