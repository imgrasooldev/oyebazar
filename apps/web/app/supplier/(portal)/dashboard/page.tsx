import Link from 'next/link'
import { LazyImage } from '@/components/lazy-image'
import type { Metadata } from 'next'
import { formatPkr } from '@oyebazar/shared'
import { CounterpartyLedger } from '@/components/counterparty-ledger'
import { MiniBars, StatTile, Widget } from '@/components/dash-kit'
import { BoxesIcon, ListIcon, MoneyIcon, ShieldIcon } from '@/components/icons'
import { requireSupplier } from '@/lib/api/supplier-session'
import { container } from '@/lib/container'
import { translator } from '@/lib/i18n'
import { getLocale } from '@/lib/i18n-server'

export const metadata: Metadata = {
  title: 'Dashboard',
  robots: { index: false, follow: false },
}
export const dynamic = 'force-dynamic'

/** Ye order abhi chal rahe hain — na mare, na mukammal hue. */
const RUNNING = new Set(['ACCEPTED', 'PACKED', 'DISPATCHED'])

/** Chaal kitne dinon ki dikhani hai — do hafte. */
const TREND_DAYS = 14

/**
 * Dukan ka ghar — ek nazar mein poori tasveer.
 *
 * Pehle wholesaler ka landing seedha orders ki lambi list thi. Us par ye teen sawal —
 * jo dukan par roz poochhe jate hain — kahin nazar nahi aate the:
 *
 *   · abhi mera kya kaam ruka hua hai (jawab kis ka baqi hai)
 *   · kis reseller ke kitne paise mere zimme hain
 *   · mera kaun sa maal chal raha hai
 *
 * Teenon ka data pehle se mojood tha, magar teen alag safhon par bikhra hua. Is safhe
 * ne koi naya hisab nahi banaya — sirf wo saath rakha hai jo saath dekha jata hai, aur
 * ginti wohi component se aati hai jo baqi safhon par chalta hai (do jagah do alag
 * number kabhi na banen).
 */
