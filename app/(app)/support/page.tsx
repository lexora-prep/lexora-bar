"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Inbox,
  LifeBuoy,
  Loader2,
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
  { value: "bug", label: "Bug report" },
  { value: "billing", label: "Billing or payment" },
  { value: "subscription", label: "Subscription" },
  { value: "account", label: "Account access" },
  { value: "content", label: "Rule content issue" },
  { value: "study_plan", label: "Study plan or progress" },
  { value: "feature", label: "Feature request" },
  { value: "other", label: "Other" },
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
  return found?.label || category || "Other"
}

function statusClasses(status: string) {
  const normalized = status?.toLowerCase()

  if (normalized === "open") return "bg-blue-50 text-blue-700"
  if (normalized === "pending") return "bg-amber-50 text-amber-700"
  if (normalized === "resolved") return "bg-emerald-50 text-emerald-700"
  if (normalized === "closed") return "bg-slate-100 text-slate-600"

  return "bg-blue-50 text-blue-700"
}

function priorityClasses(priority: string) {
  const normalized = priority?.toLowerCase()

  if (normalized === "high") return "bg-rose-50 text-rose-700"
  if (normalized === "urgent") return "bg-red-50 text-red-700"

  return "bg-amber-50 text-amber-700"
}

function priorityLabel(priority: string) {
  const normalized = priority?.toLowerCase()

  if (normalized === "high") return "High"
  if (normalized === "urgent") return "Urgent"

  return "Medium"
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

  const visibleMessages = ticket.messages.filter((message) => !isSystemSender(message.sender))
  const lastVisibleMessage = visibleMessages[visibleMessages.length - 1]

  return lastVisibleMessage?.message || "No messages yet."
}

function isSupportSender(sender: string) {
  const normalized = sender?.toLowerCase()
  return normalized === "support" || normalized === "admin"
}

function isSystemSender(sender: string) {
  const normalized = sender?.toLowerCase()
  return normalized === "system" || normalized === "support_event" || normalized === "status"
}

function getTicketNumber(ticket: SupportTicket, allTickets: SupportTicket[]) {
  const ordered = [...allTickets].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )

  const index = ordered.findIndex((item) => item.id === ticket.id)
  const number = index >= 0 ? index + 1 : 1

  return `TKT-${String(number).padStart(4, "0")}`
}

export default function SupportPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white px-4 py-4 xl:px-5">
          <div className="mx-auto max-w-[1500px] rounded-[28px] border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-[0_18px_55px_-38px_rgba(15,23,42,0.45)]">
            Loading support center...
          </div>
        </div>
      }
    >
      <SupportPageContent />
    </Suspense>
  )
}

