import type { Metadata } from 'next'
import { AdminRowAction } from '@/components/admin-row-action'
import { requireOpsUser } from '@/lib/api/admin-session'
import { container } from '@/lib/container'

export const metadata: Metadata = {
  title: 'Resellers · Admin',
  robots: { index: false, follow: false },
}
export const dynamic = 'force-dynamic'

/**
 * Resellers.
 *
 * 🔴 Suspend karte hi us ki saari sessions bhi khatam hoti hain (repository mein, ek
 * hi transaction ke andar). Sirf status badalne se khula hua phone agle 7 din tak
 * chalta rehta — aur suspend aksar isi liye hota hai ke account ghalat haathon mein hai.
 */
export default async function AdminResellersPage() {
  const { user } = await requireOpsUser()
  const resellers = await container.admin.listResellers(user)

  /*
   * Invite ka khulasa — teen adad.
   *
   * 🔴 Ye qataron se GINE jate hain, ek nayi query se nahi. Fehrist pehle se
   * yahan hai, aur us par teen jama karna sifar kharche ka kaam hai; us ke liye DB
   * dobara poochhna wo kharch hai jo hamesha rehta hai aur kabhi wapas nahi aata.
   *
   * 🔴 "Chalu inviter" ki ginti alag hai aur wohi asal khabar hai. Kul invite ka
   * number ek do bandon se bhi bara ho sakta hai; ye batata hai ke KITNE log waqai laa
   * rahe hain — aur growth ka jawab usi mein hai.
   */
  const invitedTotal = resellers.reduce((sum, row) => sum + row.invitedCount, 0)
  const inviters = resellers.filter((row) => row.invitedCount > 0).length
  const cameViaInvite = resellers.filter((row) => row.referredByName !== null).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[1.4rem] font-bold tracking-tight">Resellers</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Suspending also ends every open session on that account.
        </p>
      </div>

      {/*
        Invite ka khulasa — fehrist se UPAR.

        Bina is ke ops ko ye jawab qatarein gin kar nikalna parta, aur wo koi nahi karta.
        Sawal rozana ka hai ("scheme kaam kar rahi hai ya nahi") aur us ka jawab ek nazar
        mein milna chahiye.
      */}
      {invitedTotal > 0 && (
        <dl dir="ltr" className="card flex flex-wrap gap-6 p-4 text-[0.85rem]">
          <div>
            <dt className="text-ink-faint">Came via invite</dt>
            <dd className="numeric text-[1.1rem] font-bold">{cameViaInvite}</dd>
          </div>
          <div>
            <dt className="text-ink-faint">Invites sent through</dt>
            <dd className="numeric text-[1.1rem] font-bold">{invitedTotal}</dd>
          </div>
          <div>
            <dt className="text-ink-faint">Sellers who invited</dt>
            <dd className="numeric text-[1.1rem] font-bold text-accent-700">{inviters}</dd>
          </div>
        </dl>
      )}

      {resellers.length === 0 ? (
        <p className="card p-6 text-center text-sm text-ink-soft">No resellers yet.</p>
      ) : (
        <ul className="space-y-3">
          {resellers.map((reseller) => (
            <li key={reseller.id} className="card flex flex-wrap items-center gap-4 p-4">
              <div className="min-w-[12rem] flex-1">
                <p className="font-bold">{reseller.name}</p>
                <p dir="ltr" className="numeric mt-0.5 text-[0.82rem] text-ink-soft">
                  {reseller.whatsappPhone} · {reseller.city}
                </p>

                {/*
                  Payout ka khata — POORA, aur ops ke liye lazmi.

                  🔴 Jhagra hamesha yahin phansta hai: reseller kehti hai paise nahi
                  mile, dukan kehta hai bhej diye. Dono ke saamne ek hi khata rakhe
                  baghair ye baat kabhi tay nahi hoti — aur aaj tak wo khata kisi
                  record mein tha hi nahi, sirf kisi purani WhatsApp chat mein.

                  🔴 "No payout account" ka dikhna utna hi zaroori hai jitna khate ka.
                  Wo qatarein wo behnein hain jin ka paisa atka rehne wala hai, aur
                  ops unhen aaj bhi sirf tab dekhta hai jab wo khud shikayat kare.
                */}
                {reseller.payoutAccount ? (
                  <p dir="ltr" className="numeric mt-1 text-[0.78rem] text-ink-faint">
                    {reseller.payoutAccount.method}
                    {reseller.payoutAccount.bankName && ` (${reseller.payoutAccount.bankName})`}{' '}
                    <span className="font-bold text-ink">{reseller.payoutAccount.number}</span> ·{' '}
                    {reseller.payoutAccount.title}
                  </p>
                ) : (
                  <p className="mt-1 text-[0.78rem] font-semibold text-amber-700">
                    No payout account — her money has nowhere to go
                  </p>
                )}
              </div>

              <dl dir="ltr" className="numeric flex shrink-0 gap-5 text-[0.8rem]">
                <div>
                  <dt className="text-ink-faint">Orders</dt>
                  <dd className="font-bold">{reseller.orderCount}</dd>
                </div>
                {/*
                  Kis ne bulaya — `Tier` ki jagah.

                  Wo khaana har qatar par 'NEW' chhapta tha, kyunke usay koi badalta hi
                  nahi tha. Ye us ki jagah wo cheez hai jo har qatar par ALAG hoti hai
                  aur jis se ops ko waqai kuch pata chalta hai.
                */}
                {reseller.referredByName && (
                  <div dir="auto">
                    <dt className="text-ink-faint">Invited by</dt>
                    <dd className="font-bold">{reseller.referredByName}</dd>
                  </div>
                )}

                {/*
                  Ulta rukh — is ne kitno ko bulaya.

                  🔴 Sirf jab sifar se ziyada ho. "Invited 0" har us qatar par chhap
                  jata jis ne kabhi link bheja hi nahi (yani aksar par), aur us shor
                  mein wo ek qatar doob jati jo waqai log laa rahi hai — jab ke poore
                  khaane ka maqsad wohi ek qatar dhoondhna hai.
                */}
                {reseller.invitedCount > 0 && (
                  <div>
                    <dt className="text-ink-faint">Invited</dt>
                    <dd className="font-bold text-accent-700">{reseller.invitedCount}</dd>
                  </div>
                )}
              </dl>

              <div className="flex shrink-0 items-center gap-2">
                <span
                  className={`badge ${
                    reseller.status === 'ACTIVE'
                      ? 'bg-accent-50 text-accent-700'
                      : reseller.status === 'SUSPENDED'
                        ? 'bg-coal-900 text-white'
                        : 'bg-brand-50 text-brand-800'
                  }`}
                >
                  {reseller.status}
                </span>

                {reseller.status === 'SUSPENDED' ? (
                  <AdminRowAction
                    endpoint={`/api/v1/admin/resellers/${reseller.id}`}
                    body={{ status: 'ACTIVE' }}
                    label="Reinstate"
                  />
                ) : (
                  <AdminRowAction
                    endpoint={`/api/v1/admin/resellers/${reseller.id}`}
                    body={{ status: 'SUSPENDED' }}
                    label="Suspend"
                    tone="danger"
                    confirmText={`Suspend ${reseller.name}? They are logged out everywhere.`}
                  />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
