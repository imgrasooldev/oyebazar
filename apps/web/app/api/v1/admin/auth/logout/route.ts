import { cookies } from 'next/headers'
import { apiHandler } from '@/lib/api/handler'
import { ADMIN_SESSION_COOKIE, clearAdminSessionCookie } from '@/lib/api/admin-session'
import { container } from '@/lib/container'

export const runtime = 'nodejs'

/** POST /api/v1/admin/auth/logout — sirf yehi session (admin ke kai device ho sakte hain). */
export async function POST() {
  return apiHandler(async () => {
    const store = await cookies()
    await container.opsAuth.logout(store.get(ADMIN_SESSION_COOKIE)?.value)
    await clearAdminSessionCookie()
    return { ok: true }
  })
}
