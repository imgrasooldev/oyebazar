/**
 * Chalti hui app ke screenshots — mobile aur desktop dono.
 *
 * Kis ke liye: UI par kaam karte waqt "khud dekh kar" faisla karna. Sadia ka phone
 * chhota hai, is liye default mobile viewport hai.
 *
 * Chalayen (dev server chalte hue):
 *   pnpm --filter @oyebazar/worker shoot -- /  /bazaar  /login
 */
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { chromium } from 'playwright'

const BASE = process.env.SHOOT_BASE_URL ?? 'http://localhost:3000'

/** Android 8/9 wala aam sasta phone, aur ek desktop. */
const VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'desktop', width: 1280, height: 900 },
]

function parseCookies(raw: string) {
  return raw
    .split(';')
    .map((pair) => pair.trim())
    .filter(Boolean)
    .map((pair) => {
      const [name, ...rest] = pair.split('=')
      return {
        name: name ?? '',
        value: rest.join('='),
        domain: 'localhost',
        path: '/',
        expires: -1,
        httpOnly: false,
        secure: false,
        sameSite: 'Lax' as const,
      }
    })
}

async function main(): Promise<void> {
  const paths = process.argv.slice(2).filter((arg) => arg.startsWith('/'))
  if (paths.length === 0) paths.push('/')

  const outDir = resolve(process.cwd(), 'shots')
  await mkdir(outDir, { recursive: true })

  const browser = await chromium.launch()

  try {
    for (const viewport of VIEWPORTS) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        deviceScaleFactor: 2,
        locale: 'ur-PK',
        // Cookies SHOOT_COOKIE mein: "oyebazar_session=abc; oyebazar_lang=en"
        // (session ke liye, aur zaban badal kar dono shakleN dekhne ke liye)
        ...(process.env.SHOOT_COOKIE
          ? {
              storageState: {
                cookies: parseCookies(process.env.SHOOT_COOKIE),
                origins: [],
              },
            }
          : {}),
      })

      const page = await context.newPage()

      for (const path of paths) {
        await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' })
        const slug = path === '/' ? 'home' : path.replace(/^\//, '').replace(/\//g, '-')
        const file = resolve(outDir, `${slug}-${viewport.name}.png`)
        // SHOOT_FULLPAGE=0 → sirf pehli screen (dekhne mein aasan, share karne ke liye behtar)
        await page.screenshot({ path: file, fullPage: process.env.SHOOT_FULLPAGE !== '0' })
        console.log(`✓ ${viewport.name.padEnd(8)} ${path.padEnd(20)} → ${file}`)
      }

      await context.close()
    }
  } finally {
    await browser.close()
  }
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
