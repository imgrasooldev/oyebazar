import { cookies } from 'next/headers'
import type { AuthenticatedActor } from '@oyebazar/core'
import { SESSION_TTL_MS } from '@oyebazar/shared'
import { container } from '../container'

export const SESSION_COOKIE = process.env.SESSION_COOKIE_NAME ?? 'oyebazar_session'

/** Login-gated route/page — session na ho to UnauthenticatedError throw hota hai. */
export async function requireReseller(): Promise<AuthenticatedActor> {
  const store = await cookies()
  return container.auth.authenticate(store.get(SESSION_COOKIE)?.value)
}

/** Optional — public page par "login karen" ya "catalogue" dikhane ke faisle ke liye. */
export async function getResellerOrNull(): Promise<AuthenticatedActor | null> {
  try {
    return await requireReseller()
  } catch {
    return null
  }
}

export async function setSessionCookie(token: string, expiresAt: Date): Promise<void> {
  const store = await cookies()
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
    expires: expiresAt,
  })
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies()
  store.delete(SESSION_COOKIE)
}
