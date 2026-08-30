import type { Metadata } from 'next'
import { ORDER_TRANSIT, courierName, formatPkr } from '@oyebazar/shared'
import type { ResellerRiskRecord, SupplierOrderView } from '@oyebazar/core'
import { OrderThread, type ThreadMessage } from '@/components/order-thread'
import { SupplierOrderActions } from '@/components/supplier-order-actions'
import { ResellerRtoRecord } from '@/components/reseller-rto-record'
import { OrderRiskNote } from '@/components/order-risk-note'
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
  // Ek hi "abhi" poore safhe ke liye — warna har card apna waqt naapta hai
  const now = new Date()

  /*
   * RTO ka record — sirf ISI dukan ke saath ka chalan.
   *
   * Poore platform ka record dikhana zyada "mukammal" lagta, magar faisla yahan ye hai
   * ke "mere saath is ka kya chalan raha" — aur wahi wo cheez hai jis par dukan wala
   * apna maal bhejta hai.
   */
  const risk = await container.payouts.resellerRisk(
    [...new Set(orders.map((order) => order.resellerId))],
    supplier.id,
  )
  const riskByReseller = new Map(risk.map((row) => [row.resellerId, row]))

  /*
   * Guftagu — EK query mein, poore safhe ke liye.
   *
   * 🔴 Ye safha pehle guftagu dikhata hi nahi tha. Reseller apne `/orders`
   * safhe par likh sakti thi, aur dukan sirf WhatsApp wale magic link se jawab de sakti
   * thi — yani jo dukandar login kar ke yahan baitha hai, us ke liye wo baat mojood hi
   * nahi thi. "Laal wala bhejna" likha jata aur kabhi parha na jata.
   */
  const messagesByOrderId = await container.repositories.orderMessages.listForOrders(
    orders.map((order) => order.id),
  )
  const threads = new Map<string, ThreadMessage[]>(
    orders.map((order) => [
      order.orderNo,
      (messagesByOrderId.get(order.id) ?? []).map((m) => ({
        id: m.id,
        kind: m.kind,
        authorType: m.authorType,
        body: m.body,
      })),
    ]),
  )

  const waiting = orders.filter((order) => order.status === 'SENT_TO_SUPPLIER')

  /*
   * Wapsi ka andaza — SIRF un orders par jin par faisla abhi baqi hai.
   *
   * Chal rahe aur mukammal shuda orders par ye sirf shor hai: maal ja chuka, faisla ho
   * chuka. `showRecord` par yahi soch pehle se likhi hui hai — ye us se mel khata hai,
   * aur is se ginti bhi chhoti reh jati hai (aam tor par teen-chaar orders).
   */
  const riskByOrder = await container.orders.riskFor(
    supplier.id,
    waiting.map((order) => ({
      id: order.id,
      deliveryFee: order.deliveryFee,
      total: order.total,
      hasLocationPin: order.locationLat !== null && order.locationLng !== null,
    })),
    (orderId) => {
      const order = waiting.find((row) => row.id === orderId)
      const record = order ? riskByReseller.get(order.resellerId) : undefined
      return { delivered: record?.delivered ?? 0, rto: record?.rto ?? 0 }
    },
  )
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
                <OrderCard
                  order={order}
                  locale={locale}
                  risk={riskByReseller}
                  now={now}
                  messages={threads.get(order.orderNo) ?? []}
                />
                {/* Ishara BUTTON se pehle — faisle ke baad likhi hui baat kaam ki nahi rehti */}
                <OrderRiskNote risk={riskByOrder.get(order.id)} locale={locale} />
                <SupplierOrderActions endpoint={`/api/v1/supplier/orders/${order.orderNo}`} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {running.length > 0 && (
        <Section
          title={t('runningOrders')}
          orders={running}
          locale={locale}
          risk={riskByReseller}
          now={now}
          threads={threads}
          withActions
        />
      )}
      {done.length > 0 && (
        <Section
          title={t('finishedOrders')}
          orders={done}
          locale={locale}
          risk={riskByReseller}
          now={now}
          threads={threads}
        />
      )}
    </div>
  )
}

