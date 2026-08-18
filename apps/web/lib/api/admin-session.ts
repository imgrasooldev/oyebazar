import { cookies } from 'next/headers'
import type { AuthenticatedOpsUser } from '@oyebazar/core'
import { container } from '../container'

/**
 * Admin ki apni cookie — reseller aur wholesaler dono se alag naam.
 *
 * Alag rakhne ki wajah sirf safai nahi: ops ka banda apne hi phone par reseller ka
 * account bhi khol kar dekhta hai (support ke liye). Ek hi cookie hoti to ek login
 * doosre ko gira deta, aur support ke beech mein admin session tootna sab se bura
 * waqt hota.
 *
 * Session bhi chhoti hai (24 ghante, baqi 7 din) — is portal se poora karobar chalta hai.
 */
export const ADMIN_SESSION_COOKIE = process.env.ADMIN_SESSION_COOKIE_NAME ?? 'oyebazar_admin'

export async function requireOpsUser(): Promise<AuthenticatedOpsUser> {
  const store = await cookies()
  return container.opsAuth.authenticate(store.get(ADMIN_SESSION_COOKIE)?.value)
}

export async function getOpsUserOrNull(): Promise<AuthenticatedOpsUser | null> {
  try {
    return await requireOpsUser()
  } catch {
    return null
  }
}

export async function setAdminSessionCookie(token: string, expiresAt: Date): Promise<void> {
  const store = await cookies()
  store.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  })
}

export async function clearAdminSessionCookie(): Promise<void> {
  const store = await cookies()
  store.set(ADMIN_SESSION_COOKIE, '', { path: '/', maxAge: 0 })
}
