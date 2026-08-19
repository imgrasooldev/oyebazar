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
}: {
  params: Promise<{ productId: string }>
}) {
  const { reseller } = await requireReseller()
  const { productId } = await params
  const locale = await getLocale()

  const [item, paymentRecord] = await Promise.all([
    container.catalogue.getById(reseller.id, productId).catch(() => null),
    container.payouts.paymentRecordForProduct(productId),
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
        title={locale === 'ur' ? item.product.titleUr : item.product.titleEn}
        bajiPrice={item.product.bajiPrice}
        defaultRetailPrice={item.myRetailPrice ?? item.product.suggestedRetail}
        locale={locale}
      />
    </div>
  )
}
