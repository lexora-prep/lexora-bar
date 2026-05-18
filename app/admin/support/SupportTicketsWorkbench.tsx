"use client"

import { useMemo, useState, useTransition } from "react"
import {
  Check,
  ChevronDown,
  Filter,
  Inbox,
  LinkIcon,
  Paperclip,
  Search,
  Send,
  SlidersHorizontal,
  X,
} from "lucide-react"
import styles from "./SupportTicketsWorkbench.module.css"

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

type StatusFilter = "open" | "pending" | "resolved" | "closed" | "all"
type PriorityFilter = "all" | "normal" | "high"

const statusOptions = ["open", "pending", "resolved", "closed"] as const
const priorityOptions = ["normal", "high"] as const

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
    year: "numeric",
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
  const lastHumanMessage = [...ticket.messages]
    .reverse()
    .find((message) => message.sender.toLowerCase() !== "system")

  return lastHumanMessage?.message || "No message yet."
}

function ticketNumber(index: number) {
  if (index < 0) return "#TKT-0000"
  return `#TKT-${String(index + 1).padStart(4, "0")}`
}

function statusClass(status: string) {
  const normalized = normalizeStatus(status)

  if (normalized === "resolved") return `${styles.statusPill} ${styles.statusResolved}`
  if (normalized === "closed") return `${styles.statusPill} ${styles.statusClosed}`
  if (normalized === "pending") return `${styles.statusPill} ${styles.statusPending}`

  return `${styles.statusPill} ${styles.statusOpen}`
}

function priorityClass(priority: string) {
  return normalizePriority(priority) === "high"
    ? `${styles.priorityPill} ${styles.priorityHigh}`
    : `${styles.priorityPill} ${styles.priorityNormal}`
}

function miniPriorityClass(priority: string) {
  return normalizePriority(priority) === "high"
    ? styles.miniPriorityHigh
    : styles.miniPriorityNormal
}

