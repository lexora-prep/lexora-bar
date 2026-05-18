"use client"

import { useEffect, useMemo, useRef, useState, useTransition } from "react"
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
  userId: string
  email: string
  userEmail: string
  userName: string | null
  userJurisdiction: string
  userExam: string
  userBillingStatus: string
  userIsBlocked: boolean
  userLastActiveAt: string | null
  userCreatedAt: string | null
  userTotalTicketCount: number
  userOpenTicketCount: number
  subject: string
  category: string
  status: string
  priority: string
  created_at: string
  updated_at: string
  userPlan: string
  memberSince: string
  assignedAdminName: string | null
  assignedAdminId: string | null
  lastUserMessageAt: string | null
  lastSupportReplyAt: string | null
  lastAdminReadAt: string | null
  resolvedAt: string | null
  closedAt: string | null
  slaDueAt: string | null
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
  unread: number
  slaAtRisk: number
}

type Props = {
  admin: AdminInfo
  tickets: SupportTicketForWorkbench[]
  counts: Counts
  replyAction: (formData: FormData) => Promise<void>
  updateStatusAction: (formData: FormData) => Promise<void>
  updatePriorityAction: (formData: FormData) => Promise<void>
  markReadAction: (formData: FormData) => Promise<void>
}

type StatusFilter = "open" | "pending" | "resolved" | "closed" | "all"
type PriorityFilter = "all" | "normal" | "high" | "urgent"
type SortMode =
  | "newest"
  | "oldest"
  | "high_priority"
  | "open_first"
  | "sla_soon"
  | "unread_first"
type ViewMode = "inbox" | "list"

const statusOptions = ["open", "pending", "resolved", "closed"] as const
const priorityOptions = ["normal", "high", "urgent"] as const

function formatShortTime(value: string | null | undefined) {
  if (!value) return ""

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date)
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Not available"

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Not available"

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date)
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Not available"

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

function safeInitials(ticket: SupportTicketForWorkbench) {
  const name = ticket.userName?.trim()

  if (name) {
    return (
      name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() || "")
        .join("") || "U"
    )
  }

  const local = ticket.userEmail.split("@")[0] || ticket.email.split("@")[0] || "U"
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
  const priority = value.toLowerCase()

  if (priority === "urgent") return "urgent"
  if (priority === "high") return "high"

  return "normal"
}

function statusLabel(value: string) {
  const status = normalizeStatus(value)

  if (status === "resolved") return "Resolved"
  if (status === "closed") return "Closed"
  if (status === "pending") return "Pending"

  return "Open"
}

function priorityLabel(value: string) {
  const priority = normalizePriority(value)

  if (priority === "urgent") return "Urgent"
  if (priority === "high") return "High"

  return "Normal"
}

