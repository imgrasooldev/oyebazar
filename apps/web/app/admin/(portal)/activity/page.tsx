import type { Metadata } from 'next'
import { requireOpsUser } from '@/lib/api/admin-session'
import { container } from '@/lib/container'
import { timeAgo } from '@/lib/i18n'

export const metadata: Metadata = { title: 'Activity' }
export const dynamic = 'force-dynamic'

/**
 * Kis ne kya kiya — ops ka daftar.
 *
 * 🔴 Ye safha isliye bana ke ye poora nishan PEHLE SE likha ja raha tha aur koi usay
 * parhta nahi tha. `AdminService.record()` har admin harkat ko `Event` table mein
 * daalta hai — dukan mo'attal karna, fee ka rate badalna, kisi ko SUPER_ADMIN banana —
 * aur us table ko poore code mein koi query nahi karta tha.
 *
 * Likha hua magar na parha jane wala record us record se BURA hai jo hai hi nahi:
 * team ko lagta hai ke nazar rakhi ja rahi hai, aur us bharose par wo dhyan chhor deti
 * hai jo wo warna rakhti.
 *
 * 🔴 Chhanni `actorType: 'ops'` par lagi hui hai, aur ye is safhe ki asal shart hai.
 * Usi table mein reseller aur dukan ke waqiat bhi jate hain — rozana hazaron — aur un
 * ke darmiyan ops ki das harkatein gum ho jati hain. Ye safha jawabdehi ka hai,
 * trafik ka nahi.
 */

/** Insaan ki zaban — event ka naam wo cheez nahi jo koi parhna chahe. */
const SAYS: Record<string, string> = {
  admin_supplier_status_changed: 'Wholesaler ki halat badli',
  admin_supplier_listing_changed: 'Wholesaler ki listing badli',
  admin_supplier_fee_changed: 'Wholesaler ka fee rate badla',
  admin_product_status_changed: 'Maal ki halat badli',
  admin_reseller_status_changed: 'Reseller ki halat badli',
  admin_team_role_changed: 'Team member ka darja badla',
  admin_team_active_changed: 'Team member on/off kiya',
  admin_team_member_added: 'Naya team member',
  admin_invoices_generated: 'Invoices banayin',
  admin_invoice_collected: 'Invoice wasool hui',
}

/**
 * Sab se bhaari harkatein — ye laal nishan ke saath aati hain.
 *
 * 🔴 Har qatar ko ek jaisa dikhana is fehrist ko bekar kar deta: "invoice banayin"
 * rozana ka kaam hai, aur "kisi ko SUPER_ADMIN banaya" saal mein ek dafa hota hai.
 * Dono ek rang mein hon to doosri wali pehli walon ke dher mein doob jati hai.
 */
const HEAVY = new Set([
  'admin_team_role_changed',
  'admin_team_member_added',
  'admin_supplier_fee_changed',
])

export default async function AdminActivityPage() {
  const { user } = await requireOpsUser()
  container.admin.assertPermission(user, 'view')

  const rows = await container.repositories.adminActivity.recent({ actorType: 'ops', limit: 100 })
  const now = new Date()

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[1.4rem] font-bold tracking-tight">Activity</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Ops team ne kya kiya — nayi harkat sab se upar. Aakhri 100.
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="card p-6 text-center text-[0.9rem] text-ink-soft">Abhi koi harkat nahi.</p>
      ) : (
        <ul className="card divide-y divide-paper-sunken px-4">
          {rows.map((row) => (
            <li key={row.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2.5">
              <span className="min-w-0 flex-1">
                <span className="font-semibold">
                  {/*
                    Naam na mile to `actorId` — "kisi ne" likhna jhoot hai, aur is
                    safhe par jhoot us ke poore maqsad ko khatam kar deta hai.
                  */}
                  {row.actorName ?? row.actorId ?? '—'}
                </span>{' '}
                <span className={HEAVY.has(row.name) ? 'font-semibold text-red-700' : 'text-ink-soft'}>
                  {SAYS[row.name] ?? row.name}
                </span>
                {/*
                  Tafseel — jo bhi us harkat ke saath likha gaya tha.

                  🔴 Yahan koi chunao nahi kiya gaya (kaun si key dikhani hai): har
                  harkat apni alag tafseel likhti hai, aur chunao karne ka matlab hota
                  ke kal koi nayi harkat likhi jati aur us ki tafseel khamoshi se gayab
                  rehti — us din bhi jab wohi cheez chahiye hoti.
                */}
                {Object.keys(row.properties).length > 0 && (
                  <span dir="ltr" className="ms-1.5 text-[0.76rem] text-ink-faint">
                    {Object.entries(row.properties)
                      .map(([key, value]) => `${key}: ${String(value)}`)
                      .join(' · ')}
                  </span>
                )}
              </span>
              <span className="shrink-0 text-[0.76rem] text-ink-faint">
                {timeAgo('rm', row.createdAt, now)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
