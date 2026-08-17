import { cookies } from 'next/headers'
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from './i18n'

/**
 * Server-only hissa. `lib/i18n.ts` client components bhi import karte hain
 * (dictionary + translator), is liye `next/headers` ko alag rakhna zaroori hai —
 * warna client bundle mein server API aa jati hai aur build tootta hai.
 */
export async function getLocale(): Promise<Locale> {
  const store = await cookies()
  const value = store.get(LOCALE_COOKIE)?.value
  return isLocale(value) ? value : DEFAULT_LOCALE
}
