"use client"

import { Shield, Users, Wrench } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

type TeamMember = {
  id: string
  email: string
  full_name: string | null
  role: string
  admin_role: string | null
  is_admin: boolean
  is_blocked: boolean
  can_manage_questions: boolean
  can_manage_rules: boolean
  can_manage_users: boolean
  can_manage_announcements: boolean
  can_view_billing: boolean
  can_manage_coupons: boolean
  can_manage_settings: boolean
  can_view_audit_log: boolean
  created_at: string
}

function safeName(fullName: string | null, email: string) {
  if (fullName && fullName.trim()) return fullName
  return email.split("@")[0]
}

function getInitials(fullName: string | null, email: string) {
  const base = safeName(fullName, email)
  const parts = base.split(" ").filter(Boolean)
  return (
    parts
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() || "")
      .join("") || "A"
  )
}

function roleTone(role: string | null, fallbackRole: string) {
  const finalRole = (role || fallbackRole || "user").toLowerCase()

  if (finalRole === "super_admin") {
    return "bg-violet-50 text-violet-700 ring-violet-200"
  }
  if (finalRole === "editor") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200"
  }
  if (finalRole === "admin") {
    return "bg-indigo-50 text-indigo-700 ring-indigo-200"
  }
  return "bg-slate-100 text-slate-600 ring-slate-200"
}

function permissionSummary(member: TeamMember) {
  const count = [
    member.can_manage_questions,
    member.can_manage_rules,
    member.can_manage_users,
    member.can_manage_announcements,
    member.can_view_billing,
    member.can_manage_coupons,
    member.can_manage_settings,
    member.can_view_audit_log,
  ].filter(Boolean).length

  return count
}

