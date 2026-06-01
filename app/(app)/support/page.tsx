"use client"

import { useEffect, useMemo, useState } from "react"
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Inbox,
  LifeBuoy,
  Loader2,
  MessageSquare,
  Plus,
  Search,
  Send,
  X,
  XCircle,
} from "lucide-react"

type SupportMessage = {
  id: string
  ticket_id: string
  sender: string
  message: string
  created_at: string
}

type SupportTicket = {
  id: string
  user_id: string
  email: string
  subject: string
  category: string
  status: string
  priority: string
  created_at: string
  updated_at: string
  last_user_message_at?: string | null
  last_support_reply_at?: string | null
  resolved_at?: string | null
  closed_at?: string | null
  sla_due_at?: string | null
  messages: SupportMessage[]
}

type TicketFilter = "all" | "open" | "pending" | "resolved" | "closed"

const categories = [
  { value: "technical", label: "Technical issue" },
  { value: "billing", label: "Billing" },
  { value: "account", label: "Account" },
  { value: "content", label: "Content / rules" },
]

function statusLabel(status: string) {
  const normalized = status?.toLowerCase()

  if (normalized === "open") return "Open"
  if (normalized === "pending") return "Pending"
  if (normalized === "resolved") return "Resolved"
  if (normalized === "closed") return "Closed"

  return status || "Open"
}

function categoryLabel(category: string) {
  const found = categories.find((item) => item.value === category)
  return found?.label || category || "General"
}

function statusClasses(status: string) {
  const normalized = status?.toLowerCase()

  if (normalized === "open") return "bg-blue-50 text-blue-700 ring-blue-100"
  if (normalized === "pending") return "bg-amber-50 text-amber-700 ring-amber-100"
  if (normalized === "resolved") return "bg-emerald-50 text-emerald-700 ring-emerald-100"
  if (normalized === "closed") return "bg-slate-100 text-slate-600 ring-slate-200"

  return "bg-blue-50 text-blue-700 ring-blue-100"
}

function priorityClasses(priority: string) {
  const normalized = priority?.toLowerCase()

  if (normalized === "high") return "text-rose-600"
  if (normalized === "urgent") return "text-red-700"

  return "text-slate-500"
}

