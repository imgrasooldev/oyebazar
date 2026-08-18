import type { Metadata } from 'next'
import {
  OPS_PERMISSIONS,
  OPS_ROLES,
  OPS_ROLE_PURPOSE,
  OPS_ROLE_RANK,
  canDo,
} from '@oyebazar/core'
import { AdminRowAction } from '@/components/admin-row-action'
import { AdminTeamForm } from '@/components/admin-team-form'
import { requireOpsUser } from '@/lib/api/admin-session'
import { container } from '@/lib/container'

export const metadata: Metadata = {
  title: 'Team · Admin',
  robots: { index: false, follow: false },
}
export const dynamic = 'force-dynamic'

/**
 * Ops team.
 *
 * Pehle naya ops user sirf DB mein SQL chala kar banta tha — yani har nayi joining
 * developer ka kaam thi, aur kisi ke jane par access hatana bhool jane ki poori
 * gunjaish.
 *
 * Role ke saath ye bhi likha hai ke us role mein kya kar sakte hain. Sirf naam
 * ("MANAGER") se kisi ko andaza nahi hota ke wo kitna ikhtiyar de raha hai — aur ye
 * wo faisla hai jo galat hone par paise tak jata hai.
 */
/*
 * 🔴 Jadwal core se banti hai (domain/ops-permissions.ts) — yahan dobara likhi hoti to
 * kisi din qawaid badalte aur safha purani baat kehta rehta.
 */
const PERMISSIONS = Object.values(OPS_PERMISSIONS)
const ROLES = OPS_ROLES

export default async function AdminTeamPage() {
  const { user } = await requireOpsUser()

  // URL type kar ke aane wale ko crash nahi, saaf jawab — rok service mein hai,
  // ye sirf us rok ka shaista chehra hai
  if (!canDo(user.role, 'manageTeam')) {
    return (
      <div className="card p-8 text-center">
        <h1 className="text-[1.2rem] font-bold">Team</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Only a super admin can see and change the team.
        </p>
      </div>
    )
  }

  const team = await container.admin.listTeam(user)
  const canManage = canDo(user.role, 'manageTeam')

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[1.4rem] font-bold tracking-tight">Team</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Everyone signs in with the WhatsApp number listed here — there are no passwords.
        </p>
      </div>

      {canManage && <AdminTeamForm />}

      <section>
        <h2 className="mb-3 text-[0.72rem] font-bold uppercase tracking-[0.14em] text-ink-faint">
          Members ({team.length})
        </h2>

        <ul className="space-y-3">
          {team.map((member) => {
            const isSelf = member.id === user.id

            return (
              <li key={member.id} className="card flex flex-wrap items-center gap-4 p-4">
                <div className="min-w-[12rem] flex-1">
                  <p className="font-bold">
                    {member.name}
                    {isSelf && <span className="ms-2 text-[0.72rem] text-ink-faint">(you)</span>}
                  </p>
                  <p dir="ltr" className="numeric mt-0.5 text-[0.82rem] text-ink-soft">
                    {member.phone ?? 'no number — cannot sign in'} · {member.email}
                  </p>
                </div>

                <div className="text-[0.78rem] text-ink-faint">
                  {member.lastSeenAt
                    ? `last seen ${member.lastSeenAt.toISOString().slice(0, 10)}`
                    : 'never signed in'}
                </div>

                <span
                  className={`badge ${
                    member.role === 'SUPER_ADMIN'
                      ? 'bg-brand-50 text-brand-800'
                      : member.role === 'MANAGER'
                        ? 'bg-accent-50 text-accent-700'
                        : 'bg-paper-sunken text-ink-soft'
                  }`}
                >
                  {member.role}
                </span>

                {!member.isActive && (
                  <span className="badge bg-coal-900 text-white">disabled</span>
                )}

                {/*
                  Apne aap par koi button nahi: apna role badalna ya khud ko band karna
                  service bhi rokti hai, magar button dikhana hi ghalat ummeed deta hai.
                */}
                {canManage && !isSelf && (
                  <div className="flex flex-wrap items-center gap-2">
                    {ROLES.filter((role) => role !== member.role).map((role) => (
                      <AdminRowAction
                        key={role}
                        endpoint={`/api/v1/admin/team/${member.id}`}
                        body={{ role }}
                        label={`Make ${role.toLowerCase()}`}
                        confirmText={
                          role === 'SUPER_ADMIN'
                            ? `Make ${member.name} a super admin? They will be able to change fee rates, generate invoices and manage this team.`
                            : undefined
                        }
                      />
                    ))}

                    <AdminRowAction
                      endpoint={`/api/v1/admin/team/${member.id}`}
                      body={{ isActive: !member.isActive }}
                      label={member.isActive ? 'Disable' : 'Enable'}
                      tone={member.isActive ? 'danger' : 'plain'}
                      confirmText={
                        member.isActive
                          ? `Disable ${member.name}? They are signed out everywhere immediately.`
                          : undefined
                      }
                    />
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </section>

      {/* Role dene se pehle ye dekh lena chahiye ke wo role deta kya hai */}
      <section>
        <h2 className="mb-3 text-[0.72rem] font-bold uppercase tracking-[0.14em] text-ink-faint">
          What each role can do
        </h2>

        <div className="card overflow-x-auto">
          <table className="w-full text-[0.85rem]">
            <thead>
              <tr className="border-b border-black/[0.06] text-ink-faint">
                <th className="px-4 py-3 text-start font-semibold">Permission</th>
                {ROLES.map((role) => (
                  <th key={role} className="px-4 py-3 text-center font-semibold">
                    <span className="block">{role.replace('_', ' ')}</span>
                    <span className="mt-1 block text-[0.68rem] font-normal normal-case text-ink-faint">
                      {OPS_ROLE_PURPOSE[role]}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSIONS.map((permission) => (
                <tr key={permission.label} className="border-b border-black/[0.04] last:border-0">
                  <td className="px-4 py-2.5">{permission.label}</td>
                  {ROLES.map((role) => (
                    <td key={role} className="px-4 py-2.5 text-center">
                      {OPS_ROLE_RANK[role] >= OPS_ROLE_RANK[permission.needs] ? (
                        <span className="text-accent-700">✓</span>
                      ) : (
                        <span className="text-ink-faint">·</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
