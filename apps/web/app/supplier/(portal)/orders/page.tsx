import type { Metadata } from 'next'
import { formatPkr } from '@oyebazar/shared'
import type { SupplierOrderView } from '@oyebazar/core'
import { SupplierOrderActions } from '@/components/supplier-order-actions'
import { SupplierStatusButton } from '@/components/supplier-status-button'
import { PinIcon } from '@/components/icons'
import { requireSupplier } from '@/lib/api/supplier-session'
import { container } from '@/lib/container'
import { orderStatusStyle } from '@/lib/order-status-style'
import { orderStatusLabel, translator, type Locale } from '@/lib/i18n'
import { getLocale } from '@/lib/i18n-server'

export const metadata: Metadata = {
  title: 'Orders',
  robots: { index: false, follow: false },
}
export const dynamic = 'force-dynamic'

/** Ye status ab bhi chal rahe hain — mukammal nahi hue. */
const RUNNING = new Set(['ACCEPTED', 'PACKED', 'DISPATCHED'])

/**
 * Wholesaler ke order.
 *
 * Tarteeb wohi jo dukan par kaam ki hai: pehle wo jin ka jawab hum se maanga gaya hai
 * (SENT_TO_SUPPLIER) — yahi ek kaam hai jo sirf wholesaler kar sakta hai aur jis par
 * reseller ka customer intezar mein khara hai. Phir chal rahe order, phir purane.
 */
export default async function SupplierOrdersPage() {
  const { supplier } = await requireSupplier()
  const locale = await getLocale()
  const t = translator(locale)

  const page = await container.orders.listForSupplier(supplier.id, { limit: 40 })
  const orders = page.items

  const waiting = orders.filter((order) => order.status === 'SENT_TO_SUPPLIER')
  const running = orders.filter((order) => RUNNING.has(order.status))
  const done = orders.filter(
    (order) => !RUNNING.has(order.status) && order.status !== 'SENT_TO_SUPPLIER',
  )

  return (
    <div className="space-y-9">
      <h1 className="text-[1.35rem] font-bold tracking-tight">{t('supplierOrdersNav')}</h1>

      {orders.length === 0 && (
        <div className="card p-8 text-center text-ink-soft">{t('noSupplierOrders')}</div>
      )}

      {waiting.length > 0 && (
        <section>
          <div className="mb-4 rounded-card bg-brand-50 px-5 py-4">
            <p className="font-bold text-brand-800">
              {t('newOrders')} ({waiting.length})
            </p>
            <p className="mt-1 text-[0.88rem] text-brand-800/80">{t('newOrdersBody')}</p>
          </div>

          <ul className="grid gap-4 lg:grid-cols-2">
            {waiting.map((order) => (
              <li key={order.id} className="card space-y-4 p-5 ring-1 ring-brand-200">
                <OrderCard order={order} locale={locale} />
                <SupplierOrderActions endpoint={`/api/v1/supplier/orders/${order.orderNo}`} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {running.length > 0 && (
        <Section title={t('runningOrders')} orders={running} locale={locale} withActions />
      )}
      {done.length > 0 && <Section title={t('finishedOrders')} orders={done} locale={locale} />}
    </div>
  )
}

function Section({
  title,
  orders,
  locale,
  withActions = false,
}: {
  title: string
  orders: readonly SupplierOrderView[]
  locale: Locale
  /** Chal rahe orders par agla qadam — mukammal shuda par koi button nahi */
  withActions?: boolean
}) {
  const t = translator(locale)

  return (
    <section>
      <h2 className="mb-4 text-[1.05rem] font-bold">{title}</h2>
      <ul className="grid gap-4 lg:grid-cols-2">
        {orders.map((order) => (
          <li key={order.id} className="card space-y-4 p-5">
            <OrderCard order={order} locale={locale} />

            {/*
              Agla qadam wohi jo ab bana hai — dukan par jaldi mein chunna nahi parta.
              PACKED skip bhi ho sakta hai: chhoti dukan seedha courier ko de deti hai.
            */}
            {withActions && order.status === 'ACCEPTED' && (
              <div className="flex flex-wrap gap-2">
                <SupplierStatusButton
                  orderNo={order.orderNo}
                  toStatus="PACKED"
                  label={t('markPacked')}
                />
                <SupplierStatusButton
                  orderNo={order.orderNo}
                  toStatus="DISPATCHED"
                  label={t('markDispatched')}
                  tone="primary"
                />
              </div>
            )}

            {withActions && order.status === 'PACKED' && (
              <SupplierStatusButton
                orderNo={order.orderNo}
                toStatus="DISPATCHED"
                label={t('markDispatched')}
                tone="primary"
              />
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

function OrderCard({ order, locale }: { order: SupplierOrderView; locale: Locale }) {
  const t = translator(locale)
  const label = orderStatusLabel(locale, order.status)

  // Wholesaler ki apni raqam — order ka `total` (customer ka retail) us ka number nahi hai
  const myTotal = order.items.reduce((sum, item) => sum + item.supplierPrice * item.qty, 0)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <span dir="ltr" className="numeric text-sm font-bold text-ink-faint">
          {order.orderNo}
        </span>
        <span className={`badge ${orderStatusStyle(order.status)}`}>{label}</span>
      </div>

      <div>
        <p className="font-bold">{order.customerName}</p>
        <p className="mt-0.5 flex items-center gap-1 text-[0.85rem] text-ink-faint">
          <PinIcon className="h-3.5 w-3.5" />
          {order.area} · <span dir="ltr">{order.customerPhone}</span>
        </p>
        <p className="mt-1 text-[0.85rem] leading-relaxed text-ink-soft">{order.customerAddress}</p>
      </div>

      <ul className="space-y-1 text-[0.88rem] text-ink-soft">
        {order.items.map((item, index) => (
          <li
            key={`${order.id}-${index}`}
            className="flex items-baseline justify-between gap-3"
          >
            <span className="min-w-0 truncate">{locale === 'ur' ? item.titleUr : item.titleEn}</span>
            <span className="numeric shrink-0 text-ink-faint">× {item.qty}</span>
          </li>
        ))}
      </ul>

      <div className="hairline" />

      {/*
        🔴 Sirf wholesaler ki apni raqam. Customer ka total (order.total) yahan jaan
        boojh kar nahi — us se wo hamara margin nikal sakta hai.
      */}
      <div className="flex items-center justify-between gap-2 text-[0.88rem]">
        <span className="text-ink-soft">{t('youWillGet')}</span>
        <span dir="ltr" className="numeric text-[1.05rem] font-bold text-ink">
          {formatPkr(myTotal)}
        </span>
      </div>
    </div>
  )
}
