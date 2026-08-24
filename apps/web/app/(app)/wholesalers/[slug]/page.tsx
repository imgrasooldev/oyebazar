/**
 * Ek dukan ka safha — reseller ke portal ke ANDAR.
 *
 * 🔴 Is safhe ki poori wajah ek hi hai: yahan reseller ko us ka APNA rate dikhta hai.
 *
 * `/bazaar/<slug>` par wohi dukan bahar ke banday ko dikhti hai, magar wahan sirf public
 * maloomat hoti hai — reseller ki lagat, us ka rate aur us ka munafa wahan ho hi nahi
 * sakte. Wo teen number hi us ka asal faisla hain. Isi liye ye safha `/bazaar` ki naqal
 * nahi: wahan "ye dukan kya bechti hai" ka jawab hai, yahan "is dukan se mujhe kya
 * milega" ka.
 *
 * Rabte ka number yahan jaan boojh kar nahi — dekhen `RESELLER_PRODUCT_SELECT` ka note.
 */
import { notFound } from 'next/navigation'
import { requireReseller } from '@/lib/api/session'
import { container } from '@/lib/container'
import { getLocale } from '@/lib/i18n-server'
import { translator } from '@/lib/i18n'
import Link from 'next/link'
import { SupplierLogo } from '@/components/supplier-logo'

export const dynamic = 'force-dynamic'

export default async function WholesalerPage({ params }: { params: Promise<{ slug: string }> }) {
  const { reseller } = await requireReseller()
  const { slug } = await params
  const locale = await getLocale()
  const t = translator(locale)

  const supplier = await container.bazaar.getSupplier(slug).catch(() => null)
  if (!supplier) notFound()

  /*
   * 🔴 Maal yahan DOBARA nahi dikhaya jata — reseller ko usi catalogue par bheja jata
   * hai jo wo roz dekhti hai, bas dukan ki chhanni lagi hui.
   *
   * Yahan apna grid banane ka matlab hota ke maal ka card TEESRI dafa likha jaye (do
   * dafa pehle se catalogue mein hai). Aur us naqal ka anjaam maloom hai: kal card ki
   * oonchai ya rate ka hisaab ek jagah badalta aur baqi jagah purana reh jata. Us se
   * bara faida ye hai ke reseller ko wahan apni saari chhanni aur tarteeb bhi mil jati
   * hai — jo yahan dobara banani parti.
   */
  const goods = await container.catalogue.list(reseller.id, { limit: 1, supplierSlug: slug })

  return (
    <div>
      <div className="flex items-center gap-3">
        <SupplierLogo name={supplier.businessName} logoUrl={supplier.logoUrl} size="lg" />
        <div className="min-w-0">
          <h1 className="truncate text-[1.35rem] font-bold tracking-tight">
            {supplier.businessName}
          </h1>
          <p className="mt-0.5 truncate text-[0.88rem] text-ink-soft">
            {supplier.marketName ? `${supplier.marketName} · ` : ''}
            {supplier.city}
          </p>
        </div>
      </div>

      {supplier.bioUr && (
        <p className="mt-3 text-[0.9rem] leading-relaxed text-ink-soft">{supplier.bioUr}</p>
      )}

      {goods.items.length === 0 ? (
        <p className="mt-6 text-[0.9rem] text-ink-soft">{t('wholesalerNoGoods')}</p>
      ) : (
        <Link
          href={{ pathname: '/catalogue', query: { supplier: slug } }}
          className="btn-primary mt-6 inline-flex"
        >
          {t('wholesalerGoods')}
        </Link>
      )}
    </div>
  )
}
