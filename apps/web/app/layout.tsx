import type { Metadata, Viewport } from 'next'
import { BRAND } from '@oyebazar/shared'
import { dirOf } from '@/lib/i18n'
import { getLocale } from '@/lib/i18n-server'
import './globals.css'

/**
 * Zaban cookie se aati hai — Urdu default, English ek tap door.
 * `dir` bhi wahin se badalti hai, is liye poora layout mirror ho jata hai.
 *
 * Font: abhi device ka Noto Nastaliq (Android par mojood hota hai). Self-hosted subset
 * `templates/fonts/` se aayega — tab render aur app dono ek jaisi dikhengi.
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
  themeColor: '#d42561',
  width: 'device-width',
  initialScale: 1,
  // sasta Android + bara font: zoom band karna galti hoti hai
  maximumScale: 5,
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale()

  return (
    <html lang={locale} dir={dirOf(locale)}>
      <body className={locale === 'ur' ? 'font-urdu' : 'font-sans'}>{children}</body>
    </html>
  )
}