function InfoRow({
  label,
  value,
  email = false,
}: {
  label: string
  value: string
  email?: boolean
}) {
  return (
    <div className={styles.infoRow}>
      <span className={styles.infoLabel}>{label}</span>
      <span className={email ? styles.infoValueEmail : styles.infoValue}>
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
  const [filter, setFilter] = useState<StatusFilter>("open")
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [query, setQuery] = useState("")
  const [replyText, setReplyText] = useState("")
  const [filterOpen, setFilterOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const categories = useMemo(() => {
    const values = Array.from(
      new Set(tickets.map((ticket) => ticket.category).filter(Boolean)),
    )

    return values.length ? values : ["billing"]
  }, [tickets])

  const filteredTickets = useMemo(() => {
    const search = query.trim().toLowerCase()

    return tickets.filter((ticket) => {
      const status = normalizeStatus(ticket.status)
      const priority = normalizePriority(ticket.priority)

      const matchesStatus = filter === "all" ? true : status === filter
      const matchesPriority =
        priorityFilter === "all" ? true : priority === priorityFilter
      const matchesCategory =
        categoryFilter === "all" ? true : ticket.category === categoryFilter

      const matchesSearch = search
        ? ticket.subject.toLowerCase().includes(search) ||
          ticket.email.toLowerCase().includes(search) ||
          ticket.category.toLowerCase().includes(search) ||
          getPreview(ticket).toLowerCase().includes(search)
        : true

      return matchesStatus && matchesPriority && matchesCategory && matchesSearch
    })
  }, [tickets, filter, priorityFilter, categoryFilter, query])

  const selectedTicket =
    tickets.find((ticket) => ticket.id === selectedTicketId) ||
    filteredTickets[0] ||
    tickets[0] ||
    null

  const selectedTicketIndex = selectedTicket
    ? tickets.findIndex((ticket) => ticket.id === selectedTicket.id)
    : -1

  const selectedStatus = selectedTicket
    ? normalizeStatus(selectedTicket.status)
    : "open"

  const selectedIsClosed = selectedStatus === "closed"
  const selectedIsResolved = selectedStatus === "resolved"

  function submitReply() {
    if (!selectedTicket || !replyText.trim() || selectedIsClosed) return

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
    if (!selectedTicket || selectedIsClosed) return

    const formData = new FormData()
    formData.set("ticketId", selectedTicket.id)
    formData.set("priority", priority)

    startTransition(async () => {
      await updatePriorityAction(formData)
    })
  }

  function resetFilters() {
    setPriorityFilter("all")
    setCategoryFilter("all")
    setQuery("")
  }

  return (
    <div className={styles.shell}>
      <aside className={styles.listPanel}>
        <div className={styles.listHeader}>
          <div className={styles.listTitleRow}>
            <div>
              <div className={styles.listTitle}>Tickets</div>
              <div className={styles.listSubtitle}>Customer support inbox</div>
            </div>

            <div className={styles.listHeaderIcons}>
              <button type="button" title="Sort" className={styles.smallIconButton}>
                <SlidersHorizontal size={14} />
              </button>

              <div className={styles.filterWrap}>
                <button
                  type="button"
                  title="Filter"
                  onClick={() => setFilterOpen((value) => !value)}
                  className={`${styles.smallIconButton} ${
                    filterOpen ||
                    priorityFilter !== "all" ||
                    categoryFilter !== "all"
                      ? styles.smallIconButtonActive
                      : ""
                  }`}
                >
                  <Filter size={14} />
                </button>

                {filterOpen ? (
                  <div className={styles.filterMenu}>
                    <div className={styles.filterMenuTitle}>Filter tickets</div>

                    <label className={styles.filterLabel}>
                      Priority
                      <select
                        value={priorityFilter}
                        onChange={(event) =>
                          setPriorityFilter(event.target.value as PriorityFilter)
                        }
                        className={styles.filterSelect}
                      >
                        <option value="all">All priorities</option>
                        <option value="normal">Normal</option>
                        <option value="high">High</option>
                      </select>
                    </label>

                    <label className={styles.filterLabel}>
                      Category
                      <select
                        value={categoryFilter}
                        onChange={(event) => setCategoryFilter(event.target.value)}
                        className={styles.filterSelect}
                      >
                        <option value="all">All categories</option>
                        {categories.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                    </label>

                    <button
                      type="button"
                      onClick={resetFilters}
                      className={styles.clearFiltersButton}
                    >
                      Clear filters
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className={styles.searchWrap}>
            <Search size={14} className={styles.searchIcon} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search tickets..."
              className={styles.searchInput}
            />
          </div>

          <div className={styles.tabs}>
            <button
              type="button"
              onClick={() => setFilter("open")}
              className={`${styles.tab} ${filter === "open" ? styles.tabActive : ""}`}
            >
              Open <span>{counts.open}</span>
            </button>

            <button
              type="button"
              onClick={() => setFilter("pending")}
              className={`${styles.tab} ${filter === "pending" ? styles.tabActive : ""}`}
            >
              Pending <span>{counts.pending}</span>
            </button>

            <button
              type="button"
              onClick={() => setFilter("resolved")}
              className={`${styles.tab} ${filter === "resolved" ? styles.tabActive : ""}`}
            >
              Resolved <span>{counts.resolved}</span>
            </button>

            <button
              type="button"
              onClick={() => setFilter("closed")}
              className={`${styles.tab} ${filter === "closed" ? styles.tabActive : ""}`}
            >
              Closed <span>{counts.closed}</span>
            </button>

            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`${styles.tab} ${filter === "all" ? styles.tabActive : ""}`}
            >
              All <span>{counts.all}</span>
            </button>
          </div>
        </div>

        <div className={styles.ticketList}>
          {filteredTickets.length === 0 ? (
            <div className={styles.emptyList}>No tickets found.</div>
          ) : (
            filteredTickets.map((ticket) => {
              const active = selectedTicket?.id === ticket.id
              const status = normalizeStatus(ticket.status)

              return (
                <button
                  key={ticket.id}
                  type="button"
                  onClick={() => setSelectedTicketId(ticket.id)}
                  className={`${styles.ticketItem} ${
                    active ? styles.ticketItemActive : ""
                  }`}
                >
                  <div className={styles.ticketTop}>
                    <span className={styles.ticketSubject}>{ticket.subject}</span>
                    <span className={styles.ticketTime}>
                      {formatShortTime(ticket.updated_at)}
                    </span>
                  </div>

                  <div className={styles.ticketMeta}>
                    <span className={styles.ticketEmail}>{ticket.email}</span>
                    <span className={statusClass(ticket.status)}>
                      {statusLabel(ticket.status)}
                    </span>
                    <span className={miniPriorityClass(ticket.priority)}>
                      {normalizePriority(ticket.priority)}
                    </span>
                  </div>

                  <div className={styles.ticketPreview}>{getPreview(ticket)}</div>

                  {status === "closed" ? (
                    <div className={styles.closedHint}>Closed thread</div>
                  ) : null}
                </button>
              )
            })
          )}
        </div>
      </aside>

      <main className={styles.mainPanel}>
        {selectedTicket ? (
          <>
            <header className={styles.threadHeader}>
              <div className={styles.threadTitleArea}>
                <div className={styles.threadTitle}>{selectedTicket.subject}</div>

                <div className={styles.pillGroup}>
                  <span className={statusClass(selectedTicket.status)}>
                    {statusLabel(selectedTicket.status)}
                  </span>
                  <span className={priorityClass(selectedTicket.priority)}>
                    {priorityLabel(selectedTicket.priority)}
                  </span>
                </div>
              </div>

              <div className={styles.headerActions}>
                <select
                  value={selectedStatus}
                  onChange={(event) => updateStatus(event.target.value)}
                  disabled={isPending}
                  className={styles.headerSelect}
                >
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {statusLabel(status)}
                    </option>
                  ))}
                </select>

                {!selectedIsResolved && !selectedIsClosed ? (
                  <button
                    type="button"
                    onClick={() => updateStatus("resolved")}
                    disabled={isPending}
                    className={styles.headerButton}
                  >
                    <Check size={12} />
                    Mark resolved
                  </button>
                ) : null}

                {selectedIsResolved ? (
                  <button
                    type="button"
                    onClick={() => updateStatus("closed")}
                    disabled={isPending}
                    className={styles.headerButtonDanger}
                  >
                    <X size={12} />
                    Close ticket
                  </button>
                ) : null}
              </div>
            </header>

            <div className={styles.threadBodyWrap}>
              <section className={styles.conversationArea}>
                <div className={styles.messages}>
                  <div className={styles.dateDivider}>
                    <div className={styles.line} />
                    <span>{formatDate(selectedTicket.created_at)}</span>
                    <div className={styles.line} />
                  </div>

                  {selectedTicket.messages.map((message) => {
                    const sender = message.sender.toLowerCase()
                    const isSupport = sender === "support"
                    const isSystem = sender === "system"

                    if (isSystem) {
                      return (
                        <div key={message.id} className={styles.systemEvent}>
                          <span>{message.message}</span>
                          <small>{formatDateTime(message.created_at)}</small>
                        </div>
                      )
                    }

                    return (
                      <div
                        key={message.id}
                        className={`${styles.messageBlock} ${
                          isSupport ? styles.supportMessageBlock : ""
                        }`}
                      >
                        <div
                          className={`${styles.messageMeta} ${
                            isSupport ? styles.supportMessageMeta : ""
                          }`}
                        >
                          <div
                            className={`${styles.messageAvatar} ${
                              isSupport ? styles.supportAvatar : styles.userAvatar
                            }`}
                          >
                            {isSupport ? "V" : safeInitials(selectedTicket.email)}
                          </div>

                          <span className={styles.messageSender}>
                            {isSupport
                              ? `${admin.fullName || "Vladimir"} · Support`
                              : selectedTicket.email}
                          </span>

                          <span className={styles.messageTime}>
                            {formatShortTime(message.created_at)}
                          </span>
                        </div>

                        <div
                          className={`${styles.messageBubble} ${
                            isSupport ? styles.supportBubble : styles.userBubble
                          }`}
                        >
                          {message.message}
                        </div>
                      </div>
                    )
                  })}

                  <div className={styles.ticketCreated}>
                    <span />
                    Ticket created · {formatDateTime(selectedTicket.created_at)}
                  </div>
                </div>

                <div className={styles.replyBox}>
                  {selectedIsClosed ? (
                    <div className={styles.closedReplyNotice}>
                      <div className={styles.closedReplyTitle}>
                        This ticket is closed.
                      </div>
                      <div className={styles.closedReplyText}>
                        The thread is locked. The user should open a new ticket if more help is needed.
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className={styles.replyToolbar}>
                        <button type="button" className={styles.replyTabActive}>
                          Reply
                        </button>

                        <button type="button" className={styles.replyTab}>
                          Internal note
                        </button>

                        <div className={styles.toolbarDivider} />

                        <button type="button" className={styles.toolbarButton}>
                          <strong>B</strong>
                        </button>

                        <button type="button" className={styles.toolbarButton}>
                          <em>I</em>
                        </button>

                        <button type="button" className={styles.toolbarButton}>
                          <LinkIcon size={13} />
                        </button>

                        <button type="button" className={styles.toolbarButton}>
                          <Paperclip size={13} />
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
                        className={styles.replyTextarea}
                      />

                      <div className={styles.replyFooter}>
                        <div className={styles.replyingAs}>
                          Replying as <strong>{admin.fullName || "Vladimir"}</strong> · Support
                        </div>

                        <div className={styles.replyActions}>
                          <button
                            type="button"
                            onClick={() => setReplyText("")}
                            className={styles.discardButton}
                          >
                            Discard
                          </button>

                          <button
                            type="button"
                            onClick={submitReply}
                            disabled={isPending || !replyText.trim()}
                            className={styles.sendButton}
                          >
                            <Send size={12} />
                            {isPending ? "Sending..." : "Send reply"}
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </section>

              <aside className={styles.infoPanel}>
                <div className={styles.infoSection}>
                  <div className={styles.infoSectionTitle}>Ticket info</div>
                  <InfoRow label="ID" value={ticketNumber(selectedTicketIndex)} />
                  <InfoRow label="Category" value={selectedTicket.category} />
                  <InfoRow label="Created" value={formatDateTime(selectedTicket.created_at)} />
                  <InfoRow label="Last update" value={formatDateTime(selectedTicket.updated_at)} />
                </div>

                <div className={styles.infoSection}>
                  <div className={styles.infoSectionTitle}>Priority</div>

                  <select
                    value={normalizePriority(selectedTicket.priority)}
                    onChange={(event) => updatePriority(event.target.value)}
                    disabled={isPending || selectedIsClosed}
                    className={styles.sideSelect}
                  >
                    {priorityOptions.map((priority) => (
                      <option key={priority} value={priority}>
                        {priorityLabel(priority)}
                      </option>
                    ))}
                  </select>

                  <div className={styles.statusTitle}>Status</div>

                  <select
                    value={selectedStatus}
                    onChange={(event) => updateStatus(event.target.value)}
                    disabled={isPending}
                    className={styles.sideSelect}
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {statusLabel(status)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.infoSection}>
                  <div className={styles.infoSectionTitle}>User</div>
                  <InfoRow label="Email" value={selectedTicket.email} email />
                  <InfoRow label="Plan" value={selectedTicket.userPlan} />
                  <InfoRow label="Member since" value={selectedTicket.memberSince} />
                </div>

                <div className={styles.infoSectionLast}>
                  <div className={styles.infoSectionTitle}>Quick actions</div>

                  {!selectedIsResolved && !selectedIsClosed ? (
                    <button
                      type="button"
                      onClick={() => updateStatus("resolved")}
                      disabled={isPending}
                      className={styles.resolveButton}
                    >
                      <Check size={11} />
                      Mark resolved
                    </button>
                  ) : null}

                  {!selectedIsClosed ? (
                    <button
                      type="button"
                      onClick={() => updateStatus("closed")}
                      disabled={isPending}
                      className={styles.closeButton}
                    >
                      <X size={11} />
                      Close ticket
                    </button>
                  ) : (
                    <div className={styles.closedSideNotice}>
                      Closed ticket. Replies are disabled.
                    </div>
                  )}

                  {selectedIsClosed ? (
                    <button
                      type="button"
                      onClick={() => updateStatus("open")}
                      disabled={isPending}
                      className={styles.reopenButton}
                    >
                      <ChevronDown size={11} />
                      Reopen ticket
                    </button>
                  ) : null}
                </div>
              </aside>
            </div>
          </>
        ) : (
          <div className={styles.noTicket}>
            <div className={styles.noTicketIcon}>
              <Inbox size={20} />
            </div>
            <div className={styles.noTicketTitle}>No ticket selected</div>
            <div className={styles.noTicketText}>Select a ticket from the left panel.</div>
          </div>
        )}
      </main>
    </div>
  )
}