export default function AdminTeamPage() {
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [team, setTeam] = useState<TeamMember[]>([])

  useEffect(() => {
    void loadTeam()
  }, [])

  const sortedTeam = useMemo(() => {
    return [...team].sort((a, b) => {
      const rank = (value: string | null) => {
        if (value === "super_admin") return 0
        if (value === "admin") return 1
        if (value === "editor") return 2
        return 3
      }

      const diff = rank(a.admin_role) - rank(b.admin_role)
      if (diff !== 0) return diff

      return safeName(a.full_name, a.email).localeCompare(safeName(b.full_name, b.email))
    })
  }, [team])

  async function loadTeam() {
    try {
      setLoading(true)
      setError("")

      const res = await fetch("/api/admin/team", {
        cache: "no-store",
      })

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        setError(data?.error || "Failed to load team.")
        return
      }

      setTeam(Array.isArray(data?.team) ? data.team : [])
    } catch (err) {
      console.error("LOAD TEAM ERROR:", err)
      setError("Something went wrong while loading the team.")
    } finally {
      setLoading(false)
    }
  }

  function updateMember(id: string, patch: Partial<TeamMember>) {
    setTeam((prev) =>
      prev.map((member) => (member.id === id ? { ...member, ...patch } : member))
    )
  }

  async function saveMember(member: TeamMember) {
    if (member.admin_role === "super_admin") {
      setError("Super admin is protected and cannot be edited from this screen.")
      return
    }

    try {
      setSavingId(member.id)
      setError("")
      setSuccess("")

      const res = await fetch(`/api/admin/team/${member.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          admin_role: member.admin_role,
          can_manage_questions: member.can_manage_questions,
          can_manage_rules: member.can_manage_rules,
          can_manage_users: member.can_manage_users,
          can_manage_announcements: member.can_manage_announcements,
          can_view_billing: member.can_view_billing,
          can_manage_coupons: member.can_manage_coupons,
          can_manage_settings: member.can_manage_settings,
          can_view_audit_log: member.can_view_audit_log,
        }),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok || !data?.ok) {
        setError(data?.error || "Failed to update team member.")
        return
      }

      setSuccess("Team member updated successfully.")
      await loadTeam()
    } catch (err) {
      console.error("SAVE TEAM MEMBER ERROR:", err)
      setError("Something went wrong while saving team member.")
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="px-6 py-6">
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-5 grid gap-4 xl:grid-cols-[1.2fr_0.8fr_0.8fr]">
          <section className="rounded-[24px] border border-[#E6EAF0] bg-white px-5 py-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EEF2FF] text-[#4F46E5]">
                <Users size={18} />
              </div>
              <div>
                <div className="text-[18px] font-semibold text-[#111827]">Team Management</div>
                <div className="mt-1 text-[13px] text-[#667085]">
                  Review admin users, roles, and permission access.
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[24px] border border-[#E6EAF0] bg-white px-5 py-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#98A2B3]">
              Team Members
            </div>
            <div className="mt-2 text-[30px] font-semibold leading-none text-[#111827]">
              {loading ? "..." : sortedTeam.length}
            </div>
            <div className="mt-2 text-[13px] text-[#667085]">Active admins in the system</div>
          </section>

          <section className="rounded-[24px] border border-[#E6EAF0] bg-white px-5 py-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#98A2B3]">
              Protected
            </div>
            <div className="mt-2 text-[30px] font-semibold leading-none text-[#111827]">
              {loading
                ? "..."
                : sortedTeam.filter((member) => member.admin_role === "super_admin").length}
            </div>
            <div className="mt-2 text-[13px] text-[#667085]">Super admin accounts</div>
          </section>
        </div>

        {error ? (
          <div className="mb-4 rounded-[20px] border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-[13px] text-[#B91C1C]">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="mb-4 rounded-[20px] border border-[#BBF7D0] bg-[#F0FDF4] px-4 py-3 text-[13px] text-[#15803D]">
            {success}
          </div>
        ) : null}

        <section className="overflow-hidden rounded-[28px] border border-[#E6EAF0] bg-white shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
          <div className="flex items-center justify-between border-b border-[#E6EAF0] px-5 py-4">
            <div>
              <div className="text-[15px] font-semibold text-[#111827]">Team Members</div>
              <div className="mt-0.5 text-[13px] text-[#667085]">
                Edit admin roles and permission sets.
              </div>
            </div>

            <div className="text-[12px] text-[#98A2B3]">
              {loading ? "Loading..." : `${sortedTeam.length} admins`}
            </div>
          </div>

          {loading ? (
            <div className="px-5 py-5 text-[13px] text-[#667085]">Loading team...</div>
          ) : sortedTeam.length === 0 ? (
            <div className="px-5 py-5 text-[13px] text-[#667085]">No admin users found.</div>
          ) : (
            <div className="divide-y divide-[#E6EAF0]">
              {sortedTeam.map((member) => {
                const isProtectedSuperAdmin = member.admin_role === "super_admin"
                const currentRole = member.admin_role || member.role || "user"
                const permissionCount = permissionSummary(member)

                return (
                  <div key={member.id} className="px-5 py-5">
                    <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)_120px]">
                      <div className="min-w-0">
                        <div className="flex items-start gap-3">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#8B5CF6] to-[#60A5FA] text-[12px] font-semibold text-white">
                            {getInitials(member.full_name, member.email)}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[15px] font-semibold text-[#111827]">
                              {safeName(member.full_name, member.email)}
                            </div>
                            <div className="mt-1 truncate text-[13px] text-[#667085]">
                              {member.email}
                            </div>

                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              <span
                                className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.06em] ring-1 ${roleTone(
                                  member.admin_role,
                                  member.role
                                )}`}
                              >
                                {currentRole}
                              </span>

                              {isProtectedSuperAdmin ? (
                                <span className="rounded-full bg-[#F5F3FF] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-[#7C3AED] ring-1 ring-[#DDD6FE]">
                                  Protected
                                </span>
                              ) : null}

                              {member.is_blocked ? (
                                <span className="rounded-full bg-[#FEF2F2] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-[#DC2626] ring-1 ring-[#FECACA]">
                                  Blocked
                                </span>
                              ) : (
                                <span className="rounded-full bg-[#F0FDF4] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-[#16A34A] ring-1 ring-[#BBF7D0]">
                                  Active
                                </span>
                              )}
                            </div>

                            <div className="mt-3 text-[12px] text-[#98A2B3]">
                              Created: {new Date(member.created_at).toLocaleDateString()}
                            </div>

                            <div className="mt-2 inline-flex items-center gap-2 text-[12px] text-[#667085]">
                              <Shield size={13} />
                              <span>{permissionCount} permissions enabled</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="min-w-0">
                        <div className="mb-3 flex items-center gap-2">
                          <Wrench size={14} className="text-[#667085]" />
                          <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#98A2B3]">
                            Permissions
                          </div>
                        </div>

                        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                          <ToggleRow
                            label="Questions"
                            checked={member.can_manage_questions}
                            disabled={isProtectedSuperAdmin}
                            onChange={(value) =>
                              updateMember(member.id, { can_manage_questions: value })
                            }
                          />
                          <ToggleRow
                            label="Rules"
                            checked={member.can_manage_rules}
                            disabled={isProtectedSuperAdmin}
                            onChange={(value) =>
                              updateMember(member.id, { can_manage_rules: value })
                            }
                          />
                          <ToggleRow
                            label="Users"
                            checked={member.can_manage_users}
                            disabled={isProtectedSuperAdmin}
                            onChange={(value) =>
                              updateMember(member.id, { can_manage_users: value })
                            }
                          />
                          <ToggleRow
                            label="Announcements"
                            checked={member.can_manage_announcements}
                            disabled={isProtectedSuperAdmin}
                            onChange={(value) =>
                              updateMember(member.id, { can_manage_announcements: value })
                            }
                          />
                          <ToggleRow
                            label="Billing"
                            checked={member.can_view_billing}
                            disabled={isProtectedSuperAdmin}
                            onChange={(value) =>
                              updateMember(member.id, { can_view_billing: value })
                            }
                          />
                          <ToggleRow
                            label="Coupons"
                            checked={member.can_manage_coupons}
                            disabled={isProtectedSuperAdmin}
                            onChange={(value) =>
                              updateMember(member.id, { can_manage_coupons: value })
                            }
                          />
                          <ToggleRow
                            label="Settings"
                            checked={member.can_manage_settings}
                            disabled={isProtectedSuperAdmin}
                            onChange={(value) =>
                              updateMember(member.id, { can_manage_settings: value })
                            }
                          />
                          <ToggleRow
                            label="Audit Log"
                            checked={member.can_view_audit_log}
                            disabled={isProtectedSuperAdmin}
                            onChange={(value) =>
                              updateMember(member.id, { can_view_audit_log: value })
                            }
                          />
                        </div>
                      </div>

                      <div className="min-w-[120px]">
                        <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#98A2B3]">
                          Admin Role
                        </label>

                        <select
                          value={member.admin_role || "user"}
                          disabled={isProtectedSuperAdmin}
                          onChange={(e) =>
                            updateMember(member.id, { admin_role: e.target.value })
                          }
                          className="w-full rounded-2xl border border-[#E6EAF0] bg-white px-3 py-2.5 text-[13px] text-[#111827] outline-none transition focus:border-[#A5B4FC] disabled:cursor-not-allowed disabled:bg-[#F8FAFC] disabled:text-[#98A2B3]"
                        >
                          <option value="super_admin">super_admin</option>
                          <option value="admin">admin</option>
                          <option value="editor">editor</option>
                          <option value="user">user</option>
                        </select>

                        <div className="mt-4">
                          {isProtectedSuperAdmin ? (
                            <div className="rounded-2xl border border-[#E6EAF0] bg-[#F8FAFC] px-3 py-2.5 text-center text-[12px] font-medium text-[#98A2B3]">
                              Protected
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => saveMember(member)}
                              disabled={savingId === member.id}
                              className="w-full rounded-2xl bg-[#111827] px-3 py-2.5 text-[12px] font-medium text-white transition hover:bg-[#1F2937] disabled:opacity-60"
                            >
                              {savingId === member.id ? "Saving..." : "Save"}
                            </button>
                          )}
                        </div>

                        {isProtectedSuperAdmin ? (
                          <div className="mt-3 text-[11px] leading-5 text-[#98A2B3]">
                            Super admin access is fixed and always full.
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function ToggleRow({
  label,
  checked,
  disabled = false,
  onChange,
}: {
  label: string
  checked: boolean
  disabled?: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <label
      className={`flex items-center justify-between rounded-2xl border px-3 py-2.5 transition ${
        disabled
          ? "border-[#E6EAF0] bg-[#F8FAFC]"
          : checked
          ? "border-[#C7D2FE] bg-[#EEF2FF]"
          : "border-[#E6EAF0] bg-white hover:border-[#D0D5DD]"
      }`}
    >
      <span
        className={`text-[12px] ${
          disabled
            ? "text-[#98A2B3]"
            : checked
            ? "font-medium text-[#4338CA]"
            : "text-[#344054]"
        }`}
      >
        {label}
      </span>

      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-[#4F46E5]"
      />
    </label>
  )
}