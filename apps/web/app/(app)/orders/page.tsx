import Link from 'next/link'
import type { Metadata } from 'next'
import { ORDER_STATUS_EN, ORDER_STATUS_UR, formatPkr } from '@oyebazar/shared'
import { OrderConfirmButton } from '@/components/order-confirm-button'
import { toResellerOrderDTO } from '@/lib/api/mappers'
import { requireReseller } from '@/lib/api/session'
import { container } from '@/lib/container'
import { translator, type Locale } from '@/lib/i18n'
import { getLocale } from '@/lib/i18n-server'

export const metadata: Metadata = { title: 'Orders' }
export const dynamic = 'force-dynamic'

/**
 * Meri orders.
 *
 * Tarteeb jaan boojh kar: jin ki tasdeeq baqi hai wo sab se upar, kyunke wohi
 * ek kaam hai jo sirf reseller kar sakti hai — aur us ke baghair order aage nahi barhta.
 */
export default async function OrdersPage() {
  const { reseller } = await requireReseller()
  const locale = await getLocale()
  const t = translator(locale)

  const page = await container.orders.listForReseller(reseller.id, { limit: 30 })
  const orders = page.items.map(toResellerOrderDTO)

  const pending = orders.filter((order) => order.status === 'PENDING_CONFIRM')
  const rest = orders.filter((order) => order.status !== 'PENDING_CONFIRM')

  return (
    <div className="space-y-6">
      <h1 className="section-title text-2xl">{t('myOrders')}</h1>

      {orders.length === 0 && (
        <div className="card p-6 text-ink-soft">
          <p>{t('noOrdersYet')}</p>
          <Link href="/catalogue" className="btn-primary mt-4">
            {t('seeCatalogue')}
          </Link>
        </div>
      )}

      {pending.length > 0 && (
        <section>
          <h2 className="mb-2 text-lg font-bold text-amber-800">
            {t('awaitingConfirmation')} ({pending.length})
          </h2>
          <p className="mb-3 text-sm text-ink-soft">{t('awaitingConfirmationBody')}</p>
          <ul className="space-y-3">
            {pending.map((order) => (
              <li key={order.id} className="card space-y-3 border-amber-300 p-4">
                <OrderRow order={order} locale={locale} />
                <OrderConfirmButton orderNo={order.orderNo} locale={locale} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {rest.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-bold">{t('otherOrders')}</h2>
          <ul className="space-y-3">
            {rest.map((order) => (
              <li key={order.id} className="card p-4">
                <OrderRow order={order} locale={locale} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function OrderRow({
  order,
  locale,
}: {
  order: ReturnType<typeof toResellerOrderDTO>
  locale: Locale
}) {
  const t = translator(locale)

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <span dir="ltr" className="font-mono text-sm text-ink-faint">
          {order.orderNo}
        </span>
        <span className="rounded-full bg-paper-sunken px-3 py-1 text-xs font-semibold">
          {locale === 'ur' ? ORDER_STATUS_UR[order.status] : ORDER_STATUS_EN[order.status]}
        </span>
      </div>

      <p className="font-semibold">{order.customerName}</p>
      <p className="text-sm text-ink-soft">
        {order.area} · <span dir="ltr">{order.customerPhone}</span>
      </p>

      <ul className="text-sm text-ink-soft">
        {order.items.map((item) => (
          <li key={item.productId}>
            {item.titleUr} × {item.qty}
          </li>
        ))}
      </ul>

      <div className="flex justify-between border-t border-black/[0.05] pt-2 text-sm">
        <span>
          {t('customerPays')}: <span dir="ltr">{formatPkr(order.total)}</span>
        </span>
        <span className="font-semibold text-accent-700">
          {t('profit')}: <span dir="ltr">{formatPkr(order.myEarnings)}</span>
        </span>
      </div>
    </div>
  )
}
