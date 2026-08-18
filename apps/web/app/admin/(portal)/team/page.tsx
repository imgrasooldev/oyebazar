import type { Metadata } from 'next'
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
const PERMISSIONS = [
  {
    label: 'See everything (orders, stock, resellers, money)',
    roles: ['COORDINATOR', 'MANAGER', 'FOUNDER'],
  },
  {
    label: 'Move orders forward (send, dispatch, deliver, RTO)',
    roles: ['COORDINATOR', 'MANAGER', 'FOUNDER'],
  },
  { label: 'Verify / suspend wholesalers', roles: ['MANAGER', 'FOUNDER'] },
  { label: 'Make products live, archive them', roles: ['MANAGER', 'FOUNDER'] },
  { label: 'Suspend resellers', roles: ['MANAGER', 'FOUNDER'] },
  { label: 'Mark invoices paid', roles: ['MANAGER', 'FOUNDER'] },
  { label: 'Change a wholesaler’s fee rate', roles: ['FOUNDER'] },
  { label: 'Generate invoices', roles: ['FOUNDER'] },
  { label: 'Add team members, change roles', roles: ['FOUNDER'] },
] as const

const ROLES = ['COORDINATOR', 'MANAGER', 'FOUNDER'] as const

export default async function AdminTeamPage() {
  const { user } = await requireOpsUser()

  // URL type kar ke aane wale ko crash nahi, saaf jawab — rok service mein hai,
  // ye sirf us rok ka shaista chehra hai
  if (user.role === 'COORDINATOR') {
    return (
      <div className="card p-8 text-center">
        <h1 className="text-[1.2rem] font-bold">Team</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Only managers and founders can see the team list.
        </p>
      </div>
    )
  }

  const team = await container.admin.listTeam(user)
  const canManage = user.role === 'FOUNDER'

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[1.4rem] font-bold tracking-tight">Team</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Everyone signs in with the WhatsApp number listed here — there are no passwords.
          {!canManage && ' Only the founder can add people or change roles.'}
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
                    member.role === 'FOUNDER'
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
                          role === 'FOUNDER'
                            ? `Make ${member.name} a founder? They will be able to change fee rates and generate invoices.`
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
                    {role}
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
                      {(permission.roles as readonly string[]).includes(role) ? (
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
