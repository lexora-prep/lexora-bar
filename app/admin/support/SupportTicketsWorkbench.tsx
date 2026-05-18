"use client"

import { useEffect, useMemo, useRef, useState, useTransition } from "react"
import {
  AlertCircle,
  Bot,
  Check,
  ChevronDown,
  Clock3,
  Filter,
  Inbox,
  LinkIcon,
  Lock,
  Mail,
  MessageSquare,
  Paperclip,
  Search,
  Send,
  SlidersHorizontal,
  Sparkles,
  Tag,
  UserRound,
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
type SideTab = "details" | "copilot"

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
      tone: "muted",
      urgent: false,
      sortTime: Number.POSITIVE_INFINITY,
    }
  }

  if (status === "resolved") {
    return {
      label: "Resolved",
      tone: "good",
      urgent: false,
      sortTime: Number.POSITIVE_INFINITY,
    }
  }

  if (!ticket.slaDueAt) {
    return {
      label: "No SLA",
      tone: "muted",
      urgent: false,
      sortTime: Number.POSITIVE_INFINITY,
    }
  }

  const due = new Date(ticket.slaDueAt).getTime()

  if (Number.isNaN(due)) {
    return {
      label: "No SLA",
      tone: "muted",
      urgent: false,
      sortTime: Number.POSITIVE_INFINITY,
    }
  }

  const diffMs = due - Date.now()
  const diffMinutes = Math.round(diffMs / 60000)

  if (diffMinutes <= 0) {
    return {
      label: "Overdue",
      tone: "danger",
      urgent: true,
      sortTime: due,
    }
  }

  if (diffMinutes < 60) {
    return {
      label: `${diffMinutes}m left`,
      tone: "danger",
      urgent: true,
      sortTime: due,
    }
  }

  const hours = Math.round(diffMinutes / 60)

  if (hours <= 4) {
    return {
      label: `${hours}h left`,
      tone: "warning",
      urgent: true,
      sortTime: due,
    }
  }

  return {
    label: `${hours}h left`,
    tone: "info",
    urgent: false,
    sortTime: due,
  }
}

function urgencyLabel(ticket: SupportTicketForWorkbench) {
  const priority = normalizePriority(ticket.priority)
  const sla = slaInfo(ticket)

  if (sla.tone === "danger") return "Critical"
  if (priority === "urgent") return "Urgent"
  if (priority === "high" || sla.tone === "warning") return "High"
  return "Normal"
}

function statusClass(status: string) {
  const normalized = normalizeStatus(status)

  if (normalized === "resolved") return `${styles.dotText} ${styles.dotGood}`
  if (normalized === "closed") return `${styles.dotText} ${styles.dotMuted}`
  if (normalized === "pending") return `${styles.dotText} ${styles.dotWarning}`

  return `${styles.dotText} ${styles.dotInfo}`
}

function priorityClass(priority: string) {
  const normalized = normalizePriority(priority)

  if (normalized === "urgent") return `${styles.dotText} ${styles.dotDanger}`
  if (normalized === "high") return `${styles.dotText} ${styles.dotDanger}`

  return `${styles.dotText} ${styles.dotWarning}`
}

function slaClass(ticket: SupportTicketForWorkbench) {
  const sla = slaInfo(ticket)

  if (sla.tone === "danger") return `${styles.dotText} ${styles.dotDanger}`
  if (sla.tone === "warning") return `${styles.dotText} ${styles.dotWarning}`
  if (sla.tone === "good") return `${styles.dotText} ${styles.dotGood}`
  if (sla.tone === "info") return `${styles.dotText} ${styles.dotInfo}`

  return `${styles.dotText} ${styles.dotMuted}`
}

function planClass(plan: string) {
  const normalized = plan.toLowerCase()

  if (normalized.includes("premium") || normalized.includes("pro")) {
    return `${styles.planBadge} ${styles.planBadgePremium}`
  }

  if (normalized.includes("trial")) {
    return `${styles.planBadge} ${styles.planBadgeTrial}`
  }

  return `${styles.planBadge} ${styles.planBadgeFree}`
}

