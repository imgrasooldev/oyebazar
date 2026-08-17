/**
 * Local Postgres — bina Docker, bina install ke.
 *
 *   pnpm db:local        ← ye chalta rehna chahiye (alag terminal mein)
 *
 * Data `.local/pgdata` mein rehta hai (gitignored), is liye dobara chalane par
 * seed zaya nahi hota.
 *
 * 🔴 initdb par UTF8 LAZMI hai: Windows par default WIN1252 banta hai, jis mein
 * Urdu insert hi nahi hoti — seed "character ... has no equivalent in encoding WIN1252"
 * par mar jata hai. Neon/Supabase default UTF8 hain, ye sirf local ka masla hai.
 *
 * Neon/Supabase use karni ho to bas `.env` ka DATABASE_URL badal dein — ye script
 * chalane ki zaroorat hi nahi rahegi.
 */
import EmbeddedPostgres from 'embedded-postgres'
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dataDir = join(repoRoot, '.local', 'pgdata')

const PORT = Number(process.env.LOCAL_DB_PORT ?? 5433)
const USER = 'oyebazar'
const PASSWORD = 'oyebazar'
const DATABASE = 'oyebazar'

const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: USER,
  password: PASSWORD,
  port: PORT,
  persistent: true,
  initdbFlags: ['--encoding=UTF8', '--locale=C', '--lc-collate=C', '--lc-ctype=C'],
})

const fresh = !existsSync(join(dataDir, 'PG_VERSION'))

if (fresh) {
  console.log('Pehli baar — Postgres bana rahe hain (ek dafa ka kaam)…')
  await pg.initialise()
}

await pg.start()

if (fresh) {
  await pg.createDatabase(DATABASE)
}

console.log('')
console.log('  Postgres tayyar hai:')
console.log(`  postgresql://${USER}:${PASSWORD}@localhost:${PORT}/${DATABASE}`)
console.log('')
console.log('  Isay chalta rehne dein. Doosre terminal mein:')
console.log('    pnpm db:migrate && pnpm db:seed && pnpm dev')
console.log('')

const shutdown = async () => {
  console.log('\nPostgres band ho raha hai…')
  await pg.stop().catch(() => undefined)
  process.exit(0)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

// zinda raho — child process parent ke saath marta hai
setInterval(() => {}, 1 << 30)
