"use client"

import Link from "next/link"
import { useMemo, useState, useTransition } from "react"
import {
  BarChart3,
  Bell,
  Check,
  FileText,
  Filter,
  Grid2X2,
  Inbox,
  LinkIcon,
  Menu,
  MessageSquare,
  MoreVertical,
  Paperclip,
  Search,
  Send,
  Settings,
  SlidersHorizontal,
  UserRound,
  Users,
  X,
} from "lucide-react"

type SupportMessage = {
  id: string
  sender: string
  message: string
  created_at: string
}

export type SupportTicketForWorkbench = {
  id: string
  email: string
  subject: string
  category: string
  status: string
  priority: string
  created_at: string
  updated_at: string
  userPlan: string
  memberSince: string
  messages: SupportMessage[]
}

type AdminInfo = {
  id: string
  email: string
  fullName: string | null
}

type Counts = {
  open: number
  pending: number
  resolved: number
  closed: number
  all: number
}

type Props = {
  admin: AdminInfo
  tickets: SupportTicketForWorkbench[]
  counts: Counts
  replyAction: (formData: FormData) => Promise<void>
  updateStatusAction: (formData: FormData) => Promise<void>
  updatePriorityAction: (formData: FormData) => Promise<void>
}

const statusOptions = ["open", "pending", "resolved", "closed"]
const priorityOptions = ["normal", "high"]

function formatShortTime(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return ""

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date)
}

function formatDate(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return "Not available"

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date)
}

function formatDateTime(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return "Not available"

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date)
}

function safeInitials(email: string) {
  const local = email.split("@")[0] || "U"
  return local.slice(0, 2).toUpperCase()
}

function normalizeStatus(value: string) {
  const status = value.toLowerCase()

  if (status === "resolved") return "resolved"
  if (status === "closed") return "closed"
  if (status === "pending") return "pending"

  return "open"
}

function normalizePriority(value: string) {
  return value.toLowerCase() === "high" ? "high" : "normal"
}

function statusLabel(value: string) {
  const status = normalizeStatus(value)

  if (status === "resolved") return "Resolved"
  if (status === "closed") return "Closed"
  if (status === "pending") return "Pending"

  return "Open"
}

function priorityLabel(value: string) {
  return normalizePriority(value) === "high" ? "High" : "Normal"
}

function getPreview(ticket: SupportTicketForWorkbench) {
  const last = ticket.messages[ticket.messages.length - 1]
  return last?.message || "No message yet."
}

function ticketNumber(index: number) {
  if (index < 0) return "#TKT-0000"
  return `#TKT-${String(index + 1).padStart(4, "0")}`
}

function StatusPill({ status }: { status: string }) {
  const normalized = normalizeStatus(status)

  if (normalized === "resolved") {
    return (
      <span className="inline-flex rounded-full bg-[rgba(13,160,96,0.1)] px-[9px] py-[3px] text-[11px] font-medium text-[#0da060]">
        Resolved
      </span>
    )
  }

  if (normalized === "closed") {
    return (
      <span className="inline-flex rounded-full bg-[rgba(17,19,24,0.06)] px-[9px] py-[3px] text-[11px] font-medium text-[#7f869e]">
        Closed
      </span>
    )
  }

  if (normalized === "pending") {
    return (
      <span className="inline-flex rounded-full bg-[rgba(180,83,9,0.1)] px-[9px] py-[3px] text-[11px] font-medium text-[#b45309]">
        Pending
      </span>
    )
  }

  return (
    <span className="inline-flex rounded-full bg-[rgba(180,83,9,0.1)] px-[9px] py-[3px] text-[11px] font-medium text-[#b45309]">
      Open
    </span>
  )
}

function PriorityPill({ priority }: { priority: string }) {
  const normalized = normalizePriority(priority)

  if (normalized === "high") {
    return (
      <span className="inline-flex rounded-full bg-[rgba(220,38,38,0.09)] px-[9px] py-[3px] text-[11px] font-medium text-[#dc2626]">
        High
      </span>
    )
  }

  return (
    <span className="inline-flex rounded-full bg-[rgba(180,83,9,0.1)] px-[9px] py-[3px] text-[11px] font-medium text-[#b45309]">
      Normal
    </span>
  )
}

