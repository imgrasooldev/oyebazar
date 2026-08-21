/**
 * Pehle din ke asli khaate — production ke liye.
 *
 * `seed.ts` se alag cheez hai: wo poora farzi bazaar banata hai (farzi maal, farzi
 * orders, farzi paise). Ye sirf DARWAZE kholta hai — 15 dukanen, 3 resellers, aur ek
 * super admin — taake asli log andar aa kar apna maal khud daalen.
 *
 * 🔴 Koi maal, koi order, koi paisa yahan nahi banta. Asli site par farzi maal sab se
 * bura pehla tassur hai: banda kholta hai, "Test Suit — Rs 1,000" dekhta hai, aur
 * wapas chala jata hai.
 *
 * Dobara chalane par kuch kharab nahi hota — jo number pehle se mojood ho wo chhoot
 * jata hai.
 *
 * Chalayen:
 *   node --env-file=<prod env> node_modules/tsx/dist/cli.mjs prisma/seed-accounts.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Number ka silsila jaan boojh kar saada hai (03001000001…) — soft launch mein inhen
 * yaad rakhna aur ek doosre se pehchanna aasan hona chahiye. Asli dukanen aane par
 * apne asli number se khud register karengi.
 */
const SUPPLIERS = [
  { businessName: 'فیصل فیبرکس', ownerName: 'Faisal Iqbal', city: 'Faisalabad', market: 'Sitara Market' },
  { businessName: 'شہزاد کلاتھ ہاؤس', ownerName: 'Shahzad Ali', city: 'Lahore', market: 'Azam Cloth Market' },
  { businessName: 'الکرم ٹیکسٹائل', ownerName: 'Kamran Sheikh', city: 'Karachi', market: 'Bolton Market' },
  { businessName: 'مدینہ سوٹ سینٹر', ownerName: 'Bilal Ahmad', city: 'Lahore', market: 'Anarkali' },
  { businessName: 'گجرانوالہ اسٹیل ہاؤس', ownerName: 'Adnan Butt', city: 'Gujranwala', market: 'Sarafa Bazaar' },
  { businessName: 'ملتان ڈرائی فروٹ', ownerName: 'Rizwan Qureshi', city: 'Multan', market: 'Hussain Agahi' },
  { businessName: 'سیالکوٹ اسپورٹس', ownerName: 'Usman Cheema', city: 'Sialkot', market: 'Chowk Kachehri' },
  { businessName: 'پشاور کراکری ہاؤس', ownerName: 'Naveed Khan', city: 'Peshawar', market: 'Qissa Khwani' },
  { businessName: 'کریسنٹ کاسمیٹکس', ownerName: 'Sana Malik', city: 'Karachi', market: 'Tariq Road' },
  { businessName: 'میٹرو ہوم سپلائیز', ownerName: 'Tanveer Hussain', city: 'Rawalpindi', market: 'Raja Bazaar' },
  { businessName: 'نور جیولری', ownerName: 'Noor Fatima', city: 'Lahore', market: 'Liberty Market' },
  { businessName: 'اقبال الیکٹرانکس', ownerName: 'Iqbal Ahmed', city: 'Karachi', market: 'Saddar' },
  { businessName: 'چناب لان', ownerName: 'Waqas Nadeem', city: 'Faisalabad', market: 'Rail Bazaar' },
  { businessName: 'راوی کچن اسٹور', ownerName: 'Hamza Tariq', city: 'Lahore', market: 'Shah Alam Market' },
  { businessName: 'سوات ہینڈی کرافٹس', ownerName: 'Zahid Ullah', city: 'Mingora', market: 'Green Chowk' },
]

const RESELLERS = [
  { name: 'صادیہ', city: 'Rawalpindi', area: 'Satellite Town' },
  { name: 'حرا', city: 'Lahore', area: 'Johar Town' },
  { name: 'عائشہ', city: 'Karachi', area: 'Gulshan-e-Iqbal' },
]

const ADMIN = {
  name: 'Ghulam Rasool',
  email: 'imgrasool@gmail.com',
  phone: '923004445566',
  role: 'SUPER_ADMIN' as const,
}

/** Karachi/Lahore ke aam rate — dukan apne settings se badal sakti hai. */
const DELIVERY = { city: 200, other: 350 }

function supplierPhone(index: number): string {
  return `9230010000${String(index + 1).padStart(2, '0')}`
}

function resellerPhone(index: number): string {
  return `9230020000${String(index + 1).padStart(2, '0')}`
}

/** Dukan ka apna safha — naam se, aur ek hi dafa tay hota hai (link kabhi na toote). */
function slugFor(name: string, index: number): string {
  return `dukan-${index + 1}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`
}

async function main(): Promise<void> {
  let made = 0
  let skipped = 0

  for (const [index, supplier] of SUPPLIERS.entries()) {
    const phone = supplierPhone(index)
    if (await prisma.supplier.findUnique({ where: { phone } })) {
      skipped += 1
      continue
    }

    await prisma.supplier.create({
      data: {
        businessName: supplier.businessName,
        ownerName: supplier.ownerName,
        phone,
        city: supplier.city,
        marketName: supplier.market,
        // Pata lazmi hai (parcel yahin se uthta hai) — bazaar aur sheher se ban jata hai
        address: `${supplier.market}, ${supplier.city}`,
        slug: slugFor(supplier.ownerName, index),
        // Bazaar par nazar aane ke liye dono cheezein chahiyen
        status: 'VERIFIED',
        listedOnBazaar: true,
        feeRateBps: 500,
        deliveryFeeCity: DELIVERY.city,
        deliveryFeeOther: DELIVERY.other,
        payoutTermDays: 3,
      },
    })
    made += 1
  }

  for (const [index, reseller] of RESELLERS.entries()) {
    const whatsappPhone = resellerPhone(index)
    if (await prisma.reseller.findUnique({ where: { whatsappPhone } })) {
      skipped += 1
      continue
    }

    await prisma.reseller.create({
      data: {
        name: reseller.name,
        whatsappPhone,
        city: reseller.city,
        area: reseller.area,
        status: 'ACTIVE',
        tier: 'NEW',
      },
    })
    made += 1
  }

  const adminExists = await prisma.opsUser.findUnique({ where: { phone: ADMIN.phone } })
  if (adminExists) skipped += 1
  else {
    await prisma.opsUser.create({ data: { ...ADMIN, isActive: true } })
    made += 1
  }

  console.log(`khaate: ${made} naye, ${skipped} pehle se mojood`)
  console.log('\ndukanen  :', SUPPLIERS.map((_, i) => supplierPhone(i)).join(', '))
  console.log('resellers:', RESELLERS.map((_, i) => resellerPhone(i)).join(', '))
  console.log('admin    :', ADMIN.phone)

  await prisma.$disconnect()
}

void main()
