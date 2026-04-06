"use client"

import { Download, Search, UserPlus } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

type AdminUser = {
  id: string
  email: string
  full_name: string | null
  law_school: string | null
  jurisdiction: string | null
  exam_month: number | null
  exam_year: number | null
  subscription_tier: string | null
  mbe_access: boolean
  role: string
  admin_role?: string | null
  is_admin: boolean
  is_blocked: boolean
  pending_deletion: boolean
  deletion_requested_at: string | null
  created_at: string
  updated_at: string
  account_age_days?: number
  last_active_at?: string | null
}

function safeName(fullName: string | null, email: string) {
  if (fullName && fullName.trim()) return fullName
  return email.split("@")[0]
}

function initials(fullName: string | null, email: string) {
  return safeName(fullName, email)
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

function avatarStyle(seed: string): React.CSSProperties {
  const map: Record<string, React.CSSProperties> = {
    MC: { background: "linear-gradient(135deg, #6c72ff, #818cf8)", color: "#ffffff" },
    SK: { background: "linear-gradient(135deg, #4ade80, #22d3ee)", color: "#052e16" },
    JP: { background: "linear-gradient(135deg, #f97316, #eab308)", color: "#ffffff" },
    AL: { background: "linear-gradient(135deg, #e879f9, #a855f7)", color: "#ffffff" },
    TR: { background: "linear-gradient(135deg, #22d3ee, #6366f1)", color: "#ffffff" },
    HS: { background: "linear-gradient(135deg, #f472b6, #fb7185)", color: "#ffffff" },
    CR: { background: "linear-gradient(135deg, #34d399, #10b981)", color: "#ffffff" },
    VL: { background: "linear-gradient(135deg, #6c72ff, #e879f9)", color: "#ffffff" },
    A2: { background: "linear-gradient(135deg, #6c72ff, #818cf8)", color: "#ffffff" },
    AD: { background: "linear-gradient(135deg, #6c72ff, #e879f9)", color: "#ffffff" },
    VO: { background: "linear-gradient(135deg, #6c72ff, #818cf8)", color: "#ffffff" },
    VV: { background: "linear-gradient(135deg, #6c72ff, #818cf8)", color: "#ffffff" },
  }

  return map[seed] || { background: "linear-gradient(135deg, #6c72ff, #818cf8)", color: "#ffffff" }
}

function planStyle(plan: string): React.CSSProperties {
  const normalized = plan.toLowerCase()

  if (normalized === "enterprise") {
    return {
      color: "#a855f7",
      border: "1px solid rgba(168,85,247,0.30)",
      background: "rgba(168,85,247,0.08)",
    }
  }

  if (
    normalized === "pro" ||
    normalized === "premium" ||
    normalized === "pro_monthly" ||
    normalized === "pro_annual"
  ) {
    return {
      color: "#4f46e5",
      border: "1px solid rgba(79,70,229,0.28)",
      background: "rgba(79,70,229,0.07)",
    }
  }

  return {
    color: "#6b7280",
    border: "1px solid rgba(15,23,42,0.08)",
    background: "#f3f4f6",
  }
}

function getStatus(user: AdminUser) {
  const plan = (user.subscription_tier || "free").toLowerCase()

  if (user.is_blocked) {
    return {
      label: "Churned",
      style: {
        background: "rgba(239,68,68,0.10)",
        color: "#dc2626",
      } as React.CSSProperties,
    }
  }

  if (user.pending_deletion) {
    return {
      label: "Cancelled",
      style: {
        background: "rgba(249,115,22,0.10)",
        color: "#ea580c",
      } as React.CSSProperties,
    }
  }

  if (plan === "trial") {
    return {
      label: "Trial",
      style: {
        background: "rgba(79,70,229,0.10)",
        color: "#4f46e5",
      } as React.CSSProperties,
    }
  }

  if (plan === "paused") {
    return {
      label: "Paused",
      style: {
        background: "rgba(234,179,8,0.12)",
        color: "#ca8a04",
      } as React.CSSProperties,
    }
  }

  if (
    ["premium", "pro", "pro_monthly", "pro_annual", "monthly", "annual", "enterprise"].includes(
      plan
    )
  ) {
    return {
      label: "Active",
      style: {
        background: "rgba(34,197,94,0.10)",
        color: "#16a34a",
      } as React.CSSProperties,
    }
  }

  return {
    label: "Free",
    style: {
      background: "#f3f4f6",
      color: "#6b7280",
    } as React.CSSProperties,
  }
}

function formatRelative(dateString?: string | null) {
  if (!dateString) return "—"

  const date = new Date(dateString)
  const diffMs = Date.now() - date.getTime()
  const mins = Math.floor(diffMs / 60000)

  if (mins < 1) return "Just now"
  if (mins < 60) return `${mins} min ago`

  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`

  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} day${days > 1 ? "s" : ""} ago`

  const months = Math.floor(days / 30)
  if (months < 12) return `${months} month${months > 1 ? "s" : ""} ago`

  const years = Math.floor(months / 12)
  return `${years} year${years > 1 ? "s" : ""} ago`
}

export default function AdminUsersPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState("all")
  const [plan, setPlan] = useState("all")
  const [users, setUsers] = useState<AdminUser[]>([])

  const queryString = useMemo(() => {
    const params = new URLSearchParams()

    if (query.trim()) params.set("q", query.trim())
    if (status !== "all") params.set("status", status)
    if (plan !== "all") params.set("plan", plan)

    return params.toString()
  }, [query, status, plan])

  useEffect(() => {
    void loadUsers()
  }, [queryString])

  async function loadUsers() {
    try {
      setLoading(true)
      setError("")

      const res = await fetch(`/api/admin/users${queryString ? `?${queryString}` : ""}`, {
        cache: "no-store",
      })

      const data = await res.json().catch(() => null)

      if (!res.ok || !data?.ok) {
        setError(data?.error || "Failed to load users.")
        setUsers([])
        return
      }

      setUsers(Array.isArray(data?.users) ? data.users : [])
    } catch (err) {
      console.error("LOAD ADMIN USERS ERROR:", err)
      setError("Something went wrong while loading users.")
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  function exportCsv() {
    if (users.length === 0) return

    const rows = [
      ["name", "email", "plan", "status", "jurisdiction", "law_school", "last_active"],
      ...users.map((user) => [
        safeName(user.full_name, user.email),
        user.email,
        user.subscription_tier || "free",
        getStatus(user).label,
        user.jurisdiction || "",
        user.law_school || "",
        user.last_active_at || user.updated_at || "",
      ]),
    ]

    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n")

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "users-export.csv"
    link.click()
    URL.revokeObjectURL(url)
  }

  const counts = useMemo(() => {
    const all = users.length
    const active = users.filter((u) => getStatus(u).label === "Active").length
    const trial = users.filter((u) => getStatus(u).label === "Trial").length
    const churned = users.filter((u) => getStatus(u).label === "Churned").length
    return { all, active, trial, churned }
  }, [users])

  return (
    <div
      className="min-h-[calc(100vh-64px)] overflow-hidden"
      style={{ background: "#f7f7f5", color: "#111827" }}
    >
      <div
        className="flex h-14 items-center gap-4 px-6"
        style={{
          background: "#f7f7f5",
          borderBottom: "1px solid rgba(15,23,42,0.08)",
        }}
      >
        <div>
          <div className="text-[15px] font-semibold">User Management</div>
          <div className="mt-px text-[12px]" style={{ color: "#6b7280" }}>
            {loading ? "Loading users..." : `${users.length.toLocaleString()} total accounts`}
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div
            className="flex h-11 w-[340px] items-center gap-2 rounded-lg px-3"
            style={{
              background: "#ffffff",
              border: "1px solid rgba(15,23,42,0.10)",
            }}
          >
            <Search className="h-4 w-4" style={{ color: "#6b7280" }} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search users..."
              className="w-full border-0 bg-transparent text-[13px] outline-none"
              style={{ color: "#111827" }}
            />
          </div>

          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex h-11 items-center gap-2 rounded-lg px-4 text-[12.5px] font-medium transition"
            style={{
              color: "#374151",
              border: "1px solid rgba(15,23,42,0.10)",
              background: "#ffffff",
            }}
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>

          <button
            type="button"
            className="inline-flex h-11 items-center gap-2 rounded-lg px-4 text-[12.5px] font-medium text-white transition"
            style={{ background: "#6c72ff" }}
          >
            <UserPlus className="h-4 w-4" />
            Invite User
          </button>
        </div>
      </div>

      <div className="p-5">
        {error ? (
          <div
            className="mb-4 rounded-[10px] px-4 py-3 text-[13px]"
            style={{
              border: "1px solid rgba(239,68,68,0.18)",
              background: "rgba(239,68,68,0.06)",
              color: "#dc2626",
            }}
          >
            {error}
          </div>
        ) : null}

        <div className="mb-4 flex items-center gap-2">
          <div
            className="flex gap-[2px] rounded-lg p-[3px]"
            style={{
              background: "#ffffff",
              border: "1px solid rgba(15,23,42,0.08)",
            }}
          >
            {[
              { value: "all", label: `All (${counts.all})` },
              { value: "active", label: `Active (${counts.active})` },
              { value: "trial", label: `Trial (${counts.trial})` },
              { value: "churned", label: `Churned (${counts.churned})` },
            ].map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setStatus(item.value)}
                className="rounded-md px-4 py-[7px] text-[12.5px] transition"
                style={
                  status === item.value
                    ? {
                        background: "#f3f4f6",
                        color: "#111827",
                        fontWeight: 500,
                      }
                    : {
                        color: "#6b7280",
                      }
                }
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4 hidden">
          <select value={plan} onChange={(e) => setPlan(e.target.value)} />
        </div>

        <div
          className="overflow-hidden rounded-xl"
          style={{
            background: "#fbfbfa",
            border: "1px solid rgba(15,23,42,0.08)",
          }}
        >
          <div
            className="grid px-5 py-4"
            style={{
              gridTemplateColumns: "2.4fr 1.4fr 1.3fr 1fr 1.4fr 1fr",
              borderBottom: "1px solid rgba(15,23,42,0.08)",
            }}
          >
            {["User", "Plan", "Status", "MRR", "Last Active", "Actions"].map((label) => (
              <div
                key={label}
                className="text-[11px] uppercase tracking-[0.5px]"
                style={{
                  color: "#6b7280",
                  fontFamily: '"DM Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
                }}
              >
                {label}
              </div>
            ))}
          </div>

          {loading ? (
            <div className="px-5 py-8 text-[13px]" style={{ color: "#6b7280" }}>
              Loading users...
            </div>
          ) : users.length === 0 ? (
            <div className="px-5 py-8 text-[13px]" style={{ color: "#6b7280" }}>
              No users found.
            </div>
          ) : (
            <div>
              {users.map((user) => {
                const name = safeName(user.full_name, user.email)
                const avatar = initials(user.full_name, user.email)
                const planValue = user.subscription_tier?.trim() || "free"
                const statusInfo = getStatus(user)

                const mrrValue =
                  planValue.toLowerCase() === "enterprise"
                    ? "$2,400"
                    : ["pro", "premium", "pro_monthly", "pro_annual", "monthly", "annual"].includes(
                        planValue.toLowerCase()
                      )
                    ? "$149"
                    : "$0"

                return (
                  <div
                    key={user.id}
                    className="grid items-center px-5 py-[18px] last:border-b-0"
                    style={{
                      gridTemplateColumns: "2.4fr 1.4fr 1.3fr 1fr 1.4fr 1fr",
                      borderBottom: "1px solid rgba(15,23,42,0.08)",
                    }}
                  >
                    <div className="min-w-0 pr-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold"
                          style={avatarStyle(avatar)}
                        >
                          {avatar}
                        </div>

                        <div className="min-w-0">
                          <div className="truncate text-[13px] font-medium" style={{ color: "#111827" }}>
                            {name}
                          </div>
                          <div className="truncate text-[11.5px]" style={{ color: "#6b7280" }}>
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <span
                        className="inline-flex rounded-[4px] px-[7px] py-[2px] text-[10.5px] capitalize"
                        style={{
                          ...planStyle(planValue),
                          fontFamily: '"DM Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
                        }}
                      >
                        {planValue}
                      </span>
                    </div>

                    <div>
                      <span
                        className="inline-flex items-center gap-[5px] rounded-[5px] px-[8px] py-[3px] text-[11px] font-medium"
                        style={statusInfo.style}
                      >
                        <span className="h-[5px] w-[5px] rounded-full bg-current" />
                        {statusInfo.label}
                      </span>
                    </div>

                    <div
                      className="text-[12.5px] font-medium"
                      style={{
                        color: "#111827",
                        fontFamily: '"DM Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
                      }}
                    >
                      {mrrValue}
                    </div>

                    <div className="text-[12px]" style={{ color: "#6b7280" }}>
                      {formatRelative(user.last_active_at || user.updated_at)}
                    </div>

                    <div>
                      <button
                        type="button"
                        className="rounded-[7px] px-4 py-[7px] text-[11px] transition"
                        style={{
                          border: "1px solid rgba(15,23,42,0.10)",
                          background: "#ffffff",
                          color: "#374151",
                        }}
                      >
                        View
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}