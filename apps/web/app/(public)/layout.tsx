import { RouteProgress } from '@/components/route-progress'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { getResellerOrNull } from '@/lib/api/session'
import { getSupplierOrNull } from '@/lib/api/supplier-session'
import { getLocale } from '@/lib/i18n-server'

/**
 * PUBLIC zone (logged-out).
 *
 * 🔴 Yahan koi price, koi order button, koi fee nahi. Ye qanooni tahaffuz hai:
 * Sales Tax Act 2(18A) ki "online marketplace" tareef fee AUR digital orders — dono
 * par poori hoti hai. Bazaar dono par bahar hai. Is layout ke andar order UI na banayen.
 */
export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  /*
   * Dono session poochhte hain — reseller ka aur dukan ka.
   *
   * Bazaar wo jagah hai jahan dono aate hain (aur logged out log bhi). Pehle sirf
   * reseller ka poochha jata tha, is liye dukan wala apni hi site par anjaan rehta tha
   * aur usay "Wholesaler login" hi dikhta rehta tha — halanke wo abhi abhi login kar
   * ke aaya hota tha.
   */
  const [actor, supplierSession, locale] = await Promise.all([
    getResellerOrNull(),
    getSupplierOrNull(),
    getLocale(),
  ])

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      {/* Click ka foran jawab — Bazaar ke safhe sab se bhaari hain (tasveerein) */}
      <RouteProgress />

      <SiteHeader
        locale={locale}
        {...(actor ? { reseller: { name: actor.reseller.name } } : {})}
        {...(supplierSession
          ? {
              supplier: {
                businessName: supplierSession.supplier.businessName,
                logoUrl: supplierSession.supplier.logoUrl ?? null,
              },
            }
          : {})}
      />
      <main className="flex-1">{children}</main>
      <SiteFooter locale={locale} supplierLoggedIn={supplierSession !== null} />
    </div>
  )
}
