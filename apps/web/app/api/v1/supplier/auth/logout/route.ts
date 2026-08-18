import { cookies } from 'next/headers'
import { apiHandler } from '@/lib/api/handler'
import {
  SUPPLIER_SESSION_COOKIE,
  clearSupplierSessionCookie,
} from '@/lib/api/supplier-session'
import { container } from '@/lib/container'

export const runtime = 'nodejs'

/** POST /api/v1/supplier/auth/logout — dukan ke har device se, ek sath. */
export async function POST() {
  return apiHandler(async () => {
    const store = await cookies()
    await container.supplierAuth.logout(store.get(SUPPLIER_SESSION_COOKIE)?.value)
    await clearSupplierSessionCookie()
    return { ok: true }
  })
}