export default async function SupplierDashboardPage() {
  const [{ supplier }, locale] = await Promise.all([requireSupplier(), getLocale()])
  const t = translator(locale)
  const now = new Date()

  /*
   * Wholesaler ka pehla sawal: "main yahan kyun list karun?"
   *
   * 🔴 Order ki ginti us ka sirf AADHA jawab hai. Naye maal par order sifar hote hain
   * aur us se lagta hai ke kuch ho hi nahi raha — jabke us maal ke pack ban rahe hote
   * hain aur reseller usay apne customers ke saamne rakh rahi hoti hain. Pohanch pehle
   * aati hai, order baad mein; agar sirf order dikhaye jayen to wo maal barhane se
   * pehle hi haar maan leta hai.
   */
  const demandSince = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const [page, ledger, payouts, platformFee, trending, demand, myRating] =
    await Promise.all([
    container.orders.listForSupplier(supplier.id, { limit: 60 }),
    container.payouts.ledgerByReseller(supplier.id),
    container.payouts.listForSupplier(supplier.id),
    container.payouts.platformFeeForSupplier(supplier.id),
    container.repositories.products.findTrending({ limit: 5, days: 30, supplierId: supplier.id }),
    container.repositories.supplierDemand.demand(supplier.id, demandSince),
    /*
     * Apna record — reseller kya keh rahi hain.
     *
     * 🔴 Naam ke baghair. Agar dukan ko pata chal jaye ke kis ne buri raye di to wo us
     * reseller ka agla order rad kar sakta hai — aur us khatre ka natija ye hai ke
     * reseller sach likhna chhor degi.
     */
    container.repositories.supplierReviews.forSupplier(supplier.id),
  ])

  /*
   * Khatam hone wala maal — dashboard par SIRF ginti, list nahi.
   *
   * Ye safha "kya haal hai" ka jawab deta hai; list us safhe par hai jahan us par kaam
   * bhi ho sakta hai (/supplier/inventory). Dono jagah list rakhne ka anjaam ye hota
   * hai ke koi bhi jagah mukammal nahi rehti aur dukan wala har dafa dono kholta hai.
   */
  const stock = await container.inventory.summary(supplier.id)

  const orders = page.items
  const waiting = orders.filter((order) => order.status === 'SENT_TO_SUPPLIER')
  const running = orders.filter((order) => RUNNING.has(order.status))
  const delivered = orders.filter((order) => order.status === 'DELIVERED')
  const lost = orders.filter((order) =>
    ['RTO', 'CANCELLED', 'REJECTED'].includes(order.status),
  )

  // Reseller ka paisa jo abhi mere zimme hai — wohi ginti jo payouts ke safhe par hai
  const owed = payouts
    .filter((payout) => payout.status !== 'SETTLED')
    .reduce((sum, payout) => sum + payout.amount, 0)
  const settled = payouts
    .filter((payout) => payout.status === 'SETTLED')
    .reduce((sum, payout) => sum + payout.amount, 0)

  // Hamari fee: ban chuki hai magar abhi wasool nahi hui
  const feeDue = Math.max(platformFee.earned - platformFee.collected, 0)

  /*
   * Do hafte ki chaal — har din ke order.
   *
   * Ginti usi list se banti hai jo upar aa chuki hai; is ke liye alag query nahi chalti.
   * Din ki hadd sthaniya (local) waqt par banti hai — dukan wala apna din dekhta hai,
   * UTC ka nahi.
   */
  const dayKey = (date: Date) =>
    `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`

  const perDay = new Map<string, number>()
  for (const order of orders) {
    const key = dayKey(new Date(order.createdAt))
    perDay.set(key, (perDay.get(key) ?? 0) + 1)
  }

  const points = Array.from({ length: TREND_DAYS }, (_, index) => {
    const date = new Date(now)
    date.setDate(date.getDate() - (TREND_DAYS - 1 - index))
    return {
      label: `${date.getDate()}/${date.getMonth() + 1}`,
      value: perDay.get(dayKey(date)) ?? 0,
    }
  })
  const inTrend = points.reduce((sum, point) => sum + point.value, 0)

  const products = trending.length
    ? await container.supplierCatalogue.listMyProducts(supplier.id)
    : []
  const productById = new Map(products.map((product) => [product.id, product]))
  const movers = trending.flatMap((row) => {
    const product = productById.get(row.productId)
    return product ? [{ product, orders: row.orders, qty: row.qty }] : []
  })

  // Kitne mukammal hue in mein se jo mar nahi gaye — tile par lakeer ke liye
  const finished = delivered.length + lost.length
  const deliveredShare = finished > 0 ? Math.round((delivered.length / finished) * 100) : undefined

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[1.35rem] font-bold tracking-tight">{supplier.businessName}</h1>
        <p className="mt-1 text-[0.92rem] text-ink-soft">{t('supplierDashboardBody')}</p>
      </div>

      {/*
        Apne sitare — reseller kya keh rahi hain.

        🔴 Ye "reach" se PEHLE hai. Pohanch aur order khabar hain; ye wo cheez hai jis par
        dukan ko KAAM karna hai. Aur agar usay ye nazar hi na aaye to wo badle ga kya?
        Sitare us ka karobar to gira denge magar wajah kabhi maloom nahi hogi — aur wo
        soorat na us ke liye insaaf hai, na reseller ke liye faida.
      */}
      {myRating.rating.stars !== null && (
        <section className="rounded-card bg-paper-raised p-4 shadow-soft">
          <h2 className="text-[0.95rem] font-bold">{t('myRatingTitle')}</h2>
          <p className="mt-1 text-[1.35rem] font-bold text-accent-700">
            ★ <span dir="ltr" className="numeric">{myRating.rating.stars}</span>
            <span className="ms-2 text-[0.78rem] font-normal text-ink-faint">
              <span dir="ltr" className="numeric">{myRating.rating.count}</span>{' '}
              {t('reviewCount')}
            </span>
          </p>

          <dl className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {(
              [
                [t('reviewQuality'), myRating.rating.quality],
                [t('reviewCommunication'), myRating.rating.communication],
                [t('reviewPayout'), myRating.rating.payoutOnTime],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-paper-sunken px-3 py-2.5">
                <dt className="text-[0.72rem] text-ink-soft">{label}</dt>
                <dd dir="ltr" className="numeric mt-0.5 text-[1.15rem] font-bold">
                  {value}
                </dd>
              </div>
            ))}
          </dl>

          {myRating.comments.length > 0 && (
            <ul className="mt-3 space-y-2">
              {myRating.comments.slice(0, 5).map((entry) => (
                <li
                  key={entry.createdAt.toISOString()}
                  className="rounded-2xl bg-paper-sunken px-3 py-2 text-[0.86rem] leading-relaxed"
                >
                  {entry.comment}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/*
        Aap ka maal kahan tak pohancha — pichhle 30 din.

        🔴 Ye order ki ginti se PEHLE hai, aur ye tarteeb jaan boojh kar hai. Naye maal
        par order sifar hote hain; agar wholesaler ko sirf wo dikhaya jaye to wo samjhega
        ke kuch ho hi nahi raha. Haqeeqat ye hoti hai ke us ke maal ke pack ban rahe hote
        hain aur reseller usay apne customers ke saamne rakh rahi hoti hain — pohanch
        pehle aati hai, order baad mein.

        "Kitni reseller ne uthaya" sab se ahem number hai: wo batata hai ke maal PASAND
        aaya, chahe abhi bika na ho.
      */}
      {(demand.resellers > 0 || demand.packs > 0) && (
        <section className="rounded-card bg-paper-raised p-4 shadow-soft">
          <h2 className="text-[0.95rem] font-bold">{t('reachTitle')}</h2>
          <p className="mt-1 text-[0.8rem] text-ink-soft">{t('reachHint')}</p>

          <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(
              [
                [t('reachResellers'), demand.resellers],
                [t('reachPacks'), demand.packs],
                [t('reachDownloads'), demand.packsDownloaded],
                [t('reachOrders'), demand.orders],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-paper-sunken px-3 py-2.5">
                <dt className="text-[0.72rem] text-ink-soft">{label}</dt>
                <dd dir="ltr" className="numeric mt-0.5 text-[1.15rem] font-bold">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {/*
        Sab se pehle wo qatar jis par KISI KA INTEZAR hai.
        Baqi numbers khabar hain; ye ek kaam hai — is liye ye alag dikhta hai aur seedha
        usi list par le jata hai jahan wo kaam hota hai.
      */}
      {waiting.length > 0 && (
        <Link
          href="/supplier/orders"
          className="flex flex-wrap items-center justify-between gap-3 rounded-card bg-brand-500 px-5 py-4 text-white shadow-lift transition hover:bg-brand-700"
        >
          <span className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-card bg-white/15">
              <ListIcon className="h-5 w-5" />
            </span>
            <span className="text-[1rem] font-bold">
              <span dir="ltr" className="numeric">
                {waiting.length}
              </span>{' '}
              {t('ordersNeedAnswer')}
            </span>
          </span>
          <span className="text-[0.85rem] text-white/85">{t('supplierOrdersNav')} →</span>
        </Link>
      )}

      {/*
        Maal khatam hone ka ishara — order wale patti ke NEECHE.
        Tarteeb maqsad se hai: upar wali qatar par kisi ka INTEZAR hai (customer khara
        hai), ye us se kam foran ka kaam hai. Dono ko ek jaisa numaya karne se dono ka
        asar barabar ho jata hai — aur phir na koi upar wala dabata hai na neeche wala.
      */}
      {stock.outCount + stock.lowCount > 0 && (
        <Link
          href="/supplier/inventory"
          className="flex flex-wrap items-center justify-between gap-3 rounded-card bg-paper-sunken px-5 py-3.5 transition hover:shadow-lift"
        >
          <span className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-card bg-white text-ink-soft">
              <BoxesIcon className="h-4 w-4" />
            </span>
            <span className="text-[0.92rem] font-semibold">
              {stock.outCount > 0 && (
                <span className="text-red-700">
                  <span dir="ltr" className="numeric">
                    {stock.outCount}
                  </span>{' '}
                  {t('stockOutCount')}
                </span>
              )}
              {stock.outCount > 0 && stock.lowCount > 0 && <span className="mx-2">·</span>}
              {stock.lowCount > 0 && (
                <span className="text-brand-800">
                  <span dir="ltr" className="numeric">
                    {stock.lowCount}
                  </span>{' '}
                  {t('stockLowCount')}
                </span>
              )}
            </span>
          </span>
          <span className="text-[0.82rem] text-ink-faint">{t('inventoryNav')} →</span>
        </Link>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          icon={<ListIcon className="h-5 w-5" />}
          label={t('ordersRunning')}
          value={String(running.length)}
          hint={t('ordersRunningHint')}
          href="/supplier/orders"
        />
        <StatTile
          icon={<BoxesIcon className="h-5 w-5" />}
          label={t('ordersDelivered')}
          value={String(delivered.length)}
          tone="accent"
          {...(deliveredShare !== undefined
            ? {
                progress: deliveredShare,
                // Lakeer ka matlab saaf likha hua hai — warna log us se apna matlab nikalte hain
                hint: `${deliveredShare}% ${t('ofFinishedOrders')}`,
              }
            : {})}
          href="/supplier/orders"
        />
        {/*
          Do paison ke khaane alag rangon mein: ek reseller ko dena hai, doosra humein.
          Dukan par ye dono aksar gaddmadd ho jate hain — aur phir na reseller ko poora
          milta hai na humein.
        */}
        <StatTile
          icon={<MoneyIcon className="h-5 w-5" />}
          label={t('moneyOwedToResellers')}
          value={formatPkr(owed)}
          hint={`${t('payoutSettled')}: ${formatPkr(settled)}`}
          tone="brand"
          href="/supplier/payouts"
        />
        <StatTile
          icon={<ShieldIcon className="h-5 w-5" />}
          label={t('feeDueLabel')}
          value={formatPkr(feeDue)}
          hint={`${t('feeCollectedLabel')}: ${formatPkr(platformFee.collected)}`}
          tone="coal"
          href="/supplier/payouts"
        />
      </div>

      {/* Chaal ka khana sirf tab jab kuch chala ho — khali chart kuch nahi kehta */}
      <div className={inTrend > 0 ? 'grid gap-4 lg:grid-cols-2' : 'grid gap-4'}>
        {inTrend > 0 && (
          <Widget
            title={t('ordersTrend')}
            subtitle={`${inTrend} ${t('ordersShort')} · ${TREND_DAYS} ${t('daysShort')}`}
          >
            <MiniBars points={points} caption={t('ordersTrendCaption')} unit={t('ordersShort')} />
          </Widget>
        )}

        <Widget
          title={t('yourMovers')}
          subtitle={t('trendingWindow')}
          action={{ label: t('supplierStockNav'), href: '/supplier/stock' }}
        >
          {movers.length === 0 ? (
            <p className="px-4 py-6 text-[0.88rem] text-ink-faint">{t('noDealingsYet')}</p>
          ) : (
            <ul className="divide-y divide-paper-sunken">
              {movers.map((row) => (
                <li key={row.product.id} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-card bg-paper-sunken">
                    {row.product.imageUrl && (
                      <LazyImage
                        src={row.product.imageUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[0.9rem] font-semibold">
                      {locale === 'ur' ? row.product.titleUr : row.product.titleEn}
                    </p>
                    {/* Bacha hua maal saath — "chal raha hai" aur "khatam hone wala hai" ek nazar mein */}
                    <p className="text-[0.74rem] text-ink-faint">
                      {t('stockLeftShort')}{' '}
                      <span dir="ltr" className="numeric">
                        {row.product.stockQty}
                      </span>
                    </p>
                  </div>

                  <span className="shrink-0 rounded-pill bg-accent-50 px-2.5 py-1 text-[0.75rem] font-semibold text-accent-700">
                    <span dir="ltr" className="numeric">
                      {row.orders}
                    </span>{' '}
                    {t('ordersShort')}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Widget>
      </div>

      {/* Wohi kaghaz jo /supplier/payouts par hai, aur wohi jo reseller apni taraf dekhti hai */}
      <Widget
        title={t('moneyByReseller')}
        subtitle={t('payoutNoteSupplier')}
        action={{ label: t('payoutsNav'), href: '/supplier/payouts' }}
      >
        <div className="p-4">
          <CounterpartyLedger
            rows={ledger.slice(0, 5)}
            locale={locale}
            now={now}
            labels={{
              empty: t('noDealingsYet'),
              orders: t('ordersCount'),
              delivered: t('ordersDeliveredShort'),
              running: t('ordersRunningShort'),
              lost: t('ordersLostShort'),
              earned: t('moneyEarnedTotal'),
              received: t('feeCollectedLabel'),
              awaiting: t('moneyAwaiting'),
              disputed: t('disputedShort'),
              lastOrder: t('lastOrder'),
            }}
          />
        </div>
      </Widget>
    </div>
  )
}
