import type { Metadata, Viewport } from 'next'
import { BRAND } from '@oyebazar/shared'
import { dirOf, htmlLang, isUrduScript } from '@/lib/i18n'
import { getLocale } from '@/lib/i18n-server'
import { SITE_URL } from '@/lib/seo'
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
const DESCRIPTION =
  'OyeBazar: Bolton Market, Azam Cloth aur poore Pakistan ke wholesalers — muft directory, seedha WhatsApp rabta. Resellers ke liye: har roz tayyar status packs.'

export const metadata: Metadata = {
  /*
   * 🔴 `metadataBase` — ye gum tha, aur us ki qeemat theek us jagah lag rahi thi jahan
   * is karobar ko sab se zyada nuqsan hota hai.
   *
   * Us ke baghair har Open Graph tasveer ka pata ADHOORA jata hai (`/og.png`, poora
   * `https://oyebazar.com/og.png` nahi). WhatsApp, Facebook aur Twitter adhoore pate par
   * tasveer dikhate hi nahi — aur is platform par har link WhatsApp par hi share hota
   * hai. Yani hamara sab se ahem surface bilkul khali chal raha tha: link bhejne par
   * sirf nanga pata nazar aata tha, na tasveer na unwan.
   */
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${BRAND.name} — Pakistan ke tasdeeq shuda wholesalers ki directory`,
    template: `%s · ${BRAND.name}`,
  },
  description: DESCRIPTION,
  manifest: '/manifest.webmanifest',
  applicationName: BRAND.name,
  /*
   * Open Graph — har safha isay warasat mein leta hai aur sirf wo hissa badalta hai jo
   * us ka apna hai (maal ka naam aur us ki apni tasveer).
   */
  openGraph: {
    type: 'website',
    siteName: BRAND.name,
    locale: 'ur_PK',
    url: SITE_URL,
    title: `${BRAND.name} — ${BRAND.directoryTaglineUr}`,
    description: DESCRIPTION,
  },
  twitter: {
    // `summary_large_image` — maal ki tasveer choti nahi, poori chaurai mein
    card: 'summary_large_image',
    title: `${BRAND.name} — ${BRAND.directoryTaglineUr}`,
    description: DESCRIPTION,
  },
  /*
   * 🔴 Ye khaana `noindex` NAHI hai — ye poori site ka default hai aur site ka
   * public hissa Google par jana hi chahiye. Login wale hisse apne apne layout par
   * khud ko `noindex` karte hain (dekhen `(app)/layout.tsx`), aur `robots.ts` un ke
   * raston par crawler ka waqt bhi bachati hai.
   */
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      // Google ko poora snippet aur bari tasveer dikhane di jaye — default tang hai
      'max-snippet': -1,
      'max-image-preview': 'large',
      'max-video-preview': -1,
    },
  },
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
