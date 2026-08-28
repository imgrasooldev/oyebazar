import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { BRAND, formatPkr } from '@oyebazar/shared'
import { SupplierOrderActions } from '@/components/supplier-order-actions'
import { OrderRiskNote } from '@/components/order-risk-note'
import { OrderThread } from '@/components/order-thread'
import { SupplierStatusButton } from '@/components/supplier-status-button'
import { PinIcon } from '@/components/icons'
import { container } from '@/lib/container'
import { translator } from '@/lib/i18n'
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
  const statusEndpoint = `/api/v1/supplier/link/${token}/status`
  const locale = await getLocale()

  const order = await container.orders.getForSupplierToken(token).catch(() => null)

  /*
   * Guftagu — dukan ke liye bhi wohi jo reseller ko dikhti hai.
   *
   * 🔴 Login ke baghair: Bolton Market ka thok wala naya account nahi banata magar
   * WhatsApp ka link zaroor kholta hai (isi liye accept/reject bhi isi token se hota
   * hai). Jawab dene ke liye login maangne ka matlab hai ke wo jawab dega hi nahi, aur
   * guftagu ek tarfa reh jayegi — jo us se bhi buri soorat hai ke guftagu hoti hi na.
   */
  const messages = order
    ? (await container.repositories.orderMessages.listForOrder(order.id)).map((m) => ({
        id: m.id,
        kind: m.kind,
        authorType: m.authorType,
        body: m.body,
      }))
    : []
  if (!order) notFound()

  /* Is reseller ka chalan ISI dukan ke saath — wapsi ke andaze ka ek hissa. */
  const resellerRecord =
    order.status === 'SENT_TO_SUPPLIER'
      ? await container.payouts.resellerRisk([order.resellerId], order.supplierId)
      : []

  const t = translator(locale)

  // Teen button, teen lafz — ek hi jagah se, taake portal aur link par ek jaise rahen
  const actionLabels = {
    reasonAsk: t('reasonAsk'),
    confirm: t('confirmAction'),
    back: t('backOut'),
  }
  /*
   * Wapsi ka andaza — sirf usi lamhe jab faisla abhi baqi ho.
   *
   * 🔴 Ye safha portal se ZYADA ahem hai: Bolton Market ka thok wala login nahi karta,
   * wo isi link par faisla karta hai. Jo ishara sirf portal par ho, wo aksar us shakhs
   * tak pohanchta hi nahi jis ke liye banaya gaya tha.
   */
  const risk =
    order.status === 'SENT_TO_SUPPLIER'
      ? (
          await container.orders.riskFor(
            order.supplierId,
            [
              {
                id: order.id,
                deliveryFee: order.deliveryFee,
                total: order.total,
                hasLocationPin: order.locationLat !== null && order.locationLng !== null,
              },
            ],
            () => {
              const record = resellerRecord[0]
              return { delivered: record?.delivered ?? 0, rto: record?.rto ?? 0 }
            },
          )
        ).get(order.id)
      : undefined

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

      {/*
        🔴 Poora safar isi ek link par — login kahin nahi.

        Pehle yahan sirf "qubool" ya "maazrat" tha; us ke baad har qadam portal mein
        tha (login, OTP, ek aur app jaisi cheez) aur bohot se dukan wale wahan tak jate
        hi nahi. Us ki qeemat reseller bhugatti thi: "pohanch gaya" wohi qadam hai jis
        par us ka hissa khulta hai — na likha jaye to us ka paisa hawa mein latka rehta.

        Har halat par sirf WAHI button jo ab bante hain — teen ya us se kam. Dukan par
        koi list parh kar nahi chunta; wo wohi dabata hai jo saamne hai.
      */}
      {order.status === 'SENT_TO_SUPPLIER' && (
        <div className="mt-5 space-y-4">
          {/* Ishara BUTTON se pehle — faisle ke baad likhi hui baat kaam ki nahi rehti */}
          <OrderRiskNote risk={risk} locale={locale} />
          <SupplierOrderActions endpoint={`/api/v1/supplier/link/${token}`} />

          {/* Dukan masla SHURU nahi karti, sirf jawab deti hai — dekhen messages route */}
          <OrderThread
            endpoint={`/api/v1/supplier/link/${token}/messages`}
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
              reseller: t('threadReseller'),
              supplier: t('threadYou'),
              ops: t('threadOps'),
            }}
          />
        </div>
      )}

      {(order.status === 'ACCEPTED' || order.status === 'PACKED') && (
        <div className="mt-5 flex flex-wrap items-start gap-2">
          {order.status === 'ACCEPTED' && (
            <SupplierStatusButton
              orderNo={order.orderNo}
              endpoint={statusEndpoint}
              toStatus="PACKED"
              label={t('markPacked')}
              labels={actionLabels}
            />
          )}
          <SupplierStatusButton
            orderNo={order.orderNo}
            endpoint={statusEndpoint}
            toStatus="DISPATCHED"
            label={t('markDispatched')}
            tone="primary"
            labels={actionLabels}
          />
          <SupplierStatusButton
            orderNo={order.orderNo}
            endpoint={statusEndpoint}
            toStatus="CANCELLED"
            label={t('markCancelled')}
            tone="quiet"
            labels={actionLabels}
          />
        </div>
      )}

      {order.status === 'DISPATCHED' && (
        <div className="mt-5 flex flex-wrap items-start gap-2">
          <SupplierStatusButton
            orderNo={order.orderNo}
            endpoint={statusEndpoint}
            toStatus="DELIVERED"
            label={t('markDelivered')}
            tone="primary"
            note={t('deliveredOpensMoney')}
            labels={actionLabels}
          />
          <SupplierStatusButton
            orderNo={order.orderNo}
            endpoint={statusEndpoint}
            toStatus="RTO"
            label={t('markRto')}
            tone="danger"
            labels={actionLabels}
          />
        </div>
      )}

      {/* Mukammal ho chuka — ab dabane ko kuch nahi, sirf khabar */}
      {(order.status === 'DELIVERED' || order.status === 'RTO' || order.status === 'CANCELLED' ||
        order.status === 'REJECTED') && (
        <p className="card mt-5 p-5 text-center text-sm">
          {order.status === 'DELIVERED' ? '✓ یہ آرڈر مکمل ہو گیا۔' : 'یہ آرڈر بند ہو چکا ہے۔'}
        </p>
      )}
    </div>
  )
}
