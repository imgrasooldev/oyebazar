/**
 * Poore data ki ek nakal — JSON mein.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔴 Ye Supabase ke backup ki JAGAH NAHI hai, aur ye baat pehle likhna zaroori hai.
 *
 * Supabase khud backup leta hai (paid plan par point-in-time tak) — aur wo asli backup
 * hai: poora schema, saari shartein, indexes, aur binary fidelity. Ye script us ka
 * badal nahi ban sakti.
 *
 * Ye us ek sawal ka jawab hai jo backup se pehle poochha jana chahiye: "agar aaj sab
 * kuch mit jaye, to kya hamare paas apna kuch hai?" — aur us ka jawab is waqt NAHI hai.
 * Ye script wo "kuch" deti hai: har table ki ek JSON nakal, jo aap ke apne computer par
 * hoti hai aur jise parhne ke liye kisi vendor ki zaroorat nahi.
 *
 * 🔴 Aur wo backup backup NAHI hota jise kabhi restore kar ke na dekha gaya ho. Is
 * script ka poora faida usi din milta hai jis din aap us ki nakal se kuch wapas laa kar
 * dekh len — us se pehle wo sirf ek umeed hai.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * 🔴 NIKALNE WALI FILE HASSAS HAI. Us mein `supplierPrice`, `avgCost` (dukan ki lagat),
 * customer ke phone number aur pate — sab kuch hota hai. Wo `.local/` mein girti hai jo
 * git se bahar hai. Usay kabhi kisi ko na bhejen, na kisi cloud folder mein rakhen.
 *
 * Chalayen:
 *   node --env-file=<env> node_modules/tsx/dist/cli.mjs prisma/export-data.ts
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Kaun se table — aur tarteeb WAPAS DAALNE ke hisab se.
 *
 * 🔴 Ye list haath se likhi hai, khud-kar nahi. Wajah: naya table banne par ye script
 * chup chaap usay chhor degi, aur wo baat kisi ko pata nahi chalegi. Haath se likhi list
 * par kam se kam ye ummeed hai ke naya table daalte waqt nazar yahan bhi pare — aur us
 * din ye satar us bande ko yaad dila degi.
 *
 * Tarteeb wo hai jis mein wapas daala jaye to rishtey na toote: pehle wo jin par koi
 * dusra khara hai (Supplier, Category), phir un par khare hue (Product, Order).
 */
const TABLES = [
  'supplier',
  'category',
  'reseller',
  'opsUser',
  'warehouse',
  'product',
  'productVariant',
  'productMedia',
  'variantStock',
  'stockBatch',
  'resellerPricing',
  'resellerTemplate',
  'statusPack',
  'dailyDrop',
  'dailyDropItem',
  'order',
  'orderItem',
  'orderEvent',
  'orderMessage',
  'supplierReview',
  'stockMove',
  'resellerPayout',
  'feeLedger',
  'priceChangeRequest',
  'contentPack',
  'counter',
] as const

async function main(): Promise<void> {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const dir = join(process.cwd(), '..', '..', '.local', 'backups', stamp)
  mkdirSync(dir, { recursive: true })

  let total = 0
  const summary: Record<string, number> = {}

  for (const table of TABLES) {
    /*
     * `as never` — Prisma ke client par har model ka apna type hai, aur unhen ek hi
     * naam se ghumana TypeScript ke bas ki baat nahi. Yahan wo qeemat qubool hai: is
     * script ka kaam har table ko EK jaisa samajhna hai, aur agar koi naam ghalat hua to
     * wo pehli hi dafa chalne par saamne aa jayega.
     */
    const model = (prisma as never as Record<string, { findMany(): Promise<unknown[]> }>)[table]
    if (!model) {
      console.error(`🔴 table nahi mila: ${table} — list theek karen`)
      process.exit(1)
    }

    const rows = await model.findMany()
    writeFileSync(join(dir, `${table}.json`), JSON.stringify(rows, null, 2), 'utf8')

    summary[table] = rows.length
    total += rows.length
  }

  writeFileSync(
    join(dir, '_manifest.json'),
    JSON.stringify({ takenAt: new Date().toISOString(), rows: summary, total }, null, 2),
    'utf8',
  )

  console.log(`\nnakal yahan hai: ${dir}`)
  for (const [table, count] of Object.entries(summary)) {
    if (count > 0) console.log(`  ${table.padEnd(20)} ${count}`)
  }
  console.log(`\nkul qataren: ${total}`)
  console.log('\n🔴 Ye file hassas hai (lagat, phone number, pate). Kisi ko na bhejen.')

  await prisma.$disconnect()
}

void main()
