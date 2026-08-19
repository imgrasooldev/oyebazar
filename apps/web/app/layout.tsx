import type { Metadata, Viewport } from 'next'
import { BRAND } from '@oyebazar/shared'
import { dirOf, htmlLang, isUrduScript } from '@/lib/i18n'
import { getLocale } from '@/lib/i18n-server'
import { inter } from './fonts'
import './globals.css'

/**
 * Zaban cookie se aati hai — Urdu default, English ek tap door.
 * `dir` bhi wahin se badalti hai, is liye poora layout mirror ho jata hai.
 *
 * Font dono self-hosted hain (koi Google CDN nahi). Latin har safhe par chahiye kyunke
 * hindse usi mein chhapte hain, is liye wo preload hota hai. Nastaliq sirf tab utarta hai
 * jab safhe par waqai Urdu haroof hon (`unicode-range`, globals.css) — aur us ka preload
 * bhi sirf Urdu wale safhe par lagta hai, warna Roman/English wale visitor ko 159 KB ki
 * aisi file preload ho jati jo usay kabhi chahiye hi nahi.
 */
export const metadata: Metadata = {
  title: {
    default: `${BRAND.name} — Pakistan ke tasdeeq shuda wholesalers ki directory`,
    template: `%s · ${BRAND.name}`,
  },
  description:
    'OyeBazar: Bolton Market, Azam Cloth aur poore Pakistan ke wholesalers — muft directory, seedha WhatsApp rabta. Resellers ke liye: har roz tayyar status packs.',
  manifest: '/manifest.webmanifest',
}

export const viewport: Viewport = {
  themeColor: '#F2600C',
  width: 'device-width',
  initialScale: 1,
  // sasta Android + bara font: zoom band karna galti hoti hai
  maximumScale: 5,
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale()

  const urduScript = isUrduScript(locale)

  return (
    <html lang={htmlLang(locale)} dir={dirOf(locale)} className={inter.variable}>
      <head>
        {urduScript && (
          <link
            rel="preload"
            href="/fonts/noto-nastaliq-urdu-arabic-400.woff2"
            as="font"
            type="font/woff2"
            crossOrigin="anonymous"
          />
        )}
      </head>
      {/* Nastaliq sirf Urdu script par — Roman Urdu Latin haroof mein hai */}
      <body className={urduScript ? 'font-urdu' : 'font-sans'}>{children}</body>
    </html>
  )
}
