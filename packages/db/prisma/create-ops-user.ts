/**
 * Pehla admin banane ka rasta — bootstrap.
 *
 * Masla jo ye hal karta hai: nayi (production) database par koi OpsUser hota hi nahi.
 * `/admin/login` par koi andar nahi ja sakta, aur Team ka safha bhi kaam nahi aata
 * kyunke wo pehle se mojood SUPER_ADMIN maangta hai. Yani deploy karne ke baad admin
 * portal band ka band reh jata.
 *
 * Is ke baad ke saare users portal se bante hain — ye CLI sirf pehle darwaze ke liye hai.
 *
 * Chalayen:
 *   pnpm db:ops-user -- --name "Ghulam Rasool" --email me@oyebazar.com --phone 03004445566
 *   pnpm db:ops-user -- --name "Ops Lead" --email lead@oyebazar.com --phone 03001234567 --role MANAGER
 *
 * Production par (Fly):
 *   fly ssh console -C "pnpm db:ops-user -- --name ... --email ... --phone ..."
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const ROLES = ['REVIEWER', 'COORDINATOR', 'MANAGER', 'SUPER_ADMIN'] as const
type Role = (typeof ROLES)[number]

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`)
  return index === -1 ? undefined : process.argv[index + 1]
}

/** 03001234567 → 923001234567. Wohi qaida jo poori app mein hai. */
function toE164(raw: string): string | null {
  const digits = raw.replace(/[\s-()]/g, '')
  if (!/^(?:\+?92|0)3\d{9}$/.test(digits)) return null
  const clean = digits.replace(/^\+/, '')
  return clean.startsWith('92') ? clean : `92${clean.slice(1)}`
}

async function main(): Promise<void> {
  const name = arg('name')
  const email = arg('email')
  const phoneRaw = arg('phone')
  const role = (arg('role') ?? 'SUPER_ADMIN') as Role

  if (!name || !email || !phoneRaw) {
    console.error('Chahiye: --name "Naam" --email a@b.com --phone 03001234567 [--role SUPER_ADMIN]')
    process.exit(1)
  }

  if (!ROLES.includes(role)) {
    console.error(`Role in mein se ek ho: ${ROLES.join(', ')}`)
    process.exit(1)
  }

  const phone = toE164(phoneRaw)
  if (!phone) {
    console.error(`Number theek nahi: ${phoneRaw} (misal: 03001234567)`)
    process.exit(1)
  }

  // 🔴 Login isi number se hota hai. Number pehle se kisi aur ke paas ho to chup chaap
  // badalna khatarnak hai — us ka access chala jata aur kisi ko pata na chalta.
  const existing = await prisma.opsUser.findFirst({
    where: { OR: [{ phone }, { email }] },
    select: { id: true, name: true, email: true, phone: true, role: true, isActive: true },
  })

  if (existing) {
    console.log('Ye number ya email pehle se mojood hai:')
    console.log(JSON.stringify(existing, null, 1))
    console.log('\nRole badalna ya access khokna ho to /admin/team se karen.')
    await prisma.$disconnect()
    return
  }

  const created = await prisma.opsUser.create({
    data: { name, email, phone, role, isActive: true },
    select: { id: true, name: true, email: true, phone: true, role: true },
  })

  const total = await prisma.opsUser.count()

  console.log('✓ Ops user ban gaya:')
  console.log(JSON.stringify(created, null, 1))
  console.log(`\nAb /admin/login par ${phoneRaw} daal kar login karen — code WhatsApp par aayega.`)
  if (total === 1) {
    console.log('Ye pehla ops user hai; baqi team is ke baad /admin/team se add karen.')
  }

  await prisma.$disconnect()
}

main().catch(async (error) => {
  console.error(error)
  await prisma.$disconnect()
  process.exit(1)
})
