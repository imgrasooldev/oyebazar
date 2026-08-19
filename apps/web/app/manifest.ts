import type { MetadataRoute } from 'next'
import { BRAND } from '@oyebazar/shared'

/**
 * PWA manifest.
 *
 * 🔴 Ye file gum thi. `layout.tsx` har safhe par `/manifest.webmanifest` maangta tha
 * aur browser ko har load par 404 milta — ek fazool chakkar, har safhe par, har
 * visitor par. Sasta phone aur 3G par ye muft ka nuqsan hai.
 *
 * Route se banaya hai (public folder ki file se nahi) taake naam aur rang ek hi jagah
 * se aayen — brand kahin aur badle to yahan bhi khud badal jaye.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${BRAND.name} — ${BRAND.nameUr}`,
    short_name: BRAND.name,
    description:
      'Pakistan ke tasdeeq shuda wholesalers ki muft directory — aur resellers ke liye har roz tayyar status packs.',
    start_url: '/',
    display: 'standalone',
    background_color: '#F7F6F4',
    theme_color: '#F2600C',
    // Reseller ka poora kaam phone par hota hai — is liye portrait
    orientation: 'portrait',
    lang: 'ur',
    dir: 'rtl',
  }
}
