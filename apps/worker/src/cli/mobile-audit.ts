/**
 * Mobile audit — sasta phone, asli sawal.
 *
 *   pnpm --filter @oyebazar/worker mobile:audit -- / /bazaar /login
 *
 * Teen cheezein naapta hai, kyunke yehi teen Sadia ke phone par sab se pehle tootti hain:
 *  1. Horizontal scroll — safha side mein khisakta ho to app tooti hui lagti hai
 *  2. Tap targets 44px se chhote — ungli se nahi lagte
 *  3. Text 12px se chhota — sasti screen par parha nahi jata
 */
import { chromium } from 'playwright'

const BASE = process.env.SHOOT_BASE_URL ?? 'http://localhost:3000'
const WIDTH = Number(process.env.AUDIT_WIDTH ?? 360) // aam sasta Android

async function main(): Promise<void> {
  const paths = process.argv.slice(2).filter((arg) => arg.startsWith('/'))
  if (paths.length === 0) paths.push('/')

  const browser = await chromium.launch()
  const context = await browser.newContext({
    viewport: { width: WIDTH, height: 780 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    locale: 'ur-PK',
    ...(process.env.SHOOT_COOKIE
      ? {
          storageState: {
            cookies: process.env.SHOOT_COOKIE.split(';')
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
              }),
            origins: [],
          },
        }
      : {}),
  })

  const page = await context.newPage()
  let problems = 0

  for (const path of paths) {
    await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' })

    const report = await page.evaluate(() => {
      const doc = document.documentElement
      const overflow = doc.scrollWidth - doc.clientWidth

      /*
       * Kaun sa element chaurai se bahar nikal raha hai.
       *
       * 🔴 Dono taraf dekhna zaroori hai. Pehle sirf `rect.right` dekha jata tha, magar
       * hamari site RTL hai — wahan content BAEN taraf bahar jata hai (left manfi hota
       * hai). Is blind spot ki wajah se audit "28px overflow" to batata tha magar element
       * ki list KHALI aati thi, aur wajah dhoondne mein waqt gaya.
       *
       * Sirf wo element ginte hain jo khud clip nahi karte — rail jaisi cheezon ke andar
       * ka content jaan boojh kar chaura hota hai aur wo safhe ko nahi torta.
       */
      const wide: string[] = []
      for (const el of Array.from(document.querySelectorAll('body *'))) {
        const rect = el.getBoundingClientRect()
        if (rect.width === 0) continue

        const outside = rect.right > doc.clientWidth + 2 || rect.left < -2
        if (!outside) continue

        // Kisi scroll hone wale dabbe ke andar hai? To ye safhe ka masla nahi
        let inScroller = false
        for (let parent = el.parentElement; parent; parent = parent.parentElement) {
          const overflowX = getComputedStyle(parent).overflowX
          if (overflowX === 'auto' || overflowX === 'scroll' || overflowX === 'hidden') {
            inScroller = true
            break
          }
        }
        if (inScroller) continue

        const node = el as HTMLElement
        const label = `${node.tagName.toLowerCase()}.${(node.className || '').toString().split(' ').slice(0, 3).join('.')}`
        if (!wide.includes(label)) wide.push(label)
        if (wide.length >= 5) break
      }

      const smallTaps: string[] = []
      for (const el of Array.from(document.querySelectorAll('a, button, input, select'))) {
        const rect = el.getBoundingClientRect()
        if (rect.width === 0 || rect.height === 0) continue
        if (rect.height < 40) {
          const node = el as HTMLElement
          const text = (node.innerText || node.getAttribute('aria-label') || node.tagName).trim().slice(0, 24)
          const entry = `${Math.round(rect.height)}px · ${text}`
          if (!smallTaps.includes(entry)) smallTaps.push(entry)
        }
        if (smallTaps.length >= 6) break
      }

      const tinyText: string[] = []
      for (const el of Array.from(document.querySelectorAll('p, span, li, a, td'))) {
        const node = el as HTMLElement
        // 🔴 Chhupe hue element ka `innerText` bhi text deta hai (Chromium textContent
        // par gir jata hai) — is liye pehle dekhte hain ke wo waqai nazar aa raha hai
        const rect = node.getBoundingClientRect()
        if (rect.width === 0 || rect.height === 0) continue
        if (!node.innerText?.trim()) continue
        const size = parseFloat(getComputedStyle(node).fontSize)
        if (size < 11.5) {
          const entry = `${size}px · ${node.innerText.trim().slice(0, 22)}`
          if (!tinyText.includes(entry)) tinyText.push(entry)
        }
        if (tinyText.length >= 5) break
      }

      return { overflow, wide, smallTaps, tinyText }
    })

    const bad = report.overflow > 1 || report.smallTaps.length > 0 || report.tinyText.length > 0
    if (bad) problems += 1

    console.log(`\n${bad ? '✗' : '✓'} ${path}`)
    if (report.overflow > 1) {
      console.log(`   overflow: ${report.overflow}px → ${report.wide.join(', ')}`)
    }
    if (report.smallTaps.length) console.log(`   chhote tap: ${report.smallTaps.join(' | ')}`)
    if (report.tinyText.length) console.log(`   chhota text: ${report.tinyText.join(' | ')}`)
  }

  await browser.close()
  console.log(`\n${problems === 0 ? 'Sab theek' : `${problems} safhon par masla`} (width ${WIDTH}px)`)
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
