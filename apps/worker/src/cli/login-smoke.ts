/**
 * Login ka smoke test — asli browser mein, wohi qadam jo user uthata hai.
 *
 * Kis ke liye: login ek client component hai (React state, fetch, do qadam). Curl se
 * sirf API check hoti hai; ye batata hai ke safha wakai chalta bhi hai — hydration hui,
 * button ne kaam kiya, aur dev par test code upar nazar aa raha hai.
 *
 * Chalayen (dev server chalte hue):
 *   pnpm --filter @oyebazar/worker exec tsx src/cli/login-smoke.ts
 *   pnpm --filter @oyebazar/worker exec tsx src/cli/login-smoke.ts supplier
 */
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { chromium } from 'playwright'

const BASE = process.env.SHOOT_BASE_URL ?? 'http://localhost:3000'
const OUT = resolve(process.cwd(), 'shots')

type Who = 'reseller' | 'supplier' | 'signup'

const WHO: Who =
  process.argv[2] === 'supplier' ? 'supplier' : process.argv[2] === 'signup' ? 'signup' : 'reseller'

const PATHS = {
  reseller: { login: '/login', phone: '03009876543' },
  supplier: { login: '/supplier/login', phone: '03001200040' },
  // Har chalane par naya number — warna doosri dafa ye register nahi, login ban jata hai
  signup: { login: '/login', phone: `0333${String(Date.now()).slice(-7)}` },
} as const

async function main() {
  await mkdir(OUT, { recursive: true })
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 420, height: 860 } })

  const { login, phone } = PATHS[WHO]
  await page.goto(`${BASE}${login}`, { waitUntil: 'networkidle' })

  await page.fill('input[type="tel"]', phone)
  await page.getByRole('button', { name: /کوڈ بھیجیں|Send code/ }).click()

  // Doosra qadam aane ka intezar — yehi sabit karta hai ke fetch chali aur state badli
  const codeInput = page.locator('input[autocomplete="one-time-code"]')
  await codeInput.waitFor({ state: 'visible', timeout: 15_000 })

  const shownCode = (await page.locator('p.numeric').first().innerText().catch(() => '')).trim()
  const filled = await codeInput.inputValue()

  await page.screenshot({ path: resolve(OUT, `login-${WHO}.png`), fullPage: true })

  console.log(`safhe par dikhaya gaya code : ${shownCode || '(koi nahi)'}`)
  console.log(`khane mein pehle se bhara    : ${filled || '(khali)'}`)

  // Code sahi hai ya nahi — asli imtihan yehi hai: usi se andar jaen
  await page.getByRole('button', { name: /اندر آئیں|Continue/ }).click()

  // Naya number: server NOT_REGISTERED kehta hai aur safha naam/sheher poochhta hai
  if (WHO === 'signup') {
    const nameBox = page.locator('input[autocomplete="name"]')
    await nameBox.waitFor({ state: 'visible', timeout: 15_000 })
    console.log('naya number   : register ka form khul gaya')

    await nameBox.fill('صائمہ')
    await page.locator('input[autocomplete="address-level2"]').fill('راولپنڈی')
    await page.screenshot({ path: resolve(OUT, 'signup-form.png'), fullPage: true })
    await page.getByRole('button', { name: /اکاؤنٹ بنائیں|Create account/ }).click()
  }
  try {
    await page.waitForURL((url) => !url.pathname.endsWith('login'), { timeout: 15_000 })
    console.log(`login ke baad pohanche      : ${new URL(page.url()).pathname}`)
  } catch {
    // Login na hua to wajah safhe par likhi hoti hai — usay dikhaen, khali timeout nahi
    const message = await page.locator('p.text-red-600').first().innerText().catch(() => '')
    throw new Error(`login nahi hua. Safhe ka paighaam: ${message || '(koi nahi)'}`)
  }

  await browser.close()
}

main().catch((error) => {
  console.error('login smoke fail:', error instanceof Error ? error.message : error)
  process.exit(1)
})
