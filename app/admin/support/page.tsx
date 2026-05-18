import { prisma } from "@/lib/prisma"
import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

type SupportStatus = "open" | "pending" | "resolved" | "closed"

const allowedStatuses: SupportStatus[] = ["open", "pending", "resolved", "closed"]

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(value)
}

function cleanString(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return ""
  return value.trim()
}

function statusClass(status: string) {
  const normalized = status.toLowerCase()

  if (normalized === "resolved") {
    return "bg-[#EDF7EE] text-[#2A6041]"
  }

  if (normalized === "closed") {
    return "bg-[#F3F4F6] text-[#6B7280]"
  }

  if (normalized === "pending") {
    return "bg-[#FFF4D6] text-[#9A6A00]"
  }

  return "bg-[#EAF2FF] text-[#2F5C9F]"
}

function priorityClass(priority: string) {
  const normalized = priority.toLowerCase()

  if (normalized === "high") {
    return "bg-[#FDECEC] text-[#B44C4C]"
  }

  return "bg-[#F3F4F6] text-[#6B7280]"
}

async function getCurrentAdmin() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const profile = await prisma.profiles.findUnique({
    where: {
      id: user.id,
    },
    select: {
      id: true,
      email: true,
      full_name: true,
      is_admin: true,
      role: true,
      admin_role: true,
      is_blocked: true,
      can_view_billing: true,
      can_manage_users: true,
      can_view_audit_log: true,
    },
  })

  if (
    !profile ||
    profile.is_blocked ||
    (!profile.is_admin && profile.role !== "admin")
  ) {
    redirect("/dashboard")
  }

  const isSuperAdmin = profile.admin_role === "super_admin"
  const canViewSupport =
    isSuperAdmin ||
    !!profile.can_view_billing ||
    !!profile.can_manage_users ||
    !!profile.can_view_audit_log

  if (!canViewSupport) {
    redirect("/admin")
  }

  return {
    id: profile.id,
    email: profile.email,
    fullName: profile.full_name,
    isSuperAdmin,
  }
}

