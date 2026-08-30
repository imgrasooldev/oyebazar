import type { Metadata } from 'next'
import { ORDER_STATUS_EN, formatPkr } from '@oyebazar/shared'
import { IssueResolve } from '@/components/issue-resolve'
import { AdminRowAction } from '@/components/admin-row-action'
import { requireOpsUser } from '@/lib/api/admin-session'
import { container } from '@/lib/container'
import { orderStatusStyle } from '@/lib/order-status-style'

export const metadata: Metadata = {
  title: 'Orders · Admin',
  robots: { index: false, follow: false },
}
export const dynamic = 'force-dynamic'

/**
 * Orders — ops ka rozana ka kaam.
 *
 * Tarteeb wohi jo kaam ki hai: pehle wo jin par HUM ne kuch karna hai (CONFIRMED —
 * inhen wholesaler ko bhejna hai), phir wo jin par koi aur atka hua hai, phir baqi.
 *
 * 🔴 Har button OrderService se guzarta hai, seedha DB update kahin nahi. Isi liye
 * yahan se bhi bina reseller ki tasdeeq ke order wholesaler ko nahi ja sakta — admin
 * hone ka matlab qawaid se bahar hona nahi hai.
 */
export default async function AdminOrdersPage() {
  const { user } = await requireOpsUser()

  // Admin ki list INTERNAL view hai — is mein hamari fee bhi dikhti hai
  /*
   * Khule hue masle sab se OOPAR — order ki list se pehle.
   *
   * 🔴 Shikayat ka poora faida isi par khara hai ke wo kisi ki NAZAR mein aaye. Agar wo
   * order ki list mein kahin dabi rahe to reseller ne likh to diya magar kuch hua nahi —
   * aur agli dafa wo likhegi hi nahi, wapas WhatsApp par chali jayegi. Us soorat mein ye
   * poora nizam banane ka koi maqsad nahi bachta.
   */
  const [page, issues] = await Promise.all([
    container.repositories.orders.listForOps({ limit: 60 }),
    container.repositories.orderMessages.openIssues(20),
  ])
  const orders = page.items

  const toSend = orders.filter((order) => order.status === 'CONFIRMED')
  const waitingOthers = orders.filter((order) =>
    ['PENDING_CONFIRM', 'SENT_TO_SUPPLIER'].includes(order.status),
  )
  const moving = orders.filter((order) => ['ACCEPTED', 'DISPATCHED'].includes(order.status))
  const done = orders.filter((order) =>
    ['DELIVERED', 'RTO', 'CANCELLED', 'REJECTED'].includes(order.status),
  )

  return (
    <div className="space-y-8">
      {issues.length > 0 && (
        <section className="mb-6 rounded-card bg-red-50 p-4 ring-1 ring-red-200">
          <h2 className="text-[0.95rem] font-bold text-red-800">
            {issues.length} khule hue masle
          </h2>
          <ul className="mt-2 space-y-2">
            {issues.map((issue) => (
              <li key={issue.id} className="flex items-start gap-3 rounded-2xl bg-white px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p dir="ltr" className="numeric text-[0.72rem] font-semibold text-ink-faint">
                    {issue.orderNo}
                  </p>
                  <p className="mt-0.5 whitespace-pre-line text-[0.86rem] leading-relaxed">
                    {issue.body}
                  </p>
                </div>
                <IssueResolve messageId={issue.id} label="ہو گیا" />
              </li>
            ))}
          </ul>
        </section>
      )}

      <div>
        <h1 className="text-[1.4rem] font-bold tracking-tight">Orders</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Every action goes through the order state machine — the same rules apply here.
        </p>
      </div>

      <Group
        title={`Send to wholesaler (${toSend.length})`}
        highlight
        rows={toSend}
        actor={user.id}
      />
      <Group title="Waiting on someone else" rows={waitingOthers} actor={user.id} />
      <Group title="On the way" rows={moving} actor={user.id} />
      <Group title="Finished" rows={done} actor={user.id} />
    </div>
  )
}

type Rows = Awaited<ReturnType<typeof container.repositories.orders.listForOps>>['items']

function Group({
  title,
  rows,
  highlight = false,
  actor,
}: {
  title: string
  rows: Rows
  highlight?: boolean
  actor: string
}) {
  if (rows.length === 0) return null

  return (
    <section>
      <h2
        className={
          highlight
            ? 'mb-3 rounded-card bg-brand-50 px-4 py-3 font-bold text-brand-800'
            : 'mb-3 text-[0.72rem] font-bold uppercase tracking-[0.14em] text-ink-faint'
        }
      >
        {title}
      </h2>

      <ul className="space-y-3">
        {rows.map((order) => (
          <li key={order.id} className="card flex flex-wrap items-center gap-4 p-4">
            <div className="min-w-[8rem]">
              <p dir="ltr" className="numeric font-bold">
                {order.orderNo}
              </p>
              <span className={`badge mt-1 ${orderStatusStyle(order.status)}`}>
                {ORDER_STATUS_EN[order.status]}
              </span>
            </div>

            <dl dir="ltr" className="numeric flex flex-1 gap-5 text-[0.8rem]">
              <div>
                <dt className="text-ink-faint">Items</dt>
                <dd className="font-bold">{order.items.length}</dd>
              </div>
              <div>
                <dt className="text-ink-faint">Order value</dt>
                <dd className="font-bold">{formatPkr(order.total)}</dd>
              </div>
              <div>
                <dt className="text-ink-faint">Our fee</dt>
                <dd className="font-bold text-accent-700">{formatPkr(order.bajiFee)}</dd>
              </div>
              <div>
                <dt className="text-ink-faint">Confirmed</dt>
                <dd className={order.confirmedAt ? 'font-bold' : 'font-bold text-brand-700'}>
                  {order.confirmedAt ? (order.confirmedBy ?? 'yes') : 'not yet'}
                </dd>
              </div>
            </dl>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {order.status === 'CONFIRMED' && (
                <AdminRowAction
                  endpoint={`/api/v1/admin/orders/${order.id}/status`}
                  body={{ toStatus: 'SENT_TO_SUPPLIER' }}
                  label="Send to wholesaler"
                  tone="primary"
                />
              )}

              {order.status === 'ACCEPTED' && (
                <AdminRowAction
                  endpoint={`/api/v1/admin/orders/${order.id}/status`}
                  body={{ toStatus: 'DISPATCHED' }}
                  label="Dispatched"
                  tone="primary"
                />
              )}

              {order.status === 'DISPATCHED' && (
                <>
                  <AdminRowAction
                    endpoint={`/api/v1/admin/orders/${order.id}/status`}
                    body={{ toStatus: 'DELIVERED' }}
                    label="Delivered"
                    tone="primary"
                  />
                  {/*
                    RTO ki wajah lazmi hai (server bhi maangta hai) — yehi number batata
                    hai ke kaun sa ilaqa ya reseller baar baar nuqsan de rahi hai.
                  */}
                  <AdminRowAction
                    endpoint={`/api/v1/admin/orders/${order.id}/status`}
                    body={{ toStatus: 'RTO', note: 'Customer refused / not available' }}
                    label="Returned (RTO)"
                    tone="danger"
                    confirmText={`Mark ${order.orderNo} as returned? The fee is written off.`}
                  />
                </>
              )}

              <span className="sr-only">acting as {actor}</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
