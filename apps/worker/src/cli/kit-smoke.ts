/**
 * Kit ka smoke test — asli browser mein, wohi qadam jo reseller uthati hai.
 *
 * Login → product → "پورا پیک بنائیں" → chaar naap tayyar → har platform ka tab.
 * Ye batata hai ke API theek hai; curl sirf JSON dekhta hai, ye dekhta hai ke
 * tasveerein wakai screen par aati hain aur kinare kate hue nahi.
 *
 * Chalayen (dev server chalte hue):
 *   pnpm --filter @oyebazar/worker exec tsx src/cli/kit-smoke.ts <productId>
 */
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { chromium } from 'playwright'

const BASE = process.env.SHOOT_BASE_URL ?? 'http://localhost:3000'
const OUT = resolve(process.cwd(), 'shots')
const PHONE = process.env.SMOKE_PHONE ?? '03009876543'
const PRODUCT = process.argv[2] ?? 'cmsxs0fss003cvdrg57tskctr'
/**
 * Rate jaan boojh kar diya jata hai: dev mein Redis nahi hota, is liye naya kit render
 * nahi ho sakta. Wohi rate den jis ki kit pehle se bani ho (render-pending se), warna
 * test sirf khali dabbe dekhega.
 */
const PRICE = process.argv[3] ?? '1450'

async function main() {
  await mkdir(OUT, { recursive: true })
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 430, height: 1000 } })

  // ---- login (dev par code safhe par hota hai, is liye code dhoondna nahi parta)
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  await page.fill('input[type="tel"]', PHONE)
  await page.getByRole('button', { name: /کوڈ بھیجیں|Send code/ }).click()
  await page.locator('input[autocomplete="one-time-code"]').waitFor({ state: 'visible' })
  await page.getByRole('button', { name: /اندر آئیں|Continue/ }).click()
  await page.waitForURL((url) => url.pathname.includes('/catalogue'), { timeout: 20_000 })

  // ---- product ka safha
  await page.goto(`${BASE}/catalogue/${PRODUCT}`, { waitUntil: 'networkidle' })
  // Range input par Playwright ka fill nahi chalta ("not editable") — React ka apna
  // setter chala kar input event bhejte hain, warna component ki state nahi badalti
  await page.evaluate((value) => {
    const input = document.querySelector('#price') as HTMLInputElement | null
    if (!input) throw new Error('price slider nahi mila')
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
    setter?.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  }, PRICE)
  await page.getByRole('button', { name: /پورا پیک بنائیں|Create the pack/ }).click()

  // ---- chaar naap: jab tak "بن رہا ہے" baqi hai, intezar
  const preparing = page.getByText(/بن رہا ہے|Preparing/)
  const deadline = Date.now() + 60_000
  while (Date.now() < deadline && (await preparing.count()) > 0) {
    await page.waitForTimeout(1000)
  }

  const images = page.locator('li img[alt]')
  const shown = await images.count()
  console.log(`WhatsApp tab par naap dikh rahe hain : ${shown}`)

  // Har platform ka tab khol kar dekhen — naap us platform ke mutabiq badalne chahiyen
  for (const platform of ['واٹس ایپ', 'انسٹاگرام', 'فیس بک', 'ٹک ٹاک']) {
    await page.getByRole('button', { name: platform, exact: true }).click()
    await page.waitForTimeout(600)

    const count = await page.locator('li img[alt]').count()
    const caption = await page.locator('.whitespace-pre-line').first().innerText()
    const hasPhone = caption.includes('03') || /\d{10,}/.test(caption)

    console.log(
      `${platform.padEnd(12)} naap: ${count}  caption: ${caption.split('\n').length} line, number ${hasPhone ? 'hai' : 'NAHI'}`,
    )

    await page.screenshot({ path: resolve(OUT, `kit-${platform}.png`), fullPage: true })
  }

  await browser.close()
}

main().catch((error) => {
  console.error('kit smoke fail:', error instanceof Error ? error.message : error)
  process.exit(1)
})