export default async function AdminSupportPage() {
  const admin = await getCurrentAdmin()

  async function replyToTicket(formData: FormData) {
    "use server"

    await getCurrentAdmin()

    const ticketId = cleanString(formData.get("ticketId"))
    const message = cleanString(formData.get("message"))

    if (!ticketId || !message) {
      redirect("/admin/support")
    }

    const ticket = await prisma.support_tickets.findUnique({
      where: {
        id: ticketId,
      },
      select: {
        id: true,
      },
    })

    if (!ticket) {
      redirect("/admin/support")
    }

    await prisma.support_ticket_messages.create({
      data: {
        ticket_id: ticket.id,
        sender: "support",
        message,
      },
    })

    await prisma.support_tickets.update({
      where: {
        id: ticket.id,
      },
      data: {
        status: "pending",
        updated_at: new Date(),
      },
    })

    revalidatePath("/admin/support")
  }

  async function updateTicketStatus(formData: FormData) {
    "use server"

    await getCurrentAdmin()

    const ticketId = cleanString(formData.get("ticketId"))
    const rawStatus = cleanString(formData.get("status")).toLowerCase()
    const status = allowedStatuses.includes(rawStatus as SupportStatus)
      ? (rawStatus as SupportStatus)
      : "open"

    if (!ticketId) {
      redirect("/admin/support")
    }

    await prisma.support_tickets.update({
      where: {
        id: ticketId,
      },
      data: {
        status,
        updated_at: new Date(),
      },
    })

    revalidatePath("/admin/support")
  }

  const [tickets, openCount, pendingCount, resolvedCount, closedCount] =
    await Promise.all([
      prisma.support_tickets.findMany({
        orderBy: {
          updated_at: "desc",
        },
        take: 50,
        include: {
          messages: {
            orderBy: {
              created_at: "asc",
            },
          },
        },
      }),

      prisma.support_tickets.count({
        where: {
          status: "open",
        },
      }),

      prisma.support_tickets.count({
        where: {
          status: "pending",
        },
      }),

      prisma.support_tickets.count({
        where: {
          status: "resolved",
        },
      }),

      prisma.support_tickets.count({
        where: {
          status: "closed",
        },
      }),
    ])

  return (
    <div className="min-w-0">
      <section className="border-b border-[#DDD7CC] bg-white px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-semibold text-[#111827]">
              Support Tickets
            </h1>
            <p className="mt-1 text-[14px] text-[#6B7280]">
              Review customer support requests, reply to users, and update ticket status.
            </p>
          </div>

          <div className="text-right">
            <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-[#9B9B9B]">
              Admin
            </div>
            <div className="mt-1 text-[13px] font-medium text-[#111827]">
              {admin.fullName || admin.email}
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-[#E6E0D4] bg-[#FCFBF8] px-6 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded bg-[#EAF2FF] px-2.5 py-1 text-[11px] text-[#2F5C9F]">
            Open {openCount}
          </span>
          <span className="rounded bg-[#FFF4D6] px-2.5 py-1 text-[11px] text-[#9A6A00]">
            Pending {pendingCount}
          </span>
          <span className="rounded bg-[#EDF7EE] px-2.5 py-1 text-[11px] text-[#2A6041]">
            Resolved {resolvedCount}
          </span>
          <span className="rounded bg-[#F3F4F6] px-2.5 py-1 text-[11px] text-[#6B7280]">
            Closed {closedCount}
          </span>
        </div>
      </section>

      <section className="bg-[#F7F3EA] px-6 py-6">
        <div className="mx-auto max-w-[1400px] space-y-4">
          {tickets.length === 0 ? (
            <div className="border border-[#DDD7CC] bg-white px-6 py-10 text-center">
              <div className="text-[16px] font-semibold text-[#111827]">
                No support tickets yet
              </div>
              <div className="mt-1 text-[13px] text-[#6B7280]">
                User support requests will appear here after they are submitted.
              </div>
            </div>
          ) : (
            tickets.map((ticket) => (
              <div
                key={ticket.id}
                className="overflow-hidden border border-[#DDD7CC] bg-white shadow-sm"
              >
                <div className="border-b border-[#E8E1D6] bg-[#FBF8F2] px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-[16px] font-semibold text-[#111827]">
                          {ticket.subject}
                        </h2>

                        <span
                          className={`rounded px-2.5 py-1 text-[11px] font-medium ${statusClass(
                            ticket.status,
                          )}`}
                        >
                          {ticket.status}
                        </span>

                        <span
                          className={`rounded px-2.5 py-1 text-[11px] font-medium ${priorityClass(
                            ticket.priority,
                          )}`}
                        >
                          {ticket.priority}
                        </span>
                      </div>

                      <div className="mt-2 text-[12px] text-[#6B7280]">
                        {ticket.email} · {ticket.category} · Created{" "}
                        {formatDateTime(ticket.created_at)} · Updated{" "}
                        {formatDateTime(ticket.updated_at)}
                      </div>
                    </div>

                    <form action={updateTicketStatus} className="flex items-center gap-2">
                      <input type="hidden" name="ticketId" value={ticket.id} />

                      <select
                        name="status"
                        defaultValue={ticket.status}
                        className="h-9 rounded border border-[#D8D2C8] bg-white px-3 text-[13px] text-[#111827] outline-none focus:border-[#111827]"
                      >
                        <option value="open">Open</option>
                        <option value="pending">Pending</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                      </select>

                      <button
                        type="submit"
                        className="h-9 rounded bg-[#111827] px-3 text-[12px] font-semibold text-white hover:bg-[#374151]"
                      >
                        Update
                      </button>
                    </form>
                  </div>
                </div>

                <div className="divide-y divide-[#EEE8DD]">
                  {ticket.messages.map((message) => {
                    const isSupport = message.sender.toLowerCase() === "support"

                    return (
                      <div
                        key={message.id}
                        className={`px-5 py-4 ${
                          isSupport ? "bg-[#F3F7FF]" : "bg-white"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div
                            className={`font-mono text-[10px] uppercase tracking-[0.1em] ${
                              isSupport ? "text-[#2F5C9F]" : "text-[#8E96A3]"
                            }`}
                          >
                            {isSupport ? "Support" : "User"}
                          </div>

                          <div className="text-[11px] text-[#8E96A3]">
                            {formatDateTime(message.created_at)}
                          </div>
                        </div>

                        <div className="mt-2 whitespace-pre-wrap text-[14px] leading-6 text-[#374151]">
                          {message.message}
                        </div>
                      </div>
                    )
                  })}
                </div>

                <form action={replyToTicket} className="border-t border-[#E8E1D6] bg-[#FCFBF8] px-5 py-4">
                  <input type="hidden" name="ticketId" value={ticket.id} />

                  <label className="block font-mono text-[10px] uppercase tracking-[0.1em] text-[#8E96A3]">
                    Reply as support
                  </label>

                  <textarea
                    name="message"
                    rows={3}
                    placeholder="Write a reply to the user..."
                    className="mt-2 w-full resize-none rounded border border-[#D8D2C8] bg-white px-3 py-2 text-[13px] leading-5 text-[#111827] outline-none placeholder:text-[#9CA3AF] focus:border-[#111827]"
                  />

                  <div className="mt-3 flex justify-end">
                    <button
                      type="submit"
                      className="rounded bg-[#111827] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#374151]"
                    >
                      Send reply
                    </button>
                  </div>
                </form>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  )
}