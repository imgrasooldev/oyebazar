import Link from 'next/link'
import type { Metadata } from 'next'
import { formatPkr } from '@oyebazar/shared'
import { OrderConfirmButton } from '@/components/order-confirm-button'
import { PinIcon } from '@/components/icons'
import { toResellerOrderDTO } from '@/lib/api/mappers'
import { requireReseller } from '@/lib/api/session'
import { container } from '@/lib/container'
import { orderStatusStyle } from '@/lib/order-status-style'
import { orderStatusLabel, translator, type Locale } from '@/lib/i18n'
import { getLocale } from '@/lib/i18n-server'

export const metadata: Metadata = { title: 'Orders' }
export const dynamic = 'force-dynamic'

/**
 * Meri orders.
 *
 * Tarteeb jaan boojh kar: jin ki tasdeeq baqi hai wo sab se upar aur numaya rang mein,
 * kyunke wohi ek kaam hai jo SIRF reseller kar sakti hai — aur us ke baghair order
 * wholesaler tak jata hi nahi. Baqi orders khamosh rang mein rehte hain, warna
 * sab kuch cheekhta hai aur kuch nazar nahi aata.
 */
export default async function OrdersPage() {
  const { reseller } = await requireReseller()
  const locale = await getLocale()
  const t = translator(locale)

  const page = await container.orders.listForReseller(reseller.id, { limit: 30 })
  const orders = page.items.map(toResellerOrderDTO)

  const pending = orders.filter((order) => order.status === 'PENDING_CONFIRM')
  const rest = orders.filter((order) => order.status !== 'PENDING_CONFIRM')
  const earnings = orders
    .filter((order) => order.status === 'DELIVERED')
    .reduce((sum, order) => sum + order.myEarnings, 0)

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-[1.35rem] font-bold tracking-tight">{t('myOrders')}</h1>
        {orders.length > 0 && (
          <span className="inline-flex items-center gap-2 rounded-pill bg-accent-50 px-4 py-2 text-sm font-semibold text-accent-700">
            {t('earnedSoFar')}
            <span dir="ltr" className="numeric">
              {formatPkr(earnings)}
            </span>
          </span>
        )}
      </div>

      {orders.length === 0 && (
        <div className="card p-8 text-center">
          <p className="text-ink-soft">{t('noOrdersYet')}</p>
          <Link href="/catalogue" className="btn-primary mt-5">
            {t('seeCatalogue')}
          </Link>
        </div>
      )}

      {pending.length > 0 && (
        <section>
          <div className="mb-4 rounded-card bg-brand-50 px-5 py-4">
            <p className="font-bold text-brand-800">
              {t('awaitingConfirmation')} ({pending.length})
            </p>
            <p className="mt-1 text-[0.88rem] text-brand-800/80">{t('awaitingConfirmationBody')}</p>
          </div>

          <ul className="grid gap-4 lg:grid-cols-2">
            {pending.map((order) => (
              <li key={order.id} className="card space-y-4 p-5 ring-1 ring-brand-200">
                <OrderRow order={order} locale={locale} />
                <OrderConfirmButton orderNo={order.orderNo} locale={locale} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {rest.length > 0 && (
        <section>
          <div className="mb-4 flex items-baseline gap-2">
            <h2 className="text-[1.05rem] font-bold">{t('otherOrders')}</h2>
            <span
              dir="ltr"
              className="numeric rounded-pill bg-paper-sunken px-2 py-0.5 text-[0.75rem] font-bold text-ink-soft"
            >
              {rest.length}
            </span>
          </div>
          <ul className="grid gap-4 lg:grid-cols-2">
            {rest.map((order) => (
              <li key={order.id} className="card p-5">
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
  const label = orderStatusLabel(locale, order.status)

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
      </div>

      <ul className="space-y-1 text-[0.88rem] text-ink-soft">
        {order.items.map((item) => (
          <li key={item.productId} className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate">{item.titleUr}</span>
            <span className="numeric shrink-0 text-ink-faint">× {item.qty}</span>
          </li>
        ))}
      </ul>

      <div className="hairline" />

      <div className="flex flex-wrap items-center justify-between gap-2 text-[0.88rem]">
        <span className="text-ink-soft">
          {t('customerPays')}{' '}
          <span dir="ltr" className="numeric font-bold text-ink">
            {formatPkr(order.total)}
          </span>
        </span>
        <span className="rounded-pill bg-accent-50 px-3 py-1 font-semibold text-accent-700">
          {t('profit')}{' '}
          <span dir="ltr" className="numeric">
            {formatPkr(order.myEarnings)}
          </span>
        </span>
      </div>
    </div>
  )
}
