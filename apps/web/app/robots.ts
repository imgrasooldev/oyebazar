import type { MetadataRoute } from 'next'
import { SITE_URL, absoluteUrl } from '@/lib/seo'

/**
 * robots.txt — ye file MOJOOD hi nahi thi (404).
 *
 * Us ka nateeja sirf "SEO kam" nahi tha: bina is ke crawler ko sitemap ka pata bhi
 * nahi milta, aur wo poore login wale hisse par bhi haath maarta rehta hai — yani
 * hamare apne server ka waqt un safhon par kharch hota hai jo usay dikhne hi nahi.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        /*
         * 🔴 Ye rukawat hifazat NAHI hai — koi bhi ye file parh kar in raston ko
         * jaan sakta hai. Asal taala har safhe par session ki jaanch hai (`requireReseller`,
         * `requireSupplier`, `requireOpsUser`), aur wo apni jagah hai.
         *
         * Ye sirf crawler ka waqt bachati hai. In mein se har rasta login par redirect
         * karta hai — yani crawler ko wahan sirf login ka safha milta hai, baar baar,
         * har pate par. Wo "soft 404" ki shakl banti hai aur us se poori site ka crawl
         * budget usi jagah lag jata hai jahan dekhne ko kuch hai hi nahi.
         */
        disallow: [
          '/api/',
          '/admin',
          '/supplier',
          '/dashboard',
          '/catalogue',
          '/orders',
          '/money',
          '/templates',
          '/wholesalers',
          '/invites',
          /*
           * Customer ka apna pata likhne wala link — har ek alag token par.
           *
           * 🔴 Ye qatar sab se zyada zaroori hai. Wo safhe kisi asli bande ka naam,
           * number aur PATA dikhate hain. Un ka Google par aa jana sirf SEO ka masla
           * nahi — wo hamare customer ka pata duniya ke saamne rakh dena hai.
           */
          '/pata/',
          '/login',
        ],
      },
    ],
    sitemap: absoluteUrl('/sitemap.xml'),
    host: SITE_URL,
  }
}
