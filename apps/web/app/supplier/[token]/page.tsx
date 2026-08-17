import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { BRAND, formatPkr } from '@oyebazar/shared'
import { SupplierOrderActions } from '@/components/supplier-order-actions'
import { PinIcon } from '@/components/icons'
import { container } from '@/lib/container'
import { getLocale } from '@/lib/i18n-server'

export const dynamic = 'force-dynamic'

/** 🔴 Ye link kabhi search engine mein na jaye — is mein customer ka pata hai. */
export const metadata: Metadata = {
  title: 'Order',
  robots: { index: false, follow: false },
}

/**
 * Wholesaler ka safha — bina login, sirf WhatsApp wale link se.
 *
 * Kyun login nahi: Bolton Market ka thok wala naya account nahi banata, magar
 * WhatsApp ka link zaroor kholta hai. Token hi us ki chabi hai — lamba, har order
 * ka apna, aur sirf isi order par chalta hai.
 *
 * 🔴 Is safhe par SIRF wholesaler ke apne numbers hain. Reseller ne kis bhaav becha,
 *    ye yahan kabhi nahi aata — warna wo kal usay bypass karne ki soch sakta hai.
 */
export default async function SupplierOrderPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const locale = await getLocale()

  const order = await container.orders.getForSupplierToken(token).catch(() => null)
  if (!order) notFound()

  const decided = order.status !== 'SENT_TO_SUPPLIER'
  const mapsUrl =
    order.locationLat && order.locationLng
      ? `https://maps.google.com/?q=${order.locationLat},${order.locationLng}`
      : null

  return (
    <div className="mx-auto max-w-xl px-5 py-8">
      <div className="text-center">
        <p className="text-2xl font-bold text-brand-800">
          {locale === 'ur' ? BRAND.nameUr : BRAND.name}
        </p>
        <p className="mt-1 text-sm text-ink-faint">نیا آرڈر</p>
      </div>

      <div className="card mt-6 overflow-hidden">
        <div className="flex items-center justify-between gap-3 bg-coal-900 px-5 py-4 text-white">
          <span className="numeric text-lg font-bold">{order.orderNo}</span>
          <span className="badge bg-white/15 text-white">
            {order.paymentMethod === 'COD' ? 'کیش آن ڈیلیوری' : 'ایڈوانس'}
          </span>
        </div>

        <div className="p-5">
          <ul className="space-y-3">
            {order.items.map((item, index) => (
              <li key={`${item.titleUr}-${index}`} className="flex items-baseline justify-between gap-3">
                <span className="min-w-0">
                  <span className="block">{item.titleUr}</span>
                  <span className="numeric text-xs text-ink-faint">× {item.qty}</span>
                </span>
                {/* 🔴 Wholesaler ka apna ریٹ — reseller ka retail yahan kabhi nahi */}
                <span className="numeric shrink-0 font-bold">
                  {formatPkr(item.supplierPrice * item.qty)}
                </span>
              </li>
            ))}
          </ul>

          <div className="hairline my-5" />

          <div className="space-y-1 text-sm">
            <p className="font-bold">{order.customerName}</p>
            <p className="text-ink-soft">{order.customerAddress}</p>
            <p className="text-ink-soft">
              {order.area} · <span dir="ltr">{order.customerPhone}</span>
            </p>
            {mapsUrl && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="link-tap gap-1 font-semibold text-brand-700"
              >
                <PinIcon className="h-4 w-4" />
                نقشے پر لوکیشن دیکھیں
              </a>
            )}
          </div>

          <div className="mt-5 rounded-2xl bg-paper-sunken p-4">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-ink-soft">کورئیر آپ کو دے گا (COD)</span>
              <span className="numeric text-lg font-bold">{formatPkr(order.total)}</span>
            </div>
            <p className="mt-2 text-xs text-ink-faint">
              پارسل پر اپنا نام یا پرچی نہ لگائیں — نیوٹرل پیکنگ ضروری ہے۔
            </p>
          </div>
        </div>
      </div>

      {decided ? (
        <p className="card mt-5 p-5 text-center text-sm">
          {order.status === 'ACCEPTED' || order.status === 'DISPATCHED' || order.status === 'DELIVERED'
            ? '✓ آپ یہ آرڈر قبول کر چکے ہیں۔'
            : 'یہ آرڈر بند ہو چکا ہے۔'}
        </p>
      ) : (
        <div className="mt-5">
          <SupplierOrderActions token={token} />
        </div>
      )}
    </div>
  )
}
