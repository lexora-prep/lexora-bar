import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/utils/supabase/server"

type AuditRow = {
  id: string
  time: string
  actor: string
  action: string
  entity: string
  detail: string
  ip: string
}

function actionTone(action: string) {
  const value = action.toLowerCase()

  if (value === "create") return "bg-[#EDF7EE] text-[#2A6041]"
  if (value === "edit" || value === "update") return "bg-[#EEF2F7] text-[#4B5D7A]"
  if (value === "delete" || value === "block") return "bg-[#FDECEC] text-[#B44C4C]"
  if (value === "publish") return "bg-[#FFF4D6] text-[#9A6A00]"
  if (value === "import") return "bg-[#EEF7F0] text-[#356B47]"
  if (value === "auth") return "bg-[#F5F0FF] text-[#6A4BBC]"
  return "bg-[#F3F4F6] text-[#6B7280]"
}

export default async function AdminAuditLogPage() {
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
      can_view_audit_log: true,
    },
  })

  const canViewAudit =
    profile?.admin_role === "super_admin" || !!profile?.can_view_audit_log

  if (
    !profile ||
    profile.is_blocked ||
    (!profile.is_admin && profile.role !== "admin") ||
    !canViewAudit
  ) {
    redirect("/admin")
  }

  const rows: AuditRow[] = [
    {
      id: "1",
      time: "Today 09:42",
      actor: "Vlad L.",
      action: "Edit",
      entity: "MBEQuestion #1041",
      detail: "Updated explanation and changed difficulty from Easy to Hard",
      ip: "82.117.x.x",
    },
    {
      id: "2",
      time: "Today 08:31",
      actor: "Vlad L.",
      action: "Create",
      entity: "Coupon PREP25",
      detail: "Created 25% monthly coupon with 100 use limit",
      ip: "82.117.x.x",
    },
    {
      id: "3",
      time: "Today 06:18",
      actor: "Vlad L.",
      action: "Block",
      entity: "User [email protected]",
      detail: "Blocked account for terms violation",
      ip: "82.117.x.x",
    },
    {
      id: "4",
      time: "Today 03:05",
      actor: "Vlad L.",
      action: "Publish",
      entity: "Announcement #7",
      detail: "Published July Bar Push to announcement bar",
      ip: "82.117.x.x",
    },
    {
      id: "5",
      time: "Yesterday",
      actor: "Vlad L.",
      action: "Import",
      entity: "BLLRule batch",
      detail: "Imported 48 rules for Evidence subject",
      ip: "82.117.x.x",
    },
    {
      id: "6",
      time: "Yesterday",
      actor: "System",
      action: "Auth",
      entity: "Admin session",
      detail: "Session refreshed after token renewal",
      ip: "Internal",
    },
  ]

  return (
    <div className="min-w-0">
      <section className="border-b border-[#DDD7CC] bg-white px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-semibold text-[#111827]">Audit Log</h1>
            <p className="mt-1 text-[14px] text-[#6B7280]">
              Full change history for admin actions and system events.
            </p>
          </div>

          <button
            type="button"
            className="rounded border border-[#DDD7CC] bg-white px-4 py-2 text-[13px] text-[#3A3A3A] hover:bg-[#F7F3EC]"
          >
            Export Log
          </button>
        </div>
      </section>

      <section className="border-b border-[#E6E0D4] bg-[#FCFBF8] px-6 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <input
            readOnly
            value=""
            placeholder="Filter by user, action type, entity..."
            className="w-full max-w-[520px] border border-[#DDD7CC] bg-white px-3 py-2 text-[13px] outline-none placeholder:text-[#9B9B9B]"
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
            Create
          </button>

          <button
            type="button"
            className="border border-[#DDD7CC] bg-white px-3 py-2 text-[12px] text-[#3A3A3A] hover:bg-[#F7F3EC]"
          >
            Edit
          </button>

          <button
            type="button"
            className="border border-[#DDD7CC] bg-white px-3 py-2 text-[12px] text-[#3A3A3A] hover:bg-[#F7F3EC]"
          >
            Delete
          </button>

          <button
            type="button"
            className="border border-[#DDD7CC] bg-white px-3 py-2 text-[12px] text-[#3A3A3A] hover:bg-[#F7F3EC]"
          >
            Auth
          </button>

          <button
            type="button"
            className="border border-[#DDD7CC] bg-white px-3 py-2 text-[12px] text-[#3A3A3A] hover:bg-[#F7F3EC]"
          >
            System
          </button>
        </div>
      </section>

      <section className="bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="border-b border-[#E6E0D4] bg-[#FBF8F2]">
              <tr className="font-mono text-[10px] uppercase tracking-[0.08em] text-[#9B9B9B]">
                <th className="px-6 py-3 font-medium">Time</th>
                <th className="px-6 py-3 font-medium">Actor</th>
                <th className="px-6 py-3 font-medium">Action</th>
                <th className="px-6 py-3 font-medium">Entity</th>
                <th className="px-6 py-3 font-medium">Detail</th>
                <th className="px-6 py-3 font-medium">IP</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-[#EEE8DD] text-[14px] text-[#3A3A3A]"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-[#6B7280]">
                    {row.time}
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EEF2F7] text-[11px] font-semibold text-[#4B5D7A]">
                        {row.actor
                          .split(" ")
                          .map((p) => p[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                      <span className="font-medium text-[#111827]">{row.actor}</span>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex rounded px-2 py-1 text-[12px] ${actionTone(
                        row.action
                      )}`}
                    >
                      {row.action}
                    </span>
                  </td>

                  <td className="px-6 py-4 font-medium text-[#111827]">{row.entity}</td>

                  <td className="px-6 py-4 text-[#6B7280]">{row.detail}</td>

                  <td className="px-6 py-4 text-[#9B9B9B] whitespace-nowrap">{row.ip}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}