import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/utils/supabase/server"

function safeName(fullName: string | null, email: string) {
  if (fullName && fullName.trim()) return fullName
  return email.split("@")[0]
}

type TeamMemberRow = {
  id: string
  full_name: string | null
  email: string
  admin_role: string | null
  role: string
  is_blocked: boolean
  can_manage_questions: boolean
  can_manage_rules: boolean
  can_manage_users: boolean
  can_manage_announcements: boolean
  can_view_billing: boolean
  can_manage_coupons: boolean
  can_manage_settings: boolean
  can_view_audit_log: boolean
}

function permissionCount(member: TeamMemberRow) {
  return [
    member.can_manage_questions,
    member.can_manage_rules,
    member.can_manage_users,
    member.can_manage_announcements,
    member.can_view_billing,
    member.can_manage_coupons,
    member.can_manage_settings,
    member.can_view_audit_log,
  ].filter(Boolean).length
}

function roleTone(role: string) {
  const normalized = role.toLowerCase()

  if (normalized === "super_admin") return "bg-[#F5F0FF] text-[#6A4BBC]"
  if (normalized === "admin") return "bg-[#EEF2F7] text-[#4B5D7A]"
  if (normalized === "editor") return "bg-[#EDF7EE] text-[#2A6041]"
  return "bg-[#F3F4F6] text-[#6B7280]"
}

