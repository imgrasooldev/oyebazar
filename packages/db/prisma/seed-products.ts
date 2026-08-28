/**
 * Maal — production ka pehla bara data set.
 *
 * Ye `seed.ts` (poora farzi bazaar) se alag hai: yahan koi order, koi paisa, koi farzi
 * reseller nahi banta. Sirf maal — kyunke khali catalogue par koi reseller nahi tikti,
 * aur pehle asli wholesaler ko bhi ye dekhna hota hai ke us ka maal kaisa lagega.
 *
 * Har sub-category par kai cheezein banti hain, aur naam us sub-category se bante hain
 * (lawn → "لان تھری پیس — ایمبرائیڈرڈ"), be-tuke naam nahi.
 *
 * 🔴 Tarteeb DETERMINISTIC hai — koi `Math.random` nahi:
 *  · wohi maal, wohi tasveer, wohi rate — har dafa
 *  · dobara chalane par kuch dohra nahi banta (slug par pehle se dekh liya jata hai)
 *  · aur sab se ahem: pehle se bane hue status pack maal se mel khate rehte hain
 *
 * Chalayen:
 *   node --env-file=<prod env> node_modules/tsx/dist/cli.mjs prisma/seed-products.ts
 */
import { PrismaClient } from '@prisma/client'
import { buildSearchText } from '@oyebazar/shared'
import { CATALOGUE } from './seed-data'
import { productPhoto } from './photos'

const prisma = new PrismaClient()

/** Har sub-category par itni cheezein — 50 sub-category × 6 = ~300 */
const PER_SUBCATEGORY = 6

const DESCRIPTION = 'اصلی کوالٹی۔ تھوک ریٹ پر دستیاب۔ سنگل پیس بھی مل سکتا ہے۔'

/**
 * Naam ke lawaahiq (suffix) — har category ke apne.
 *
 * Ye wo lafz hain jo Pakistani thok bazaar mein waqai bolay jate hain. "Variant 1,
 * Variant 2" jaisi cheez likhna data ko farzi bana deta hai, aur reseller usay status
 * par nahi lagati.
 */
const SUFFIXES: Record<string, { ur: string; en: string }[]> = {
  apparel: [
    { ur: 'ایمبرائیڈرڈ', en: 'Embroidered' },
    { ur: 'پرنٹڈ', en: 'Printed' },
    { ur: 'سادہ', en: 'Plain' },
    { ur: 'چکن کاری', en: 'Chikankari' },
    { ur: 'ڈیجیٹل پرنٹ', en: 'Digital Print' },
    { ur: 'شیفون دوپٹہ کے ساتھ', en: 'With Chiffon Dupatta' },
  ],
  'home-textile': [
    { ur: 'ڈبل بیڈ', en: 'Double Bed' },
    { ur: 'سنگل بیڈ', en: 'Single Bed' },
    { ur: 'کاٹن', en: 'Cotton' },
    { ur: 'ویلوٹ', en: 'Velvet' },
    { ur: 'پرنٹڈ', en: 'Printed' },
    { ur: 'سردیوں کا', en: 'Winter' },
  ],
  cosmetics: [
    { ur: 'ٹریول سائز', en: 'Travel Size' },
    { ur: 'فیملی پیک', en: 'Family Pack' },
    { ur: 'ہربل', en: 'Herbal' },
    { ur: 'وٹامن ای', en: 'Vitamin E' },
    { ur: 'آئل فری', en: 'Oil Free' },
    { ur: 'پیک آف ۳', en: 'Pack of 3' },
  ],
  'food-grocery': [
    { ur: '۱ کلو', en: '1 kg' },
    { ur: '۵۰۰ گرام', en: '500 g' },
    { ur: '۲ کلو', en: '2 kg' },
    { ur: 'پریمیم', en: 'Premium' },
    { ur: 'فیملی پیک', en: 'Family Pack' },
    { ur: 'تازہ', en: 'Fresh' },
  ],
}

/** Jin categories ka apna list nahi — un ke liye aam lawaahiq. */
const DEFAULT_SUFFIXES = [
  { ur: 'اسٹینڈرڈ', en: 'Standard' },
  { ur: 'پریمیم', en: 'Premium' },
  { ur: 'اکانومی', en: 'Economy' },
  { ur: 'بڑا سائز', en: 'Large' },
  { ur: 'چھوٹا سائز', en: 'Small' },
  { ur: 'ڈبل پیک', en: 'Double Pack' },
]

/** Kapre par rang/size hote hain; aata daal par nahi. */
const VARIANT_CATEGORIES = new Set(['apparel', 'home-textile'])
const COLOURS = ['نیلا', 'سبز', 'کالا', 'گلابی']
const SIZES = ['S', 'M', 'L', 'XL']

/**
 * Rate — category ke apne band mein, aur maal ke number se badalta hua.
 *
 * Har cheez ka ek hi rate rakhne se catalogue "copy paste" lagta hai, aur `sort=price`
 * ka koi matlab nahi rehta. Random nahi: wohi maal, hamesha wohi rate.
 */
