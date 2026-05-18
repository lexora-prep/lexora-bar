"use client"

import { useMemo, useState, useTransition } from "react"
import {
  AlertTriangle,
  Check,
  Circle,
  Filter,
  Inbox,
  MessageSquare,
  MoreVertical,
  Paperclip,
  Search,
  Send,
  SlidersHorizontal,
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

function statusLabel(value: string) {
  const status = normalizeStatus(value)

  if (status === "resolved") return "Resolved"
  if (status === "closed") return "Closed"
  if (status === "pending") return "Pending"

  return "Open"
}

function priorityLabel(value: string) {
  return value.toLowerCase() === "high" ? "High" : "Normal"
}

function statusBadgeClass(value: string) {
  const status = normalizeStatus(value)

  if (status === "resolved") return "bg-emerald-50 text-emerald-700"
  if (status === "closed") return "bg-slate-100 text-slate-500"
  if (status === "pending") return "bg-amber-50 text-amber-700"

  return "bg-orange-50 text-orange-700"
}

function priorityBadgeClass(value: string) {
  return value.toLowerCase() === "high"
    ? "bg-red-50 text-red-600"
    : "bg-amber-50 text-amber-700"
}

function getPreview(ticket: SupportTicketForWorkbench) {
  const last = ticket.messages[ticket.messages.length - 1]
  return last?.message || "No message yet."
}

function ticketNumber(index: number) {
  if (index < 0) return "#TKT-0000"
  return `#TKT-${String(index + 1).padStart(4, "0")}`
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] font-semibold text-slate-300">{label}</div>
      <div className="mt-1 break-words text-xs font-semibold text-slate-700">
        {value}
      </div>
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
    <div className="flex h-[calc(100vh-56px)] min-w-0 bg-[#F6F7F9] text-slate-950">
      <aside className="flex w-[300px] shrink-0 flex-col border-r border-slate-200 bg-[#171A22] text-white">
        <div className="flex h-14 items-center justify-between border-b border-white/10 px-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-indigo-400" />
            <div className="text-sm font-semibold">Tickets</div>
          </div>

          <div className="flex items-center gap-2 text-slate-500">
            <Filter className="h-3.5 w-3.5" />
            <SlidersHorizontal className="h-3.5 w-3.5" />
          </div>
        </div>

        <div className="border-b border-white/10 px-4 py-3">
          <div className="flex h-9 items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 text-slate-400">
            <Search className="h-4 w-4" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search tickets..."
              className="h-full min-w-0 flex-1 bg-transparent text-xs text-white outline-none placeholder:text-slate-500"
            />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
            <button
              type="button"
              onClick={() => setFilter("open")}
              className={`rounded-full px-2 py-1 ${
                filter === "open" ? "bg-white/15 text-white" : "text-slate-400"
              }`}
            >
              Open <span className="ml-1 rounded-full bg-white/10 px-1">{counts.open}</span>
            </button>

            <button
              type="button"
              onClick={() => setFilter("pending")}
              className={`rounded-full px-2 py-1 ${
                filter === "pending" ? "bg-white/15 text-white" : "text-slate-400"
              }`}
            >
              Pending{" "}
              <span className="ml-1 rounded-full bg-white/10 px-1">{counts.pending}</span>
            </button>

            <button
              type="button"
              onClick={() => setFilter("resolved")}
              className={`rounded-full px-2 py-1 ${
                filter === "resolved" ? "bg-white/15 text-white" : "text-slate-400"
              }`}
            >
              Resolved{" "}
              <span className="ml-1 rounded-full bg-white/10 px-1">{counts.resolved}</span>
            </button>

            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`rounded-full px-2 py-1 ${
                filter === "all" ? "bg-white/15 text-white" : "text-slate-400"
              }`}
            >
              All <span className="ml-1 rounded-full bg-white/10 px-1">{counts.all}</span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {filteredTickets.length === 0 ? (
            <div className="px-3 py-8 text-center text-xs text-slate-500">
              No tickets found.
            </div>
          ) : (
            filteredTickets.map((ticket, index) => {
              const active = selectedTicket?.id === ticket.id

              return (
                <button
                  key={ticket.id}
                  type="button"
                  onClick={() => setSelectedTicketId(ticket.id)}
                  className={`mb-2 w-full rounded-lg border px-3 py-3 text-left transition ${
                    active
                      ? "border-white/10 bg-white/10"
                      : "border-transparent hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="truncate text-xs font-semibold text-white">
                      {ticket.subject}
                    </div>
                    <div className="shrink-0 text-[10px] text-slate-500">
                      {formatShortTime(ticket.updated_at)}
                    </div>
                  </div>

                  <div className="mt-1 flex items-center justify-between gap-2">
                    <div className="truncate text-[11px] text-slate-500">
                      {ticket.email}
                    </div>
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] ${priorityBadgeClass(
                        ticket.priority,
                      )}`}
                    >
                      {priorityLabel(ticket.priority).toLowerCase()}
                    </span>
                  </div>

                  <div className="mt-2 line-clamp-1 text-[11px] text-slate-500">
                    {getPreview(ticket)}
                  </div>

                  <div className="sr-only">{ticketNumber(index)}</div>
                </button>
              )
            })
          )}
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col bg-[#FBFBFA]">
        {selectedTicket ? (
          <>
            <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5">
              <div className="flex min-w-0 items-center gap-3">
                <h1 className="truncate text-sm font-bold text-slate-950">
                  {selectedTicket.subject}
                </h1>

                <span
                  className={`rounded-full px-2 py-1 text-[11px] font-semibold ${statusBadgeClass(
                    selectedTicket.status,
                  )}`}
                >
                  {statusLabel(selectedTicket.status)}
                </span>

                <span
                  className={`rounded-full px-2 py-1 text-[11px] font-semibold ${priorityBadgeClass(
                    selectedTicket.priority,
                  )}`}
                >
                  {priorityLabel(selectedTicket.priority)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={normalizeStatus(selectedTicket.status)}
                  onChange={(event) => updateStatus(event.target.value)}
                  disabled={isPending}
                  className="h-8 rounded-md border border-orange-200 bg-orange-50 px-3 text-xs font-semibold text-orange-700 outline-none"
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
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                >
                  <Check className="h-3.5 w-3.5" />
                  Resolve
                </button>

                <button
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
              </div>
            </header>

            <div className="flex min-h-0 flex-1">
              <section className="flex min-w-0 flex-1 flex-col">
                <div className="flex-1 overflow-y-auto px-6 py-6">
                  <div className="mb-6 flex items-center gap-3">
                    <div className="h-px flex-1 bg-slate-200" />
                    <div className="text-[11px] text-slate-400">
                      {formatDate(selectedTicket.created_at)}
                    </div>
                    <div className="h-px flex-1 bg-slate-200" />
                  </div>

                  <div className="space-y-5">
                    {selectedTicket.messages.map((message) => {
                      const isSupport = message.sender.toLowerCase() === "support"

                      return (
                        <div key={message.id} className={isSupport ? "flex justify-end" : ""}>
                          <div className={`max-w-[720px] ${isSupport ? "text-right" : ""}`}>
                            <div
                              className={`mb-2 flex items-center gap-2 ${
                                isSupport ? "justify-end" : ""
                              }`}
                            >
                              {!isSupport ? (
                                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700">
                                  {safeInitials(selectedTicket.email)}
                                </div>
                              ) : null}

                              <span className="text-xs font-semibold text-slate-700">
                                {isSupport ? "Support" : selectedTicket.email}
                              </span>

                              <span className="text-xs text-slate-400">
                                {formatShortTime(message.created_at)}
                              </span>

                              {isSupport ? (
                                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white">
                                  S
                                </div>
                              ) : null}
                            </div>

                            <div
                              className={`rounded-lg border px-4 py-3 text-left text-sm leading-6 shadow-sm ${
                                isSupport
                                  ? "border-slate-200 bg-slate-900 text-white"
                                  : "border-slate-200 bg-white text-slate-800"
                              }`}
                            >
                              <div className="whitespace-pre-wrap">{message.message}</div>
                            </div>

                            {!isSupport ? (
                              <div className="mt-2 text-xs text-slate-300">
                                Ticket created · {formatDateTime(selectedTicket.created_at)}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="shrink-0 border-t border-slate-200 bg-white px-5 py-4">
                  <div className="mb-2 flex items-center gap-2">
                    <button
                      type="button"
                      className="rounded-md bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      Reply
                    </button>

                    <button
                      type="button"
                      className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500"
                    >
                      Note
                    </button>

                    <div className="h-5 w-px bg-slate-200" />

                    <button type="button" className="text-xs font-bold text-slate-300">
                      B
                    </button>

                    <button type="button" className="text-xs italic text-slate-300">
                      I
                    </button>

                    <button type="button" className="text-slate-300">
                      <Paperclip className="h-3.5 w-3.5" />
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
                    className="h-20 w-full resize-none rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-300 focus:border-slate-400"
                  />

                  <div className="mt-3 flex items-center justify-between">
                    <div className="text-xs text-slate-400">
                      Replying as {admin.fullName || admin.email} · Support
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setReplyText("")}
                        className="h-9 rounded-md border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                      >
                        Discard
                      </button>

                      <button
                        type="button"
                        onClick={submitReply}
                        disabled={isPending || !replyText.trim()}
                        className="inline-flex h-9 items-center gap-2 rounded-md bg-slate-950 px-4 text-xs font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Send className="h-3.5 w-3.5" />
                        {isPending ? "Sending..." : "Send reply"}
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              <aside className="hidden w-[230px] shrink-0 border-l border-slate-200 bg-white xl:block">
                <div className="border-b border-slate-200 px-4 py-4">
                  <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-300">
                    Ticket Info
                  </div>

                  <div className="mt-4 space-y-3 text-xs">
                    <InfoRow label="ID" value={ticketNumber(selectedTicketIndex)} />
                    <InfoRow label="Category" value={selectedTicket.category} />
                    <InfoRow label="Created" value={formatDateTime(selectedTicket.created_at)} />
                    <InfoRow label="Last update" value={formatDateTime(selectedTicket.updated_at)} />
                  </div>
                </div>

                <div className="border-b border-slate-200 px-4 py-4">
                  <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-300">
                    Priority
                  </div>

                  <select
                    value={selectedTicket.priority.toLowerCase() === "high" ? "high" : "normal"}
                    onChange={(event) => updatePriority(event.target.value)}
                    disabled={isPending}
                    className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none"
                  >
                    {priorityOptions.map((priority) => (
                      <option key={priority} value={priority}>
                        {priorityLabel(priority)}
                      </option>
                    ))}
                  </select>

                  <div className="mb-3 mt-5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-300">
                    Status
                  </div>

                  <select
                    value={normalizeStatus(selectedTicket.status)}
                    onChange={(event) => updateStatus(event.target.value)}
                    disabled={isPending}
                    className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none"
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {statusLabel(status)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="border-b border-slate-200 px-4 py-4">
                  <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-300">
                    User
                  </div>

                  <div className="mt-4 space-y-3 text-xs">
                    <InfoRow label="Email" value={selectedTicket.email} />
                    <InfoRow label="Plan" value={selectedTicket.userPlan} />
                    <InfoRow label="Member since" value={selectedTicket.memberSince} />
                  </div>
                </div>

                <div className="px-4 py-4">
                  <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-300">
                    Quick Actions
                  </div>

                  <div className="mt-4 space-y-2">
                    <button
                      type="button"
                      onClick={() => updateStatus("resolved")}
                      disabled={isPending}
                      className="inline-flex h-8 w-full items-center justify-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Mark resolved
                    </button>

                    <button
                      type="button"
                      onClick={() => updateStatus("closed")}
                      disabled={isPending}
                      className="inline-flex h-8 w-full items-center justify-center gap-2 rounded-md border border-red-200 bg-red-50 text-xs font-semibold text-red-600 hover:bg-red-100 disabled:opacity-60"
                    >
                      <X className="h-3.5 w-3.5" />
                      Close ticket
                    </button>
                  </div>
                </div>
              </aside>
            </div>
          </>
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <Inbox className="h-5 w-5" />
              </div>

              <div className="mt-3 text-sm font-semibold text-slate-900">
                No ticket selected
              </div>

              <div className="mt-1 text-xs text-slate-500">
                Select a ticket from the left panel.
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}