function formatDateTime(value?: string | null) {
  if (!value) return "Not available"

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return "Not available"

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function getLastPublicMessage(ticket: SupportTicket) {
  if (!Array.isArray(ticket.messages) || ticket.messages.length === 0) {
    return "No messages yet."
  }

  return ticket.messages[ticket.messages.length - 1]?.message || "No messages yet."
}

function isSupportSender(sender: string) {
  const normalized = sender?.toLowerCase()
  return normalized === "support" || normalized === "admin"
}

function isSystemSender(sender: string) {
  const normalized = sender?.toLowerCase()
  return normalized === "system" || normalized === "support_event" || normalized === "status"
}

export default function SupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [selectedTicketId, setSelectedTicketId] = useState("")
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [replying, setReplying] = useState(false)
  const [error, setError] = useState("")
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<TicketFilter>("all")
  const [newTicketOpen, setNewTicketOpen] = useState(false)
  const [subject, setSubject] = useState("")
  const [category, setCategory] = useState("technical")
  const [message, setMessage] = useState("")
  const [replyText, setReplyText] = useState("")

  async function loadTickets(selectLatest = false) {
    try {
      setLoading(true)
      setError("")

      const res = await fetch("/api/support/tickets", {
        cache: "no-store",
      })

      const data = await res.json().catch(() => null)

      if (!res.ok || data?.ok === false) {
        setError(data?.error || "Failed to load support tickets.")
        setTickets([])
        return
      }

      const nextTickets = Array.isArray(data?.tickets) ? data.tickets : []

      setTickets(nextTickets)

      if (selectLatest && nextTickets[0]?.id) {
        setSelectedTicketId(nextTickets[0].id)
      } else if (!selectedTicketId && nextTickets[0]?.id) {
        setSelectedTicketId(nextTickets[0].id)
      } else if (
        selectedTicketId &&
        !nextTickets.some((ticket: SupportTicket) => ticket.id === selectedTicketId)
      ) {
        setSelectedTicketId(nextTickets[0]?.id || "")
      }
    } catch (err) {
      console.error("LOAD SUPPORT TICKETS ERROR:", err)
      setError("Failed to load support tickets.")
      setTickets([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTickets()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filteredTickets = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase()

    return tickets.filter((ticket) => {
      const matchesFilter = filter === "all" ? true : ticket.status === filter

      const matchesQuery = cleanQuery
        ? ticket.subject.toLowerCase().includes(cleanQuery) ||
          ticket.category.toLowerCase().includes(cleanQuery) ||
          ticket.status.toLowerCase().includes(cleanQuery) ||
          getLastPublicMessage(ticket).toLowerCase().includes(cleanQuery)
        : true

      return matchesFilter && matchesQuery
    })
  }, [tickets, filter, query])

  const selectedTicket =
    tickets.find((ticket) => ticket.id === selectedTicketId) ||
    filteredTickets[0] ||
    tickets[0] ||
    null

  const openCount = tickets.filter((ticket) => ticket.status === "open").length
  const pendingCount = tickets.filter((ticket) => ticket.status === "pending").length
  const resolvedCount = tickets.filter((ticket) => ticket.status === "resolved").length
  const closedCount = tickets.filter((ticket) => ticket.status === "closed").length

  async function createTicket() {
    if (!subject.trim() || !message.trim()) {
      setError("Subject and message are required.")
      return
    }

    try {
      setCreating(true)
      setError("")

      const res = await fetch("/api/support/tickets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subject: subject.trim(),
          category,
          message: message.trim(),
        }),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok || data?.ok === false) {
        setError(data?.error || "Failed to create support ticket.")
        return
      }

      setSubject("")
      setMessage("")
      setCategory("technical")
      setNewTicketOpen(false)

      await loadTickets(true)
    } catch (err) {
      console.error("CREATE SUPPORT TICKET ERROR:", err)
      setError("Failed to create support ticket.")
    } finally {
      setCreating(false)
    }
  }

  async function sendReply() {
    if (!selectedTicket || !replyText.trim()) return

    try {
      setReplying(true)
      setError("")

      const res = await fetch(`/api/support/tickets/${selectedTicket.id}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: replyText.trim(),
        }),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok || data?.ok === false) {
        setError(data?.error || "Failed to send reply.")
        return
      }

      setReplyText("")

      if (data?.ticket) {
        setTickets((prev) =>
          prev.map((ticket) => (ticket.id === data.ticket.id ? data.ticket : ticket))
        )
        setSelectedTicketId(data.ticket.id)
      } else {
        await loadTickets()
      }
    } catch (err) {
      console.error("SEND SUPPORT REPLY ERROR:", err)
      setError("Failed to send reply.")
    } finally {
      setReplying(false)
    }
  }

  const selectedIsClosed = selectedTicket?.status === "closed"

  return (
    <div className="min-h-screen bg-white px-4 py-4 xl:px-5">
      <div className="mx-auto max-w-[1500px] space-y-4">
        <div className="flex flex-col gap-3 rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_55px_-38px_rgba(15,23,42,0.45)] md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
              <LifeBuoy size={14} />
              Support
            </div>
            <h1 className="text-[24px] font-semibold tracking-[-0.03em] text-slate-950">
              Support center
            </h1>
            <p className="mt-1 max-w-[720px] text-sm leading-6 text-slate-500">
              Send questions, report technical problems, and keep a record of your support conversations.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setNewTicketOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_16px_30px_-18px_rgba(15,23,42,0.7)] transition hover:-translate-y-0.5 hover:bg-slate-800"
          >
            <Plus size={16} />
            New ticket
          </button>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[410px_minmax(0,1fr)]">
          <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_55px_-38px_rgba(15,23,42,0.45)]">
            <div className="border-b border-slate-100 p-4">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search tickets..."
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none transition focus:border-violet-300 focus:bg-white focus:ring-4 focus:ring-violet-100"
                />
              </div>

              <div className="mt-3 grid grid-cols-5 gap-2">
                {[
                  { value: "all", label: "All", count: tickets.length },
                  { value: "open", label: "Open", count: openCount },
                  { value: "pending", label: "Pending", count: pendingCount },
                  { value: "resolved", label: "Resolved", count: resolvedCount },
                  { value: "closed", label: "Closed", count: closedCount },
                ].map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setFilter(item.value as TicketFilter)}
                    className={`rounded-2xl px-2 py-2 text-[11px] font-semibold transition ${
                      filter === item.value
                        ? "bg-slate-950 text-white"
                        : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                    }`}
                  >
                    {item.label}
                    <span className="ml-1 opacity-70">{item.count}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="max-h-[660px] overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center gap-2 px-4 py-10 text-sm text-slate-500">
                  <Loader2 size={16} className="animate-spin" />
                  Loading tickets...
                </div>
              ) : filteredTickets.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {filteredTickets.map((ticket) => {
                    const active = selectedTicket?.id === ticket.id

                    return (
                      <button
                        key={ticket.id}
                        type="button"
                        onClick={() => setSelectedTicketId(ticket.id)}
                        className={`block w-full px-4 py-4 text-left transition ${
                          active ? "bg-violet-50/70" : "bg-white hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-slate-950">
                              {ticket.subject}
                            </div>
                            <div className="mt-1 truncate text-[12px] text-slate-500">
                              {categoryLabel(ticket.category)}
                            </div>
                          </div>

                          <span
                            className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ring-1 ${statusClasses(
                              ticket.status
                            )}`}
                          >
                            {statusLabel(ticket.status)}
                          </span>
                        </div>

                        <div className="mt-2 line-clamp-2 text-[13px] leading-5 text-slate-500">
                          {getLastPublicMessage(ticket)}
                        </div>

                        <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
                          <span className={priorityClasses(ticket.priority)}>
                            {ticket.priority === "high" ? "High priority" : "Normal priority"}
                          </span>
                          <span>{formatDateTime(ticket.updated_at)}</span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              ) : (
                <div className="px-5 py-12 text-center">
                  <Inbox size={28} className="mx-auto text-slate-300" />
                  <div className="mt-3 text-sm font-semibold text-slate-800">
                    No tickets found
                  </div>
                  <div className="mt-1 text-sm leading-6 text-slate-500">
                    Create a ticket when you need help with account, billing, rules, or technical issues.
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="min-h-[680px] overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_55px_-38px_rgba(15,23,42,0.45)]">
            {selectedTicket ? (
              <div className="flex h-full min-h-[680px] flex-col">
                <div className="border-b border-slate-100 p-5">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                        <MessageSquare size={14} />
                        Ticket conversation
                      </div>
                      <h2 className="mt-1 text-[21px] font-semibold tracking-[-0.03em] text-slate-950">
                        {selectedTicket.subject}
                      </h2>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px] text-slate-500">
                        <span
                          className={`rounded-full px-2 py-1 text-[10px] font-bold ring-1 ${statusClasses(
                            selectedTicket.status
                          )}`}
                        >
                          {statusLabel(selectedTicket.status)}
                        </span>
                        <span>{categoryLabel(selectedTicket.category)}</span>
                        <span>Created {formatDateTime(selectedTicket.created_at)}</span>
                      </div>
                    </div>

                    <div className="rounded-2xl bg-slate-50 px-4 py-3 text-[12px] leading-5 text-slate-500">
                      <div className="flex items-center gap-2">
                        <Clock3 size={14} />
                        Last updated {formatDateTime(selectedTicket.updated_at)}
                      </div>
                      {selectedTicket.sla_due_at && (
                        <div className="mt-1">
                          Target response: {formatDateTime(selectedTicket.sla_due_at)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto bg-slate-50/60 p-5">
                  <div className="space-y-4">
                    {selectedTicket.messages.map((item) => {
                      const support = isSupportSender(item.sender)
                      const system = isSystemSender(item.sender)

                      if (system) {
                        return (
                          <div
                            key={item.id}
                            className="border-b border-slate-100 px-6 py-2.5 text-center text-[12px] text-slate-400"
                          >
                            <span>
                              {item.message}
                              <span className="mx-1 text-slate-300">·</span>
                              {formatDateTime(item.created_at)}
                            </span>
                          </div>
                        )
                      }

                      return (
                        <div key={item.id} className="border-b border-slate-100 px-6 py-4">
                          <div className="grid grid-cols-[36px_minmax(0,1fr)] gap-3">
                            <div
                              className={`flex h-9 w-9 items-center justify-center rounded-full text-[12px] font-bold ${
                                support
                                  ? "bg-blue-50 text-blue-700 ring-1 ring-blue-100"
                                  : "bg-slate-100 text-slate-700 ring-1 ring-slate-200"
                              }`}
                            >
                              {support ? "L" : "M"}
                            </div>

                            <div className="min-w-0">
                              <div className="mb-1 flex flex-wrap items-center gap-2 text-[13px]">
                                <span className="font-semibold text-slate-900">
                                  {support ? "Lexora Support" : "Me"}
                                </span>
                                <span className="text-slate-300">·</span>
                                <span className="text-slate-400">
                                  {formatDateTime(item.created_at)}
                                </span>
                              </div>

                              <div className="whitespace-pre-wrap text-[14px] leading-6 text-slate-700">
                                {item.message}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="border-t border-slate-100 bg-white p-4">
                  {selectedIsClosed ? (
                    <div className="flex items-start gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
                      <XCircle size={16} className="mt-0.5 shrink-0" />
                      <span>This ticket is closed. Create a new ticket if you need more help.</span>
                    </div>
                  ) : (
                    <div className="flex gap-3">
                      <textarea
                        value={replyText}
                        onChange={(event) => setReplyText(event.target.value)}
                        placeholder="Write your reply..."
                        rows={3}
                        className="min-h-[82px] flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 outline-none transition focus:border-violet-300 focus:bg-white focus:ring-4 focus:ring-violet-100"
                      />
                      <button
                        type="button"
                        onClick={sendReply}
                        disabled={!replyText.trim() || replying}
                        className="flex w-[112px] items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                      >
                        {replying ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                        Send
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex min-h-[680px] items-center justify-center p-8 text-center">
                <div>
                  <LifeBuoy size={34} className="mx-auto text-slate-300" />
                  <div className="mt-4 text-sm font-semibold text-slate-800">
                    Select or create a ticket
                  </div>
                  <div className="mt-1 max-w-[360px] text-sm leading-6 text-slate-500">
                    Your support conversations will appear here after you create your first ticket.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {newTicketOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-[560px] rounded-[28px] border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <div className="text-[19px] font-semibold tracking-[-0.03em] text-slate-950">
                  Create support ticket
                </div>
                <div className="mt-1 text-sm leading-6 text-slate-500">
                  Describe the issue clearly so support can help faster.
                </div>
              </div>

              <button
                type="button"
                onClick={() => setNewTicketOpen(false)}
                className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-[12px] font-semibold text-slate-600">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
                >
                  {categories.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-[12px] font-semibold text-slate-600">
                  Subject
                </label>
                <input
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  placeholder="Example: I cannot open rule training"
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-[12px] font-semibold text-slate-600">
                  Message
                </label>
                <textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Explain what happened, what you expected, and what page you were using."
                  rows={6}
                  className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setNewTicketOpen(false)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={createTicket}
                disabled={!subject.trim() || !message.trim() || creating}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {creating ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                Create ticket
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
