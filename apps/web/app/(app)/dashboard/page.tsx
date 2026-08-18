import Link from 'next/link'
import type { Metadata } from 'next'
import { formatPkr } from '@oyebazar/shared'
import { GridIcon, ListIcon, SparkIcon } from '@/components/icons'
import { toResellerOrderDTO } from '@/lib/api/mappers'
import { requireReseller } from '@/lib/api/session'
import { container } from '@/lib/container'
import { orderStatusLabel, translator, type Locale } from '@/lib/i18n'
import { getLocale } from '@/lib/i18n-server'
import { orderStatusStyle } from '@/lib/order-status-style'

export const metadata: Metadata = { title: 'Dashboard' }
export const dynamic = 'force-dynamic'

/**
 * Reseller ka dashboard — login ke baad pehli screen.
 *
 * Pehle login ke baad seedha catalogue khulta tha: maal hi maal, aur ye kahin nahi
 * likha tha ke "aap ne kitna kamaya" ya "kis order par aap atki hui hain". Reseller ke
 * liye ye do sawal maal se pehle aate hain.
 *
 * Tarteeb: pehle wo kaam jo RUKA hua hai (tasdeeq), phir kamai, phir aaj ka maal.
 * Jo cheez ruki ho wohi sab se upar aur garam rang mein — baqi khamosh.
 */
export default async function ResellerDashboard() {
  const { reseller } = await requireReseller()
  const locale = await getLocale()
  const t = translator(locale)

  const [stats, ordersPage] = await Promise.all([
    container.repositories.resellerStats.summary(reseller.id, new Date()),
    container.orders.listForReseller(reseller.id, { limit: 5 }),
  ])

  const orders = ordersPage.items.map(toResellerOrderDTO)
  const pending = orders.filter((order) => order.status === 'PENDING_CONFIRM')

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[1.35rem] font-bold tracking-tight">
          {t('hello')} {reseller.name}
        </h1>
        <p className="mt-1 text-[0.92rem] text-ink-soft">{t('dashboardBody')}</p>
      </div>

      {/* Ruka hua kaam — sirf tab dikhta hai jab waqai kuch ruka ho */}
      {pending.length > 0 && (
        <section className="card overflow-hidden ring-1 ring-brand-200">
          <div className="bg-brand-50 px-5 py-4">
            <p className="font-bold text-brand-800">
              {t('awaitingConfirmation')} ({pending.length})
            </p>
            <p className="mt-1 text-[0.88rem] text-brand-800/80">
              {t('awaitingConfirmationBody')}
            </p>
          </div>

          <ul className="divide-y divide-black/[0.05]">
            {pending.map((order) => (
              <li key={order.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <span>
                  <span dir="ltr" className="numeric text-sm font-bold text-ink-faint">
                    {order.orderNo}
                  </span>
                  <span className="ms-2 text-[0.9rem]">{order.customerName}</span>
                </span>
                <Link href="/orders" className="link-tap text-sm font-semibold text-brand-700">
                  {t('confirm')}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Kamai — reseller ka asal sawal */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card bg-coal-900 p-5 text-white">
          <p className="text-[0.72rem] uppercase tracking-wider text-white/50">
            {t('earnedThisMonth')}
          </p>
          <p dir="ltr" className="numeric mt-2 text-[1.7rem] font-bold leading-none text-brand-300">
            {formatPkr(stats.earnedThisMonth)}
          </p>
          <p className="mt-2 text-[0.76rem] text-white/45">
            {t('earnedTotal')} <span dir="ltr">{formatPkr(stats.earnedTotal)}</span>
          </p>
        </div>

        <Stat label={t('ordersRunning')} value={stats.ordersRunning} hint={t('ordersRunningHint')} />
        <Stat label={t('ordersDelivered')} value={stats.ordersDelivered} />
        <Stat
          label={t('packsMade')}
          value={stats.packsMade}
          hint={`${stats.packsDownloaded} ${t('packsDownloaded')}`}
        />
      </section>

      {/* Aage kya karna hai — teen raaste, teen tap */}
      <section className="grid gap-4 sm:grid-cols-3">
        <Shortcut
          href="/catalogue"
          label={t('catalogue')}
          hint={t('shortcutCatalogue')}
          Icon={GridIcon}
        />
        <Shortcut href="/orders" label={t('orders')} hint={t('shortcutOrders')} Icon={ListIcon} />
        <Shortcut href="/bazaar" label={t('bazaar')} hint={t('shortcutBazaar')} Icon={SparkIcon} />
      </section>

      {orders.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-[1.05rem] font-bold">{t('myOrders')}</h2>
            <Link href="/orders" className="link-tap text-sm font-semibold text-brand-700">
              {t('viewAll')}
            </Link>
          </div>

          <ul className="card divide-y divide-black/[0.05]">
            {orders.map((order) => (
              <li key={order.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <span dir="ltr" className="numeric text-sm font-bold text-ink-faint">
                  {order.orderNo}
                </span>
                <span className="min-w-0 flex-1 truncate text-[0.9rem]">{order.customerName}</span>
                <span dir="ltr" className="numeric text-sm font-semibold text-accent-700">
                  {formatPkr(order.myEarnings)}
                </span>
                <span className={`badge ${orderStatusStyle(order.status)}`}>
                  {orderStatusLabel(locale as Locale, order.status)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function Stat({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="card p-5">
      <p className="text-[0.72rem] uppercase tracking-wider text-ink-faint">{label}</p>
      <p dir="ltr" className="numeric mt-2 text-[1.7rem] font-bold leading-none">
        {value}
      </p>
      {hint && <p className="mt-2 text-[0.76rem] text-ink-faint">{hint}</p>}
    </div>
  )
}

function Shortcut({
  href,
  label,
  hint,
  Icon,
}: {
  href: '/catalogue' | '/orders' | '/bazaar'
  label: string
  hint: string
  Icon: (props: { className?: string }) => React.ReactElement
}) {
  return (
    <Link href={href} className="card flex items-center gap-4 p-5 transition hover:shadow-lift">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-pill bg-brand-50 text-brand-700">
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block font-bold">{label}</span>
        <span className="mt-0.5 block text-[0.8rem] leading-snug text-ink-faint">{hint}</span>
      </span>
    </Link>
  )
}
