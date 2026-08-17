import { cookies } from 'next/headers'
import { apiHandler } from '@/lib/api/handler'
import { SESSION_COOKIE, clearSessionCookie } from '@/lib/api/session'
import { container } from '@/lib/container'

export const runtime = 'nodejs'

/** POST /api/v1/auth/logout — us reseller ki SAARI sessions khatam (shared phone rule). */
export async function POST() {
  return apiHandler(async () => {
    const store = await cookies()
    await container.auth.logout(store.get(SESSION_COOKIE)?.value)
    await clearSessionCookie()
    return { ok: true }
  })
}