function sortLabel(value: SortMode) {
  if (value === "oldest") return "Oldest first"
  if (value === "high_priority") return "Priority first"
  if (value === "open_first") return "Open first"
  if (value === "sla_soon") return "SLA soonest"
  if (value === "unread_first") return "Unread first"

  return "Newest first"
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

function displayUserName(ticket: SupportTicketForWorkbench) {
  if (ticket.userName && ticket.userName.trim()) return ticket.userName.trim()
  return ticket.userEmail || ticket.email
}

function displayUserLine(ticket: SupportTicketForWorkbench) {
  const name = ticket.userName?.trim()
  const email = ticket.userEmail || ticket.email

  if (name) return `${name} (${email})`
  return email
}

function statusClass(status: string) {
  const normalized = normalizeStatus(status)

  if (normalized === "resolved") {
    return `${styles.statusPill} ${styles.statusResolved}`
  }

  if (normalized === "closed") {
    return `${styles.statusPill} ${styles.statusClosed}`
  }

  if (normalized === "pending") {
    return `${styles.statusPill} ${styles.statusPending}`
  }

  return `${styles.statusPill} ${styles.statusOpen}`
}

function priorityClass(priority: string) {
  const normalized = normalizePriority(priority)

  if (normalized === "urgent") {
    return `${styles.priorityPill} ${styles.priorityHigh}`
  }

  if (normalized === "high") {
    return `${styles.priorityPill} ${styles.priorityHigh}`
  }

  return `${styles.priorityPill} ${styles.priorityNormal}`
}

function miniPriorityClass(priority: string) {
  const normalized = normalizePriority(priority)

  if (normalized === "urgent" || normalized === "high") {
    return styles.miniPriorityHigh
  }

  return styles.miniPriorityNormal
}

function getLastHumanMessage(ticket: SupportTicketForWorkbench) {
  return [...ticket.messages]
    .reverse()
    .find((message) => message.sender.toLowerCase() !== "system")
}

function isTicketUnread(ticket: SupportTicketForWorkbench) {
  const status = normalizeStatus(ticket.status)

  if (status === "closed" || status === "resolved") return false

  const latestHumanMessage = getLastHumanMessage(ticket)
  const latestHumanIsUser = latestHumanMessage?.sender.toLowerCase() === "user"

  const lastUserTime = ticket.lastUserMessageAt
    ? new Date(ticket.lastUserMessageAt).getTime()
    : 0

  const lastReadTime = ticket.lastAdminReadAt
    ? new Date(ticket.lastAdminReadAt).getTime()
    : 0

  return latestHumanIsUser && lastUserTime > lastReadTime
}

function slaInfo(ticket: SupportTicketForWorkbench) {
  const status = normalizeStatus(ticket.status)

  if (status === "closed") {
    return {
      label: "Closed",
      tone: "#64748b",
      background: "#f1f5f9",
      urgent: false,
      sortTime: Number.POSITIVE_INFINITY,
    }
  }

  if (status === "resolved") {
    return {
      label: "Resolved",
      tone: "#059669",
      background: "#ecfdf5",
      urgent: false,
      sortTime: Number.POSITIVE_INFINITY,
    }
  }

  if (!ticket.slaDueAt) {
    return {
      label: "No SLA",
      tone: "#64748b",
      background: "#f8fafc",
      urgent: false,
      sortTime: Number.POSITIVE_INFINITY,
    }
  }

  const due = new Date(ticket.slaDueAt).getTime()

  if (Number.isNaN(due)) {
    return {
      label: "No SLA",
      tone: "#64748b",
      background: "#f8fafc",
      urgent: false,
      sortTime: Number.POSITIVE_INFINITY,
    }
  }

  const diffMs = due - Date.now()
  const diffMinutes = Math.round(diffMs / 60000)

  if (diffMinutes <= 0) {
    return {
      label: "Overdue",
      tone: "#dc2626",
      background: "#fef2f2",
      urgent: true,
      sortTime: due,
    }
  }

  if (diffMinutes < 60) {
    return {
      label: `${diffMinutes}m left`,
      tone: "#dc2626",
      background: "#fff1f2",
      urgent: true,
      sortTime: due,
    }
  }

  const hours = Math.round(diffMinutes / 60)

  if (hours <= 4) {
    return {
      label: `${hours}h left`,
      tone: "#c2410c",
      background: "#fff7ed",
      urgent: true,
      sortTime: due,
    }
  }

  return {
    label: `${hours}h left`,
    tone: "#2563eb",
    background: "#eff6ff",
    urgent: false,
    sortTime: due,
  }
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
  markReadAction,
}: Props) {
  const [selectedTicketId, setSelectedTicketId] = useState(tickets[0]?.id || "")
  const [filter, setFilter] = useState<StatusFilter>("open")
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [draftPriorityFilter, setDraftPriorityFilter] =
    useState<PriorityFilter>("all")
  const [draftCategoryFilter, setDraftCategoryFilter] = useState("all")
  const [sortMode, setSortMode] = useState<SortMode>("newest")
  const [viewMode, setViewMode] = useState<ViewMode>("inbox")
  const [query, setQuery] = useState("")
  const [replyText, setReplyText] = useState("")
  const [filterOpen, setFilterOpen] = useState(false)
  const [sortOpen, setSortOpen] = useState(false)
  const [profileDrawerTicketId, setProfileDrawerTicketId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const filterRef = useRef<HTMLDivElement | null>(null)
  const sortRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node

      if (filterRef.current && !filterRef.current.contains(target)) {
        setFilterOpen(false)
      }

      if (sortRef.current && !sortRef.current.contains(target)) {
        setSortOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    if (filterOpen) {
      setDraftPriorityFilter(priorityFilter)
      setDraftCategoryFilter(categoryFilter)
    }
  }, [filterOpen, priorityFilter, categoryFilter])

  const categories = useMemo(() => {
    const values = Array.from(
      new Set(tickets.map((ticket) => ticket.category).filter(Boolean)),
    )

    return values.length ? values : ["billing"]
  }, [tickets])

  const activeFilterCount = useMemo(() => {
    let count = 0

    if (priorityFilter !== "all") count += 1
    if (categoryFilter !== "all") count += 1

    return count
  }, [priorityFilter, categoryFilter])

  function ticketMatchesSearchAndSecondaryFilters(ticket: SupportTicketForWorkbench) {
    const search = query.trim().toLowerCase()
    const priority = normalizePriority(ticket.priority)

    const matchesPriority =
      priorityFilter === "all" ? true : priority === priorityFilter

    const matchesCategory =
      categoryFilter === "all" ? true : ticket.category === categoryFilter

    const matchesSearch = search
      ? ticket.subject.toLowerCase().includes(search) ||
        ticket.email.toLowerCase().includes(search) ||
        ticket.userEmail.toLowerCase().includes(search) ||
        String(ticket.userName || "").toLowerCase().includes(search) ||
        ticket.category.toLowerCase().includes(search) ||
        ticket.id.toLowerCase().includes(search) ||
        getPreview(ticket).toLowerCase().includes(search)
      : true

    return matchesPriority && matchesCategory && matchesSearch
  }

  const ticketsAfterSearchAndSecondaryFilters = useMemo(() => {
    return tickets.filter(ticketMatchesSearchAndSecondaryFilters)
  }, [tickets, query, priorityFilter, categoryFilter])

  const visibleCounts = useMemo(() => {
    const result = {
      open: 0,
      pending: 0,
      resolved: 0,
      closed: 0,
      all: ticketsAfterSearchAndSecondaryFilters.length,
    }

    ticketsAfterSearchAndSecondaryFilters.forEach((ticket) => {
      const status = normalizeStatus(ticket.status)

      if (status === "open") result.open += 1
      if (status === "pending") result.pending += 1
      if (status === "resolved") result.resolved += 1
      if (status === "closed") result.closed += 1
    })

    return result
  }, [ticketsAfterSearchAndSecondaryFilters])

  const filteredTickets = useMemo(() => {
    const filtered = ticketsAfterSearchAndSecondaryFilters.filter((ticket) => {
      const status = normalizeStatus(ticket.status)
      return filter === "all" ? true : status === filter
    })

    return [...filtered].sort((a, b) => {
      if (sortMode === "oldest") {
        return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()
      }

      if (sortMode === "high_priority") {
        const weight = (ticket: SupportTicketForWorkbench) => {
          const priority = normalizePriority(ticket.priority)
          if (priority === "urgent") return 3
          if (priority === "high") return 2
          return 1
        }

        const aWeight = weight(a)
        const bWeight = weight(b)

        if (aWeight !== bWeight) return bWeight - aWeight
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      }

      if (sortMode === "open_first") {
        const statusWeight: Record<string, number> = {
          open: 4,
          pending: 3,
          resolved: 2,
          closed: 1,
        }

        const aWeight = statusWeight[normalizeStatus(a.status)] || 0
        const bWeight = statusWeight[normalizeStatus(b.status)] || 0

        if (aWeight !== bWeight) return bWeight - aWeight
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      }

      if (sortMode === "sla_soon") {
        return slaInfo(a).sortTime - slaInfo(b).sortTime
      }

      if (sortMode === "unread_first") {
        const aUnread = isTicketUnread(a) ? 1 : 0
        const bUnread = isTicketUnread(b) ? 1 : 0

        if (aUnread !== bUnread) return bUnread - aUnread
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      }

      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    })
  }, [ticketsAfterSearchAndSecondaryFilters, filter, sortMode])

  useEffect(() => {
    if (filteredTickets.length === 0) return

    const selectedStillVisible = filteredTickets.some(
      (ticket) => ticket.id === selectedTicketId,
    )

    if (!selectedStillVisible) {
      setSelectedTicketId(filteredTickets[0].id)
    }
  }, [filteredTickets, selectedTicketId])

  const selectedTicket =
    tickets.find((ticket) => ticket.id === selectedTicketId) ||
    filteredTickets[0] ||
    tickets[0] ||
    null

  const profileDrawerTicket =
    tickets.find((ticket) => ticket.id === profileDrawerTicketId) || null

  const selectedTicketIndex = selectedTicket
    ? tickets.findIndex((ticket) => ticket.id === selectedTicket.id)
    : -1

  const selectedStatus = selectedTicket
    ? normalizeStatus(selectedTicket.status)
    : "open"

  const selectedIsClosed = selectedStatus === "closed"
  const selectedIsResolved = selectedStatus === "resolved"

  function applyFilters() {
    setPriorityFilter(draftPriorityFilter)
    setCategoryFilter(draftCategoryFilter)
    setFilterOpen(false)
  }

  function clearFilters() {
    setDraftPriorityFilter("all")
    setDraftCategoryFilter("all")
    setPriorityFilter("all")
    setCategoryFilter("all")
    setFilterOpen(false)
  }

  function closeFilterMenu() {
    setDraftPriorityFilter(priorityFilter)
    setDraftCategoryFilter(categoryFilter)
    setFilterOpen(false)
  }

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

  function markTicketRead(ticket: SupportTicketForWorkbench) {
    const formData = new FormData()
    formData.set("ticketId", ticket.id)

    startTransition(async () => {
      await markReadAction(formData)
    })
  }

  function selectTicket(ticket: SupportTicketForWorkbench) {
    setSelectedTicketId(ticket.id)

    if (isTicketUnread(ticket)) {
      markTicketRead(ticket)
    }
  }

  function openTicketFromList(ticket: SupportTicketForWorkbench) {
    setSelectedTicketId(ticket.id)
    setViewMode("inbox")

    if (isTicketUnread(ticket)) {
      markTicketRead(ticket)
    }
  }

  function openUserDrawer(ticket: SupportTicketForWorkbench) {
    setProfileDrawerTicketId(ticket.id)
  }

  return (
    <div className={styles.shell}>
      <aside className={styles.listPanel}>
        <div className={styles.listHeader}>
          <div className={styles.listTitleRow}>
            <div>
              <div className={styles.listTitle}>Tickets</div>
              <div className={styles.listSubtitle}>
                Customer support inbox · Unread {counts.unread} · SLA risk {counts.slaAtRisk}
              </div>
            </div>

            <div className={styles.listHeaderIcons}>
              <div ref={sortRef} className={styles.filterWrap}>
                <button
                  type="button"
                  title="Sort tickets"
                  onClick={() => {
                    setSortOpen((value) => !value)
                    setFilterOpen(false)
                  }}
                  className={`${styles.smallIconButton} ${
                    sortOpen || sortMode !== "newest"
                      ? styles.smallIconButtonActive
                      : ""
                  }`}
                >
                  <SlidersHorizontal size={14} />
                </button>

                {sortOpen ? (
                  <div className={styles.compactMenu}>
                    <div className={styles.compactMenuHeader}>
                      <div>
                        <div className={styles.compactMenuTitle}>Sort tickets</div>
                        <div className={styles.compactMenuSubtitle}>
                          Current: {sortLabel(sortMode)}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSortOpen(false)}
                        className={styles.popoverCloseButton}
                      >
                        <X size={13} />
                      </button>
                    </div>

                    <div className={styles.sortOptions}>
                      {(
                        [
                          "newest",
                          "oldest",
                          "high_priority",
                          "open_first",
                          "sla_soon",
                          "unread_first",
                        ] as SortMode[]
                      ).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => {
                            setSortMode(mode)
                            setSortOpen(false)
                          }}
                          className={`${styles.sortOption} ${
                            sortMode === mode ? styles.sortOptionActive : ""
                          }`}
                        >
                          <span>{sortLabel(mode)}</span>
                          {sortMode === mode ? <Check size={13} /> : null}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              <div ref={filterRef} className={styles.filterWrap}>
                <button
                  type="button"
                  title="Filter tickets"
                  onClick={() => {
                    setFilterOpen((value) => !value)
                    setSortOpen(false)
                  }}
                  className={`${styles.smallIconButton} ${
                    filterOpen || activeFilterCount > 0
                      ? styles.smallIconButtonActive
                      : ""
                  }`}
                >
                  <Filter size={14} />
                  {activeFilterCount > 0 ? (
                    <span className={styles.filterDot}>{activeFilterCount}</span>
                  ) : null}
                </button>

                {filterOpen ? (
                  <div className={styles.filterMenu}>
                    <div className={styles.compactMenuHeader}>
                      <div>
                        <div className={styles.compactMenuTitle}>Filter tickets</div>
                        <div className={styles.compactMenuSubtitle}>
                          Choose filters, then apply
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={closeFilterMenu}
                        className={styles.popoverCloseButton}
                      >
                        <X size={13} />
                      </button>
                    </div>

                    <label className={styles.filterLabel}>
                      <span>Priority</span>
                      <select
                        value={draftPriorityFilter}
                        onChange={(event) =>
                          setDraftPriorityFilter(event.target.value as PriorityFilter)
                        }
                        className={styles.filterSelect}
                      >
                        <option value="all">All priorities</option>
                        <option value="normal">Normal</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </label>

                    <label className={styles.filterLabel}>
                      <span>Category</span>
                      <select
                        value={draftCategoryFilter}
                        onChange={(event) => setDraftCategoryFilter(event.target.value)}
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

                    <div className={styles.filterActions}>
                      <button
                        type="button"
                        onClick={clearFilters}
                        className={styles.clearTextButton}
                      >
                        Clear
                      </button>

                      <div className={styles.filterActionRight}>
                        <button
                          type="button"
                          onClick={closeFilterMenu}
                          className={styles.cancelButton}
                        >
                          Cancel
                        </button>

                        <button
                          type="button"
                          onClick={applyFilters}
                          className={styles.applyButton}
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 6,
              marginBottom: 12,
            }}
          >
            <button
              type="button"
              onClick={() => setViewMode("inbox")}
              style={{
                height: 32,
                border: "1px solid rgba(148, 163, 184, 0.18)",
                borderRadius: 9,
                background:
                  viewMode === "inbox"
                    ? "rgba(96, 165, 250, 0.16)"
                    : "rgba(255, 255, 255, 0.04)",
                color: viewMode === "inbox" ? "#bfdbfe" : "#94a3b8",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Inbox
            </button>

            <button
              type="button"
              onClick={() => setViewMode("list")}
              style={{
                height: 32,
                border: "1px solid rgba(148, 163, 184, 0.18)",
                borderRadius: 9,
                background:
                  viewMode === "list"
                    ? "rgba(96, 165, 250, 0.16)"
                    : "rgba(255, 255, 255, 0.04)",
                color: viewMode === "list" ? "#bfdbfe" : "#94a3b8",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              List
            </button>
          </div>

          <div className={styles.searchWrap}>
            <Search size={14} className={styles.searchIcon} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search tickets, user, email, topic..."
              className={styles.searchInput}
            />
          </div>

          <div className={styles.tabs}>
            <button
              type="button"
              onClick={() => setFilter("open")}
              className={`${styles.tab} ${filter === "open" ? styles.tabActive : ""}`}
            >
              Open <span>{visibleCounts.open}</span>
            </button>

            <button
              type="button"
              onClick={() => setFilter("pending")}
              className={`${styles.tab} ${filter === "pending" ? styles.tabActive : ""}`}
            >
              Pending <span>{visibleCounts.pending}</span>
            </button>

            <button
              type="button"
              onClick={() => setFilter("resolved")}
              className={`${styles.tab} ${filter === "resolved" ? styles.tabActive : ""}`}
            >
              Resolved <span>{visibleCounts.resolved}</span>
            </button>

            <button
              type="button"
              onClick={() => setFilter("closed")}
              className={`${styles.tab} ${filter === "closed" ? styles.tabActive : ""}`}
            >
              Closed <span>{visibleCounts.closed}</span>
            </button>

            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`${styles.tab} ${filter === "all" ? styles.tabActive : ""}`}
            >
              All <span>{visibleCounts.all}</span>
            </button>
          </div>
        </div>

        <div className={styles.ticketList}>
          {filteredTickets.length === 0 ? (
            <div className={styles.emptyList}>
              {activeFilterCount > 0 || query.trim()
                ? "No tickets match these filters."
                : "No tickets found."}
            </div>
          ) : (
            filteredTickets.map((ticket) => {
              const active = selectedTicket?.id === ticket.id
              const status = normalizeStatus(ticket.status)
              const unread = isTicketUnread(ticket)
              const sla = slaInfo(ticket)

              return (
                <button
                  key={ticket.id}
                  type="button"
                  onClick={() => selectTicket(ticket)}
                  className={`${styles.ticketItem} ${
                    active ? styles.ticketItemActive : ""
                  }`}
                >
                  <div className={styles.ticketTop}>
                    <span className={styles.ticketSubject}>
                      {unread ? (
                        <span
                          style={{
                            display: "inline-block",
                            width: 7,
                            height: 7,
                            borderRadius: 99,
                            background: "#ef4444",
                            marginRight: 7,
                            verticalAlign: "middle",
                          }}
                        />
                      ) : null}
                      {ticket.subject}
                    </span>
                    <span className={styles.ticketTime}>
                      {formatShortTime(ticket.updated_at)}
                    </span>
                  </div>

                  <div className={styles.ticketMeta}>
                    <span className={styles.ticketEmail}>
                      {displayUserLine(ticket)}
                    </span>
                    <span>{statusLabel(ticket.status)} thread</span>
                    <span className={miniPriorityClass(ticket.priority)}>
                      {priorityLabel(ticket.priority)} priority
                    </span>
                    <span style={{ color: sla.tone }}>{sla.label}</span>
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
        {viewMode === "list" ? (
          <section
            style={{
              height: "100%",
              overflow: "auto",
              background: "#f7f9fc",
              padding: 22,
            }}
          >
            <div
              style={{
                background: "#ffffff",
                border: "1px solid #dbe5f2",
                borderRadius: 14,
                overflow: "hidden",
                boxShadow: "0 8px 24px rgba(15, 23, 42, 0.04)",
              }}
            >
              <div
                style={{
                  padding: "16px 18px",
                  borderBottom: "1px solid #dbe5f2",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 16,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 17,
                      fontWeight: 650,
                      color: "#0f172a",
                      letterSpacing: "-0.02em",
                    }}
                  >
                    Ticket list
                  </div>
                  <div style={{ marginTop: 3, color: "#64748b", fontSize: 12.5 }}>
                    {filteredTickets.length} tickets shown · {counts.unread} unread ·{" "}
                    {counts.slaAtRisk} SLA risk
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setViewMode("inbox")}
                  style={{
                    height: 34,
                    borderRadius: 9,
                    border: "1px solid #dbe5f2",
                    background: "white",
                    color: "#475569",
                    padding: "0 13px",
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Back to inbox
                </button>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    minWidth: 980,
                    fontSize: 13,
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        background: "#f8fafc",
                        color: "#64748b",
                        textAlign: "left",
                        borderBottom: "1px solid #dbe5f2",
                      }}
                    >
                      {[
                        "ID",
                        "Subject",
                        "User",
                        "Status",
                        "Priority",
                        "SLA",
                        "Unread",
                        "Assigned",
                        "Updated",
                        "Action",
                      ].map((heading) => (
                        <th
                          key={heading}
                          style={{
                            padding: "11px 12px",
                            fontSize: 11,
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.08em",
                          }}
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {filteredTickets.map((ticket) => {
                      const index = tickets.findIndex((item) => item.id === ticket.id)
                      const sla = slaInfo(ticket)
                      const unread = isTicketUnread(ticket)

                      return (
                        <tr
                          key={ticket.id}
                          style={{
                            borderBottom: "1px solid #edf2f7",
                            background:
                              selectedTicket?.id === ticket.id ? "#fbfdff" : "#ffffff",
                          }}
                        >
                          <td style={{ padding: "12px", color: "#64748b" }}>
                            {ticketNumber(index)}
                          </td>

                          <td style={{ padding: "12px", color: "#0f172a" }}>
                            <div style={{ fontWeight: 550 }}>{ticket.subject}</div>
                            <div
                              style={{
                                marginTop: 3,
                                color: "#94a3b8",
                                fontSize: 12,
                                maxWidth: 250,
                                overflow: "hidden",
                                whiteSpace: "nowrap",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {getPreview(ticket)}
                            </div>
                          </td>

                          <td style={{ padding: "12px" }}>
                            <button
                              type="button"
                              onClick={() => openUserDrawer(ticket)}
                              style={{
                                border: 0,
                                background: "transparent",
                                padding: 0,
                                textAlign: "left",
                                cursor: "pointer",
                              }}
                            >
                              <div style={{ color: "#0f172a", fontWeight: 550 }}>
                                {displayUserName(ticket)}
                              </div>
                              <div style={{ marginTop: 3, color: "#64748b", fontSize: 12 }}>
                                {ticket.userEmail}
                              </div>
                            </button>
                          </td>

                          <td style={{ padding: "12px", color: "#475569" }}>
                            {statusLabel(ticket.status)}
                          </td>

                          <td style={{ padding: "12px", color: "#475569" }}>
                            {priorityLabel(ticket.priority)}
                          </td>

                          <td style={{ padding: "12px" }}>
                            <span
                              style={{
                                display: "inline-flex",
                                borderRadius: 8,
                                padding: "4px 8px",
                                background: sla.background,
                                color: sla.tone,
                                fontWeight: 650,
                                fontSize: 12,
                              }}
                            >
                              {sla.label}
                            </span>
                          </td>

                          <td style={{ padding: "12px" }}>
                            {unread ? (
                              <span style={{ color: "#dc2626", fontWeight: 650 }}>
                                Unread
                              </span>
                            ) : (
                              <span style={{ color: "#94a3b8" }}>Read</span>
                            )}
                          </td>

                          <td style={{ padding: "12px", color: "#64748b" }}>
                            {ticket.assignedAdminName || "Unassigned"}
                          </td>

                          <td style={{ padding: "12px", color: "#64748b" }}>
                            {formatDateTime(ticket.updated_at)}
                          </td>

                          <td style={{ padding: "12px" }}>
                            <button
                              type="button"
                              onClick={() => openTicketFromList(ticket)}
                              style={{
                                height: 30,
                                borderRadius: 8,
                                border: "1px solid #bfdbfe",
                                background: "#eff6ff",
                                color: "#2563eb",
                                padding: "0 11px",
                                fontSize: 12,
                                fontWeight: 650,
                                cursor: "pointer",
                              }}
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        ) : selectedTicket ? (
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
                          <button
                            type="button"
                            onClick={() =>
                              !isSupport ? openUserDrawer(selectedTicket) : undefined
                            }
                            className={`${styles.messageAvatar} ${
                              isSupport ? styles.supportAvatar : styles.userAvatar
                            }`}
                            style={{
                              border: 0,
                              cursor: isSupport ? "default" : "pointer",
                            }}
                          >
                            {isSupport ? "V" : safeInitials(selectedTicket)}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              !isSupport ? openUserDrawer(selectedTicket) : undefined
                            }
                            className={styles.messageSender}
                            style={{
                              border: 0,
                              background: "transparent",
                              padding: 0,
                              cursor: isSupport ? "default" : "pointer",
                              textAlign: "left",
                            }}
                          >
                            {isSupport
                              ? `${admin.fullName || "Vladimir"} · Support`
                              : displayUserLine(selectedTicket)}
                          </button>

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
                  <InfoRow label="SLA" value={slaInfo(selectedTicket).label} />
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

                  <button
                    type="button"
                    onClick={() => openUserDrawer(selectedTicket)}
                    style={{
                      width: "100%",
                      border: "1px solid #dbe5f2",
                      borderRadius: 10,
                      background: "#fbfdff",
                      padding: 10,
                      textAlign: "left",
                      cursor: "pointer",
                      marginBottom: 10,
                    }}
                  >
                    <div style={{ color: "#0f172a", fontSize: 12.5, fontWeight: 650 }}>
                      {displayUserName(selectedTicket)}
                    </div>
                    <div style={{ color: "#64748b", fontSize: 11.5, marginTop: 3 }}>
                      {selectedTicket.userEmail}
                    </div>
                  </button>

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

      {profileDrawerTicket ? (
        <>
          <button
            type="button"
            aria-label="Close user profile drawer"
            onClick={() => setProfileDrawerTicketId(null)}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 80,
              border: 0,
              background: "rgba(15, 23, 42, 0.28)",
              cursor: "default",
            }}
          />

          <aside
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              bottom: 0,
              zIndex: 90,
              width: 390,
              maxWidth: "92vw",
              background: "#ffffff",
              borderLeft: "1px solid #dbe5f2",
              boxShadow: "-22px 0 55px rgba(15, 23, 42, 0.18)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                padding: "18px 18px 16px",
                borderBottom: "1px solid #dbe5f2",
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div>
                <div
                  style={{
                    color: "#0f172a",
                    fontSize: 17,
                    fontWeight: 650,
                    letterSpacing: "-0.02em",
                  }}
                >
                  User profile
                </div>
                <div style={{ color: "#64748b", fontSize: 12.5, marginTop: 3 }}>
                  Support context and account details
                </div>
              </div>

              <button
                type="button"
                onClick={() => setProfileDrawerTicketId(null)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 9,
                  border: "1px solid #dbe5f2",
                  background: "#f8fafc",
                  color: "#64748b",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <X size={14} />
              </button>
            </div>

            <div style={{ padding: 18, overflowY: "auto" }}>
              <div
                style={{
                  border: "1px solid #dbe5f2",
                  borderRadius: 14,
                  padding: 14,
                  background: "#fbfdff",
                  marginBottom: 14,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 999,
                      background: "#2563eb",
                      color: "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 13,
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {safeInitials(profileDrawerTicket)}
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        color: "#0f172a",
                        fontSize: 15,
                        fontWeight: 650,
                        overflow: "hidden",
                        whiteSpace: "nowrap",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {displayUserName(profileDrawerTicket)}
                    </div>
                    <div
                      style={{
                        color: "#64748b",
                        fontSize: 12.5,
                        marginTop: 3,
                        overflow: "hidden",
                        whiteSpace: "nowrap",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {profileDrawerTicket.userEmail}
                    </div>
                  </div>
                </div>

                {profileDrawerTicket.userIsBlocked ? (
                  <div
                    style={{
                      marginTop: 12,
                      borderRadius: 9,
                      background: "#fef2f2",
                      color: "#dc2626",
                      padding: "8px 10px",
                      fontSize: 12,
                      fontWeight: 650,
                    }}
                  >
                    This account is blocked.
                  </div>
                ) : null}
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                {[
                  ["User ID", profileDrawerTicket.userId],
                  ["Plan", profileDrawerTicket.userPlan],
                  ["Billing status", profileDrawerTicket.userBillingStatus],
                  ["Jurisdiction", profileDrawerTicket.userJurisdiction],
                  ["Exam", profileDrawerTicket.userExam],
                  ["Member since", profileDrawerTicket.memberSince],
                  ["Last active", formatDateTime(profileDrawerTicket.userLastActiveAt)],
                  ["Total tickets", String(profileDrawerTicket.userTotalTicketCount)],
                  ["Open tickets", String(profileDrawerTicket.userOpenTicketCount)],
                  ["Current ticket", profileDrawerTicket.subject],
                  ["Current ticket status", statusLabel(profileDrawerTicket.status)],
                  ["Current ticket priority", priorityLabel(profileDrawerTicket.priority)],
                  ["Current ticket SLA", slaInfo(profileDrawerTicket).label],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    style={{
                      borderBottom: "1px solid #edf2f7",
                      paddingBottom: 9,
                    }}
                  >
                    <div
                      style={{
                        color: "#94a3b8",
                        fontSize: 11,
                        fontWeight: 650,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                      }}
                    >
                      {label}
                    </div>
                    <div
                      style={{
                        color: "#334155",
                        fontSize: 13,
                        fontWeight: 550,
                        marginTop: 4,
                        wordBreak: "break-word",
                      }}
                    >
                      {value || "Not available"}
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedTicketId(profileDrawerTicket.id)
                  setViewMode("inbox")
                  setProfileDrawerTicketId(null)
                }}
                style={{
                  marginTop: 18,
                  width: "100%",
                  height: 38,
                  borderRadius: 10,
                  border: 0,
                  background: "#2563eb",
                  color: "white",
                  fontSize: 13,
                  fontWeight: 650,
                  cursor: "pointer",
                }}
              >
                Open this ticket
              </button>
            </div>
          </aside>
        </>
      ) : null}
    </div>
  )
}