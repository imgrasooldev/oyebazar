import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { OrderForm } from '@/components/order-form'
import { SupplierPaymentRecord } from '@/components/supplier-payment-record'
import { requireReseller } from '@/lib/api/session'
import { container } from '@/lib/container'
import { getLocale } from '@/lib/i18n-server'

export const metadata: Metadata = { title: 'نیا آرڈر' }
export const dynamic = 'force-dynamic'

export default async function NewOrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ productId: string }>
  searchParams: Promise<{ pata?: string }>
}) {
  const { reseller } = await requireReseller()
  const [{ productId }, { pata }, locale] = await Promise.all([
    params,
    searchParams,
    getLocale(),
  ])

  /*
   * 🔴 `takeForOrder` mein `resellerId` shart hai — doosri reseller ka token yahan se
   * kuch nahi deta. Us ke baghair koi bhi logged-in reseller URL mein token daal kar
   * kisi aur ki customer ka naam, number aur ghar ka pata parh leti.
   *
   * Na milne par `null` — safha phir bhi khulta hai, bas khaane khali. Yahi theek hai:
   * link band ho chuka ho (order ban gaya) to reseller ko error safha dikhane se koi
   * faida nahi, wo waise bhi order laga sakti hai.
   */
  const filled = pata
    ? await container.addressRequests.takeForOrder(reseller.id, pata).catch(() => null)
    : null

  const [item, paymentRecord, delivery] = await Promise.all([
    container.catalogue.getById(reseller.id, productId).catch(() => null),
    container.payouts.paymentRecordForProduct(productId),
    // Dukan ke apne rate — naam ya id nahi, sirf do number
    container.catalogue.deliveryRatesFor(productId),
  ])
  if (!item) notFound()

  return (
    <div className="space-y-4">
      {/*
        Aakhri lamha jahan reseller ruk kar soch sakti hai. Us ke baad customer se
        wada ho chuka hota hai aur paisa is dukan ke haath mein chala jata hai.
      */}
      <SupplierPaymentRecord record={paymentRecord} locale={locale} />

      <OrderForm
        productId={item.product.id}
        variants={item.product.variants}
        delivery={delivery}
        title={locale === 'ur' ? item.product.titleUr : item.product.titleEn}
        bajiPrice={item.product.bajiPrice}
        defaultRetailPrice={filled?.retailPrice ?? item.myRetailPrice ?? item.product.suggestedRetail}
        locale={locale}
        {...(filled
          ? {
              prefill: {
                token: filled.token,
                customerName: filled.customerName,
                customerPhone: filled.customerPhone,
                customerAddress: filled.customerAddress,
                area: filled.area,
                locationLat: filled.locationLat,
                locationLng: filled.locationLng,
              },
            }
          : {})}
      />
    </div>
  )
}