function priceFor(base: number, index: number): number {
  const swing = [0, 150, -100, 300, -50, 450][index % 6] ?? 0
  return Math.max(200, Math.round((base + swing) / 50) * 50)
}

function slugify(text: string, index: number): string {
  const base = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `${base || 'item'}-${index}`
}

async function main(): Promise<void> {
  const suppliers = await prisma.supplier.findMany({
    where: { status: 'VERIFIED' },
    orderBy: { createdAt: 'asc' },
    select: { id: true, feeRateBps: true },
  })

  if (suppliers.length === 0) {
    console.error('koi VERIFIED dukan nahi mili — pehle seed-accounts chalayen')
    process.exit(1)
  }

  let made = 0
  let skipped = 0
  let index = 0

  for (const category of CATALOGUE) {
    const suffixes = SUFFIXES[category.slug] ?? DEFAULT_SUFFIXES
    const basePrice = category.products?.[0]?.price ?? 1500

    for (const child of category.children) {
      const target = await prisma.category.findUnique({ where: { slug: child.slug } })
      if (!target) continue

      for (let n = 0; n < PER_SUBCATEGORY; n += 1) {
        const suffix = suffixes[n % suffixes.length]!
        const titleUr = `${child.nameUr} — ${suffix.ur}`
        const titleEn = `${child.nameEn} — ${suffix.en}`
        const slug = slugify(`${child.slug}-${suffix.en}`, n + 1)

        if (await prisma.product.findUnique({ where: { slug } })) {
          skipped += 1
          index += 1
          continue
        }

        // Maal sab dukanon par baant dete hain — ek hi dukan par dher lagana asli nahi lagta
        const supplier = suppliers[index % suppliers.length]!
        const supplierPrice = priceFor(basePrice, n)
        const bajiPrice = Math.round(supplierPrice * (1 + supplier.feeRateBps / 10_000))

        const product = await prisma.product.create({
          data: {
            slug,
            supplierId: supplier.id,
            titleUr,
            titleEn,
            descriptionUr: DESCRIPTION,
            categoryId: target.id,
            // Talash ka khana — repository bhi yehi likhti hai (shared/search-terms.ts)
            searchText: buildSearchText({
              titleUr,
              titleEn,
              descriptionUr: DESCRIPTION,
              categoryNameUr: child.nameUr,
              categoryNameEn: child.nameEn,
            }),
            supplierPrice,
            bajiPrice,
            // Mashwara diya gaya rate — reseller isay badal sakti hai
            suggestedRetail: Math.round((bajiPrice * 1.35) / 50) * 50,
            status: 'LIVE',
          },
        })

        if (VARIANT_CATEGORIES.has(category.slug)) {
          await prisma.productVariant.createMany({
            data: COLOURS.slice(0, 2).flatMap((colour, ci) =>
              SIZES.slice(0, 2).map((size, si) => ({
                productId: product.id,
                colour,
                size,
                // SKU maal ke slug se banta hai — dukan wale ke apne register se mel khata hai
                skuCode: `${slug}-${ci + 1}${si + 1}`.toUpperCase(),
                stockQty: 6 + ((n + colour.length) % 10),
                /*
                 * Hadd aur lagat — taake maal ka register pehle din se kuch keh sake.
                 *
                 * 🔴 Lagat bechne ke rate se NIKALI gayi hai (75%), aur ye sirf seed
                 * mein qabool hai. Asli dukan ki lagat sirf wo khud batati hai
                 * (`stock/in` par) — us ka andaza lagana poori valuation ko ek jhoot par
                 * khara kar deta, aur us ke baad wo number kabhi theek na hota kyunke
                 * kisi ko pata hi na chalta ke wo andaza tha.
                 */
                reorderLevel: 4,
                avgCost: Math.round((supplierPrice * 0.75) / 10) * 10,
              })),
            ),
          })
        } else {
          // Jis maal par rang/size na hon us ka bhi ek default variant hota hai —
          // ginti wahin rehti hai, warna stock ka hisab do jagah ban jata
          await prisma.productVariant.create({
            data: {
              productId: product.id,
              skuCode: slug.toUpperCase(),
              stockQty: 12 + (n % 20),
              reorderLevel: 6,
              avgCost: Math.round((supplierPrice * 0.75) / 10) * 10,
            },
          })
        }

        // Do tasveerein: pehli status pack ke liye (isStatusSource)
        await prisma.productMedia.create({
          data: {
            productId: product.id,
            originalUrl: productPhoto(category.slug, slug),
            processedUrl: productPhoto(category.slug, slug),
            isStatusSource: true,
            sortOrder: 0,
          },
        })
        await prisma.productMedia.create({
          data: {
            productId: product.id,
            originalUrl: productPhoto(category.slug, `${slug}-2`),
            processedUrl: productPhoto(category.slug, `${slug}-2`),
            isStatusSource: false,
            sortOrder: 1,
          },
        })

        made += 1
        index += 1
      }
    }
  }

  const total = await prisma.product.count({ where: { status: 'LIVE' } })
  console.log(`maal: ${made} naya, ${skipped} pehle se mojood — ab kul LIVE: ${total}`)

  await prisma.$disconnect()
}

void main()
