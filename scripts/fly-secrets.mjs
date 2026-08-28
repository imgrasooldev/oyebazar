/**
 * `.env.production` se Fly ke secrets set karta hai — dono apps par.
 *
 *   node scripts/fly-secrets.mjs            # set kar deta hai
 *   node scripts/fly-secrets.mjs --dry-run  # sirf batata hai kya jayega
 *
 * 🔴 Qadrein kabhi chhapti NAHI — sirf khaanon ke naam. Terminal ka record, screen
 * share, aur CI ke log: teenon jagah secret chhap jana aam ghalti hai, aur ek dafa
 * chhap jaye to usay wapas nahi liya ja sakta (badalna parta hai).
 *
 * Khali khaane chhoot jate hain: Fly par khali secret set karna us ke "mojood nahi"
 * hone se alag cheez hai, aur code aksar dono ko alag samajhta hai (misal WhatsApp
 * provider — khali string aur ghair-mojood par alag rasta chalta hai).
 */
import { execFileSync } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const envPath = resolve(root, '.env.production')

if (!existsSync(envPath)) {
  console.error('.env.production nahi mila. Pehle .env.production.example se copy karen.')
  process.exit(1)
}

/** Dono apps ko kaun se khaane chahiyen. */
const WEB_KEYS = [
  'DATABASE_URL',
  'DIRECT_URL',
  'APP_URL',
  'SESSION_COOKIE_NAME',
  'DEFAULT_FEE_RATE_BPS',
  'WHATSAPP_PROVIDER',
  'WATI_API_URL',
  'WATI_API_KEY',
  'META_PHONE_NUMBER_ID',
  'META_ACCESS_TOKEN',
  'META_WEBHOOK_VERIFY_TOKEN',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_KEY',
  'SUPABASE_BUCKET',
  'R2_PUBLIC_URL',
  'REDIS_URL',
  'OPS_API_KEY',
  'TRUST_CLOUDFLARE',
  'STATIC_OTP',
  /*
   * Status ke lafz — MARZI ka.
   *
   * 🔴 Na ho to kuch band nahi hota: reseller ko phir bhi teen jumle milte hain, hamare
   * apne khanon se (dekhen `packages/core/domain/pitch.ts`). Ye key sirf un jumlon ko
   * BEHTAR karti hai. Isi liye ye us list mein nahi jisay chhoot jane par deploy rukna
   * chahiye — us se ulta nuqsan hota: log ek marzi ki cheez ko lazmi samajh kar deploy
   * rok dete.
   */
  'ANTHROPIC_API_KEY',
]

/*
 * Worker ko bhi APP_URL chahiye: WhatsApp par jane wale link (dukan ka magic link,
 * status pack) isi se bante hain. Ye chhoot jaye to link `undefined/...` ban jate hain
 * aur baat kisi ko us waqt tak pata nahi chalti jab tak dukan wala shikayat na kare.
 */
const WORKER_KEYS = [...WEB_KEYS, 'RENDER_CONCURRENCY']

function parseEnv(text) {
  const out = new Map()

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const eq = trimmed.indexOf('=')
    if (eq < 0) continue

    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()

    // Dono taraf ke quote hata dete hain — Fly par wo qadar ka hissa ban jate hain
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    if (value) out.set(key, value)
  }

  return out
}

const env = parseEnv(readFileSync(envPath, 'utf8'))
const dryRun = process.argv.includes('--dry-run')

for (const [app, keys] of [
  ['oyebazar-web', WEB_KEYS],
  ['oyebazar-worker', WORKER_KEYS],
]) {
  const pairs = keys.filter((key) => env.has(key)).map((key) => `${key}=${env.get(key)}`)
  const names = keys.filter((key) => env.has(key))
  const missing = keys.filter((key) => !env.has(key))

  console.log(`\n${app}`)
  console.log(`  ja rahe hain (${names.length}): ${names.join(', ') || 'koi nahi'}`)
  if (missing.length > 0) console.log(`  khali (${missing.length}): ${missing.join(', ')}`)

  if (pairs.length === 0 || dryRun) continue

  // `--stage` nahi: hum chahte hain ke qadrein foran lag jayen aur agla deploy inhen le
  execFileSync('flyctl', ['secrets', 'set', '-a', app, ...pairs], { stdio: 'inherit' })
}

if (dryRun) console.log('\n(dry run — kuch set nahi hua)')
