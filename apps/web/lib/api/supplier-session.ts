import { cookies } from 'next/headers'
import type { AuthenticatedSupplier } from '@oyebazar/core'
import { SESSION_TTL_MS } from '@oyebazar/shared'
import { container } from '../container'

/**
 * 🔴 Wholesaler ki cookie ka naam alag hai — reseller wali se juda.
 *
 * Wajah sirf safai nahi: bohat si dukanon par ek hi phone/computer chalta hai jahan
 * beta reseller ka kaam bhi karta hai. Ek hi cookie hoti to ek login doosre ko dhakel
 * deta. Alag naam se dono sath sath chal sakte hain, aur ek ka logout doosre ko nahi girata.
 *
 * Path `/` hai, `/supplier` nahi — API `/api/v1/supplier/...` par hai, jo us path ke
 * neeche nahi aati, warna cookie request ke sath jati hi nahi.
 */
export const SUPPLIER_SESSION_COOKIE =
  process.env.SUPPLIER_SESSION_COOKIE_NAME ?? 'oyebazar_supplier'

const COOKIE_PATH = '/'

export async function requireSupplier(): Promise<AuthenticatedSupplier> {
  const store = await cookies()
  return container.supplierAuth.authenticate(store.get(SUPPLIER_SESSION_COOKIE)?.value)
}

export async function getSupplierOrNull(): Promise<AuthenticatedSupplier | null> {
  try {
    return await requireSupplier()
  } catch {
    return null
  }
}

export async function setSupplierSessionCookie(token: string, expiresAt: Date): Promise<void> {
  const store = await cookies()
  store.set(SUPPLIER_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: COOKIE_PATH,
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
    expires: expiresAt,
  })
}

export async function clearSupplierSessionCookie(): Promise<void> {
  const store = await cookies()
  store.set(SUPPLIER_SESSION_COOKIE, '', { path: COOKIE_PATH, maxAge: 0 })
}