function compactPlanLabel(plan: string) {
  if (!plan || plan === "free") return "Free"
  return plan
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function DetailRow({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: "good" | "warning" | "danger" | "info" | "muted"
}) {
  return (
    <div className={styles.detailRow}>
      <span className={styles.detailLabel}>{label}</span>
      <span
        className={`${styles.detailValue} ${
          tone === "good"
            ? styles.detailGood
            : tone === "warning"
              ? styles.detailWarning
              : tone === "danger"
                ? styles.detailDanger
                : tone === "info"
                  ? styles.detailInfo
                  : tone === "muted"
                    ? styles.detailMuted
                    : ""
        }`}
      >
        {value}
      </span>
    </div>
  )
}

function SectionTitle({
  icon,
  title,
}: {
  icon?: React.ReactNode
  title: string
}) {
  return (
    <div className={styles.sideSectionTitle}>
      {icon}
      <span>{title}</span>
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
  const [sideTab, setSideTab] = useState<SideTab>("details")
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

  const ticketsAfterSearchAndSecondaryFilters = useMemo(() => {
    const search = query.trim().toLowerCase()

    return tickets.filter((ticket) => {
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
    })
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
      <aside className={styles.leftRail}>
        <div className={styles.railHeader}>
          <div className={styles.railTitle}>Support</div>
          <div className={styles.railSubtitle}>Inbox workspace</div>
        </div>

        <button
          type="button"
          onClick={() => {
            setFilter("open")
            setViewMode("inbox")
          }}
          className={`${styles.railItem} ${filter === "open" ? styles.railItemActive : ""}`}
        >
          <Inbox size={14} />
          <span>Open tickets</span>
          <strong>{visibleCounts.open}</strong>
        </button>

        <button
          type="button"
          onClick={() => {
            setSortMode("unread_first")
            setViewMode("inbox")
          }}
          className={styles.railItem}
        >
          <Mail size={14} />
          <span>Unread</span>
          <strong>{counts.unread}</strong>
        </button>

        <button
          type="button"
          onClick={() => {
            setSortMode("sla_soon")
            setViewMode("inbox")
          }}
          className={styles.railItem}
        >
          <Clock3 size={14} />
          <span>SLA risk</span>
          <strong>{counts.slaAtRisk}</strong>
        </button>

        <div className={styles.railDivider} />

        <div className={styles.railGroupLabel}>Views</div>

        <button
          type="button"
          onClick={() => setCategoryFilter("billing")}
          className={styles.railItem}
        >
          <Tag size={14} />
          <span>Billing issues</span>
        </button>

        <button
          type="button"
          onClick={() => setCategoryFilter("account")}
          className={styles.railItem}
        >
          <UserRound size={14} />
          <span>Account access</span>
        </button>

        <button
          type="button"
          onClick={() => setPriorityFilter("urgent")}
          className={styles.railItem}
        >
          <AlertCircle size={14} />
          <span>Urgent</span>
        </button>

        <div className={styles.railBottom}>
          <button
            type="button"
            onClick={() => setSideTab("copilot")}
            className={styles.copilotRailButton}
          >
            <Sparkles size={14} />
            <span>Copilot preview</span>
          </button>
        </div>
      </aside>

      <aside className={styles.listPanel}>
        <div className={styles.listHeader}>
          <div className={styles.listTitleRow}>
            <div>
              <div className={styles.listTitle}>Customer inbox</div>
              <div className={styles.listSubtitle}>
                {filteredTickets.length} shown · {counts.unread} unread · {counts.slaAtRisk} SLA risk
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

          <div className={styles.viewToggle}>
            <button
              type="button"
              onClick={() => setViewMode("inbox")}
              className={`${styles.viewToggleButton} ${
                viewMode === "inbox" ? styles.viewToggleButtonActive : ""
              }`}
            >
              Inbox
            </button>

            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`${styles.viewToggleButton} ${
                viewMode === "list" ? styles.viewToggleButtonActive : ""
              }`}
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
                      {unread ? <span className={styles.unreadDot} /> : null}
                      {ticket.subject}
                    </span>
                    <span className={styles.ticketTime}>
                      {formatShortTime(ticket.updated_at)}
                    </span>
                  </div>

                  <div className={styles.ticketCustomerLine}>
                    <span>{displayUserLine(ticket)}</span>
                  </div>

                  <div className={styles.ticketMeta}>
                    <span>{statusLabel(ticket.status)}</span>
                    <span>{priorityLabel(ticket.priority)}</span>
                    <span className={styles[`slaTone_${sla.tone}`]}>
                      {sla.label}
                    </span>
                  </div>

                  <div className={styles.ticketPreview}>{getPreview(ticket)}</div>
                </button>
              )
            })
          )}
        </div>
      </aside>

      <main className={styles.mainPanel}>
        {viewMode === "list" ? (
          <section className={styles.listView}>
            <div className={styles.listViewCard}>
              <div className={styles.listViewHeader}>
                <div>
                  <div className={styles.listViewTitle}>Ticket list</div>
                  <div className={styles.listViewSub}>
                    {filteredTickets.length} tickets shown · {counts.unread} unread · {counts.slaAtRisk} SLA risk
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setViewMode("inbox")}
                  className={styles.secondaryButton}
                >
                  Back to inbox
                </button>
              </div>

              <div className={styles.tableWrap}>
                <table className={styles.ticketTable}>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Subject</th>
                      <th>User</th>
                      <th>Status</th>
                      <th>Priority</th>
                      <th>SLA</th>
                      <th>Urgency</th>
                      <th>Assigned</th>
                      <th>Updated</th>
                      <th>Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredTickets.map((ticket) => {
                      const index = tickets.findIndex((item) => item.id === ticket.id)
                      const sla = slaInfo(ticket)
                      const unread = isTicketUnread(ticket)

                      return (
                        <tr key={ticket.id}>
                          <td>{ticketNumber(index)}</td>

                          <td>
                            <div className={styles.tableSubject}>
                              {unread ? <span className={styles.tableUnreadDot} /> : null}
                              {ticket.subject}
                            </div>
                            <div className={styles.tablePreview}>{getPreview(ticket)}</div>
                          </td>

                          <td>
                            <button
                              type="button"
                              onClick={() => openUserDrawer(ticket)}
                              className={styles.tableUserButton}
                            >
                              <span>{displayUserName(ticket)}</span>
                              <small>{ticket.userEmail}</small>
                            </button>
                          </td>

                          <td>
                            <span className={statusClass(ticket.status)}>
                              {statusLabel(ticket.status)}
                            </span>
                          </td>

                          <td>
                            <span className={priorityClass(ticket.priority)}>
                              {priorityLabel(ticket.priority)}
                            </span>
                          </td>

                          <td>
                            <span className={slaClass(ticket)}>{sla.label}</span>
                          </td>

                          <td>{urgencyLabel(ticket)}</td>

                          <td>{ticket.assignedAdminName || "Unassigned"}</td>

                          <td>{formatDateTime(ticket.updated_at)}</td>

                          <td>
                            <button
                              type="button"
                              onClick={() => openTicketFromList(ticket)}
                              className={styles.tableViewButton}
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
                <div>
                  <div className={styles.threadTitle}>{selectedTicket.subject}</div>
                  <div className={styles.threadSubline}>
                    {ticketNumber(selectedTicketIndex)} · {displayUserLine(selectedTicket)}
                  </div>
                </div>

                <div className={styles.pillGroup}>
                  <span className={statusClass(selectedTicket.status)}>
                    {statusLabel(selectedTicket.status)}
                  </span>
                  <span className={priorityClass(selectedTicket.priority)}>
                    {priorityLabel(selectedTicket.priority)}
                  </span>
                  <span className={slaClass(selectedTicket)}>
                    {slaInfo(selectedTicket).label}
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
                          >
                            {isSupport ? "V" : safeInitials(selectedTicket)}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              !isSupport ? openUserDrawer(selectedTicket) : undefined
                            }
                            className={styles.messageSender}
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
                      <Lock size={14} />
                      <div>
                        <div className={styles.closedReplyTitle}>This ticket is closed.</div>
                        <div className={styles.closedReplyText}>
                          The thread is locked. Reopen the ticket if more support is needed.
                        </div>
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
                <div className={styles.sideTabs}>
                  <button
                    type="button"
                    onClick={() => setSideTab("details")}
                    className={`${styles.sideTabButton} ${
                      sideTab === "details" ? styles.sideTabButtonActive : ""
                    }`}
                  >
                    Details
                  </button>

                  <button
                    type="button"
                    onClick={() => setSideTab("copilot")}
                    className={`${styles.sideTabButton} ${
                      sideTab === "copilot" ? styles.sideTabButtonActive : ""
                    }`}
                  >
                    Copilot
                  </button>
                </div>

                {sideTab === "copilot" ? (
                  <div className={styles.copilotPanel}>
                    <div className={styles.copilotIcon}>
                      <Bot size={18} />
                    </div>
                    <div className={styles.copilotTitle}>Copilot is prepared</div>
                    <div className={styles.copilotText}>
                      AI suggestions are disabled for now. Later this panel can summarize the ticket, suggest replies, and detect risk using an AI API.
                    </div>
                    <div className={styles.copilotDisabled}>Not connected</div>
                  </div>
                ) : (
                  <>
                    <div className={styles.customerIdentity}>
                      <button
                        type="button"
                        onClick={() => openUserDrawer(selectedTicket)}
                        className={styles.customerAvatar}
                      >
                        {safeInitials(selectedTicket)}
                      </button>

                      <div className={styles.customerText}>
                        <button
                          type="button"
                          onClick={() => openUserDrawer(selectedTicket)}
                          className={styles.customerName}
                        >
                          {displayUserName(selectedTicket)}
                        </button>
                        <div className={styles.customerEmail}>{selectedTicket.userEmail}</div>
                      </div>
                    </div>

                    <div className={styles.planLine}>
                      <span className={planClass(selectedTicket.userPlan)}>
                        {compactPlanLabel(selectedTicket.userPlan)}
                      </span>
                      <span className={styles.billingText}>
                        {selectedTicket.userBillingStatus}
                      </span>
                    </div>

                    <div className={styles.sideSection}>
                      <SectionTitle icon={<MessageSquare size={13} />} title="Ticket" />
                      <DetailRow label="ID" value={ticketNumber(selectedTicketIndex)} />
                      <DetailRow label="Status" value={statusLabel(selectedTicket.status)} tone={selectedStatus === "closed" ? "muted" : selectedStatus === "resolved" ? "good" : "info"} />
                      <DetailRow label="Priority" value={priorityLabel(selectedTicket.priority)} tone={normalizePriority(selectedTicket.priority) === "normal" ? "warning" : "danger"} />
                      <DetailRow label="SLA" value={slaInfo(selectedTicket).label} tone={slaInfo(selectedTicket).tone as "good" | "warning" | "danger" | "info" | "muted"} />
                      <DetailRow label="Urgency" value={urgencyLabel(selectedTicket)} tone={urgencyLabel(selectedTicket) === "Critical" ? "danger" : urgencyLabel(selectedTicket) === "High" ? "warning" : "muted"} />
                      <DetailRow label="Category" value={selectedTicket.category} />
                    </div>

                    <div className={styles.sideSection}>
                      <SectionTitle icon={<UserRound size={13} />} title="User details" />
                      <DetailRow label="Jurisdiction" value={selectedTicket.userJurisdiction} />
                      <DetailRow label="Exam" value={selectedTicket.userExam} />
                      <DetailRow label="Member since" value={selectedTicket.memberSince} />
                      <DetailRow label="Last active" value={formatDateTime(selectedTicket.userLastActiveAt)} />
                    </div>

                    <div className={styles.sideSection}>
                      <SectionTitle icon={<LinkIcon size={13} />} title="Links" />
                      <button
                        type="button"
                        onClick={() => openUserDrawer(selectedTicket)}
                        className={styles.linkRow}
                      >
                        Open user profile
                      </button>
                      <button type="button" className={styles.linkRow}>
                        Subscription record
                      </button>
                      <button type="button" className={styles.linkRow}>
                        Payment history
                      </button>
                    </div>

                    <div className={styles.sideSection}>
                      <SectionTitle icon={<Clock3 size={13} />} title="Recent history" />
                      <DetailRow label="Total tickets" value={String(selectedTicket.userTotalTicketCount)} />
                      <DetailRow label="Open tickets" value={String(selectedTicket.userOpenTicketCount)} />
                      <DetailRow label="Assigned" value={selectedTicket.assignedAdminName || "Unassigned"} />
                    </div>

                    <div className={styles.sideSectionLast}>
                      <SectionTitle icon={<Check size={13} />} title="Quick actions" />

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
                  </>
                )}
              </aside>
            </div>
          </>
        ) : (
          <div className={styles.noTicket}>
            <div className={styles.noTicketIcon}>
              <Inbox size={20} />
            </div>
            <div className={styles.noTicketTitle}>No ticket selected</div>
            <div className={styles.noTicketText}>Select a ticket from the inbox.</div>
          </div>
        )}
      </main>

      {profileDrawerTicket ? (
        <>
          <button
            type="button"
            aria-label="Close user profile drawer"
            onClick={() => setProfileDrawerTicketId(null)}
            className={styles.drawerOverlay}
          />

          <aside className={styles.profileDrawer}>
            <div className={styles.drawerHeader}>
              <div>
                <div className={styles.drawerTitle}>User profile</div>
                <div className={styles.drawerSubtitle}>Support context and account details</div>
              </div>

              <button
                type="button"
                onClick={() => setProfileDrawerTicketId(null)}
                className={styles.drawerClose}
              >
                <X size={14} />
              </button>
            </div>

            <div className={styles.drawerBody}>
              <div className={styles.drawerIdentity}>
                <div className={styles.drawerAvatar}>{safeInitials(profileDrawerTicket)}</div>
                <div>
                  <div className={styles.drawerName}>{displayUserName(profileDrawerTicket)}</div>
                  <div className={styles.drawerEmail}>{profileDrawerTicket.userEmail}</div>
                </div>
              </div>

              <div className={styles.drawerBadgeLine}>
                <span className={planClass(profileDrawerTicket.userPlan)}>
                  {compactPlanLabel(profileDrawerTicket.userPlan)}
                </span>
                <span className={profileDrawerTicket.userIsBlocked ? styles.blockedBadge : styles.activeBadge}>
                  {profileDrawerTicket.userIsBlocked ? "Blocked" : "Active"}
                </span>
              </div>

              <div className={styles.drawerGrid}>
                <DetailRow label="User ID" value={profileDrawerTicket.userId} />
                <DetailRow label="Billing status" value={profileDrawerTicket.userBillingStatus} />
                <DetailRow label="Jurisdiction" value={profileDrawerTicket.userJurisdiction} />
                <DetailRow label="Exam" value={profileDrawerTicket.userExam} />
                <DetailRow label="Member since" value={profileDrawerTicket.memberSince} />
                <DetailRow label="Last active" value={formatDateTime(profileDrawerTicket.userLastActiveAt)} />
                <DetailRow label="Total tickets" value={String(profileDrawerTicket.userTotalTicketCount)} />
                <DetailRow label="Open tickets" value={String(profileDrawerTicket.userOpenTicketCount)} />
                <DetailRow label="Current ticket" value={profileDrawerTicket.subject} />
                <DetailRow label="Current status" value={statusLabel(profileDrawerTicket.status)} />
                <DetailRow label="Current priority" value={priorityLabel(profileDrawerTicket.priority)} />
                <DetailRow label="Current SLA" value={slaInfo(profileDrawerTicket).label} />
                <DetailRow label="Urgency" value={urgencyLabel(profileDrawerTicket)} />
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedTicketId(profileDrawerTicket.id)
                  setViewMode("inbox")
                  setProfileDrawerTicketId(null)
                }}
                className={styles.drawerPrimaryButton}
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