function Section({
  title,
  orders,
  locale,
  risk,
  now,
  threads,
  withActions = false,
}: {
  title: string
  orders: readonly SupplierOrderView[]
  locale: Locale
  /** Reseller ka RTO record — id se */
  risk: Map<string, ResellerRiskRecord>
  now: Date
  /** Order ke number se us ki guftagu */
  threads: Map<string, ThreadMessage[]>
  /** Chal rahe orders par agla qadam — mukammal shuda par koi button nahi */
  withActions?: boolean
}) {
  const t = translator(locale)

  // Ek hi jagah — teen button inhi lafzon par chalte hain
  const actionLabels = {
    reasonAsk: t('reasonAsk'),
    confirm: t('confirmAction'),
    back: t('backOut'),
    courierAsk: t('courierAsk'),
    cnAsk: t('cnAsk'),
    cnHint: t('cnHint'),
  }

  return (
    <section>
      {/* Ginti sar-name ke saath — "kitne hain" ka jawab list gin kar nahi milna chahiye */}
      <div className="mb-4 flex items-baseline gap-2">
        <h2 className="text-[1.05rem] font-bold">{title}</h2>
        <span
          dir="ltr"
          className="numeric rounded-pill bg-paper-sunken px-2 py-0.5 text-[0.75rem] font-bold text-ink-soft"
        >
          {orders.length}
        </span>
      </div>
      <ul className="grid gap-4 lg:grid-cols-2">
        {orders.map((order) => (
          <li key={order.id} className="card space-y-4 p-5">
            <OrderCard
              order={order}
              locale={locale}
              risk={risk}
              now={now}
              messages={threads.get(order.orderNo) ?? []}
              showRecord={withActions}
            />

            {/*
              Agla qadam wohi jo ab bana hai — dukan par jaldi mein chunna nahi parta.
              PACKED skip bhi ho sakta hai: chhoti dukan seedha courier ko de deti hai.
            */}
            {withActions && (order.status === 'ACCEPTED' || order.status === 'PACKED') && (
              <div className="flex flex-wrap items-start gap-2">
                {order.status === 'ACCEPTED' && (
                  <SupplierStatusButton
                    orderNo={order.orderNo}
                    toStatus="PACKED"
                    label={t('markPacked')}
                    labels={actionLabels}
                  />
                )}
                <SupplierStatusButton
                  orderNo={order.orderNo}
                  toStatus="DISPATCHED"
                  label={t('markDispatched')}
                  tone="primary"
                  labels={actionLabels}
                />

                {/*
                  Mansookhi haan karne ke BAAD ka rasta hai — maal na nikle to isay
                  chhupana sirf ye karta hai ke order chup chaap qatar mein para rehta
                  hai aur reseller ka customer intezar karta rehta hai. Dabi hui shakl
                  is liye ke ye aam qadam nahi hai.
                */}
                <SupplierStatusButton
                  orderNo={order.orderNo}
                  toStatus="CANCELLED"
                  label={t('markCancelled')}
                  tone="quiet"
                  labels={actionLabels}
                />
              </div>
            )}

            {/*
              Raste wale order par do hi anjaam hain: pohanch gaya, ya wapas aa gaya.
              Dono yahan hain kyunke dono ki khabar pehle DUKAN ko milti hai — cash bhi
              usi ke haath aata hai aur wapas aya maal bhi usi ke darwaze par.
            */}
            {withActions && order.status === 'DISPATCHED' && (
              <div className="flex flex-wrap items-start gap-2">
                <SupplierStatusButton
                  orderNo={order.orderNo}
                  toStatus="DELIVERED"
                  label={t('markDelivered')}
                  tone="primary"
                  note={t('deliveredOpensMoney')}
                  labels={actionLabels}
                />
                <SupplierStatusButton
                  orderNo={order.orderNo}
                  toStatus="RTO"
                  label={t('markRto')}
                  tone="danger"
                  labels={actionLabels}
                />
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

function OrderCard({
  order,
  locale,
  risk,
  now,
  messages,
  showRecord = true,
}: {
  order: SupplierOrderView
  locale: Locale
  risk: Map<string, ResellerRiskRecord>
  /** Isi order ki guftagu — purani pehle */
  messages: ThreadMessage[]
  /** Ek hi "abhi" poori list ke liye — warna har card apna waqt naapta hai */
  now: Date
  /**
   * RTO ka record sirf wahan jahan us se KUCH badal sakta hai.
   *
   * Mukammal ho chuke order par ye sirf shor hai — faisla ho chuka, maal ja chuka. Har
   * qatar par ek laal nishan lagate rehne se wo nishan bemani ho jata hai, aur phir jis
   * din wo waqai kaam ka hota hai us din bhi koi nahi dekhta.
   */
  showRecord?: boolean
}) {
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

      {/*
        Kitne din se raste mein — sirf DISPATCHED par.

        🔴 Ye khabar nahi, PAISA hai: reseller ka hissa 'pohanch gaya' likhne par khulta
        hai. Parcel ja chuka hota hai aur dukan ka kaam apni nazar mein khatam — is liye
        likhna reh jata hai, aur reseller ka paisa mahino atka reh sakta hai. Char din ke
        baad ye nishan laal ho jata hai (WhatsApp par bhi usi din poochha jata hai).
      */}
      {order.status === 'DISPATCHED' && order.dispatchedAt && (
        <TransitAge dispatchedAt={order.dispatchedAt} locale={locale} now={now} />
      )}

      {/*
        Dukan ko apna likha hua CN wapas dikhta hai.

        🔴 Ye sirf sajawat nahi: jab reseller poochhti hai "parcel ka kya bana", to jawab
        dene wale ke saamne wohi number hona chahiye jo us ne likha tha. Warna use apni
        courier ki rasidon ke dher mein se ye order dhoondhna parta hai — aur wahi wo
        lamha hai jahan log "baad mein dekhta hoon" keh dete hain.
      */}
      {order.courier && (
        <p className="flex flex-wrap items-center gap-2 text-[0.8rem] text-ink-faint">
          <span className="font-semibold">{courierName(order.courier)}</span>
          {order.trackingNo && (
            <span dir="ltr" className="numeric font-bold text-ink-soft">
              {order.trackingNo}
            </span>
          )}
        </p>
      )}

      {/*
        RTO ka record — order qubool karne se PEHLE.
        Wapsi ka kirchaya dukan uthati hai; faisla us ka hai, magar faisle ke waqt us ke
        paas koi ishara hota hi nahi tha. Ye ilzam nahi, ginti hai.
      */}
      {showRecord && <ResellerRtoRecord record={risk.get(order.resellerId)} locale={locale} />}

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

      {/*
        Order ke gird ki baat — dukan ki taraf se.

        🔴 `canRaiseIssue` yahan NAHI hai. Masla wo uthata hai jis ka nuqsan hota
        hai (reseller ka customer, reseller ka paisa) — dukan sirf jawab deti hai. Yehi
        qaida magic link wale raste par bhi likha hua hai, aur dono jagah ek hi rakhna
        zaroori hai: warna dukandar wo darwaza istemal karta jo zyada deta hai, aur
        qaida wo ban jata jo raste ne banaya, na ke jo hum ne socha.

        Aur ye order ke SAATH hai, kisi alag safhe par nahi — bilkul jaise reseller ke
        safhe par hai. Alag safha banane ka matlab hota ke dukandar usay tab dhoondhta
        jab maal ghalat ja chuka hota.
      */}
      <OrderThread
        endpoint={`/api/v1/supplier/orders/${order.orderNo}/messages`}
        initial={messages}
        canRaiseIssue={false}
        labels={{
          title: t('threadTitle'),
          hint: t('threadHint'),
          placeholder: t('threadPlaceholder'),
          send: t('threadSend'),
          raiseIssue: t('threadRaiseIssue'),
          issueBadge: t('threadIssueBadge'),
          empty: t('threadEmpty'),
          failed: t('threadFailed'),
          /*
             🔴 Naam LIKHNE WALE ke hisaab se — "aap/doosra" ke hisaab se nahi.
             Is safhe par "Aap" dukan hai, is liye `supplier` par t('threadYou') jata hai.
             Component ke andar bhi yehi tanbeeh likhi hui hai; wahan se seekha hua hai.
          */
          reseller: t('threadReseller'),
          supplier: t('threadYou'),
          ops: t('threadOps'),
        }}
      />
    </div>
  )
}

/**
 * "Char din se raste mein" — dukan ke liye ek chhota sa sawal.
 *
 * Char din ki hadd wohi hai jo WhatsApp wale sawal ki hai (ORDER_TRANSIT), taake safhe
 * ka nishan aur paighaam ek hi baat kahen — do alag hadden rakhna wo cheez hai jis se
 * log dono par bharosa chhor dete hain.
 */
function TransitAge({
  dispatchedAt,
  locale,
  now,
}: {
  dispatchedAt: Date
  locale: Locale
  now: Date
}) {
  const t = translator(locale)
  const days = Math.floor((now.getTime() - new Date(dispatchedAt).getTime()) / 86_400_000)
  const late = days * 86_400_000 >= ORDER_TRANSIT.askSupplierAfterMs

  return (
    <span
      className={`inline-flex items-baseline gap-1.5 rounded-pill px-2.5 py-1 text-[0.75rem] font-semibold ${
        late ? 'bg-red-50 text-red-700' : 'bg-paper-sunken text-ink-soft'
      }`}
    >
      <span dir="ltr" className="numeric">
        {days}
      </span>
      {t('daysInTransit')}
    </span>
  )
}