function MiniPriorityPill({ priority }: { priority: string }) {
  const normalized = normalizePriority(priority)

  if (normalized === "high") {
    return (
      <span className="rounded-full bg-[rgba(220,38,38,0.18)] px-[6px] py-[1.5px] text-[10px] font-medium text-[#fc9393]">
        high
      </span>
    )
  }

  return (
    <span className="rounded-full bg-[rgba(180,83,9,0.18)] px-[6px] py-[1.5px] text-[10px] font-medium text-[#fbbf5a]">
      normal
    </span>
  )
}

function InfoRow({ label, value, email = false }: { label: string; value: string; email?: boolean }) {
  return (
    <div className="mb-[10px] flex flex-col gap-[2px] last:mb-0">
      <span className="text-[11px] font-normal text-[#b4b9cc]">{label}</span>
      <span
        className={`font-medium text-[#42475a] ${
          email ? "break-all text-[12px] font-normal" : "text-[12.5px]"
        }`}
      >
        {value}
      </span>
    </div>
  )
}

export default function SupportTicketsWorkbench({
  admin,
  tickets,
  counts,
  replyAction,
  updateStatusAction,
  updatePriorityAction,
}: Props) {
  const [selectedTicketId, setSelectedTicketId] = useState(tickets[0]?.id || "")
  const [filter, setFilter] = useState<"open" | "pending" | "resolved" | "all">("open")
  const [query, setQuery] = useState("")
  const [replyText, setReplyText] = useState("")
  const [isPending, startTransition] = useTransition()

  const filteredTickets = useMemo(() => {
    const search = query.trim().toLowerCase()

    return tickets.filter((ticket) => {
      const status = normalizeStatus(ticket.status)
      const matchesFilter = filter === "all" ? true : status === filter
      const matchesSearch = search
        ? ticket.subject.toLowerCase().includes(search) ||
          ticket.email.toLowerCase().includes(search) ||
          ticket.category.toLowerCase().includes(search) ||
          getPreview(ticket).toLowerCase().includes(search)
        : true

      return matchesFilter && matchesSearch
    })
  }, [tickets, filter, query])

  const selectedTicket =
    tickets.find((ticket) => ticket.id === selectedTicketId) ||
    filteredTickets[0] ||
    tickets[0] ||
    null

  const selectedTicketIndex = selectedTicket
    ? tickets.findIndex((ticket) => ticket.id === selectedTicket.id)
    : -1

  function submitReply() {
    if (!selectedTicket || !replyText.trim()) return

    const formData = new FormData()
    formData.set("ticketId", selectedTicket.id)
    formData.set("message", replyText.trim())

    startTransition(async () => {
      await replyAction(formData)
      setReplyText("")
    })
  }

  function updateStatus(status: string) {
    if (!selectedTicket) return

    const formData = new FormData()
    formData.set("ticketId", selectedTicket.id)
    formData.set("status", status)

    startTransition(async () => {
      await updateStatusAction(formData)
    })
  }

  function updatePriority(priority: string) {
    if (!selectedTicket) return

    const formData = new FormData()
    formData.set("ticketId", selectedTicket.id)
    formData.set("priority", priority)

    startTransition(async () => {
      await updatePriorityAction(formData)
    })
  }

  return (
    <div className="fixed inset-0 z-[9999] flex h-screen w-screen overflow-hidden bg-[#0f1117] font-sans text-[#111318]">
      <aside className="z-20 flex h-screen w-[56px] shrink-0 flex-col items-center gap-1 border-r border-white/[0.05] bg-[#0f1117] px-0 pb-5 pt-[14px]">
        <Link
          href="/admin"
          prefetch={false}
          title="Back to Admin Dashboard"
          className="mb-4 flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-[#6c5ce7] text-white transition hover:bg-[#7c6cf3]"
        >
          <Menu className="h-[15px] w-[15px]" />
        </Link>

        <Link
          href="/admin"
          prefetch={false}
          title="Dashboard"
          className="flex h-9 w-9 items-center justify-center rounded-[9px] text-white/30 transition hover:bg-white/[0.06] hover:text-white/70"
        >
          <Grid2X2 className="h-4 w-4" />
        </Link>

        <Link
          href="/admin/users"
          prefetch={false}
          title="Users"
          className="flex h-9 w-9 items-center justify-center rounded-[9px] text-white/30 transition hover:bg-white/[0.06] hover:text-white/70"
        >
          <Users className="h-4 w-4" />
        </Link>

        <Link
          href="/admin/support"
          prefetch={false}
          title="Support"
          className="relative flex h-9 w-9 items-center justify-center rounded-[9px] bg-white/10 text-white/90 transition"
        >
          <MessageSquare className="h-4 w-4" />
          <span className="absolute right-[5px] top-[5px] h-[7px] w-[7px] rounded-full border-[1.5px] border-[#0f1117] bg-[#dc2626]" />
        </Link>

        <Link
          href="/admin/rules"
          prefetch={false}
          title="BLL Rules"
          className="flex h-9 w-9 items-center justify-center rounded-[9px] text-white/30 transition hover:bg-white/[0.06] hover:text-white/70"
        >
          <FileText className="h-4 w-4" />
        </Link>

        <Link
          href="/admin/analytics"
          prefetch={false}
          title="Analytics"
          className="flex h-9 w-9 items-center justify-center rounded-[9px] text-white/30 transition hover:bg-white/[0.06] hover:text-white/70"
        >
          <BarChart3 className="h-4 w-4" />
        </Link>

        <Link
          href="/admin/settings"
          prefetch={false}
          title="Settings"
          className="flex h-9 w-9 items-center justify-center rounded-[9px] text-white/30 transition hover:bg-white/[0.06] hover:text-white/70"
        >
          <Settings className="h-4 w-4" />
        </Link>

        <div className="mt-auto flex flex-col items-center gap-1">
          <button
            type="button"
            title="Notifications"
            className="flex h-9 w-9 items-center justify-center rounded-[9px] text-white/30 transition hover:bg-white/[0.06] hover:text-white/70"
          >
            <Bell className="h-[15px] w-[15px]" />
          </button>

          <button
            type="button"
            title={admin.fullName || admin.email}
            className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-gradient-to-br from-[#6c5ce7] to-[#a29bfe] text-[11px] font-semibold text-white"
          >
            {admin.fullName ? admin.fullName.slice(0, 1).toUpperCase() : "V"}
          </button>
        </div>
      </aside>

      <aside className="flex h-screen w-[300px] shrink-0 flex-col overflow-hidden border-r border-white/[0.06] bg-[#161921]">
        <div className="shrink-0 border-b border-white/[0.06] px-[14px] pb-3 pt-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-serif text-[17px] font-normal tracking-[-0.02em] text-white/90">
              Tickets
            </span>

            <div className="flex items-center gap-1">
              <button
                type="button"
                title="Sort"
                className="flex h-[26px] w-[26px] items-center justify-center rounded-md text-white/30 transition hover:bg-white/[0.07] hover:text-white/70"
              >
                <SlidersHorizontal className="h-[14px] w-[14px]" />
              </button>

              <button
                type="button"
                title="Filter"
                className="flex h-[26px] w-[26px] items-center justify-center rounded-md text-white/30 transition hover:bg-white/[0.07] hover:text-white/70"
              >
                <Filter className="h-[14px] w-[14px]" />
              </button>
            </div>
          </div>

          <div className="relative mb-[10px]">
            <Search className="pointer-events-none absolute left-[9px] top-1/2 h-3 w-3 -translate-y-1/2 text-white/20" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search tickets..."
              className="h-[34px] w-full rounded-[7px] border border-white/[0.07] bg-white/[0.05] pl-[30px] pr-[10px] text-[12.5px] text-white/75 outline-none transition placeholder:text-white/20 focus:border-white/[0.14] focus:bg-white/[0.07]"
            />
          </div>

          <div className="flex gap-[2px]">
            <button
              type="button"
              onClick={() => setFilter("open")}
              className={`flex flex-1 items-center justify-center gap-[5px] whitespace-nowrap rounded-md px-1 py-[5px] text-[11.5px] font-medium transition ${
                filter === "open" ? "bg-white/[0.09] text-white/85" : "text-white/30 hover:text-white/60"
              }`}
            >
              Open
              <span className="min-w-[18px] rounded-full bg-white/[0.08] px-[5px] py-px text-center text-[10.5px] text-white/40">
                {counts.open}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFilter("pending")}
              className={`flex flex-1 items-center justify-center gap-[5px] whitespace-nowrap rounded-md px-1 py-[5px] text-[11.5px] font-medium transition ${
                filter === "pending" ? "bg-white/[0.09] text-white/85" : "text-white/30 hover:text-white/60"
              }`}
            >
              Pending
              <span className="min-w-[18px] rounded-full bg-white/[0.08] px-[5px] py-px text-center text-[10.5px] text-white/40">
                {counts.pending}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFilter("resolved")}
              className={`flex flex-1 items-center justify-center gap-[5px] whitespace-nowrap rounded-md px-1 py-[5px] text-[11.5px] font-medium transition ${
                filter === "resolved" ? "bg-white/[0.09] text-white/85" : "text-white/30 hover:text-white/60"
              }`}
            >
              Resolved
              <span className="min-w-[18px] rounded-full bg-white/[0.08] px-[5px] py-px text-center text-[10.5px] text-white/40">
                {counts.resolved}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`flex flex-1 items-center justify-center gap-[5px] whitespace-nowrap rounded-md px-1 py-[5px] text-[11.5px] font-medium transition ${
                filter === "all" ? "bg-white/[0.09] text-white/85" : "text-white/30 hover:text-white/60"
              }`}
            >
              All
              <span className="min-w-[18px] rounded-full bg-white/[0.08] px-[5px] py-px text-center text-[10.5px] text-white/40">
                {counts.all}
              </span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-[6px]">
          {filteredTickets.length === 0 ? (
            <div className="px-3 py-8 text-center text-[12px] text-white/25">
              No tickets found.
            </div>
          ) : (
            filteredTickets.map((ticket) => {
              const active = selectedTicket?.id === ticket.id

              return (
                <button
                  key={ticket.id}
                  type="button"
                  onClick={() => setSelectedTicketId(ticket.id)}
                  className={`relative mb-[2px] w-full rounded-[9px] border px-[10px] py-[10px] text-left transition ${
                    active
                      ? "border-white/[0.08] bg-white/[0.07]"
                      : "border-transparent hover:bg-white/[0.04]"
                  }`}
                >
                  {active ? (
                    <span className="absolute left-[2px] top-[13px] h-[6px] w-[6px] rounded-full bg-[#2563eb]" />
                  ) : null}

                  <div className="mb-1 flex items-start justify-between gap-[6px]">
                    <span
                      className={`flex-1 text-[12.5px] font-medium leading-[1.3] ${
                        active ? "text-white/95" : "text-white/80"
                      }`}
                    >
                      {ticket.subject}
                    </span>

                    <span className="mt-px shrink-0 text-[10.5px] text-white/20">
                      {formatShortTime(ticket.updated_at)}
                    </span>
                  </div>

                  <div className="mb-[5px] flex flex-wrap items-center gap-[5px]">
                    <span className="text-[11px] font-light text-white/30">
                      {ticket.email}
                    </span>
                    <MiniPriorityPill priority={ticket.priority} />
                  </div>

                  <div className="truncate text-[11.5px] font-light text-white/25">
                    {getPreview(ticket)}
                  </div>
                </button>
              )
            })
          )}
        </div>
      </aside>

      <main className="flex h-screen min-w-0 flex-1 flex-col overflow-hidden bg-[#f7f7f5]">
        {selectedTicket ? (
          <>
            <header className="flex h-[52px] shrink-0 items-center justify-between gap-3 border-b border-[rgba(17,19,24,0.08)] bg-white px-5">
              <div className="flex min-w-0 items-center gap-[10px]">
                <div className="truncate text-[14px] font-semibold text-[#111318]">
                  {selectedTicket.subject}
                </div>

                <div className="flex shrink-0 items-center gap-[5px]">
                  <StatusPill status={selectedTicket.status} />
                  <PriorityPill priority={selectedTicket.priority} />
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-[6px]">
                <select
                  value={normalizeStatus(selectedTicket.status)}
                  onChange={(event) => updateStatus(event.target.value)}
                  disabled={isPending}
                  className="h-[32px] cursor-pointer appearance-none rounded-[7px] border border-[rgba(180,83,9,0.18)] bg-[rgba(180,83,9,0.1)] bg-[url('data:image/svg+xml,%3Csvg_width=%2210%22_height=%2210%22_viewBox=%220_0_10_10%22_fill=%22none%22_xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cpath_d=%22M2_3.5l3_3_3-3%22_stroke=%22%23b45309%22_stroke-width=%221.4%22_stroke-linecap=%22round%22_stroke-linejoin=%22round%22/%3E%3C/svg%3E')] bg-[right_9px_center] bg-no-repeat px-3 py-[6px] pr-7 text-[12.5px] font-medium text-[#b45309] outline-none"
                >
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {statusLabel(status)}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => updateStatus("resolved")}
                  disabled={isPending}
                  className="inline-flex h-[32px] items-center gap-[6px] rounded-[7px] border border-[rgba(17,19,24,0.12)] bg-white px-[14px] text-[12.5px] font-medium text-[#42475a] transition hover:bg-[#f7f7f5] hover:text-[#111318] disabled:opacity-60"
                >
                  <Check className="h-3 w-3" />
                  Resolve
                </button>

                <button
                  type="button"
                  className="flex h-[32px] w-[36px] items-center justify-center rounded-[7px] border border-[rgba(17,19,24,0.12)] bg-white text-[#42475a] transition hover:bg-[#f7f7f5] hover:text-[#111318]"
                >
                  <MoreVertical className="h-[14px] w-[14px]" />
                </button>
              </div>
            </header>

            <div className="flex min-h-0 flex-1 overflow-hidden">
              <section className="flex min-w-0 flex-1 flex-col overflow-hidden">
                <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-6 py-5">
                  <div className="my-1 flex items-center gap-[10px] text-[11.5px] font-normal text-[#b4b9cc]">
                    <div className="h-px flex-1 bg-[rgba(17,19,24,0.08)]" />
                    {formatDate(selectedTicket.created_at)}
                    <div className="h-px flex-1 bg-[rgba(17,19,24,0.08)]" />
                  </div>

                  {selectedTicket.messages.map((message) => {
                    const isSupport = message.sender.toLowerCase() === "support"

                    return (
                      <div
                        key={message.id}
                        className={`flex max-w-[680px] flex-col gap-1 ${
                          isSupport ? "self-end" : ""
                        }`}
                      >
                        <div
                          className={`flex items-center gap-2 ${
                            isSupport ? "flex-row-reverse" : ""
                          }`}
                        >
                          <div
                            className={`flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${
                              isSupport
                                ? "bg-gradient-to-br from-[#6c5ce7] to-[#a29bfe] text-white"
                                : "border border-[rgba(37,99,235,0.15)] bg-[rgba(37,99,235,0.09)] text-[#2563eb]"
                            }`}
                          >
                            {isSupport ? "V" : safeInitials(selectedTicket.email)}
                          </div>

                          <span className="text-[11.5px] font-semibold text-[#42475a]">
                            {isSupport ? `${admin.fullName || "Vladimir"} · Support` : selectedTicket.email}
                          </span>

                          <span className="text-[11px] font-light text-[#b4b9cc]">
                            {formatShortTime(message.created_at)}
                          </span>
                        </div>

                        <div
                          className={`whitespace-pre-wrap px-[14px] py-[11px] text-[13.5px] leading-[1.6] ${
                            isSupport
                              ? "rounded-[11px_3px_11px_11px] bg-[#0f1117] font-light text-white/90"
                              : "rounded-[3px_11px_11px_11px] border border-[rgba(17,19,24,0.08)] bg-white font-normal text-[#111318]"
                          }`}
                        >
                          {message.message}
                        </div>
                      </div>
                    )
                  })}

                  <div className="flex items-center gap-2 py-[2px] text-[12px] font-normal text-[#b4b9cc]">
                    <span className="ml-[10px] h-[5px] w-[5px] shrink-0 rounded-full bg-[rgba(17,19,24,0.12)]" />
                    Ticket created · {formatDateTime(selectedTicket.created_at)}
                  </div>
                </div>

                <div className="shrink-0 border-t border-[rgba(17,19,24,0.08)] bg-white px-5 py-4">
                  <div className="mb-[10px] flex items-center gap-[6px]">
                    <button
                      type="button"
                      className="rounded-md bg-[#0f1117] px-3 py-[5px] text-[12px] font-medium text-white"
                    >
                      Reply
                    </button>

                    <button
                      type="button"
                      className="rounded-md border border-[rgba(17,19,24,0.08)] bg-transparent px-3 py-[5px] text-[12px] font-medium text-[#7f869e] transition hover:bg-[#f7f7f5] hover:text-[#42475a]"
                    >
                      Note
                    </button>

                    <div className="mx-[2px] h-[18px] w-px bg-[rgba(17,19,24,0.08)]" />

                    <button
                      type="button"
                      className="flex h-[26px] w-[26px] items-center justify-center rounded-md text-[11px] text-[#b4b9cc] transition hover:bg-[#f7f7f5] hover:text-[#42475a]"
                    >
                      <strong>B</strong>
                    </button>

                    <button
                      type="button"
                      className="flex h-[26px] w-[26px] items-center justify-center rounded-md text-[11px] text-[#b4b9cc] transition hover:bg-[#f7f7f5] hover:text-[#42475a]"
                    >
                      <em>I</em>
                    </button>

                    <button
                      type="button"
                      className="flex h-[26px] w-[26px] items-center justify-center rounded-md text-[#b4b9cc] transition hover:bg-[#f7f7f5] hover:text-[#42475a]"
                    >
                      <LinkIcon className="h-[13px] w-[13px]" />
                    </button>

                    <button
                      type="button"
                      className="flex h-[26px] w-[26px] items-center justify-center rounded-md text-[#b4b9cc] transition hover:bg-[#f7f7f5] hover:text-[#42475a]"
                    >
                      <Paperclip className="h-[13px] w-[13px]" />
                    </button>
                  </div>

                  <textarea
                    value={replyText}
                    onChange={(event) => setReplyText(event.target.value)}
                    onKeyDown={(event) => {
                      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                        event.preventDefault()
                        submitReply()
                      }
                    }}
                    placeholder="Write a reply to the user... (⌘ + Enter to send)"
                    className="h-[88px] w-full resize-none rounded-[9px] border border-[rgba(17,19,24,0.12)] bg-[#fafaf9] px-[14px] py-[11px] text-[13.5px] font-light leading-[1.55] text-[#111318] outline-none transition placeholder:text-[#b4b9cc] focus:border-[#2563eb] focus:bg-white focus:shadow-[0_0_0_3px_rgba(37,99,235,0.08)]"
                  />

                  <div className="mt-[10px] flex items-center justify-between">
                    <div className="text-[11.5px] font-light text-[#b4b9cc]">
                      Replying as <strong>{admin.fullName || "Vladimir"}</strong> · Support
                    </div>

                    <div className="flex items-center gap-[6px]">
                      <button
                        type="button"
                        onClick={() => setReplyText("")}
                        className="inline-flex h-[34px] items-center gap-[6px] rounded-[7px] border border-[rgba(17,19,24,0.12)] bg-white px-[14px] text-[12.5px] font-medium text-[#42475a] transition hover:bg-[#f7f7f5] hover:text-[#111318]"
                      >
                        Discard
                      </button>

                      <button
                        type="button"
                        onClick={submitReply}
                        disabled={isPending || !replyText.trim()}
                        className="inline-flex h-[34px] items-center gap-[6px] rounded-[7px] border border-transparent bg-[#0f1117] px-[14px] text-[12.5px] font-medium text-white transition hover:bg-[#1d2130] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Send className="h-3 w-3" />
                        {isPending ? "Sending..." : "Send reply"}
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              <aside className="w-[220px] shrink-0 overflow-y-auto border-l border-[rgba(17,19,24,0.08)] bg-white py-5">
                <div className="mb-4 border-b border-[rgba(17,19,24,0.08)] px-4 pb-4">
                  <div className="mb-[10px] text-[10px] font-semibold uppercase tracking-[0.09em] text-[#b4b9cc]">
                    Ticket info
                  </div>

                  <InfoRow label="ID" value={ticketNumber(selectedTicketIndex)} />
                  <InfoRow label="Category" value={selectedTicket.category} />
                  <InfoRow label="Created" value={formatDateTime(selectedTicket.created_at)} />
                  <InfoRow label="Last update" value={formatDateTime(selectedTicket.updated_at)} />
                </div>

                <div className="mb-4 border-b border-[rgba(17,19,24,0.08)] px-4 pb-4">
                  <div className="mb-[10px] text-[10px] font-semibold uppercase tracking-[0.09em] text-[#b4b9cc]">
                    Priority
                  </div>

                  <select
                    value={normalizePriority(selectedTicket.priority)}
                    onChange={(event) => updatePriority(event.target.value)}
                    disabled={isPending}
                    className="mb-[6px] h-[32px] w-full cursor-pointer appearance-none rounded-md border border-[rgba(17,19,24,0.12)] bg-[#f7f7f5] px-[9px] py-[6px] text-[12px] text-[#111318] outline-none"
                  >
                    {priorityOptions.map((priority) => (
                      <option key={priority} value={priority}>
                        {priorityLabel(priority)}
                      </option>
                    ))}
                  </select>

                  <div className="mb-[10px] mt-[10px] text-[10px] font-semibold uppercase tracking-[0.09em] text-[#b4b9cc]">
                    Status
                  </div>

                  <select
                    value={normalizeStatus(selectedTicket.status)}
                    onChange={(event) => updateStatus(event.target.value)}
                    disabled={isPending}
                    className="mb-[6px] h-[32px] w-full cursor-pointer appearance-none rounded-md border border-[rgba(17,19,24,0.12)] bg-[#f7f7f5] px-[9px] py-[6px] text-[12px] text-[#111318] outline-none"
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {statusLabel(status)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-4 border-b border-[rgba(17,19,24,0.08)] px-4 pb-4">
                  <div className="mb-[10px] text-[10px] font-semibold uppercase tracking-[0.09em] text-[#b4b9cc]">
                    User
                  </div>

                  <InfoRow label="Email" value={selectedTicket.email} email />
                  <InfoRow label="Plan" value={selectedTicket.userPlan} />
                  <InfoRow label="Member since" value={selectedTicket.memberSince} />
                </div>

                <div className="px-4">
                  <div className="mb-[10px] text-[10px] font-semibold uppercase tracking-[0.09em] text-[#b4b9cc]">
                    Quick actions
                  </div>

                  <button
                    type="button"
                    onClick={() => updateStatus("resolved")}
                    disabled={isPending}
                    className="mb-[6px] inline-flex h-[34px] w-full items-center justify-center gap-[6px] rounded-[7px] border border-[rgba(13,160,96,0.18)] bg-[rgba(13,160,96,0.1)] text-[12px] font-medium text-[#0da060] transition hover:bg-[rgba(13,160,96,0.14)] disabled:opacity-60"
                  >
                    <Check className="h-[11px] w-[11px]" />
                    Mark resolved
                  </button>

                  <button
                    type="button"
                    onClick={() => updateStatus("closed")}
                    disabled={isPending}
                    className="inline-flex h-[34px] w-full items-center justify-center gap-[6px] rounded-[7px] border border-[rgba(220,38,38,0.15)] bg-[rgba(220,38,38,0.09)] text-[12px] font-medium text-[#dc2626] transition hover:bg-[rgba(220,38,38,0.14)] disabled:opacity-60"
                  >
                    <X className="h-[11px] w-[11px]" />
                    Close ticket
                  </button>
                </div>
              </aside>
            </div>
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-[#b4b9cc]">
            <div className="mb-1 flex h-12 w-12 items-center justify-center rounded-xl border border-[rgba(17,19,24,0.08)] bg-white text-[#b4b9cc]">
              <Inbox className="h-5 w-5" />
            </div>

            <div className="text-[14px] font-medium text-[#7f869e]">
              No ticket selected
            </div>

            <div className="text-[12.5px] text-[#b4b9cc]">
              Select a ticket from the left panel.
            </div>
          </div>
        )}
      </main>
    </div>
  )
}