function SupportPageContent() {
  const searchParams = useSearchParams()
  const ticketIdFromUrl = searchParams.get("ticketId")

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
  const [otherTopic, setOtherTopic] = useState("")
  const [message, setMessage] = useState("")
  const [replyText, setReplyText] = useState("")
  const [activityOpen, setActivityOpen] = useState(false)

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

      if (
        ticketIdFromUrl &&
        nextTickets.some((ticket: SupportTicket) => ticket.id === ticketIdFromUrl)
      ) {
        setSelectedTicketId(ticketIdFromUrl)
      } else if (selectLatest && nextTickets[0]?.id) {
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
  }, [ticketIdFromUrl])

  useEffect(() => {
    setActivityOpen(false)
  }, [selectedTicketId])

  const filteredTickets = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase()

    return tickets.filter((ticket) => {
      const matchesFilter = filter === "all" ? true : ticket.status === filter
      const ticketNumber = getTicketNumber(ticket, tickets).toLowerCase()

      const matchesQuery = cleanQuery
        ? ticket.subject.toLowerCase().includes(cleanQuery) ||
          ticket.category.toLowerCase().includes(cleanQuery) ||
          ticket.status.toLowerCase().includes(cleanQuery) ||
          ticketNumber.includes(cleanQuery) ||
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

  const visibleMessages = selectedTicket
    ? selectedTicket.messages.filter((item) => !isSystemSender(item.sender))
    : []

  const systemMessages = selectedTicket
    ? selectedTicket.messages.filter((item) => isSystemSender(item.sender))
    : []

  const openCount = tickets.filter((ticket) => ticket.status === "open").length
  const pendingCount = tickets.filter((ticket) => ticket.status === "pending").length
  const resolvedCount = tickets.filter((ticket) => ticket.status === "resolved").length
  const closedCount = tickets.filter((ticket) => ticket.status === "closed").length

  async function createTicket() {
    if (!subject.trim() || !message.trim()) {
      setError("Subject and message are required.")
      return
    }

    if (category === "other" && !otherTopic.trim()) {
      setError("Please describe the topic for Other.")
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
          otherTopic: otherTopic.trim(),
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
      setOtherTopic("")
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
  const selectedTicketNumber = selectedTicket ? getTicketNumber(selectedTicket, tickets) : ""

  return (
    <div className="min-h-screen bg-white px-4 py-4 xl:px-5">
      <div className="mx-auto max-w-[1540px] space-y-4">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[410px_minmax(0,1fr)]">
          <aside className="rounded-[26px] border border-slate-200 bg-white shadow-[0_18px_55px_-38px_rgba(15,23,42,0.45)]">
            <div className="border-b border-slate-100 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h1 className="text-[24px] font-semibold tracking-[-0.03em] text-slate-950">
                    Support Tickets
                  </h1>
                  <p className="mt-1 text-sm text-slate-500">
                    View and manage your support requests.
                  </p>
                </div>

                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                  <LifeBuoy size={18} />
                </div>
              </div>

              <button
                type="button"
                onClick={() => setNewTicketOpen(true)}
                className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 text-sm font-semibold text-white shadow-[0_12px_28px_-18px_rgba(15,23,42,0.7)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800 active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200"
              >
                <Plus size={16} />
                New Ticket
              </button>

              <div className="relative mt-5">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search tickets..."
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
                />
              </div>

              <div className="mt-4 grid grid-cols-5 gap-2">
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
                    className={`rounded-xl px-2 py-2 text-[11px] font-semibold transition-all duration-200 active:scale-[0.98] ${
                      filter === item.value
                        ? "bg-slate-950 text-white shadow-sm"
                        : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                    }`}
                  >
                    {item.label}
                    <span className="ml-1 opacity-70">{item.count}</span>
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="mx-5 mt-4 flex items-start gap-2 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="max-h-[720px] overflow-y-auto p-5">
              {loading ? (
                <div className="flex items-center justify-center gap-2 px-4 py-10 text-sm text-slate-500">
                  <Loader2 size={16} className="animate-spin" />
                  Loading tickets...
                </div>
              ) : filteredTickets.length > 0 ? (
                <div className="space-y-3">
                  {filteredTickets.map((ticket) => {
                    const active = selectedTicket?.id === ticket.id
                    const ticketNumber = getTicketNumber(ticket, tickets)

                    return (
                      <button
                        key={ticket.id}
                        type="button"
                        onClick={() => setSelectedTicketId(ticket.id)}
                        className={`block w-full rounded-xl border px-4 py-4 text-left transition-all duration-200 active:scale-[0.99] ${
                          active
                            ? "border-blue-200 bg-blue-50/60 shadow-[0_16px_36px_-28px_rgba(37,99,235,0.55)]"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-[14px] font-semibold text-slate-950">
                              {ticket.subject}
                            </div>
                            <div className="mt-1 text-[12px] text-slate-500">
                              {categoryLabel(ticket.category)} · {ticketNumber}
                            </div>
                          </div>

                          <span className={`shrink-0 rounded-lg px-2 py-1 text-[11px] font-semibold ${statusClasses(ticket.status)}`}>
                            {statusLabel(ticket.status)}
                          </span>
                        </div>

                        <div className="mt-3 line-clamp-2 text-[13px] leading-5 text-slate-500">
                          {getLastPublicMessage(ticket)}
                        </div>

                        <div className="mt-3 flex items-center justify-between text-[12px] text-slate-400">
                          <span>{priorityLabel(ticket.priority)} priority</span>
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
                    Create a ticket when you need help with account, billing, rule content, or technical issues.
                  </div>
                </div>
              )}

              {filteredTickets.length > 0 && (
                <div className="mt-6 flex items-center justify-center gap-2 text-sm text-slate-400">
                  <button className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 transition hover:bg-slate-50 active:scale-[0.98]">
                    <ChevronLeft size={15} />
                  </button>
                  <button className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 font-semibold text-white">
                    1
                  </button>
                  <button className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 transition hover:bg-slate-50 active:scale-[0.98]">
                    <ChevronRight size={15} />
                  </button>
                </div>
              )}
            </div>
          </aside>

          <main className="min-h-[760px] rounded-[26px] border border-slate-200 bg-white shadow-[0_18px_55px_-38px_rgba(15,23,42,0.45)]">
            {selectedTicket ? (
              <div className="flex h-full min-h-[760px] flex-col">
                <div className="border-b border-slate-100 p-6">
                  <div className="min-w-0">
                    <button
                      type="button"
                      className="mb-5 inline-flex items-center gap-2 text-[13px] font-semibold text-slate-600 transition hover:text-slate-950"
                    >
                      <ChevronLeft size={15} />
                      Back to tickets
                    </button>

                    <h2 className="text-[27px] font-semibold tracking-[-0.04em] text-slate-950">
                      {selectedTicket.subject}
                    </h2>

                    <div className="mt-3 flex flex-wrap items-center gap-3 text-[13px] text-slate-500">
                      <span>Status:</span>
                      <span className={`rounded-lg px-2 py-1 text-[12px] font-semibold ${statusClasses(selectedTicket.status)}`}>
                        {statusLabel(selectedTicket.status)}
                      </span>

                      <span>Priority:</span>
                      <span className={`rounded-lg px-2 py-1 text-[12px] font-semibold ${priorityClasses(selectedTicket.priority)}`}>
                        {priorityLabel(selectedTicket.priority)}
                      </span>

                      <span>Category:</span>
                      <span className="rounded-lg bg-slate-100 px-2 py-1 text-[12px] font-semibold text-slate-600">
                        {categoryLabel(selectedTicket.category)}
                      </span>

                      <span>{selectedTicketNumber}</span>
                      <span>Created {formatDateTime(selectedTicket.created_at)}</span>
                      <span>Updated {formatDateTime(selectedTicket.updated_at)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto bg-white">
                  <div className="divide-y divide-slate-100">
                    {visibleMessages.length > 0 ? (
                      visibleMessages.map((item) => {
                        const support = isSupportSender(item.sender)

                        return (
                          <div
                            key={item.id}
                            className={`grid grid-cols-[38px_minmax(0,1fr)] gap-4 px-6 py-5 ${
                              support ? "bg-blue-50/40" : "bg-white"
                            }`}
                          >
                            <div
                              className={`flex h-9 w-9 items-center justify-center rounded-full text-[12px] font-bold ${
                                support ? "bg-blue-600 text-white" : "bg-slate-600 text-white"
                              }`}
                            >
                              {support ? "L" : "M"}
                            </div>

                            <div className="min-w-0">
                              <div className="mb-2 flex flex-wrap items-center gap-2">
                                <span className="text-[14px] font-semibold text-slate-950">
                                  {support ? "Lexora Support" : "Me"}
                                </span>

                                <span
                                  className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                                    support ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"
                                  }`}
                                >
                                  {support ? "Support" : "Student"}
                                </span>

                                <span className="text-[13px] text-slate-400">
                                  {formatDateTime(item.created_at)}
                                </span>
                              </div>

                              <div className="whitespace-pre-wrap text-[15px] leading-7 text-slate-700">
                                {item.message}
                              </div>
                            </div>
                          </div>
                        )
                      })
                    ) : (
                      <div className="px-6 py-10 text-sm text-slate-500">
                        No public messages yet.
                      </div>
                    )}
                  </div>

                  {systemMessages.length > 0 && (
                    <div className="border-t border-slate-100 px-6 py-4">
                      <button
                        type="button"
                        onClick={() => setActivityOpen((value) => !value)}
                        className="flex w-full items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-left transition hover:bg-slate-100"
                      >
                        <div>
                          <div className="text-[14px] font-semibold text-slate-900">
                            Ticket activity
                          </div>
                          <div className="mt-0.5 text-[13px] text-slate-500">
                            {systemMessages.length} updates
                          </div>
                        </div>

                        <ChevronDown
                          size={17}
                          className={`text-slate-500 transition-transform ${
                            activityOpen ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      {activityOpen && (
                        <div className="mt-3 space-y-2">
                          {systemMessages.map((item) => (
                            <div
                              key={item.id}
                              className="grid grid-cols-[26px_minmax(0,1fr)] gap-3 py-2 text-[13px] text-slate-500"
                            >
                              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                                <Clock3 size={13} />
                              </div>

                              <div className="min-w-0">
                                <span>{item.message}</span>
                                <span className="mx-2 text-slate-300">·</span>
                                <span className="text-slate-400">
                                  {formatDateTime(item.created_at)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-100 bg-white px-6 py-5">
                  {selectedIsClosed ? (
                    <div className="flex items-start gap-2 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
                      <XCircle size={16} className="mt-0.5 shrink-0" />
                      <span>This ticket is closed. Create a new ticket if you need more help.</span>
                    </div>
                  ) : (
                    <div>
                      <div className="mb-3 text-sm font-semibold text-slate-950">
                        Reply
                      </div>

                      <textarea
                        value={replyText}
                        onChange={(event) => setReplyText(event.target.value)}
                        placeholder="Type your message..."
                        rows={4}
                        className="min-h-[112px] w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 outline-none transition-all duration-200 focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
                      />

                      <div className="mt-3 flex justify-end">
                        <button
                          type="button"
                          onClick={sendReply}
                          disabled={!replyText.trim() || replying}
                          className="flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white shadow-[0_12px_24px_-16px_rgba(15,23,42,0.7)] transition-all duration-200 hover:bg-slate-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-300"
                        >
                          {replying ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                          Send Reply
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex min-h-[760px] items-center justify-center p-8 text-center">
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
          </main>
        </div>
      </div>

      {newTicketOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-[600px] rounded-[26px] border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <div className="text-[20px] font-semibold tracking-[-0.03em] text-slate-950">
                  Create support ticket
                </div>
                <div className="mt-1 text-sm leading-6 text-slate-500">
                  Describe the issue clearly so support can help faster.
                </div>
              </div>

              <button
                type="button"
                onClick={() => setNewTicketOpen(false)}
                className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 active:scale-[0.98]"
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
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition-all duration-200 focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
                >
                  {categories.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              {category === "other" && (
                <div>
                  <label className="mb-1 block text-[12px] font-semibold text-slate-600">
                    Topic
                  </label>
                  <input
                    value={otherTopic}
                    onChange={(event) => setOtherTopic(event.target.value)}
                    placeholder="Example: Partnership, feedback, general question"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition-all duration-200 focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
                  />
                </div>
              )}

              <div>
                <label className="mb-1 block text-[12px] font-semibold text-slate-600">
                  Subject
                </label>
                <input
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  placeholder="Example: I cannot open Rule Training"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition-all duration-200 focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
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
                  className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 outline-none transition-all duration-200 focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setNewTicketOpen(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={createTicket}
                disabled={creating}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-slate-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-300"
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