export default async function AdminSettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const profile = await prisma.profiles.findUnique({
    where: { id: user.id },
    select: {
      is_admin: true,
      role: true,
      admin_role: true,
      is_blocked: true,
      can_manage_settings: true,
    },
  })

  const isSuperAdmin = profile?.admin_role === "super_admin"
  const canManageSettings = isSuperAdmin || !!profile?.can_manage_settings

  if (
    !profile ||
    profile.is_blocked ||
    (!profile.is_admin && profile.role !== "admin") ||
    !canManageSettings
  ) {
    redirect("/admin")
  }

  const teamMembers = await prisma.profiles.findMany({
    where: {
      deleted_at: null,
      OR: [
        { is_admin: true },
        { role: "admin" },
        { admin_role: { not: null } },
      ],
    },
    orderBy: [
      { admin_role: "asc" },
      { created_at: "desc" },
    ],
    take: 50,
    select: {
      id: true,
      full_name: true,
      email: true,
      admin_role: true,
      role: true,
      is_blocked: true,
      can_manage_questions: true,
      can_manage_rules: true,
      can_manage_users: true,
      can_manage_announcements: true,
      can_view_billing: true,
      can_manage_coupons: true,
      can_manage_settings: true,
      can_view_audit_log: true,
    },
  })

  const totalTeamMembers = teamMembers.length
  const blockedTeamMembers = teamMembers.filter((m) => m.is_blocked).length
  const editors = teamMembers.filter((m) => (m.admin_role || "").toLowerCase() === "editor").length
  const admins = teamMembers.filter((m) =>
    ["admin", "super_admin"].includes((m.admin_role || "").toLowerCase())
  ).length

  return (
    <div className="min-w-0">
      <section className="border-b border-[#DDD7CC] bg-white px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-semibold text-[#111827]">Settings</h1>
            <p className="mt-1 text-[14px] text-[#6B7280]">
              Admin access, team controls, and platform configuration.
            </p>
          </div>

          <div className="text-right">
            <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-[#9B9B9B]">
              Access level
            </div>
            <div className="mt-1 text-[13px] font-medium text-[#111827]">
              {isSuperAdmin ? "Super Admin" : "Settings Permission"}
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-[#E6E0D4] bg-[#FCFBF8] px-6 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded bg-[#EEF2F7] px-2.5 py-1 text-[11px] text-[#4B5D7A]">
            Team {totalTeamMembers}
          </span>
          <span className="rounded bg-[#F5F0FF] px-2.5 py-1 text-[11px] text-[#6A4BBC]">
            Admins {admins}
          </span>
          <span className="rounded bg-[#EDF7EE] px-2.5 py-1 text-[11px] text-[#2A6041]">
            Editors {editors}
          </span>
          <span className="rounded bg-[#FDECEC] px-2.5 py-1 text-[11px] text-[#B44C4C]">
            Blocked {blockedTeamMembers}
          </span>
        </div>
      </section>

      <section className="bg-white">
        <div className="border-b border-[#E6E0D4] px-6 py-4">
          <div className="text-[16px] font-medium text-[#111827]">Platform Controls</div>
          <div className="mt-1 text-[12px] text-[#6B6B6B]">
            Real controls can be wired here without changing the page structure later.
          </div>
        </div>

        <div className="grid grid-cols-1 gap-0 lg:grid-cols-2">
          <div className="border-b border-r border-[#EEE8DD] px-6 py-5 lg:border-b-0">
            <div className="text-[14px] font-medium text-[#111827]">Team Access Management</div>
            <div className="mt-2 text-[13px] leading-6 text-[#6B7280]">
              Move members between teams, assign multi-team access, and define which internal groups they can view.
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                className="border border-[#DDD7CC] bg-white px-3 py-2 text-[12px] text-[#3A3A3A] hover:bg-[#F7F3EC]"
              >
                Manage Teams
              </button>
              <button
                type="button"
                className="border border-[#DDD7CC] bg-white px-3 py-2 text-[12px] text-[#3A3A3A] hover:bg-[#F7F3EC]"
              >
                Assign Access
              </button>
            </div>
          </div>

          <div className="border-b border-[#EEE8DD] px-6 py-5 lg:border-b-0">
            <div className="text-[14px] font-medium text-[#111827]">Feature and Platform Controls</div>
            <div className="mt-2 text-[13px] leading-6 text-[#6B7280]">
              Turn on billing views, announcements visibility, audit tools, and future system-level controls.
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                className="border border-[#DDD7CC] bg-white px-3 py-2 text-[12px] text-[#3A3A3A] hover:bg-[#F7F3EC]"
              >
                Billing Access
              </button>
              <button
                type="button"
                className="border border-[#DDD7CC] bg-white px-3 py-2 text-[12px] text-[#3A3A3A] hover:bg-[#F7F3EC]"
              >
                Audit Controls
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-[#E6E0D4] bg-white">
        <div className="border-b border-[#E6E0D4] px-6 py-4">
          <div className="flex flex-wrap items-center gap-3">
            <input
              readOnly
              value=""
              placeholder="Search admin member, role, permission..."
              className="w-full max-w-[420px] border border-[#DDD7CC] bg-white px-3 py-2 text-[13px] outline-none placeholder:text-[#9B9B9B]"
            />

            <button
              type="button"
              className="rounded bg-[#111111] px-3 py-2 text-[12px] font-medium text-white"
            >
              All
            </button>

            <button
              type="button"
              className="border border-[#DDD7CC] bg-white px-3 py-2 text-[12px] text-[#3A3A3A] hover:bg-[#F7F3EC]"
            >
              Super Admin
            </button>

            <button
              type="button"
              className="border border-[#DDD7CC] bg-white px-3 py-2 text-[12px] text-[#3A3A3A] hover:bg-[#F7F3EC]"
            >
              Admin
            </button>

            <button
              type="button"
              className="border border-[#DDD7CC] bg-white px-3 py-2 text-[12px] text-[#3A3A3A] hover:bg-[#F7F3EC]"
            >
              Editor
            </button>

            <button
              type="button"
              className="border border-[#DDD7CC] bg-white px-3 py-2 text-[12px] text-[#3A3A3A] hover:bg-[#F7F3EC]"
            >
              Blocked
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="border-b border-[#E6E0D4] bg-[#FBF8F2]">
              <tr className="font-mono text-[10px] uppercase tracking-[0.08em] text-[#9B9B9B]">
                <th className="px-6 py-3 font-medium">Member</th>
                <th className="px-6 py-3 font-medium">Role</th>
                <th className="px-6 py-3 font-medium">Permissions</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Access</th>
              </tr>
            </thead>

            <tbody>
              {teamMembers.map((member) => {
                const role = member.admin_role || member.role || "user"
                const perms = permissionCount(member)

                return (
                  <tr
                    key={member.id}
                    className="border-b border-[#EEE8DD] text-[14px] text-[#3A3A3A]"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#EEF2F7] text-[11px] font-semibold text-[#4B5D7A]">
                          {safeName(member.full_name, member.email)
                            .split(" ")
                            .map((p) => p[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>

                        <div className="min-w-0">
                          <div className="truncate font-medium text-[#111827]">
                            {safeName(member.full_name, member.email)}
                          </div>
                          <div className="truncate text-[12px] text-[#6B7280]">
                            {member.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded px-2 py-1 text-[12px] ${roleTone(role)}`}>
                        {role}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-[#6B7280]">
                      {perms} enabled permissions
                    </td>

                    <td className="px-6 py-4">
                      {member.is_blocked ? (
                        <span className="inline-flex rounded bg-[#FDECEC] px-2 py-1 text-[12px] text-[#B44C4C]">
                          Blocked
                        </span>
                      ) : (
                        <span className="inline-flex rounded bg-[#EDF7EE] px-2 py-1 text-[12px] text-[#2A6041]">
                          Active
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="border border-[#DDD7CC] bg-white px-3 py-1.5 text-[12px] text-[#3A3A3A] hover:bg-[#F7F3EC]"
                        >
                          Edit Access
                        </button>
                        <button
                          type="button"
                          className="border border-[#DDD7CC] bg-white px-3 py-1.5 text-[12px] text-[#3A3A3A] hover:bg-[#F7F3EC]"
                        >
                          Move Team
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="border-t border-[#E6E0D4] bg-[#FCFBF8] px-6 py-3">
        <div className="text-[12px] text-[#6B7280]">
          Settings is now a real super-admin control surface. Next step is wiring these buttons to actual role, team, and platform control actions.
        </div>
      </section>
    </div>
  )
}