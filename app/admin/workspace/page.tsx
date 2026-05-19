"use client"

import {
  AtSign,
  BellOff,
  ChevronDown,
  ChevronRight,
  Clock3,
  CornerDownRight,
  Edit3,
  EyeOff,
  FileText,
  Forward,
  Link2,
  Lock,
  Mail,
  MapPin,
  MessageCircle,
  Paperclip,
  Phone,
  Pin,
  Plus,
  Search,
  Send,
  Shield,
  Smile,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"

type WorkspaceChannel = {
  id: string
  slug: string
  name: string
  description: string | null
  team_id?: string
  is_private?: boolean
  is_default?: boolean
  is_hidden?: boolean
  icon_symbol?: string | null
  color_hex?: string | null
  created_by?: string | null
}

type WorkspaceTeam = {
  id: string
  slug: string
  name: string
  description: string | null
  member_count?: number
}

type WorkspaceMember = {
  id: string
  name: string
  email?: string | null
  phone_number?: string | null
  role: string
  title?: string | null
  status?: "online" | "away" | "busy" | "offline"
  last_login_at?: string | null
  last_active_at?: string | null
  created_at?: string | null
  location?: string | null
  timezone_label?: string | null
  bio?: string | null
  avatar_url?: string | null
  profile_theme?: string | null
  dm_thread_id?: string | null
  dm_unread_count?: number
  dm_last_message_at?: string | null
  dm_last_message_preview?: string | null
  dm_last_message_author_id?: string | null
}

type WorkspaceNote = {
  id: string
  owner_id?: string | null
  team_id?: string | null
  title: string
  description: string | null
  body?: string | null
  note_type?: "personal" | "shared" | string
  visibility?: string | null
  shared_scope?: string | null
  recipient_ids?: string[]
  status?: string | null
  forwarded_from_note_id?: string | null
  forwarded_original_author_name?: string | null
  created_at?: string
  updated_at?: string
  comment_count?: number
  my_emojis?: string[]
}

type ReactionUser = {
  user_id: string
  author_name: string
  author_role: string
}

type ReactionGroup = {
  emoji: string
  count: number
  users?: ReactionUser[]
}

type ReplyPreview = {
  id: string
  content: string
  author: string
  role: string
}

type WorkspaceMessage = {
  id: string
  author: string
  author_id?: string
  role: string
  content: string
  message_type?: string
  is_pinned: boolean
  is_urgent?: boolean
  wake_alert_sent_at?: string | null
  created_at: string
  updated_at: string
  edited_at?: string | null
  my_emojis: string[]
  reactions: ReactionGroup[]
  attachment_name?: string | null
  attachment_size?: string | null
  attachment_type?: string | null
  is_deleted?: boolean
  reply_to_message_id?: string | null
  reply_preview?: ReplyPreview | null
  forwarded_from_message_id?: string | null
  forwarded_from_note_id?: string | null
  forwarded_original_author_name?: string | null
}

type WorkspaceSettings = {
  allow_note_creation?: boolean
  allow_shared_note_creation?: boolean
  allow_channel_creation?: boolean
  allow_hidden_channel_creation?: boolean
  allow_poll_creation?: boolean
  allow_wake_alerts?: boolean
}

type BootstrapResponse = {
  ok: boolean
  settings?: WorkspaceSettings
  channels?: WorkspaceChannel[]
  teams?: WorkspaceTeam[]
  notes?: WorkspaceNote[]
  directMembers?: WorkspaceMember[]
  currentUser?: {
    id: string
    full_name: string | null
    email: string
    phone_number?: string | null
    admin_role?: string | null
    role?: string | null
    status?: "online" | "away" | "busy" | "offline"
    last_login_at?: string | null
    last_active_at?: string | null
    created_at?: string | null
  }
  teamMembers?: WorkspaceMember[]
  error?: string
}

type NoteComment = {
  id: string
  note_id: string
  author_id: string
  author_name: string
  author_role: string
  body: string
  is_deleted: boolean
  created_at: string
  updated_at: string
  edited_at?: string | null
}

type NoteDetailResponse = {
  ok: boolean
  note?: WorkspaceNote & {
    reactions?: { emoji: string; count: number; user_ids: string[] }[]
    my_emojis?: string[]
  }
}

type NoteCommentsResponse = {
  ok: boolean
  comments?: NoteComment[]
}

type DMMessage = {
  id: string
  author: string
  role: string
  content: string
  created_at: string
  edited_at?: string | null
  read_by?: string[]
  is_deleted?: boolean
  author_id?: string
}

type DMMessagesResponse = {
  ok: boolean
  messages?: DMMessage[]
  error?: string
}

type AdminRealtimeBrowserEvent = {
  type: string
  recipientId?: string
  senderId?: string
  senderName?: string
  threadId?: string
  notification?: {
    id?: string
    title?: string
    body?: string
    href?: string | null
    type?: string
    severity?: string
    createdAt?: string
  }
  dmMessage?: {
    id: string
    threadId: string
    authorId: string
    author: string
    role: string
    content: string
    createdAt: string
    editedAt: string | null
    readBy: string[]
    isDeleted: boolean
  }
}

type ActivePane =
  | { type: "channel"; slug: string }
  | { type: "note"; id: string }
  | { type: "dm"; id: string }

type PendingForward =
  | { kind: "message"; message: WorkspaceMessage }
  | { kind: "note"; note: WorkspaceNote }
  | null

const EMOJI_SET = [
  "👍",
  "🔥",
  "✅",
  "😂",
  "🙏",
  "👏",
  "❤️",
  "😎",
  "🚀",
  "👀",
  "💯",
  "🎯",
  "⚠️",
  "❗",
  "💡",
  "📌",
  "📝",
  "🙌",
]

const PROFILE_THEMES = ["sunset", "midnight", "violet", "emerald", "clean"]

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return (
    parts
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() || "")
      .join("") || "A"
  )
}

function roleTagStyle(role: string): React.CSSProperties {
  const normalized = role.toUpperCase()

  if (normalized.includes("SUPER_ADMIN")) {
    return { background: "rgba(99,102,241,0.12)", color: "#4f46e5" }
  }
  if (normalized.includes("ADMIN")) {
    return { background: "rgba(59,130,246,0.12)", color: "#2563eb" }
  }
  if (normalized.includes("EDITOR") || normalized.includes("PRODUCT")) {
    return { background: "rgba(22,163,74,0.10)", color: "#15803d" }
  }
  return { background: "rgba(148,163,184,0.14)", color: "#475569" }
}

function avatarStyle(initials: string): React.CSSProperties {
  const map: Record<string, React.CSSProperties> = {
    VL: { background: "linear-gradient(135deg, #8b5cf6, #6366f1)", color: "#ffffff" },
    SK: { background: "linear-gradient(135deg, #6ee7b7, #60a5fa)", color: "#064e3b" },
    JP: { background: "linear-gradient(135deg, #f59e0b, #fb923c)", color: "#ffffff" },
    AL: { background: "linear-gradient(135deg, #c084fc, #a855f7)", color: "#ffffff" },
    MC: { background: "linear-gradient(135deg, #818cf8, #6366f1)", color: "#ffffff" },
  }
  return map[initials] || { background: "linear-gradient(135deg, #8b5cf6, #6366f1)", color: "#ffffff" }
}

function statusDot(status?: string): React.CSSProperties {
  switch (status) {
    case "online":
      return { background: "#22c55e" }
    case "away":
      return { background: "#eab308" }
    case "busy":
      return { background: "#f97316" }
    case "offline":
    default:
      return { background: "#ef4444" }
  }
}

function formatTime(ts?: string | null) {
  if (!ts) return ""
  return new Date(ts).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  })
}

function formatDateTime(ts?: string | null) {
  if (!ts) return "—"
  return new Date(ts).toLocaleString()
}

function formatDate(ts?: string | null) {
  if (!ts) return "—"
  return new Date(ts).toLocaleDateString()
}

function normalizeColor(value?: string | null) {
  if (!value) return "#64748b"
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value : "#64748b"
}

function memberThemeStyles(theme?: string | null): React.CSSProperties {
  switch (theme) {
    case "sunset":
      return {
        background: "linear-gradient(180deg, #b91c1c 0%, #db2777 50%, #fb923c 100%)",
        color: "#ffffff",
      }
    case "midnight":
      return {
        background: "linear-gradient(180deg, #1d4ed8 0%, #1e3a8a 45%, #0f172a 100%)",
        color: "#ffffff",
      }
    case "violet":
      return {
        background: "linear-gradient(180deg, #7c3aed 0%, #9333ea 45%, #db2777 100%)",
        color: "#ffffff",
      }
    case "emerald":
      return {
        background: "linear-gradient(180deg, #065f46 0%, #059669 45%, #34d399 100%)",
        color: "#ffffff",
      }
    case "clean":
    default:
      return {
        background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
        color: "#111827",
      }
  }
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-_]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
}

const deletedMessageTextStyle: React.CSSProperties = {
  color: "#9ca3af",
  fontSize: 14,
  lineHeight: 1.65,
  whiteSpace: "pre-wrap",
  fontStyle: "italic",
}

const normalMessageTextStyle: React.CSSProperties = {
  color: "#111827",
  fontSize: 14,
  lineHeight: 1.65,
  whiteSpace: "pre-wrap",
}

export default function AdminWorkspacePage() {
  const [settings, setSettings] = useState<WorkspaceSettings>({})
  const [channels, setChannels] = useState<WorkspaceChannel[]>([])
  const [teams, setTeams] = useState<WorkspaceTeam[]>([])
  const [notes, setNotes] = useState<WorkspaceNote[]>([])
  const [teamMembers, setTeamMembers] = useState<WorkspaceMember[]>([])
  const [directMembers, setDirectMembers] = useState<WorkspaceMember[]>([])
  const [currentUser, setCurrentUser] = useState<BootstrapResponse["currentUser"] | null>(null)

  const [activePane, setActivePane] = useState<ActivePane>({ type: "channel", slug: "general" })
  const [messages, setMessages] = useState<WorkspaceMessage[]>([])
  const [messageText, setMessageText] = useState("")
  const [loading, setLoading] = useState(true)
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState("")
  const [composerMode, setComposerMode] = useState<"message" | "note">("message")
  const [emojiPickerFor, setEmojiPickerFor] = useState<string | null>(null)
  const [membersOpen, setMembersOpen] = useState(true)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [workspaceSearch, setWorkspaceSearch] = useState("")
  const [chatSearchOpen, setChatSearchOpen] = useState(false)
  const [chatSearch, setChatSearch] = useState("")
  const [inviteMemberOpen, setInviteMemberOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [currentUserStatus, setCurrentUserStatus] = useState<"online" | "away" | "busy" | "offline">(
    "online"
  )

  const [workspaceView, setWorkspaceView] = useState<"messages" | "tasks" | "notes" | "files">("messages")
  const [rightPanelTab, setRightPanelTab] = useState<"members" | "pinned" | "files">("members")

  const [replyingTo, setReplyingTo] = useState<WorkspaceMessage | null>(null)
  const [forwardingMessage, setForwardingMessage] = useState<WorkspaceMessage | null>(null)
  const [forwardingNote, setForwardingNote] = useState<WorkspaceNote | null>(null)
  const [editingNote, setEditingNote] = useState(false)

  const [channelsCollapsed, setChannelsCollapsed] = useState(false)
  const [notesCollapsed, setNotesCollapsed] = useState(false)
  const [dmsCollapsed, setDmsCollapsed] = useState(false)

  const [channelModalOpen, setChannelModalOpen] = useState(false)
  const [channelEditModalOpen, setChannelEditModalOpen] = useState(false)
  const [editingChannel, setEditingChannel] = useState<WorkspaceChannel | null>(null)
  const [channelName, setChannelName] = useState("")
  const [channelDescription, setChannelDescription] = useState("")
  const [channelSymbol, setChannelSymbol] = useState("#")
  const [channelColor, setChannelColor] = useState("#6366f1")
  const [channelIsPrivate, setChannelIsPrivate] = useState(false)
  const [channelIsHidden, setChannelIsHidden] = useState(false)
  const [channelVisibleUserIds, setChannelVisibleUserIds] = useState<string[]>([])
  const [creatingChannel, setCreatingChannel] = useState(false)
  const [savingChannelEdit, setSavingChannelEdit] = useState(false)

  const [noteModalOpen, setNoteModalOpen] = useState(false)
  const [noteTitle, setNoteTitle] = useState("")
  const [noteBody, setNoteBody] = useState("")
  const [noteType, setNoteType] = useState<"personal" | "shared">("personal")
  const [noteSharedScope, setNoteSharedScope] = useState<"workspace" | "specific_users">("workspace")
  const [selectedNoteRecipientIds, setSelectedNoteRecipientIds] = useState<string[]>([])
  const [noteRecipientSearch, setNoteRecipientSearch] = useState("")
  const [creatingNote, setCreatingNote] = useState(false)

  const [noteComments, setNoteComments] = useState<NoteComment[]>([])
  const [noteCommentText, setNoteCommentText] = useState("")
  const [noteReactionPickerOpen, setNoteReactionPickerOpen] = useState(false)

  const [memberProfileOpen, setMemberProfileOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState<WorkspaceMember | null>(null)

  const [dmThreadId, setDmThreadId] = useState<string | null>(null)
  const [dmMessages, setDmMessages] = useState<DMMessage[]>([])
  const [dmMessageText, setDmMessageText] = useState("")
  const [dmLoading, setDmLoading] = useState(false)
  const [dmPosting, setDmPosting] = useState(false)
  const [dmDeletingId, setDmDeletingId] = useState<string | null>(null)
  const [dmUnreadByMemberId, setDmUnreadByMemberId] = useState<Record<string, number>>({})
  const [workspaceDmPopupsEnabled, setWorkspaceDmPopupsEnabled] = useState(true)
  const [mutedDmMemberIds, setMutedDmMemberIds] = useState<string[]>([])

  const [composerEmojiOpen, setComposerEmojiOpen] = useState(false)

  const [editingChannelMessage, setEditingChannelMessage] = useState<WorkspaceMessage | null>(null)
  const [editingDmMessage, setEditingDmMessage] = useState<DMMessage | null>(null)
  const [editMessageText, setEditMessageText] = useState("")
  const [savingMessageEdit, setSavingMessageEdit] = useState(false)

  const [forwardPickerOpen, setForwardPickerOpen] = useState(false)
  const [forwardSearch, setForwardSearch] = useState("")
  const [pendingForward, setPendingForward] = useState<PendingForward>(null)
  const [forwardSubmitting, setForwardSubmitting] = useState(false)

  const channelComposerRef = useRef<HTMLTextAreaElement | null>(null)
  const dmComposerRef = useRef<HTMLTextAreaElement | null>(null)
  const dmMessagesEndRef = useRef<HTMLDivElement | null>(null)
  const dmMessagesByMemberIdRef = useRef<Record<string, DMMessage[]>>({})
  const dmThreadIdByMemberIdRef = useRef<Record<string, string>>({})
  const seenRealtimeDmMessageIdsRef = useRef<Set<string>>(new Set())

  function toggleMutedDmMember(memberId: string) {
    const cleanedMemberId = String(memberId || "").trim()
    if (!cleanedMemberId) return

    setMutedDmMemberIds((prev) =>
      prev.includes(cleanedMemberId)
        ? prev.filter((id) => id !== cleanedMemberId)
        : [...prev, cleanedMemberId],
    )
  }

  const activeChannel = useMemo(() => {
    if (activePane.type !== "channel") return null
    return channels.find((channel) => channel.slug === activePane.slug) || channels[0] || null
  }, [channels, activePane])

  const activeTeam = teams[0] || null

  const activeNote = useMemo(() => {
    if (activePane.type !== "note") return null
    return notes.find((note) => note.id === activePane.id) || null
  }, [notes, activePane])

  const activeDm = useMemo(() => {
    if (activePane.type !== "dm") return null
    return directMembers.find((dm) => dm.id === activePane.id) || null
  }, [directMembers, activePane])

  const currentUserDisplayName =
    currentUser?.full_name?.trim() || currentUser?.email?.split("@")[0] || "Admin User"

  const filteredRecipientMembers = useMemo(() => {
    const q = noteRecipientSearch.trim().toLowerCase()
    if (!q) return teamMembers
    return teamMembers.filter((member) => {
      return (
        member.name.toLowerCase().includes(q) ||
        (member.email || "").toLowerCase().includes(q) ||
        (member.title || "").toLowerCase().includes(q)
      )
    })
  }, [noteRecipientSearch, teamMembers])

  const filteredForwardChannels = useMemo(() => {
    const q = forwardSearch.trim().toLowerCase()
    if (!q) return channels
    return channels.filter((channel) => {
      return (
        channel.name.toLowerCase().includes(q) ||
        (channel.description || "").toLowerCase().includes(q) ||
        channel.slug.toLowerCase().includes(q)
      )
    })
  }, [forwardSearch, channels])

  const filteredForwardMembers = useMemo(() => {
    const q = forwardSearch.trim().toLowerCase()
    if (!q) return directMembers
    return directMembers.filter((member) => {
      return (
        member.name.toLowerCase().includes(q) ||
        (member.email || "").toLowerCase().includes(q) ||
        (member.title || "").toLowerCase().includes(q) ||
        member.role.toLowerCase().includes(q)
      )
    })
  }, [forwardSearch, directMembers])

  const filteredSidebarChannels = useMemo(() => {
    const q = workspaceSearch.trim().toLowerCase()
    if (!q) return channels
    return channels.filter((channel) => {
      return (
        channel.name.toLowerCase().includes(q) ||
        channel.slug.toLowerCase().includes(q) ||
        (channel.description || "").toLowerCase().includes(q)
      )
    })
  }, [workspaceSearch, channels])

  const filteredSidebarNotes = useMemo(() => {
    const q = workspaceSearch.trim().toLowerCase()
    if (!q) return notes
    return notes.filter((note) => {
      return (
        note.title.toLowerCase().includes(q) ||
        (note.description || "").toLowerCase().includes(q) ||
        (note.body || "").toLowerCase().includes(q)
      )
    })
  }, [workspaceSearch, notes])

  const filteredSidebarDms = useMemo(() => {
    const q = workspaceSearch.trim().toLowerCase()
    if (!q) return directMembers
    return directMembers.filter((member) => {
      return (
        member.name.toLowerCase().includes(q) ||
        (member.email || "").toLowerCase().includes(q) ||
        (member.title || "").toLowerCase().includes(q) ||
        member.role.toLowerCase().includes(q)
      )
    })
  }, [workspaceSearch, directMembers])

  useEffect(() => {
    void bootstrap()
  }, [])

  useEffect(() => {
    const popupValue = window.localStorage.getItem("lexora:admin:notification-popups-enabled")
    setWorkspaceDmPopupsEnabled(popupValue !== "false")

    const mutedRaw = window.localStorage.getItem("lexora:admin:workspace-muted-dm-member-ids")
    if (mutedRaw) {
      try {
        const parsed = JSON.parse(mutedRaw)
        if (Array.isArray(parsed)) {
          setMutedDmMemberIds(parsed.map((item) => String(item)).filter(Boolean))
        }
      } catch {
        setMutedDmMemberIds([])
      }
    }
  }, [])

  useEffect(() => {
    window.localStorage.setItem(
      "lexora:admin:notification-popups-enabled",
      workspaceDmPopupsEnabled ? "true" : "false",
    )
  }, [workspaceDmPopupsEnabled])

  useEffect(() => {
    window.localStorage.setItem(
      "lexora:admin:workspace-muted-dm-member-ids",
      JSON.stringify(mutedDmMemberIds),
    )
  }, [mutedDmMemberIds])

  useEffect(() => {
    function closeFloatingWorkspaceMenus() {
      setComposerEmojiOpen(false)
      setEmojiPickerFor(null)
      setNoteReactionPickerOpen(false)
    }

    document.addEventListener("mousedown", closeFloatingWorkspaceMenus)
    return () => document.removeEventListener("mousedown", closeFloatingWorkspaceMenus)
  }, [])

  useEffect(() => {
    if (activePane.type === "channel" && channels.length > 0) {
      void loadMessages(activePane.slug)
    }
    if (activePane.type === "note" && activePane.id) {
      void loadNoteDetail(activePane.id)
      void loadNoteComments(activePane.id)
    }
    if (activePane.type === "dm" && activePane.id) {
      void loadOrCreateDMThread(activePane.id)
    }
  }, [activePane, channels.length])

  useEffect(() => {
    const activeDmId = activePane.type === "dm" ? activePane.id : null

    window.dispatchEvent(
      new CustomEvent("admin:workspace-active-dm-changed", {
        detail: {
          activeDmId,
        },
      }),
    )
  }, [activePane])

  useEffect(() => {
    function handleRealtime(event: Event) {
      const customEvent = event as CustomEvent<AdminRealtimeBrowserEvent>
      const data = customEvent.detail

      if (!data || data.type !== "team_dm_message" || !data.dmMessage || !data.senderId) {
        return
      }

      const incoming: DMMessage = {
        id: data.dmMessage.id,
        author: data.dmMessage.author,
        author_id: data.dmMessage.authorId,
        role: data.dmMessage.role,
        content: data.dmMessage.content,
        created_at: data.dmMessage.createdAt,
        edited_at: data.dmMessage.editedAt,
        read_by: data.dmMessage.readBy,
        is_deleted: data.dmMessage.isDeleted,
      }

      if (seenRealtimeDmMessageIdsRef.current.has(incoming.id)) {
        return
      }

      seenRealtimeDmMessageIdsRef.current.add(incoming.id)

      if (data.threadId) {
        dmThreadIdByMemberIdRef.current[data.senderId] = data.threadId
      }

      dmMessagesByMemberIdRef.current[data.senderId] = [
        ...(dmMessagesByMemberIdRef.current[data.senderId] || []).filter(
          (message) => message.id !== incoming.id,
        ),
        incoming,
      ]

      const isOpenThread = activePane.type === "dm" && activePane.id === data.senderId

      if (isOpenThread) {
        setDmThreadId(data.threadId || data.dmMessage.threadId)
        setDmMessages((prev) => {
          if (prev.some((item) => item.id === incoming.id)) return prev
          return [...prev, incoming]
        })
        setDmUnreadByMemberId((prev) => ({
          ...prev,
          [data.senderId as string]: 0,
        }))

        const notificationId =
          typeof data.notification?.id === "string" ? data.notification.id : ""

        if (notificationId) {
          void fetch(`/api/admin/notifications/${notificationId}/read`, {
            method: "POST",
          }).catch(() => null)
        }

        return
      }

      setDmUnreadByMemberId((prev) => ({
        ...prev,
        [data.senderId as string]: (prev[data.senderId as string] || 0) + 1,
      }))
    }

    window.addEventListener("admin:realtime", handleRealtime)
    return () => window.removeEventListener("admin:realtime", handleRealtime)
  }, [activePane])

  useEffect(() => {
    if (activePane.type !== "dm") return

    requestAnimationFrame(() => {
      dmMessagesEndRef.current?.scrollIntoView({
        block: "end",
        behavior: "smooth",
      })
    })
  }, [activePane, dmMessages.length])

  async function bootstrap() {
    try {
      setLoading(true)
      setError("")

      const res = await fetch("/api/admin/workspace/bootstrap", { cache: "no-store" })
      const data: BootstrapResponse | null = await res.json().catch(() => null)

      if (!res.ok || !data?.ok) {
        setError(data?.error || "Failed to load workspace.")
        return
      }

      const loadedChannels = Array.isArray(data.channels) ? data.channels : []
      const loadedNotes = Array.isArray(data.notes) ? data.notes : []
      const loadedTeamMembers = Array.isArray(data.teamMembers) ? data.teamMembers : []
      const loadedDirectMembers = Array.isArray(data.directMembers) ? data.directMembers : []

      setSettings(data.settings || {})
      setChannels(loadedChannels)
      setTeams(Array.isArray(data.teams) ? data.teams : [])
      setNotes(loadedNotes)
      setTeamMembers(loadedTeamMembers)
      setDirectMembers(loadedDirectMembers)

      for (const member of loadedDirectMembers) {
        if (member.dm_thread_id) {
          dmThreadIdByMemberIdRef.current[member.id] = member.dm_thread_id
        }
      }

      const nextUnreadByMemberId: Record<string, number> = {}
      for (const member of loadedDirectMembers) {
        nextUnreadByMemberId[member.id] = Number(member.dm_unread_count || 0)
      }
      setDmUnreadByMemberId(nextUnreadByMemberId)

      setCurrentUser(data.currentUser || null)

      if (data.currentUser?.status) {
        setCurrentUserStatus(data.currentUser.status)
      }

      if (activePane.type === "channel") {
        const exists = loadedChannels.find((c) => c.slug === activePane.slug)
        if (!exists && loadedChannels.length > 0) {
          setActivePane({ type: "channel", slug: loadedChannels[0].slug })
        }
      }
    } catch (err) {
      console.error("WORKSPACE BOOTSTRAP ERROR:", err)
      setError("Something went wrong while loading workspace.")
    } finally {
      setLoading(false)
    }
  }

  async function loadMessages(channelSlug: string) {
    try {
      setLoading(true)
      setError("")

      const res = await fetch(`/api/admin/workspace/messages?channel=${encodeURIComponent(channelSlug)}`, {
        cache: "no-store",
      })

      const data = await res.json().catch(() => null)

      if (!res.ok || !data?.ok) {
        setError(data?.error || "Failed to load messages.")
        setMessages([])
        return
      }

      setMessages(Array.isArray(data?.messages) ? data.messages : [])
    } catch (err) {
      console.error("WORKSPACE LOAD MESSAGES ERROR:", err)
      setError("Something went wrong while loading messages.")
      setMessages([])
    } finally {
      setLoading(false)
    }
  }

  async function loadOrCreateDMThread(recipientId: string) {
    const cachedMessages = dmMessagesByMemberIdRef.current[recipientId] || []
    const knownThreadId =
      dmThreadIdByMemberIdRef.current[recipientId] ||
      directMembers.find((member) => member.id === recipientId)?.dm_thread_id ||
      null

    try {
      setError("")
      setDmUnreadByMemberId((prev) => ({
        ...prev,
        [recipientId]: 0,
      }))

      if (cachedMessages.length > 0) {
        setDmMessages(cachedMessages)
        setDmLoading(false)
      } else {
        setDmLoading(true)
        setDmMessages([])
      }

      let threadId = knownThreadId

      if (!threadId) {
        const bootstrapRes = await fetch("/api/admin/workspace/dms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipientId,
            bootstrapOnly: true,
          }),
        })

        const bootstrapData = await bootstrapRes.json().catch(() => null)

        if (!bootstrapRes.ok || !bootstrapData?.ok || !bootstrapData?.threadId) {
          setError(bootstrapData?.error || "Failed to open direct message thread.")
          return
        }

        threadId = String(bootstrapData.threadId)
      }

      dmThreadIdByMemberIdRef.current[recipientId] = threadId
      setDmThreadId(threadId)

      const threadRes = await fetch(`/api/admin/workspace/dms/${threadId}`, {
        cache: "no-store",
      })

      const threadData: DMMessagesResponse | null = await threadRes.json().catch(() => null)

      if (!threadRes.ok || !threadData?.ok) {
        setError(threadData?.error || "Failed to load direct messages.")
        return
      }

      const nextMessages = Array.isArray(threadData.messages) ? threadData.messages : []
      dmMessagesByMemberIdRef.current[recipientId] = nextMessages
      setDmMessages(nextMessages)
      setDmUnreadByMemberId((prev) => ({
        ...prev,
        [recipientId]: 0,
      }))
    } catch (err) {
      console.error("LOAD DM THREAD ERROR:", err)
      setError("Something went wrong while loading the direct message thread.")
    } finally {
      setDmLoading(false)
    }
  }

  function getActiveComposerRef() {
    return activePane.type === "dm" ? dmComposerRef : channelComposerRef
  }

  function updateActiveComposerValue(nextValue: string) {
    if (activePane.type === "dm") {
      setDmMessageText(nextValue)
    } else {
      setMessageText(nextValue)
    }
  }

  function insertAtSelection(prefix: string, suffix = "") {
    const ref = getActiveComposerRef()
    const el = ref.current
    if (!el) return

    const start = el.selectionStart ?? 0
    const end = el.selectionEnd ?? 0
    const currentValue = activePane.type === "dm" ? dmMessageText : messageText
    const selected = currentValue.slice(start, end)
    const next = `${currentValue.slice(0, start)}${prefix}${selected}${suffix}${currentValue.slice(end)}`

    updateActiveComposerValue(next)

    requestAnimationFrame(() => {
      el.focus()
      const caretStart = start + prefix.length
      const caretEnd = caretStart + selected.length
      el.setSelectionRange(
        selected ? caretStart : caretStart,
        selected ? caretEnd : caretStart
      )
    })
  }

  function insertText(text: string) {
    const ref = getActiveComposerRef()
    const el = ref.current
    if (!el) return

    const start = el.selectionStart ?? 0
    const end = el.selectionEnd ?? 0
    const currentValue = activePane.type === "dm" ? dmMessageText : messageText
    const next = `${currentValue.slice(0, start)}${text}${currentValue.slice(end)}`
    updateActiveComposerValue(next)

    requestAnimationFrame(() => {
      el.focus()
      const caret = start + text.length
      el.setSelectionRange(caret, caret)
    })
  }

  async function sendDMMessage() {
    if (activePane.type !== "dm") return

    const message = dmMessageText.trim()
    if (!message) return

    try {
      setDmPosting(true)
      setError("")
      setDmMessageText("")
      setComposerEmojiOpen(false)

      const res = await fetch("/api/admin/workspace/dms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientId: activePane.id,
          message,
        }),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok || !data?.ok || !data?.threadId) {
        setError(data?.error || "Failed to send direct message.")
        setDmMessageText(message)
        return
      }

      const nextThreadId = String(data.threadId)
      setDmThreadId(nextThreadId)
      dmThreadIdByMemberIdRef.current[activePane.id] = nextThreadId

      if (data.message) {
        const sentMessage = data.message as DMMessage

        setDmMessages((prev) => {
          if (prev.some((item) => item.id === sentMessage.id)) return prev

          const nextMessages = [...prev, sentMessage]
          dmMessagesByMemberIdRef.current[activePane.id] = nextMessages
          return nextMessages
        })
      }
    } catch (err) {
      console.error("SEND DM MESSAGE ERROR:", err)
      setError("Something went wrong while sending the direct message.")
      setDmMessageText(message)
    } finally {
      setDmPosting(false)
    }
  }

  async function deleteDMMessage(messageId: string) {
    if (!dmThreadId) return

    try {
      setDmDeletingId(messageId)
      setError("")

      const res = await fetch(`/api/admin/workspace/dms/${dmThreadId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId }),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok || !data?.ok) {
        setError(data?.error || "Failed to delete direct message.")
        return
      }

      const threadRes = await fetch(`/api/admin/workspace/dms/${dmThreadId}`, {
        cache: "no-store",
      })
      const threadData: DMMessagesResponse | null = await threadRes.json().catch(() => null)

      if (!threadRes.ok || !threadData?.ok) {
        setError(threadData?.error || "Failed to refresh direct messages.")
        return
      }

      setDmMessages(Array.isArray(threadData.messages) ? threadData.messages : [])
    } catch (err) {
      console.error("DELETE DM MESSAGE ERROR:", err)
      setError("Something went wrong while deleting the direct message.")
    } finally {
      setDmDeletingId(null)
    }
  }

  function handleDMComposerKey(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      void sendDMMessage()
    }
  }

  async function loadNoteDetail(noteId: string) {
    try {
      const res = await fetch(`/api/admin/workspace/notes/${noteId}`, {
        cache: "no-store",
      })
      const data: NoteDetailResponse | null = await res.json().catch(() => null)
      if (!res.ok || !data?.ok || !data.note) return

      const noteData = data.note

      setNotes((prev) =>
        prev.map((note) =>
          note.id === noteId
            ? {
                ...note,
                ...noteData,
                my_emojis: noteData.my_emojis || [],
              }
            : note
        )
      )
    } catch (err) {
      console.error("LOAD NOTE DETAIL ERROR:", err)
    }
  }

  async function loadNoteComments(noteId: string) {
    try {
      const res = await fetch(`/api/admin/workspace/notes/${noteId}/comments`, {
        cache: "no-store",
      })
      const data: NoteCommentsResponse | null = await res.json().catch(() => null)
      if (!res.ok || !data?.ok) {
        setNoteComments([])
        return
      }
      setNoteComments(Array.isArray(data.comments) ? data.comments : [])
    } catch (err) {
      console.error("LOAD NOTE COMMENTS ERROR:", err)
      setNoteComments([])
    }
  }

  function resetChannelForm() {
    setChannelName("")
    setChannelDescription("")
    setChannelSymbol("#")
    setChannelColor("#6366f1")
    setChannelIsPrivate(false)
    setChannelIsHidden(false)
    setChannelVisibleUserIds([])
    setEditingChannel(null)
  }

  function openCreateChannelModal() {
    resetChannelForm()
    setChannelModalOpen(true)
  }

  function openEditChannelModal(channel: WorkspaceChannel) {
    setEditingChannel(channel)
    setChannelName(channel.name || "")
    setChannelDescription(channel.description || "")
    setChannelSymbol(channel.icon_symbol || "#")
    setChannelColor(normalizeColor(channel.color_hex))
    setChannelIsPrivate(Boolean(channel.is_private))
    setChannelIsHidden(Boolean(channel.is_hidden))
    setChannelVisibleUserIds([])
    setChannelEditModalOpen(true)
  }

  async function createChannel() {
    const name = channelName.trim()
    const description = channelDescription.trim()

    if (!name) {
      setError("Channel name is required.")
      return
    }

    try {
      setCreatingChannel(true)
      setError("")

      const res = await fetch("/api/admin/workspace/channels", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          description,
          iconSymbol: channelSymbol,
          colorHex: channelColor,
          isPrivate: channelIsPrivate,
          isHidden: channelIsHidden,
          visibleUserIds: channelIsHidden ? channelVisibleUserIds : [],
        }),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok || !data?.ok) {
        setError(data?.error || "Failed to create channel.")
        return
      }

      const created = data.channel as WorkspaceChannel
      setChannels((prev) => {
        const next = [...prev, created]
        const uniq = next.filter((item, index, arr) => arr.findIndex((a) => a.id === item.id) === index)
        return uniq.sort((a, b) => Number(b.is_default) - Number(a.is_default) || a.name.localeCompare(b.name))
      })

      setActivePane({ type: "channel", slug: created.slug })
      setMessages([])
      resetChannelForm()
      setChannelModalOpen(false)

      await loadMessages(created.slug)
    } catch (err) {
      console.error("CREATE CHANNEL ERROR:", err)
      setError("Something went wrong while creating the channel.")
    } finally {
      setCreatingChannel(false)
    }
  }

  async function saveChannelEdit() {
    if (!editingChannel) return

    try {
      setSavingChannelEdit(true)
      setError("")

      const res = await fetch(`/api/admin/workspace/channels/${editingChannel.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "rename",
          name: channelName.trim(),
          description: channelDescription.trim(),
          iconSymbol: channelSymbol,
          colorHex: channelColor,
          isPrivate: channelIsPrivate,
          isHidden: channelIsHidden,
          visibleUserIds: channelIsHidden ? channelVisibleUserIds : [],
        }),
      })

      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.ok) {
        setError(data?.error || "Failed to update channel.")
        return
      }

      setChannels((prev) =>
        prev.map((channel) =>
          channel.id === editingChannel.id
            ? {
                ...channel,
                name: channelName.trim(),
                description: channelDescription.trim() || null,
                icon_symbol: channelSymbol,
                color_hex: channelColor,
                is_private: channelIsPrivate,
                is_hidden: channelIsHidden,
              }
            : channel
        )
      )

      if (activePane.type === "channel" && activePane.slug === editingChannel.slug) {
        setActivePane({ type: "channel", slug: slugify(channelName.trim()) || editingChannel.slug })
      }

      setChannelEditModalOpen(false)
      resetChannelForm()
      await bootstrap()
    } catch (err) {
      console.error("SAVE CHANNEL EDIT ERROR:", err)
      setError("Something went wrong while saving the channel.")
    } finally {
      setSavingChannelEdit(false)
    }
  }

  async function createNote() {
    const title = noteTitle.trim()
    const body = noteBody.trim()

    if (!title || !body) {
      setError("Note title and body are required.")
      return
    }

    if (noteType === "shared" && noteSharedScope === "specific_users" && selectedNoteRecipientIds.length === 0) {
      setError("Pick at least one user for a user-specific shared note.")
      return
    }

    try {
      setCreatingNote(true)
      setError("")

      const res = await fetch("/api/admin/workspace/notes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          body,
          noteType,
          visibility: noteType === "shared" ? "shared" : "private",
          sharedScope: noteType === "shared" ? noteSharedScope : "private",
          recipientIds:
            noteType === "shared" && noteSharedScope === "specific_users"
              ? selectedNoteRecipientIds
              : [],
          forwardedFromNoteId: forwardingNote?.id || null,
          forwardedOriginalAuthorName:
            forwardingNote?.forwarded_original_author_name ||
            forwardingNote?.title ||
            null,
        }),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok || !data?.ok) {
        setError(data?.error || "Failed to create note.")
        return
      }

      const createdNote: WorkspaceNote | undefined = data?.note

      if (createdNote) {
        setNotes((prev) => [createdNote, ...prev])
        setActivePane({ type: "note", id: createdNote.id })
      } else {
        await bootstrap()
      }

      resetNoteForm()
      setNoteModalOpen(false)
    } catch (err) {
      console.error("CREATE NOTE ERROR:", err)
      setError("Something went wrong while creating the note.")
    } finally {
      setCreatingNote(false)
    }
  }

  function resetNoteForm() {
    setNoteTitle("")
    setNoteBody("")
    setNoteType("personal")
    setNoteSharedScope("workspace")
    setSelectedNoteRecipientIds([])
    setNoteRecipientSearch("")
    setForwardingNote(null)
  }

  async function updateNote() {
    if (!activeNote) return
    try {
      setError("")
      const res = await fetch(`/api/admin/workspace/notes/${activeNote.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: noteTitle.trim(),
          body: noteBody.trim(),
          visibility: activeNote.note_type === "shared" ? "shared" : "private",
          sharedScope: activeNote.note_type === "shared" ? noteSharedScope : "private",
          recipientIds:
            activeNote.note_type === "shared" && noteSharedScope === "specific_users"
              ? selectedNoteRecipientIds
              : [],
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.ok) {
        setError(data?.error || "Failed to update note.")
        return
      }

      setNotes((prev) =>
        prev.map((note) =>
          note.id === activeNote.id
            ? {
                ...note,
                title: noteTitle.trim(),
                body: noteBody.trim(),
                description: noteBody.trim().slice(0, 80),
                shared_scope: activeNote.note_type === "shared" ? noteSharedScope : "private",
                recipient_ids:
                  activeNote.note_type === "shared" && noteSharedScope === "specific_users"
                    ? selectedNoteRecipientIds
                    : [],
              }
            : note
        )
      )
      setEditingNote(false)
    } catch (err) {
      console.error("UPDATE NOTE ERROR:", err)
      setError("Something went wrong while updating the note.")
    }
  }

  async function withdrawNote() {
    if (!activeNote) return
    try {
      setError("")
      const res = await fetch(`/api/admin/workspace/notes/${activeNote.id}`, { method: "DELETE" })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.ok) {
        setError(data?.error || "Failed to withdraw note.")
        return
      }

      setNotes((prev) => prev.filter((note) => note.id !== activeNote.id))
      const fallback = channels[0]
      if (fallback) {
        setActivePane({ type: "channel", slug: fallback.slug })
      }
    } catch (err) {
      console.error("WITHDRAW NOTE ERROR:", err)
      setError("Something went wrong while withdrawing the note.")
    }
  }

  async function sendMessage() {
    if (activePane.type !== "channel") return

    const content = messageText.trim()
    if (!content) return

    try {
      setPosting(true)
      setError("")

      const res = await fetch("/api/admin/workspace/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          channel: activePane.slug,
          content,
          messageType: composerMode,
          replyToMessageId: replyingTo?.id || null,
          forwardedFromMessageId: forwardingMessage?.id || null,
          forwardedFromNoteId: forwardingNote?.id || null,
          forwardedOriginalAuthorName:
            forwardingMessage?.forwarded_original_author_name ||
            forwardingMessage?.author ||
            forwardingNote?.forwarded_original_author_name ||
            forwardingNote?.title ||
            null,
        }),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok || !data?.ok) {
        setError(data?.error || "Failed to send message.")
        return
      }

      setMessageText("")
      setComposerMode("message")
      setReplyingTo(null)
      setForwardingMessage(null)
      setForwardingNote(null)
      setComposerEmojiOpen(false)
      await loadMessages(activePane.slug)
    } catch (err) {
      console.error("WORKSPACE SEND MESSAGE ERROR:", err)
      setError("Something went wrong while sending the message.")
    } finally {
      setPosting(false)
    }
  }

  async function react(messageId: string, emoji: string) {
    if (activePane.type !== "channel") return

    try {
      const res = await fetch(`/api/admin/workspace/messages/${messageId}/reactions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ emoji }),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok || !data?.ok) {
        setError(data?.error || "Failed to update reaction.")
        return
      }

      setEmojiPickerFor(null)
      await loadMessages(activePane.slug)
    } catch (err) {
      console.error("WORKSPACE REACT ERROR:", err)
      setError("Something went wrong while reacting.")
    }
  }

  async function reactToNote(emoji: string) {
    if (!activeNote) return
    try {
      const res = await fetch(`/api/admin/workspace/notes/${activeNote.id}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.ok) {
        setError(data?.error || "Failed to react to note.")
        return
      }
      setNoteReactionPickerOpen(false)
      await loadNoteDetail(activeNote.id)
    } catch (err) {
      console.error("NOTE REACTION ERROR:", err)
      setError("Something went wrong while reacting to note.")
    }
  }

  async function addNoteComment() {
    if (!activeNote) return
    const body = noteCommentText.trim()
    if (!body) return

    try {
      const res = await fetch(`/api/admin/workspace/notes/${activeNote.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.ok) {
        setError(data?.error || "Failed to add comment.")
        return
      }
      setNoteCommentText("")
      await loadNoteComments(activeNote.id)
      await loadNoteDetail(activeNote.id)
      setNotes((prev) =>
        prev.map((note) =>
          note.id === activeNote.id ? { ...note, comment_count: (note.comment_count || 0) + 1 } : note
        )
      )
    } catch (err) {
      console.error("NOTE COMMENT ERROR:", err)
      setError("Something went wrong while adding the comment.")
    }
  }

  async function deleteMessage(messageId: string) {
    try {
      const res = await fetch(`/api/admin/workspace/messages/${messageId}`, { method: "DELETE" })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.ok) {
        setError(data?.error || "Failed to delete message.")
        return
      }
      if (activePane.type === "channel") {
        await loadMessages(activePane.slug)
      }
    } catch (err) {
      console.error("DELETE MESSAGE ERROR:", err)
      setError("Something went wrong while deleting the message.")
    }
  }

  async function deleteComment(commentId: string) {
    if (!activeNote) return
    try {
      const res = await fetch(`/api/admin/workspace/notes/${activeNote.id}/comments/${commentId}`, {
        method: "DELETE",
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.ok) {
        setError(data?.error || "Failed to delete comment.")
        return
      }
      await loadNoteComments(activeNote.id)
    } catch (err) {
      console.error("DELETE COMMENT ERROR:", err)
      setError("Something went wrong while deleting the comment.")
    }
  }

  function toggleRecipient(id: string) {
    setSelectedNoteRecipientIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  function toggleHiddenChannelUser(id: string) {
    setChannelVisibleUserIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  function openMemberProfile(member: WorkspaceMember) {
    setSelectedMember(member)
    setMemberProfileOpen(true)
  }

  function handleComposerKey(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      void sendMessage()
    }
  }

  function composerPlaceholder() {
    if (replyingTo) {
      return `Replying to ${replyingTo.author}...`
    }
    if (forwardingMessage) {
      return `Forwarding message from ${forwardingMessage.author}...`
    }
    if (forwardingNote) {
      return `Forwarding note "${forwardingNote.title}"...`
    }
    if (composerMode === "note") {
      return `Drop a pinned note in ${activeChannel?.name || "general"}...`
    }
    return activePane.type === "dm"
      ? `Message ${activeDm?.name || "this person"}...`
      : `Message ${activeChannel?.name || "general"}...`
  }

  function renderCenterTitle() {
    if (activePane.type === "note") return activeNote?.title || "Note"
    if (activePane.type === "dm") return activeDm?.name || "Direct Message"
    return `${activeChannel?.icon_symbol || "#"} ${activeChannel?.name || "general"}`
  }

  function renderCenterSubtitle() {
    if (activePane.type === "note") {
      return activeNote?.note_type === "shared"
        ? activeNote.shared_scope === "specific_users"
          ? "Shared to selected users"
          : "Shared to workspace"
        : "Personal workspace note"
    }
    if (activePane.type === "dm") return activeDm?.title || activeDm?.role || "Direct message"
    return activeChannel?.description || "Internal communication"
  }

  function openChannelMessageEdit(message: WorkspaceMessage) {
    if (message.is_deleted) return
    setEditingChannelMessage(message)
    setEditMessageText(message.content)
  }

  function openDmMessageEdit(message: DMMessage) {
    if (message.is_deleted) return
    setEditingDmMessage(message)
    setEditMessageText(message.content)
  }

  async function saveMessageEdit() {
    const nextText = editMessageText.trim()
    if (!nextText) {
      setError("Message content is required.")
      return
    }

    try {
      setSavingMessageEdit(true)
      setError("")

      if (editingChannelMessage) {
        const res = await fetch(`/api/admin/workspace/messages/${editingChannelMessage.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: nextText }),
        })

        const data = await res.json().catch(() => null)
        if (!res.ok || !data?.ok) {
          setError(data?.error || "Failed to edit message.")
          return
        }

        setEditingChannelMessage(null)
        setEditMessageText("")
        if (activePane.type === "channel") {
          await loadMessages(activePane.slug)
        }
        return
      }

      if (editingDmMessage && dmThreadId) {
        const res = await fetch(`/api/admin/workspace/dms/${dmThreadId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "edit_message",
            messageId: editingDmMessage.id,
            content: nextText,
          }),
        })

        const data = await res.json().catch(() => null)
        if (!res.ok || !data?.ok) {
          setError(data?.error || "Failed to edit direct message.")
          return
        }

        setEditingDmMessage(null)
        setEditMessageText("")
        if (activePane.type === "dm") {
          await loadOrCreateDMThread(activePane.id)
        }
      }
    } catch (err) {
      console.error("SAVE MESSAGE EDIT ERROR:", err)
      setError("Something went wrong while editing the message.")
    } finally {
      setSavingMessageEdit(false)
    }
  }

  function resetForwardState() {
    setForwardPickerOpen(false)
    setForwardSearch("")
    setPendingForward(null)
    setForwardingMessage(null)
    setForwardingNote(null)
    setForwardSubmitting(false)
  }

  function openForwardPickerForMessage(message: WorkspaceMessage) {
    if (message.is_deleted) return
    setPendingForward({ kind: "message", message })
    setForwardingMessage(message)
    setForwardingNote(null)
    setReplyingTo(null)
    setForwardSearch("")
    setForwardPickerOpen(true)
  }

  function openForwardPickerForNote(note: WorkspaceNote) {
    setPendingForward({ kind: "note", note })
    setForwardingMessage(null)
    setForwardingNote(note)
    setReplyingTo(null)
    setForwardSearch("")
    setForwardPickerOpen(true)
  }

  async function forwardToChannel(channelSlug: string) {
    if (!pendingForward) return

    try {
      setForwardSubmitting(true)
      setError("")

      const content =
        pendingForward.kind === "message"
          ? pendingForward.message.content
          : pendingForward.note.body || pendingForward.note.description || pendingForward.note.title

      const forwardedOriginalAuthorName =
        pendingForward.kind === "message"
          ? pendingForward.message.forwarded_original_author_name || pendingForward.message.author
          : pendingForward.note.forwarded_original_author_name || pendingForward.note.title

      const res = await fetch("/api/admin/workspace/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: channelSlug,
          content,
          messageType: "message",
          forwardedFromMessageId: pendingForward.kind === "message" ? pendingForward.message.id : null,
          forwardedFromNoteId: pendingForward.kind === "note" ? pendingForward.note.id : null,
          forwardedOriginalAuthorName,
        }),
      })

      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.ok) {
        setError(data?.error || "Failed to forward.")
        return
      }

      resetForwardState()
      setActivePane({ type: "channel", slug: channelSlug })
      await loadMessages(channelSlug)
    } catch (err) {
      console.error("FORWARD CHANNEL ERROR:", err)
      setError("Something went wrong while forwarding.")
    } finally {
      setForwardSubmitting(false)
    }
  }

  async function forwardToDm(recipientId: string) {
    if (!pendingForward) return

    try {
      setForwardSubmitting(true)
      setError("")

      const content =
        pendingForward.kind === "message"
          ? pendingForward.message.content
          : pendingForward.note.body || pendingForward.note.description || pendingForward.note.title

      const forwardedOriginalAuthorName =
        pendingForward.kind === "message"
          ? pendingForward.message.forwarded_original_author_name || pendingForward.message.author
          : pendingForward.note.forwarded_original_author_name || pendingForward.note.title

      const res = await fetch("/api/admin/workspace/dms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientId,
          message: `Forwarded from ${forwardedOriginalAuthorName}\n\n${content}`,
        }),
      })

      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.ok) {
        setError(data?.error || "Failed to forward.")
        return
      }

      resetForwardState()
      setActivePane({ type: "dm", id: recipientId })
      await loadOrCreateDMThread(recipientId)
    } catch (err) {
      console.error("FORWARD DM ERROR:", err)
      setError("Something went wrong while forwarding.")
    } finally {
      setForwardSubmitting(false)
    }
  }

  const canCreateChannels = settings.allow_channel_creation !== false
  const canCreateNotes = settings.allow_note_creation !== false

  function renderSharedComposer(kind: "channel" | "dm") {
    const isDm = kind === "dm"
    const value = isDm ? dmMessageText : messageText
    const setValue = isDm ? setDmMessageText : setMessageText
    const ref = isDm ? dmComposerRef : channelComposerRef
    const postingState = isDm ? dmPosting : posting
    const onSend = isDm ? () => void sendDMMessage() : () => void sendMessage()

    return (
      <div
        style={{
          padding: "12px 26px 16px",
          borderTop: "1px solid rgba(15,23,42,0.08)",
          background: "#ffffff",
          flexShrink: 0,
        }}
      >
        {kind === "channel" && (replyingTo || forwardingMessage || forwardingNote) ? (
          <div
            style={{
              marginBottom: 10,
              borderRadius: 12,
              background: "#f8fafc",
              border: "1px solid rgba(15,23,42,0.08)",
              padding: "10px 12px",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <div style={{ fontSize: 12, color: "#475569", flex: 1 }}>
              {replyingTo ? (
                <>
                  Replying to <strong>{replyingTo.author}</strong>
                </>
              ) : forwardingMessage ? (
                <>
                  Forwarding message from <strong>{forwardingMessage.author}</strong>
                </>
              ) : (
                <>
                  Forwarding note <strong>{forwardingNote?.title}</strong>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                setReplyingTo(null)
                setForwardingMessage(null)
                setForwardingNote(null)
              }}
              style={tinyIconButtonStyle}
            >
              <X size={14} />
            </button>
          </div>
        ) : null}

        <div
          style={{
            borderRadius: 16,
            border: "1px solid rgba(15,23,42,0.12)",
            background: "#f8f9fd",
            position: "relative",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "10px 12px 0" }}>
            <ToolbarButton onClick={() => insertAtSelection("**", "**")}>B</ToolbarButton>
            <ToolbarButton onClick={() => insertAtSelection("*", "*")}>I</ToolbarButton>
            <ToolbarButton onClick={() => insertAtSelection("__", "__")}>U</ToolbarButton>
            <div style={{ width: 1, height: 16, background: "rgba(15,23,42,0.10)", margin: "0 6px" }} />
            <ToolbarIconButton onClick={() => insertAtSelection("[", "](url)")}>
              <Link2 size={14} />
            </ToolbarIconButton>
            <ToolbarIconButton>
              <Paperclip size={14} />
            </ToolbarIconButton>
            {!isDm ? (
              <ToolbarIconButton onClick={() => setComposerMode("note")}>
                <Pin size={14} />
              </ToolbarIconButton>
            ) : null}
            <ToolbarIconButton onClick={() => setComposerEmojiOpen((prev) => !prev)}>
              <Smile size={14} />
            </ToolbarIconButton>
            <ToolbarIconButton onClick={() => insertText("@")}>
              <AtSign size={14} />
            </ToolbarIconButton>
          </div>

          {composerEmojiOpen ? (
            <div
              onMouseDown={(event) => event.stopPropagation()}
              style={{
                position: "absolute",
                top: 42,
                left: 12,
                zIndex: 30,
                width: 248,
                borderRadius: 12,
                border: "1px solid rgba(15,23,42,0.08)",
                background: "#ffffff",
                boxShadow: "0 16px 40px rgba(15,23,42,0.10)",
                padding: 12,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  textTransform: "uppercase",
                  letterSpacing: 0.8,
                  color: "#94a3b8",
                  marginBottom: 8,
                  fontFamily: '"DM Mono", ui-monospace, monospace',
                }}
              >
                Emoji
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(6, 1fr)",
                  gap: 6,
                }}
              >
                {EMOJI_SET.map((emoji) => (
                  <button
                    key={`composer-${emoji}`}
                    type="button"
                    onClick={() => {
                      insertText(emoji)
                      setComposerEmojiOpen(false)
                    }}
                    style={emojiOptionStyle}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <textarea
            ref={ref}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={isDm ? handleDMComposerKey : handleComposerKey}
            placeholder={composerPlaceholder()}
            rows={3}
            style={{
              width: "100%",
              resize: "none",
              border: "none",
              outline: "none",
              background: "transparent",
              padding: "12px 14px 8px",
              fontSize: 14,
              lineHeight: 1.6,
              color: "#111827",
              minHeight: 90,
            }}
          />

          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "0 12px 12px",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 11, color: "#94a3b8" }}>
               to send · Shift+ newline · @ to mention
            </span>

            <button
              type="button"
              onClick={onSend}
              disabled={postingState}
              style={{
                marginLeft: "auto",
                width: 36,
                height: 36,
                borderRadius: 12,
                border: "none",
                background: "#6c72ff",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                opacity: postingState ? 0.6 : 1,
              }}
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <style jsx global>{`
        .lexora-ws-shell, .lexora-ws-shell * {
          box-sizing: border-box;
        }
        .lexora-ws-shell {
          --ws-bg: #1a1d27;
          --sidebar-bg: #1e2130;
          --sidebar-hover: rgba(255,255,255,0.05);
          --sidebar-active: rgba(255,255,255,0.10);
          --content-bg: #ffffff;
          --right-bg: #fbfbfd;
          --ink: #111318;
          --ink-2: #3d4257;
          --ink-3: #7a8099;
          --ink-4: #b0b8cc;
          --border: rgba(17,19,24,0.08);
          --border-med: rgba(17,19,24,0.12);
          --purple: #6c5ce7;
          --purple-light: #8b7cf8;
          --purple-dim: rgba(108,92,231,0.12);
          --blue: #2563eb;
          --blue-dim: rgba(37,99,235,0.09);
          --green: #059669;
          --green-dim: rgba(5,150,105,0.10);
          --amber: #d97706;
          --amber-dim: rgba(217,119,6,0.10);
          --red: #dc2626;
          --red-dim: rgba(220,38,38,0.09);
          height: 100dvh;
          min-height: 100dvh;
          overflow: hidden;
          display: grid;
          grid-template-columns: ${membersOpen ? `${sidebarCollapsed ? "64px" : "240px"} minmax(0, 1fr) 260px` : `${sidebarCollapsed ? "64px" : "240px"} minmax(0, 1fr)`};
          background: var(--ws-bg);
          color: var(--ink);
          font-family: Geist, Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          font-size: 13px;
          -webkit-font-smoothing: antialiased;
        }
        .lexora-ws-sidebar {
          background: var(--sidebar-bg);
          color: rgba(255,255,255,0.72);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          border-right: 1px solid rgba(255,255,255,0.05);
          min-height: 0;
        }
        .lexora-ws-sidebar.collapsed .lexora-ws-search {
          justify-content: center;
          padding: 0;
        }
        .lexora-ws-sidebar.collapsed .lexora-ws-search input,
        .lexora-ws-sidebar.collapsed .lexora-ws-kbd,
        .lexora-ws-sidebar.collapsed .lexora-ws-nav-name,
        .lexora-ws-sidebar.collapsed .lexora-ws-badge,
        .lexora-ws-sidebar.collapsed .lexora-ws-section-text,
        .lexora-ws-sidebar.collapsed .lexora-ws-footer {
          display: none;
        }
        .lexora-ws-sidebar.collapsed .lexora-ws-nav {
          justify-content: center;
          padding: 0;
        }
        .lexora-ws-sidebar.collapsed .lexora-ws-nav-left {
          gap: 0;
        }
        .lexora-ws-sidebar.collapsed .lexora-ws-sidebar-scroll {
          padding-left: 6px;
          padding-right: 6px;
        }
        .lexora-ws-top {
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 12px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          flex-shrink: 0;
        }
        .lexora-ws-logo {
          width: 26px;
          height: 26px;
          border-radius: 7px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: var(--purple);
          color: #fff;
          flex-shrink: 0;
        }
        .lexora-ws-search {
          margin: 10px 10px 6px;
          height: 34px;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.07);
          background: rgba(255,255,255,0.05);
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 0 10px;
          color: rgba(255,255,255,0.24);
          flex-shrink: 0;
        }
        .lexora-ws-search input {
          flex: 1;
          border: none;
          outline: none;
          background: transparent;
          color: rgba(255,255,255,0.72);
          font-size: 12.5px;
        }
        .lexora-ws-search input::placeholder {
          color: rgba(255,255,255,0.22);
        }
        .lexora-ws-kbd {
          font-size: 10px;
          color: rgba(255,255,255,0.18);
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 4px;
          padding: 1px 5px;
        }
        .lexora-ws-sidebar-scroll {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          padding: 4px 8px 16px;
        }
        .lexora-ws-section-row {
          width: 100%;
          border: none;
          background: transparent;
          color: rgba(255,255,255,0.36);
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 6px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 11.5px;
          font-weight: 500;
          text-align: left;
        }
        .lexora-ws-section-row:hover {
          background: rgba(255,255,255,0.04);
        }
        .lexora-ws-nav {
          width: 100%;
          border: none;
          background: transparent;
          color: rgba(255,255,255,0.48);
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          padding: 0 8px;
          border-radius: 7px;
          cursor: pointer;
          text-align: left;
          font-size: 13px;
        }
        .lexora-ws-nav:hover {
          background: var(--sidebar-hover);
          color: rgba(255,255,255,0.78);
        }
        .lexora-ws-nav.active {
          background: var(--sidebar-active);
          color: rgba(255,255,255,0.94);
          font-weight: 600;
        }
        .lexora-ws-nav-left {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
        }
        .lexora-ws-nav-name {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .lexora-ws-badge {
          border-radius: 999px;
          padding: 1px 6px;
          font-size: 10.5px;
          font-weight: 600;
          background: rgba(255,255,255,0.10);
          color: rgba(255,255,255,0.48);
          white-space: nowrap;
        }
        .lexora-ws-status-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          display: inline-block;
          flex-shrink: 0;
        }
        .lexora-ws-footer {
          border-top: 1px solid rgba(255,255,255,0.05);
          padding: 10px 10px 12px;
          flex-shrink: 0;
        }
        .lexora-ws-main {
          min-width: 0;
          min-height: 0;
          background: var(--content-bg);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .lexora-ws-main-top {
          height: 48px;
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 20px;
          gap: 12px;
          flex-shrink: 0;
          background: #fff;
        }
        .lexora-ws-tabs {
          height: 40px;
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: flex-end;
          gap: 2px;
          padding: 0 20px;
          background: #fff;
          flex-shrink: 0;
        }
        .lexora-ws-tab {
          border: none;
          border-bottom: 2px solid transparent;
          background: transparent;
          color: var(--ink-3);
          padding: 0 10px 10px;
          height: 40px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
        }
        .lexora-ws-tab:hover {
          color: var(--ink-2);
        }
        .lexora-ws-tab.active {
          color: var(--ink);
          border-bottom-color: var(--purple);
        }
        .lexora-ws-content {
          flex: 1;
          min-height: 0;
          overflow: hidden;
          background: #fff;
          display: flex;
          flex-direction: column;
        }
        .lexora-ws-scroll {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          padding: 16px 20px;
        }
        .lexora-ws-notice {
          display: flex;
          align-items: center;
          gap: 8px;
          border: 1px solid rgba(217,119,6,0.16);
          background: var(--amber-dim);
          color: var(--amber);
          border-radius: 9px;
          padding: 8px 12px;
          margin-bottom: 16px;
          font-size: 12.5px;
        }
        .lexora-ws-divider {
          display: flex;
          align-items: center;
          gap: 10px;
          color: var(--ink-4);
          font-size: 11.5px;
          margin: 8px 0 14px;
        }
        .lexora-ws-divider::before,
        .lexora-ws-divider::after {
          content: "";
          height: 1px;
          background: var(--border);
          flex: 1;
        }
        .lexora-ws-message {
          display: flex;
          gap: 10px;
          padding: 4px;
          border-radius: 8px;
          margin-bottom: 2px;
          position: relative;
        }
        .lexora-ws-message:hover {
          background: #fafaf8;
        }
        .lexora-ws-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          font-weight: 700;
          font-size: 12px;
          flex-shrink: 0;
        }
        .lexora-ws-role {
          font-size: 10px;
          font-weight: 700;
          padding: 1px 6px;
          border-radius: 4px;
          letter-spacing: 0.04em;
          color: var(--purple);
          background: var(--purple-dim);
          text-transform: uppercase;
        }
        .lexora-ws-pill-btn {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          border-radius: 999px;
          border: 1px solid var(--border);
          background: #fff;
          color: var(--ink-3);
          font-size: 12px;
          padding: 4px 8px;
          cursor: pointer;
        }
        .lexora-ws-pill-btn:hover {
          background: var(--purple-dim);
          color: var(--purple);
          border-color: rgba(108,92,231,0.22);
        }
        .lexora-ws-two-col {
          flex: 1;
          min-height: 0;
          display: grid;
          grid-template-columns: 220px minmax(0, 1fr);
          overflow: hidden;
        }
        .lexora-ws-note-list {
          border-right: 1px solid var(--border);
          padding: 12px 8px;
          overflow-y: auto;
        }
        .lexora-ws-note-item {
          width: 100%;
          border: none;
          background: transparent;
          border-radius: 8px;
          text-align: left;
          padding: 9px 10px;
          margin-bottom: 2px;
          cursor: pointer;
        }
        .lexora-ws-note-item:hover {
          background: #f5f5f3;
        }
        .lexora-ws-note-item.active {
          background: var(--purple-dim);
        }
        .lexora-ws-task-row {
          display: flex;
          align-items: center;
          gap: 10px;
          min-height: 38px;
          padding: 8px 10px;
          border-radius: 8px;
          cursor: default;
        }
        .lexora-ws-task-row:hover {
          background: #f7f7f5;
        }
        .lexora-ws-check {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          border: 1.5px solid var(--border-med);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          flex-shrink: 0;
        }
        .lexora-ws-check.done {
          background: var(--green);
          border-color: var(--green);
        }
        .lexora-ws-file-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(240px, 1fr));
          gap: 12px;
          max-width: 720px;
        }
        .lexora-ws-file-card {
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 10px 12px;
          display: flex;
          align-items: center;
          gap: 10px;
          background: #fff;
        }
        .lexora-ws-right {
          min-height: 0;
          background: var(--right-bg);
          border-left: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .lexora-ws-rp-tabs {
          height: 48px;
          display: flex;
          align-items: flex-end;
          border-bottom: 1px solid var(--border);
          background: #fff;
          padding: 0 12px;
          flex-shrink: 0;
        }
        .lexora-ws-rp-tab {
          border: none;
          border-bottom: 2px solid transparent;
          background: transparent;
          height: 48px;
          padding: 0 8px 10px;
          color: var(--ink-3);
          font-size: 12.5px;
          font-weight: 500;
          cursor: pointer;
        }
        .lexora-ws-rp-tab.active {
          color: var(--ink);
          border-bottom-color: var(--purple);
        }
        .lexora-ws-rp-scroll {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          padding: 14px 12px;
        }
        .lexora-ws-card {
          background: #fff;
          border: 1px solid var(--border);
          border-radius: 9px;
          padding: 10px;
          margin-bottom: 7px;
        }
        .lexora-ws-icon-btn {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          border: 1px solid var(--border);
          background: #fff;
          color: var(--ink-3);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        .lexora-ws-icon-btn:hover,
        .lexora-ws-icon-btn.active {
          background: var(--purple-dim);
          color: var(--purple);
          border-color: rgba(108,92,231,0.20);
        }
        @media (max-width: 1100px) {
          .lexora-ws-shell {
            grid-template-columns: ${sidebarCollapsed ? "64px" : "220px"} minmax(0, 1fr) !important;
          }
          .lexora-ws-right {
            display: none;
          }
        }
      `}</style>

      <div className="lexora-ws-shell">
        <aside className={`lexora-ws-sidebar ${sidebarCollapsed ? "collapsed" : ""}`}>
          <div className="lexora-ws-top">
            <button
              type="button"
              onClick={() => setSidebarCollapsed((prev) => !prev)}
              className="lexora-ws-icon-btn"
              title={sidebarCollapsed ? "Expand menu" : "Collapse menu"}
              style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.50)" }}
            >
              {sidebarCollapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
            </button>

            {!sidebarCollapsed && canCreateChannels ? (
              <button
                type="button"
                onClick={openCreateChannelModal}
                className="lexora-ws-icon-btn"
                title="Create channel"
                style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.50)" }}
              >
                <Plus size={15} />
              </button>
            ) : null}
          </div>

          <div className="lexora-ws-search">
            <Search size={13} />
            <input
              value={workspaceSearch}
              onChange={(event) => setWorkspaceSearch(event.target.value)}
              placeholder={sidebarCollapsed ? "" : "Search channels, notes, people..."}
            />
            <span className="lexora-ws-kbd">⌘K</span>
          </div>

          <div className="lexora-ws-sidebar-scroll">
            <div style={{ marginBottom: 8 }}>
              <button type="button" onClick={() => setChannelsCollapsed((v) => !v)} className="lexora-ws-section-row">
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                  {channelsCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                  <span className="lexora-ws-section-text">Channels</span>
                </span>
                {canCreateChannels ? <Plus size={12} /> : null}
              </button>

              {!channelsCollapsed ? (
                <div>
                  {filteredSidebarChannels.length === 0 ? (
                    <div style={{ padding: "6px 10px", color: "rgba(255,255,255,0.32)", fontSize: 12 }}>No channels</div>
                  ) : (
                    filteredSidebarChannels.map((channel) => {
                      const active = activePane.type === "channel" && activePane.slug === channel.slug
                      return (
                        <button
                          key={channel.id}
                          type="button"
                          onClick={() => {
                            setActivePane({ type: "channel", slug: channel.slug })
                            setWorkspaceView("messages")
                          }}
                          className={`lexora-ws-nav ${active ? "active" : ""}`}
                        >
                          <span className="lexora-ws-nav-left">
                            <span style={{ width: 18, display: "inline-flex", justifyContent: "center", color: active ? "rgba(255,255,255,0.72)" : "rgba(255,255,255,0.34)" }}>
                              {channel.icon_symbol || "#"}
                            </span>
                            <span className="lexora-ws-nav-name">{channel.name}</span>
                          </span>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                            {channel.is_private ? <Lock size={12} /> : null}
                            {!channel.is_default ? (
                              <span
                                role="button"
                                tabIndex={0}
                                title="Edit channel"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  openEditChannelModal(channel)
                                }}
                                onKeyDown={(event) => {
                                  if (event.key === "Enter") {
                                    event.stopPropagation()
                                    openEditChannelModal(channel)
                                  }
                                }}
                                style={{
                                  width: 20,
                                  height: 20,
                                  borderRadius: 6,
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  color: "rgba(255,255,255,0.38)",
                                }}
                              >
                                <Edit3 size={12} />
                              </span>
                            ) : null}
                          </span>
                        </button>
                      )
                    })
                  )}
                </div>
              ) : null}
            </div>

            <div style={{ marginBottom: 8 }}>
              <button type="button" onClick={() => setNotesCollapsed((v) => !v)} className="lexora-ws-section-row">
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                  {notesCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                  <span className="lexora-ws-section-text">Notes</span>
                </span>
                {canCreateNotes ? <Plus size={12} /> : null}
              </button>

              {!notesCollapsed ? (
                <div>
                  {filteredSidebarNotes.slice(0, 8).map((note) => {
                    const isShared = note.note_type === "shared" || note.visibility === "shared"
                    const active = activePane.type === "note" && activePane.id === note.id
                    return (
                      <button
                        key={note.id}
                        type="button"
                        onClick={() => {
                          setActivePane({ type: "note", id: note.id })
                          void loadNoteDetail(note.id)
                          setWorkspaceView("notes")
                        }}
                        className={`lexora-ws-nav ${active ? "active" : ""}`}
                      >
                        <span className="lexora-ws-nav-left">
                          <FileText size={13} />
                          <span className="lexora-ws-nav-name">{note.title}</span>
                        </span>
                        <span className="lexora-ws-badge" style={isShared ? { background: "rgba(5,150,105,0.14)", color: "#10b981" } : undefined}>
                          {isShared ? "Shared" : "Personal"}
                        </span>
                      </button>
                    )
                  })}
                </div>
              ) : null}
            </div>

            <div>
              <button type="button" onClick={() => setDmsCollapsed((v) => !v)} className="lexora-ws-section-row">
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                  {dmsCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                  <span className="lexora-ws-section-text">Direct messages</span>
                </span>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    setWorkspaceDmPopupsEnabled((prev) => !prev)
                  }}
                  title={workspaceDmPopupsEnabled ? "Turn DM popups off" : "Turn DM popups on"}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: workspaceDmPopupsEnabled ? "#10b981" : "rgba(255,255,255,0.26)",
                    cursor: "pointer",
                    display: "inline-flex",
                  }}
                >
                  <BellOff size={12} />
                </button>
              </button>

              {!dmsCollapsed ? (
                <div>
                  {filteredSidebarDms.map((dm) => {
                    const active = activePane.type === "dm" && activePane.id === dm.id
                    return (
                      <button
                        key={dm.id}
                        type="button"
                        onClick={() => {
                          setDmUnreadByMemberId((prev) => ({ ...prev, [dm.id]: 0 }))
                          setActivePane({ type: "dm", id: dm.id })
                          setWorkspaceView("messages")
                        }}
                        className={`lexora-ws-nav ${active ? "active" : ""}`}
                      >
                        <span className="lexora-ws-nav-left">
                          <span className="lexora-ws-avatar" style={{ width: 20, height: 20, fontSize: 9, ...avatarStyle(getInitials(dm.name)) }}>
                            {getInitials(dm.name)}
                          </span>
                          <span className="lexora-ws-nav-name">{dm.name}</span>
                        </span>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
                          {mutedDmMemberIds.includes(dm.id) ? (
                            <EyeOff size={12} style={{ color: "rgba(255,255,255,0.34)" }} />
                          ) : null}

                          {(dmUnreadByMemberId[dm.id] || 0) > 0 ? (
                            <span className="lexora-ws-badge" style={{ background: "#ef4444", color: "#fff" }}>
                              {dmUnreadByMemberId[dm.id] > 9 ? "9+" : dmUnreadByMemberId[dm.id]}
                            </span>
                          ) : (
                            <span className="lexora-ws-status-dot" style={statusDot(dm.status)} />
                          )}

                          <span
                            role="button"
                            tabIndex={0}
                            title={mutedDmMemberIds.includes(dm.id) ? "Unmute" : "Mute"}
                            onClick={(event) => {
                              event.stopPropagation()
                              toggleMutedDmMember(dm.id)
                            }}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.stopPropagation()
                                toggleMutedDmMember(dm.id)
                              }
                            }}
                            style={{
                              width: 20,
                              height: 20,
                              borderRadius: 6,
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: mutedDmMemberIds.includes(dm.id) ? "#f97316" : "rgba(255,255,255,0.30)",
                            }}
                          >
                            <BellOff size={12} />
                          </span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              ) : null}
            </div>
          </div>

        </aside>

        <main className="lexora-ws-main">
          <div className="lexora-ws-main-top">
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
              <span style={{ color: "#7a8099", fontSize: 18, lineHeight: 1 }}>
                {activePane.type === "dm" ? "@" : activePane.type === "note" ? "□" : activeChannel?.icon_symbol || "#"}
              </span>
              <span style={{ fontSize: 15, fontWeight: 700, color: "#111318", whiteSpace: "nowrap" }}>
                {activePane.type === "dm"
                  ? directMembers.find((m) => m.id === activePane.id)?.name || "Direct message"
                  : activePane.type === "note"
                    ? activeNote?.title || "Note"
                    : activeChannel?.name || "general"}
              </span>
              <span style={{ color: "#b0b8cc", borderLeft: "1px solid rgba(17,19,24,0.08)", paddingLeft: 12, fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {activePane.type === "dm" ? "Private direct message" : activePane.type === "note" ? "Workspace note" : activeChannel?.description || "Core internal workspace for admins and editors"}
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", marginRight: 4 }}>
                {teamMembers.slice(0, 3).map((member, index) => (
                  <span key={member.id} className="lexora-ws-avatar" style={{ width: 24, height: 24, fontSize: 9, border: "2px solid #fff", marginLeft: index === 0 ? 0 : -6, ...avatarStyle(getInitials(member.name)) }}>
                    {getInitials(member.name)}
                  </span>
                ))}
                <button type="button" onClick={() => { setRightPanelTab("members"); setMembersOpen(true) }} style={{ border: "none", background: "transparent", color: "#7a8099", fontSize: 12, fontWeight: 600, marginLeft: 6, cursor: "pointer" }}>
                  {teamMembers.length}
                </button>
              </div>

              <button
                type="button"
                className={`lexora-ws-icon-btn ${chatSearchOpen ? "active" : ""}`}
                title="Search messages"
                onClick={() => setChatSearchOpen((prev) => !prev)}
              >
                <Search size={15} />
              </button>
              <button type="button" className="lexora-ws-icon-btn" title="Pinned" onClick={() => { setRightPanelTab("pinned"); setMembersOpen(true) }}>
                <Pin size={15} />
              </button>
              <button type="button" className="lexora-ws-icon-btn" title="Files" onClick={() => { setRightPanelTab("files"); setMembersOpen(true) }}>
                <FileText size={15} />
              </button>
              <button type="button" className={`lexora-ws-icon-btn ${membersOpen ? "active" : ""}`} title="Members" onClick={() => { setRightPanelTab("members"); setMembersOpen((prev) => !prev) }}>
                <Users size={15} />
              </button>
            </div>
          </div>

          <div className="lexora-ws-tabs">
            <button type="button" onClick={() => setWorkspaceView("messages")} className={`lexora-ws-tab ${workspaceView === "messages" ? "active" : ""}`}>
              <MessageCircle size={13} />
              Messages
            </button>
            <button type="button" onClick={() => setWorkspaceView("tasks")} className={`lexora-ws-tab ${workspaceView === "tasks" ? "active" : ""}`}>
              ✓ Tasks
            </button>
            <button type="button" onClick={() => setWorkspaceView("notes")} className={`lexora-ws-tab ${workspaceView === "notes" ? "active" : ""}`}>
              <FileText size={13} />
              Notes
            </button>
            <button type="button" onClick={() => setWorkspaceView("files")} className={`lexora-ws-tab ${workspaceView === "files" ? "active" : ""}`}>
              <Paperclip size={13} />
              Files
            </button>
          </div>

          <div className="lexora-ws-content">
            {error ? (
              <div style={{ margin: "12px 20px 0", borderRadius: 9, border: "1px solid rgba(220,38,38,0.16)", background: "rgba(220,38,38,0.06)", color: "#dc2626", padding: "9px 12px", fontSize: 13 }}>
                {error}
              </div>
            ) : null}

            {workspaceView === "messages" ? (
              <>
                <div className="lexora-ws-scroll">
                  {chatSearchOpen ? (
                    <div style={{ marginBottom: 12 }}>
                      <input
                        value={chatSearch}
                        onChange={(event) => setChatSearch(event.target.value)}
                        placeholder="Search current conversation..."
                        style={inputStyle}
                      />
                    </div>
                  ) : null}

                  {activePane.type === "channel" ? (
                    <div className="lexora-ws-notice">
                      <Pin size={13} />
                      <strong>Pinned:</strong>
                      <span>Welcome to #{activeChannel?.name || "general"} — main admin comms channel. Keep it professional.</span>
                    </div>
                  ) : null}

                  <div className="lexora-ws-divider">Today</div>

                  {activePane.type === "dm" ? (
                    dmLoading ? (
                      <div style={{ padding: "50px 0", textAlign: "center", color: "#b0b8cc" }}>Loading direct messages...</div>
                    ) : dmMessages.length === 0 ? (
                      <div style={{ padding: "50px 0", textAlign: "center", color: "#b0b8cc" }}>No direct messages yet.</div>
                    ) : (
                      dmMessages
                        .filter((message) => {
                          const q = chatSearch.trim().toLowerCase()
                          if (!q) return true
                          return message.content.toLowerCase().includes(q) || message.author.toLowerCase().includes(q)
                        })
                        .map((message) => {
                        const initials = getInitials(message.author)
                        const canDeleteDmMessage = currentUser?.id === message.author_id || currentUser?.role === "super_admin" || currentUser?.admin_role === "super_admin"
                        return (
                          <div key={message.id} className="lexora-ws-message">
                            <div className="lexora-ws-avatar" style={avatarStyle(initials)}>{initials}</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 3 }}>
                                <span style={{ fontWeight: 700, color: "#111318" }}>{message.author}</span>
                                <span className="lexora-ws-role">{message.role}</span>
                                <span style={{ fontSize: 11, color: "#b0b8cc" }}>{formatTime(message.created_at)}</span>
                              </div>
                              <div style={message.is_deleted ? deletedMessageTextStyle : normalMessageTextStyle}>{message.content}</div>
                              {!message.is_deleted ? (
                                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                                  <button type="button" className="lexora-ws-pill-btn" onClick={() => openForwardPickerForMessage({
                                    id: message.id,
                                    author: message.author,
                                    author_id: message.author_id,
                                    role: message.role,
                                    content: message.content,
                                    created_at: message.created_at,
                                    updated_at: message.created_at,
                                    edited_at: message.edited_at,
                                    is_pinned: false,
                                    my_emojis: [],
                                    reactions: [],
                                    is_deleted: message.is_deleted,
                                  })}>
                                    <Forward size={13} /> Forward
                                  </button>
                                  {canDeleteDmMessage ? (
                                    <button type="button" className="lexora-ws-pill-btn" onClick={() => void deleteDMMessage(message.id)} disabled={dmDeletingId === message.id}>
                                      <Trash2 size={13} /> {dmDeletingId === message.id ? "Deleting..." : "Delete"}
                                    </button>
                                  ) : null}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        )
                      })
                    )
                  ) : loading ? (
                    <div style={{ padding: "50px 0", textAlign: "center", color: "#b0b8cc" }}>Loading messages...</div>
                  ) : messages.length === 0 ? (
                    <div style={{ padding: "50px 0", textAlign: "center", color: "#b0b8cc" }}>No messages yet in this channel.</div>
                  ) : (
                    messages
                      .filter((message) => {
                        const q = chatSearch.trim().toLowerCase()
                        if (!q) return true
                        return (
                          message.content.toLowerCase().includes(q) ||
                          message.author.toLowerCase().includes(q) ||
                          (message.forwarded_original_author_name || "").toLowerCase().includes(q)
                        )
                      })
                      .map((message) => {
                      const initials = getInitials(message.author)
                      const canDeleteChannelMessage = currentUser?.id === message.author_id || currentUser?.role === "super_admin" || currentUser?.admin_role === "super_admin"
                      const canEditChannelMessage = canDeleteChannelMessage
                      return (
                        <div key={message.id} className="lexora-ws-message">
                          <div className="lexora-ws-avatar" style={avatarStyle(initials)}>{initials}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 3, flexWrap: "wrap" }}>
                              <span style={{ fontWeight: 700, color: "#111318" }}>{message.author}</span>
                              <span className="lexora-ws-role">{message.role}</span>
                              <span style={{ fontSize: 11, color: "#b0b8cc" }}>{formatTime(message.created_at)}</span>
                              {message.edited_at ? <span style={{ fontSize: 11, color: "#cbd5e1" }}>(edited)</span> : null}
                            </div>

                            {message.reply_preview ? (
                              <div style={{ borderLeft: "2px solid rgba(108,92,231,0.22)", paddingLeft: 10, marginBottom: 6, fontSize: 12, color: "#7a8099" }}>
                                <div style={{ fontWeight: 600 }}>{message.reply_preview.author}</div>
                                <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{message.reply_preview.content}</div>
                              </div>
                            ) : null}

                            {message.forwarded_original_author_name ? (
                              <div style={{ fontSize: 12, color: "#7a8099", marginBottom: 6 }}>Forwarded from {message.forwarded_original_author_name}</div>
                            ) : null}

                            <div style={message.is_deleted ? deletedMessageTextStyle : normalMessageTextStyle}>{message.content}</div>

                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                              {!message.is_deleted && message.reactions.map((reaction) => {
                                const mine = message.my_emojis.includes(reaction.emoji)
                                return (
                                  <button key={`${message.id}-${reaction.emoji}`} type="button" onClick={() => void react(message.id, reaction.emoji)} className="lexora-ws-pill-btn" style={mine ? { background: "rgba(108,92,231,0.12)", color: "#6c5ce7", borderColor: "rgba(108,92,231,0.25)" } : undefined}>
                                    <span>{reaction.emoji}</span>
                                    <span>{reaction.count}</span>
                                  </button>
                                )
                              })}

                              {!message.is_deleted ? (
                                <button type="button" className="lexora-ws-pill-btn" onClick={() => { setReplyingTo(message); setForwardingMessage(null); setForwardingNote(null) }}>
                                  <CornerDownRight size={13} /> Reply
                                </button>
                              ) : null}
                              {!message.is_deleted ? (
                                <button type="button" className="lexora-ws-pill-btn" onClick={() => openForwardPickerForMessage(message)}>
                                  <Forward size={13} /> Forward
                                </button>
                              ) : null}
                              {!message.is_deleted && canEditChannelMessage ? (
                                <button type="button" className="lexora-ws-pill-btn" onClick={() => openChannelMessageEdit(message)}>
                                  <Edit3 size={13} /> Edit
                                </button>
                              ) : null}
                              {!message.is_deleted && canDeleteChannelMessage ? (
                                <button type="button" className="lexora-ws-pill-btn" onClick={() => void deleteMessage(message.id)}>
                                  <Trash2 size={13} /> Delete
                                </button>
                              ) : null}
                              {!message.is_deleted ? (
                                <div style={{ position: "relative" }}>
                                  <button type="button" className="lexora-ws-pill-btn" onClick={() => setEmojiPickerFor((prev) => (prev === message.id ? null : message.id))}>
                                    <Smile size={13} /> React
                                  </button>
                                  {emojiPickerFor === message.id ? (
                                    <div onMouseDown={(event) => event.stopPropagation()} style={{ position: "absolute", top: "calc(100% + 8px)", left: 0, zIndex: 20, width: 248, borderRadius: 12, border: "1px solid rgba(15,23,42,0.08)", background: "#ffffff", boxShadow: "0 16px 40px rgba(15,23,42,0.10)", padding: 12 }}>
                                      <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 0.8, color: "#94a3b8", marginBottom: 8 }}>Reactions</div>
                                      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 6 }}>
                                        {EMOJI_SET.map((emoji) => (
                                          <button key={`${message.id}-${emoji}`} type="button" onClick={() => void react(message.id, emoji)} style={emojiOptionStyle}>{emoji}</button>
                                        ))}
                                      </div>
                                    </div>
                                  ) : null}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                  {activePane.type === "dm" ? <div ref={dmMessagesEndRef} /> : null}
                </div>

                {activePane.type === "channel" ? renderSharedComposer("channel") : null}
                {activePane.type === "dm" ? renderSharedComposer("dm") : null}
              </>
            ) : null}

            {workspaceView === "tasks" ? (
              <div className="lexora-ws-scroll">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                  <div style={{ fontFamily: "Georgia, serif", fontSize: 22, color: "#111318", letterSpacing: -0.3 }}>
                    Tasks — {activePane.type === "channel" ? `#${activeChannel?.name || "general"}` : "Workspace"}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button type="button" className="lexora-ws-pill-btn">☰ Filter</button>
                    <button type="button" className="lexora-ws-pill-btn" style={{ borderRadius: 8, background: "#6c5ce7", color: "#fff", borderColor: "#6c5ce7" }}>
                      <Plus size={13} /> Add task
                    </button>
                  </div>
                </div>

                <div style={{ marginBottom: 22 }}>
                  <div style={{ borderBottom: "1px solid rgba(17,19,24,0.08)", paddingBottom: 8, marginBottom: 8, color: "#7a8099", textTransform: "uppercase", letterSpacing: 0.8, fontSize: 12, fontWeight: 700 }}>○ In Progress <span style={{ color: "#b0b8cc", fontWeight: 400 }}>2</span></div>
                  <div className="lexora-ws-task-row"><span className="lexora-ws-check" /><span style={{ width: 8, height: 8, borderRadius: "50%", background: "#dc2626" }} /><span style={{ flex: 1 }}>Fix mobile overflow on billing card</span><span className="lexora-ws-avatar" style={{ width: 20, height: 20, fontSize: 8, ...avatarStyle("V") }}>V</span><span style={{ color: "#dc2626", fontSize: 11.5 }}>Due today</span><span className="lexora-ws-badge" style={{ background: "rgba(220,38,38,0.09)", color: "#dc2626" }}>bug</span></div>
                  <div className="lexora-ws-task-row"><span className="lexora-ws-check" /><span style={{ width: 8, height: 8, borderRadius: "50%", background: "#d97706" }} /><span style={{ flex: 1 }}>Cache Copilot answers per ticket_id</span><span className="lexora-ws-avatar" style={{ width: 20, height: 20, fontSize: 8, ...avatarStyle("A") }}>A</span><span style={{ color: "#b0b8cc", fontSize: 11.5 }}>May 22</span><span className="lexora-ws-badge" style={{ background: "rgba(37,99,235,0.09)", color: "#2563eb" }}>feature</span></div>
                </div>

                <div style={{ marginBottom: 22 }}>
                  <div style={{ borderBottom: "1px solid rgba(17,19,24,0.08)", paddingBottom: 8, marginBottom: 8, color: "#7a8099", textTransform: "uppercase", letterSpacing: 0.8, fontSize: 12, fontWeight: 700 }}>□ Todo <span style={{ color: "#b0b8cc", fontWeight: 400 }}>3</span></div>
                  <div className="lexora-ws-task-row"><span className="lexora-ws-check" /><span style={{ width: 8, height: 8, borderRadius: "50%", background: "#d97706" }} /><span style={{ flex: 1 }}>Write onboarding email sequence for new subscribers</span><span className="lexora-ws-avatar" style={{ width: 20, height: 20, fontSize: 8, ...avatarStyle("T") }}>T</span><span style={{ color: "#b0b8cc", fontSize: 11.5 }}>May 25</span><span className="lexora-ws-badge" style={{ background: "rgba(217,119,6,0.10)", color: "#d97706" }}>content</span></div>
                  <div className="lexora-ws-task-row"><span className="lexora-ws-check" /><span style={{ width: 8, height: 8, borderRadius: "50%", background: "#b0b8cc" }} /><span style={{ flex: 1 }}>Add pagination to admin user table</span><span className="lexora-ws-avatar" style={{ width: 20, height: 20, fontSize: 8, ...avatarStyle("A") }}>A</span><span style={{ color: "#b0b8cc", fontSize: 11.5 }}>May 28</span><span className="lexora-ws-badge">improvement</span></div>
                  <div className="lexora-ws-task-row"><span className="lexora-ws-check" /><span style={{ width: 8, height: 8, borderRadius: "50%", background: "#dc2626" }} /><span style={{ flex: 1 }}>Set up Paddle webhook for billing sync</span><span className="lexora-ws-avatar" style={{ width: 20, height: 20, fontSize: 8, ...avatarStyle("V") }}>V</span><span style={{ color: "#dc2626", fontSize: 11.5 }}>Overdue · May 17</span><span className="lexora-ws-badge" style={{ background: "rgba(220,38,38,0.09)", color: "#dc2626" }}>critical</span></div>
                </div>

                <div>
                  <div style={{ borderBottom: "1px solid rgba(17,19,24,0.08)", paddingBottom: 8, marginBottom: 8, color: "#059669", textTransform: "uppercase", letterSpacing: 0.8, fontSize: 12, fontWeight: 700 }}>✓ Completed <span style={{ color: "#b0b8cc", fontWeight: 400 }}>1</span></div>
                  <div className="lexora-ws-task-row" style={{ color: "#b0b8cc" }}><span className="lexora-ws-check done">✓</span><span style={{ flex: 1, textDecoration: "line-through" }}>Redesign subscription page</span><span className="lexora-ws-avatar" style={{ width: 20, height: 20, fontSize: 8, ...avatarStyle("V") }}>V</span><span style={{ fontSize: 11.5 }}>Done · May 17</span></div>
                </div>
              </div>
            ) : null}

            {workspaceView === "notes" ? (
              <div className="lexora-ws-two-col">
                <div className="lexora-ws-note-list">
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 6px 10px" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#7a8099", letterSpacing: 0.8, textTransform: "uppercase" }}>Notes</div>
                    {canCreateNotes ? (
                      <button type="button" onClick={() => setNoteModalOpen(true)} className="lexora-ws-icon-btn" style={{ width: 22, height: 22, background: "rgba(108,92,231,0.12)", color: "#6c5ce7", border: "none" }}>
                        <Plus size={13} />
                      </button>
                    ) : null}
                  </div>

                  {notes.map((note) => {
                    const active = activePane.type === "note" && activePane.id === note.id
                    const isShared = note.note_type === "shared" || note.visibility === "shared"
                    return (
                      <button key={note.id} type="button" className={`lexora-ws-note-item ${active ? "active" : ""}`} onClick={() => void loadNoteDetail(note.id)}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: active ? "#6c5ce7" : "#111318", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{note.title}</div>
                        <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 3 }}>
                          <span className="lexora-ws-badge" style={isShared ? { background: "rgba(5,150,105,0.10)", color: "#059669" } : { background: "rgba(17,19,24,0.06)", color: "#7a8099" }}>{isShared ? "Shared" : "Personal"}</span>
                          <span style={{ fontSize: 11, color: "#b0b8cc" }}>{formatDate(note.updated_at || note.created_at)}</span>
                        </div>
                      </button>
                    )
                  })}
                </div>

                <div style={{ display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>
                  {activeNote ? (
                    <>
                      <div style={{ padding: "20px 28px 12px", borderBottom: "1px solid rgba(17,19,24,0.08)" }}>
                        {editingNote ? (
                          <input value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} style={noteTitleInputStyle} />
                        ) : (
                          <div style={{ fontFamily: "Georgia, serif", fontSize: 28, color: "#111318", letterSpacing: -0.4 }}>{activeNote.title || "Untitled note"}</div>
                        )}
                        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8, color: "#b0b8cc", fontSize: 12 }}>
                          <span>Edited {formatDate(activeNote.updated_at || activeNote.created_at)}</span>
                          <span>{currentUserDisplayName}</span>
                          <span className="lexora-ws-badge" style={(activeNote.note_type === "shared" || activeNote.visibility === "shared") ? { background: "rgba(5,150,105,0.10)", color: "#059669" } : undefined}>
                            {(activeNote.note_type === "shared" || activeNote.visibility === "shared") ? "Shared" : "Personal"}
                          </span>
                        </div>
                      </div>

                      <div className="lexora-ws-scroll" style={{ fontSize: 14, lineHeight: 1.75, color: "#3d4257" }}>
                        {editingNote ? (
                          <>
                            {activeNote.note_type === "shared" ? (
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                                <select value={noteSharedScope} onChange={(e) => setNoteSharedScope(e.target.value as "workspace" | "specific_users")} style={inputStyle}>
                                  <option value="workspace">Whole workspace</option>
                                  <option value="specific_users">Specific users</option>
                                </select>
                                <div />
                              </div>
                            ) : null}

                            {activeNote.note_type === "shared" && noteSharedScope === "specific_users" ? (
                              <div style={{ marginBottom: 12 }}>
                                <input value={noteRecipientSearch} onChange={(e) => setNoteRecipientSearch(e.target.value)} placeholder="Search users..." style={{ ...inputStyle, marginBottom: 10 }} />
                                <div style={recipientPanelStyle}>
                                  {filteredRecipientMembers.map((member) => {
                                    const checked = selectedNoteRecipientIds.includes(member.id)
                                    return (
                                      <label key={member.id} style={recipientOptionStyle}>
                                        <input type="checkbox" checked={checked} onChange={() => toggleRecipient(member.id)} />
                                        <span style={recipientAvatarStyle(member.name)}>{getInitials(member.name)}</span>
                                        <span style={{ minWidth: 0 }}>
                                          <span style={{ display: "block", fontSize: 13, color: "#111827", fontWeight: 600 }}>{member.name}</span>
                                          <span style={{ display: "block", fontSize: 12, color: "#64748b" }}>{member.email || member.title || member.role}</span>
                                        </span>
                                      </label>
                                    )
                                  })}
                                </div>
                              </div>
                            ) : null}

                            <textarea value={noteBody} onChange={(e) => setNoteBody(e.target.value)} rows={10} style={noteBodyInputStyle} />
                            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                              <button type="button" className="lexora-ws-pill-btn" onClick={() => void updateNote()}><Edit3 size={13} /> Save</button>
                              <button type="button" className="lexora-ws-pill-btn" onClick={() => { setEditingNote(false); setNoteTitle(""); setNoteBody(""); setNoteRecipientSearch("") }}><X size={13} /> Cancel</button>
                            </div>
                          </>
                        ) : (
                          <div style={{ whiteSpace: "pre-wrap" }}>{activeNote.body || activeNote.description || "No note content."}</div>
                        )}

                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 18 }}>
                          <button type="button" className="lexora-ws-pill-btn" onClick={() => setEditingNote(true)}><Edit3 size={13} /> Edit</button>
                          <button type="button" className="lexora-ws-pill-btn" onClick={() => setNoteReactionPickerOpen((v) => !v)}><Smile size={13} /> React</button>
                          <button type="button" className="lexora-ws-pill-btn" onClick={() => openForwardPickerForNote(activeNote)}><Forward size={13} /> Forward</button>
                          <button type="button" className="lexora-ws-pill-btn" onClick={() => void withdrawNote()}><Trash2 size={13} /> Withdraw</button>
                        </div>

                        {noteReactionPickerOpen ? (
                          <div style={notePickerStyle}>
                            {EMOJI_SET.map((emoji) => (
                              <button key={emoji} type="button" onClick={() => void reactToNote(emoji)} style={emojiOptionStyle}>{emoji}</button>
                            ))}
                          </div>
                        ) : null}

                        <div style={{ marginTop: 20 }}>
                          <div style={{ fontSize: 11, letterSpacing: 0.8, color: "#94a3b8", textTransform: "uppercase", marginBottom: 8 }}>Comments</div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {noteComments.map((comment) => (
                              <div key={comment.id} style={{ display: "flex", gap: 10 }}>
                                <span className="lexora-ws-avatar" style={{ width: 28, height: 28, fontSize: 10, ...avatarStyle(getInitials(comment.author_name || "A")) }}>{getInitials(comment.author_name || "A")}</span>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                                    <span style={{ fontSize: 13, fontWeight: 700 }}>{comment.author_name}</span>
                                    <span style={{ fontSize: 11, color: "#94a3b8" }}>{formatTime(comment.created_at)}</span>
                                    <button type="button" onClick={() => void deleteComment(comment.id)} style={{ border: "none", background: "transparent", color: "#ef4444", fontSize: 11, cursor: "pointer" }}>Delete</button>
                                  </div>
                                  <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.6 }}>{comment.body}</div>
                                </div>
                              </div>
                            ))}
                          </div>

                          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                            <input value={noteCommentText} onChange={(e) => setNoteCommentText(e.target.value)} placeholder="Add a comment..." style={{ ...inputStyle, flex: 1 }} />
                            <button type="button" onClick={() => void addNoteComment()} className="lexora-ws-pill-btn" style={{ borderRadius: 8, background: "#6c5ce7", color: "#fff", borderColor: "#6c5ce7" }}>Comment</button>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div style={{ padding: 40, color: "#b0b8cc" }}>Select a note from the list.</div>
                  )}
                </div>
              </div>
            ) : null}

            {workspaceView === "files" ? (
              <div className="lexora-ws-scroll">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                  <div style={{ fontFamily: "Georgia, serif", fontSize: 22, color: "#111318" }}>
                    Files — {activePane.type === "channel" ? `#${activeChannel?.name || "general"}` : "Workspace"}
                  </div>
                  <button type="button" className="lexora-ws-pill-btn" style={{ borderRadius: 8, background: "#6c5ce7", color: "#fff", borderColor: "#6c5ce7" }}>
                    <Paperclip size={13} /> Upload file
                  </button>
                </div>

                <div className="lexora-ws-file-grid">
                  {[
                    ["PDF", "UBE_Subject_Outline.pdf", "Vladimir · May 17 · 2.4 MB", "#dbeafe", "#2563eb"],
                    ["XLS", "Rule_Bank_Export.xlsx", "admin 2 · May 16 · 840 KB", "#dcfce7", "#059669"],
                    ["DOC", "Onboarding_Brief.docx", "Test Account · May 15 · 156 KB", "#fef3c7", "#d97706"],
                    ["IMG", "design_mockups_v3.png", "Vladimir · May 14 · 1.2 MB", "#fce7f3", "#db2777"],
                  ].map(([type, name, meta, bg, fg]) => (
                    <div key={name} className="lexora-ws-file-card">
                      <div style={{ width: 34, height: 34, borderRadius: 8, background: bg, color: fg, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800 }}>{type}</div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ color: "#111318", fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</div>
                        <div style={{ color: "#b0b8cc", fontSize: 11.5 }}>{meta}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </main>

        {membersOpen ? (
          <aside className="lexora-ws-right">
            <div className="lexora-ws-rp-tabs">
              <button type="button" onClick={() => setRightPanelTab("members")} className={`lexora-ws-rp-tab ${rightPanelTab === "members" ? "active" : ""}`}>Members</button>
              <button type="button" onClick={() => setRightPanelTab("pinned")} className={`lexora-ws-rp-tab ${rightPanelTab === "pinned" ? "active" : ""}`}>Pinned</button>
              <button type="button" onClick={() => setRightPanelTab("files")} className={`lexora-ws-rp-tab ${rightPanelTab === "files" ? "active" : ""}`}>Files</button>
            </div>

            <div className="lexora-ws-rp-scroll">
              {rightPanelTab === "members" ? (
                <>
                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1.1, color: "#b0b8cc", textTransform: "uppercase", marginBottom: 8 }}>Presence</div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 8px", borderRadius: 8, marginBottom: 6 }}>
                    <span className="lexora-ws-avatar" style={{ width: 30, height: 30, fontSize: 11, ...avatarStyle(getInitials(currentUserDisplayName)), position: "relative" }}>
                      {getInitials(currentUserDisplayName)}
                      <span style={{ position: "absolute", right: -1, bottom: -1, width: 9, height: 9, borderRadius: "50%", border: "2px solid #fbfbfd", ...statusDot(currentUserStatus) }} />
                    </span>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#111318" }}>{currentUserDisplayName}</div>
                      <div style={{ fontSize: 11, color: "#b0b8cc" }}>{currentUser?.admin_role || currentUser?.role || "Admin"}</div>
                    </div>
                    <select value={currentUserStatus} onChange={(e) => setCurrentUserStatus(e.target.value as "online" | "away" | "busy" | "offline")} style={{ fontSize: 11.5, color: "#7a8099", background: "rgba(17,19,24,0.04)", border: "none", borderRadius: 6, padding: "4px 6px", outline: "none" }}>
                      <option value="online">Online</option>
                      <option value="away">Away</option>
                      <option value="busy">Busy</option>
                      <option value="offline">Offline</option>
                    </select>
                  </div>

                  {teamMembers.map((member) => (
                    <button key={member.id} type="button" onClick={() => openMemberProfile(member)} style={{ width: "100%", border: "none", background: "transparent", display: "flex", alignItems: "center", gap: 8, padding: "7px 8px", borderRadius: 8, cursor: "pointer", textAlign: "left" }}>
                      <span className="lexora-ws-avatar" style={{ width: 30, height: 30, fontSize: 11, ...avatarStyle(getInitials(member.name)), position: "relative" }}>
                        {getInitials(member.name)}
                        <span style={{ position: "absolute", right: -1, bottom: -1, width: 9, height: 9, borderRadius: "50%", border: "2px solid #fbfbfd", ...statusDot(member.status) }} />
                      </span>
                      <span style={{ minWidth: 0, flex: 1 }}>
                        <span style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#111318", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{member.name}</span>
                        <span style={{ display: "block", fontSize: 11, color: "#b0b8cc" }}>{member.title || member.role}</span>
                      </span>
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={() => setInviteMemberOpen(true)}
                    style={{ width: "100%", marginTop: 12, borderRadius: 9, border: "1.5px dashed rgba(17,19,24,0.12)", background: "transparent", color: "#7a8099", height: 34, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, cursor: "pointer", fontSize: 12.5 }}
                  >
                    <UserPlus size={13} /> Invite member
                  </button>
                </>
              ) : null}

              {rightPanelTab === "pinned" ? (
                <>
                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1.1, color: "#b0b8cc", textTransform: "uppercase", marginBottom: 8 }}>Pinned messages</div>
                  <div className="lexora-ws-card">
                    <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 5 }}>
                      <span className="lexora-ws-avatar" style={{ width: 18, height: 18, fontSize: 8, ...avatarStyle("V") }}>V</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#3d4257" }}>Vladimir</span>
                      <span style={{ marginLeft: "auto", fontSize: 11, color: "#b0b8cc" }}>May 17</span>
                    </div>
                    <div style={{ fontSize: 12.5, color: "#7a8099", lineHeight: 1.5 }}>Welcome to #general — main admin comms channel. Keep it professional.</div>
                  </div>
                  <div className="lexora-ws-card">
                    <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 5 }}>
                      <span className="lexora-ws-avatar" style={{ width: 18, height: 18, fontSize: 8, ...avatarStyle("T") }}>T</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#3d4257" }}>Test Account</span>
                      <span style={{ marginLeft: "auto", fontSize: 11, color: "#b0b8cc" }}>May 16</span>
                    </div>
                    <div style={{ fontSize: 12.5, color: "#7a8099", lineHeight: 1.5 }}>Staging URL and credentials are in the shared vault.</div>
                  </div>
                </>
              ) : null}

              {rightPanelTab === "files" ? (
                <>
                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1.1, color: "#b0b8cc", textTransform: "uppercase", marginBottom: 8 }}>Files</div>
                  {["UBE_Subject_Outline.pdf", "Rule_Bank_Export.xlsx", "Onboarding_Brief.docx", "design_mockups_v3.png"].map((name) => (
                    <div key={name} className="lexora-ws-card" style={{ display: "flex", alignItems: "center", gap: 9 }}>
                      <div style={{ width: 30, height: 30, borderRadius: 7, background: "rgba(37,99,235,0.09)", color: "#2563eb", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800 }}>
                        {name.split(".").pop()?.toUpperCase()}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 700, color: "#111318", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
                        <div style={{ fontSize: 11, color: "#b0b8cc" }}>Workspace file</div>
                      </div>
                    </div>
                  ))}
                </>
              ) : null}
            </div>
          </aside>
        ) : null}
      </div>

      {channelModalOpen && (
        <div
          onClick={() => {
            if (!creatingChannel) setChannelModalOpen(false)
          }}
          style={modalOverlayStyle}
        >
          <div onClick={(e) => e.stopPropagation()} style={modalCardStyle}>
            <div style={modalHeaderStyle}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>Create Channel</div>
              <button type="button" onClick={() => setChannelModalOpen(false)} style={modalCloseStyle}>
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: 18 }}>
              <div style={{ marginBottom: 14 }}>
                <div style={labelStyle}>Channel name</div>
                <input
                  value={channelName}
                  onChange={(e) => setChannelName(e.target.value)}
                  placeholder="Channel title"
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <div style={labelStyle}>Description</div>
                <input
                  value={channelDescription}
                  onChange={(e) => setChannelDescription(e.target.value)}
                  placeholder="What this channel is for"
                  style={inputStyle}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "84px 1fr", gap: 12, marginBottom: 14 }}>
                <div>
                  <div style={labelStyle}>Symbol</div>
                  <input
                    value={channelSymbol}
                    onChange={(e) => setChannelSymbol(e.target.value)}
                    placeholder="#"
                    maxLength={2}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <div style={labelStyle}>Name color</div>
                  <input
                    type="color"
                    value={channelColor}
                    onChange={(e) => setChannelColor(e.target.value)}
                    style={{
                      width: "100%",
                      height: 42,
                      borderRadius: 10,
                      border: "1px solid rgba(15,23,42,0.10)",
                      background: "#ffffff",
                      padding: 4,
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: 14, marginBottom: 14 }}>
                <label style={checkboxLabelStyle}>
                  <input
                    type="checkbox"
                    checked={channelIsPrivate}
                    onChange={(e) => setChannelIsPrivate(e.target.checked)}
                  />
                  Private
                </label>
                <label style={checkboxLabelStyle}>
                  <input
                    type="checkbox"
                    checked={channelIsHidden}
                    onChange={(e) => setChannelIsHidden(e.target.checked)}
                  />
                  Hidden
                </label>
              </div>

              {channelIsHidden ? (
                <div style={{ marginBottom: 18 }}>
                  <div style={labelStyle}>Who can see this hidden channel</div>
                  <div style={recipientPanelStyle}>
                    {teamMembers.map((member) => {
                      const checked = channelVisibleUserIds.includes(member.id)
                      return (
                        <label key={member.id} style={recipientOptionStyle}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleHiddenChannelUser(member.id)}
                          />
                          <span style={recipientAvatarStyle(member.name)}>{getInitials(member.name)}</span>
                          <span style={{ minWidth: 0 }}>
                            <span style={{ display: "block", fontSize: 13, color: "#111827", fontWeight: 600 }}>
                              {member.name}
                            </span>
                            <span style={{ display: "block", fontSize: 12, color: "#64748b" }}>
                              {member.email || member.title || member.role}
                            </span>
                          </span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              ) : null}

              <div style={{ display: "flex", gap: 10 }}>
                <button type="button" onClick={() => setChannelModalOpen(false)} style={secondaryActionStyle}>
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => void createChannel()}
                  disabled={creatingChannel}
                  style={primaryActionStyle}
                >
                  {creatingChannel ? "Creating..." : "Create Channel"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {channelEditModalOpen && (
        <div
          onClick={() => {
            if (!savingChannelEdit) setChannelEditModalOpen(false)
          }}
          style={modalOverlayStyle}
        >
          <div onClick={(e) => e.stopPropagation()} style={modalCardStyle}>
            <div style={modalHeaderStyle}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>Edit Channel</div>
              <button type="button" onClick={() => setChannelEditModalOpen(false)} style={modalCloseStyle}>
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: 18 }}>
              <div style={{ marginBottom: 14 }}>
                <div style={labelStyle}>Channel name</div>
                <input value={channelName} onChange={(e) => setChannelName(e.target.value)} style={inputStyle} />
              </div>

              <div style={{ marginBottom: 14 }}>
                <div style={labelStyle}>Description</div>
                <input
                  value={channelDescription}
                  onChange={(e) => setChannelDescription(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "84px 1fr", gap: 12, marginBottom: 14 }}>
                <div>
                  <div style={labelStyle}>Symbol</div>
                  <input
                    value={channelSymbol}
                    onChange={(e) => setChannelSymbol(e.target.value)}
                    maxLength={2}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <div style={labelStyle}>Name color</div>
                  <input
                    type="color"
                    value={channelColor}
                    onChange={(e) => setChannelColor(e.target.value)}
                    style={{
                      width: "100%",
                      height: 42,
                      borderRadius: 10,
                      border: "1px solid rgba(15,23,42,0.10)",
                      background: "#ffffff",
                      padding: 4,
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: 14, marginBottom: 14 }}>
                <label style={checkboxLabelStyle}>
                  <input
                    type="checkbox"
                    checked={channelIsPrivate}
                    onChange={(e) => setChannelIsPrivate(e.target.checked)}
                  />
                  Private
                </label>
                <label style={checkboxLabelStyle}>
                  <input
                    type="checkbox"
                    checked={channelIsHidden}
                    onChange={(e) => setChannelIsHidden(e.target.checked)}
                  />
                  Hidden
                </label>
              </div>

              {channelIsHidden ? (
                <div style={{ marginBottom: 18 }}>
                  <div style={labelStyle}>Visible users</div>
                  <div style={recipientPanelStyle}>
                    {teamMembers.map((member) => {
                      const checked = channelVisibleUserIds.includes(member.id)
                      return (
                        <label key={member.id} style={recipientOptionStyle}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleHiddenChannelUser(member.id)}
                          />
                          <span style={recipientAvatarStyle(member.name)}>{getInitials(member.name)}</span>
                          <span style={{ minWidth: 0 }}>
                            <span style={{ display: "block", fontSize: 13, color: "#111827", fontWeight: 600 }}>
                              {member.name}
                            </span>
                            <span style={{ display: "block", fontSize: 12, color: "#64748b" }}>
                              {member.email || member.title || member.role}
                            </span>
                          </span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              ) : null}

              <div style={{ display: "flex", gap: 10 }}>
                <button type="button" onClick={() => setChannelEditModalOpen(false)} style={secondaryActionStyle}>
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => void saveChannelEdit()}
                  disabled={savingChannelEdit}
                  style={primaryActionStyle}
                >
                  {savingChannelEdit ? "Saving..." : "Save Channel"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {noteModalOpen && (
        <div
          onClick={() => {
            if (!creatingNote) setNoteModalOpen(false)
          }}
          style={modalOverlayStyle}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ ...modalCardStyle, width: 540 }}>
            <div style={modalHeaderStyle}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>
                {forwardingNote ? "Forward Note" : "Create Note"}
              </div>
              <button type="button" onClick={() => setNoteModalOpen(false)} style={modalCloseStyle}>
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: 18 }}>
              <div style={{ marginBottom: 14 }}>
                <div style={labelStyle}>Title</div>
                <input
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  placeholder="Note title"
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <div style={labelStyle}>Note type</div>
                <select
                  value={noteType}
                  onChange={(e) => {
                    const next = e.target.value as "personal" | "shared"
                    setNoteType(next)
                    if (next === "personal") {
                      setNoteSharedScope("workspace")
                      setSelectedNoteRecipientIds([])
                    }
                  }}
                  style={inputStyle}
                >
                  <option value="personal">Personal note</option>
                  <option value="shared">Shared note</option>
                </select>
              </div>

              {noteType === "shared" ? (
                <div style={{ marginBottom: 14 }}>
                  <div style={labelStyle}>Shared scope</div>
                  <select
                    value={noteSharedScope}
                    onChange={(e) => setNoteSharedScope(e.target.value as "workspace" | "specific_users")}
                    style={inputStyle}
                  >
                    <option value="workspace">Whole workspace</option>
                    <option value="specific_users">Specific users</option>
                  </select>
                </div>
              ) : null}

              {noteType === "shared" && noteSharedScope === "specific_users" ? (
                <div style={{ marginBottom: 14 }}>
                  <div style={labelStyle}>Choose users</div>
                  <input
                    value={noteRecipientSearch}
                    onChange={(e) => setNoteRecipientSearch(e.target.value)}
                    placeholder="Search users..."
                    style={{ ...inputStyle, marginBottom: 10 }}
                  />

                  <div style={recipientPanelStyle}>
                    {filteredRecipientMembers.map((member) => {
                      const checked = selectedNoteRecipientIds.includes(member.id)
                      return (
                        <label key={member.id} style={recipientOptionStyle}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleRecipient(member.id)}
                          />
                          <span style={recipientAvatarStyle(member.name)}>{getInitials(member.name)}</span>
                          <span style={{ minWidth: 0 }}>
                            <span style={{ display: "block", fontSize: 13, color: "#111827", fontWeight: 600 }}>
                              {member.name}
                            </span>
                            <span style={{ display: "block", fontSize: 12, color: "#64748b" }}>
                              {member.email || member.title || member.role}
                            </span>
                          </span>
                        </label>
                      )
                    })}
                  </div>

                  {selectedNoteRecipientIds.length > 0 ? (
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
                      {teamMembers
                        .filter((member) => selectedNoteRecipientIds.includes(member.id))
                        .map((member) => (
                          <button
                            key={member.id}
                            type="button"
                            onClick={() => toggleRecipient(member.id)}
                            style={recipientChipStyle}
                          >
                            {member.name}
                            <X size={12} />
                          </button>
                        ))}
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div style={{ marginBottom: 18 }}>
                <div style={labelStyle}>Body</div>
                <textarea
                  value={noteBody}
                  onChange={(e) => setNoteBody(e.target.value)}
                  placeholder="Write the note here..."
                  rows={6}
                  style={{
                    ...inputStyle,
                    height: "auto",
                    minHeight: 140,
                    paddingTop: 10,
                    resize: "vertical",
                  }}
                />
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button type="button" onClick={() => setNoteModalOpen(false)} style={secondaryActionStyle}>
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => void createNote()}
                  disabled={creatingNote}
                  style={primaryActionStyle}
                >
                  {creatingNote ? "Creating..." : forwardingNote ? "Forward Note" : "Create Note"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {memberProfileOpen && selectedMember ? (
        <div onClick={() => setMemberProfileOpen(false)} style={modalOverlayStyle}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 760,
              maxWidth: "calc(100vw - 48px)",
              borderRadius: 24,
              overflow: "hidden",
              boxShadow: "0 28px 80px rgba(15,23,42,0.22)",
              border: "1px solid rgba(15,23,42,0.08)",
              ...memberThemeStyles(selectedMember.profile_theme || PROFILE_THEMES[0]),
            }}
          >
            <div style={{ padding: 22 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
                <button
                  type="button"
                  style={profileActionButton}
                  onClick={() => {
                    setMemberProfileOpen(false)
                    setActivePane({ type: "dm", id: selectedMember.id })
                  }}
                >
                  <MessageCircle size={16} />
                </button>

                <button type="button" onClick={() => setMemberProfileOpen(false)} style={profileActionButton}>
                  <X size={16} />
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
                <div
                  style={{
                    width: 112,
                    height: 112,
                    borderRadius: "50%",
                    border: "4px solid rgba(255,255,255,0.35)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 32,
                    fontWeight: 700,
                    marginBottom: 14,
                    overflow: "hidden",
                    ...avatarStyle(getInitials(selectedMember.name)),
                  }}
                >
                  {selectedMember.avatar_url ? (
                    <img
                      src={selectedMember.avatar_url}
                      alt={selectedMember.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    getInitials(selectedMember.name)
                  )}
                </div>

                <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>{selectedMember.name}</div>
                <div style={{ fontSize: 15, opacity: 0.92, marginBottom: 4 }}>
                  {selectedMember.title || selectedMember.role}
                </div>
                <div style={{ fontSize: 13, opacity: 0.86, marginBottom: 14 }}>
                  {(selectedMember.email || "no-email") + " • " + (selectedMember.role || "member")}
                </div>

                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 14px",
                    borderRadius: 999,
                    background: "rgba(255,255,255,0.22)",
                    backdropFilter: "blur(8px)",
                    marginBottom: 18,
                    fontWeight: 700,
                  }}
                >
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      ...statusDot(selectedMember.status),
                    }}
                  />
                  {selectedMember.status || "offline"}
                </div>

                <div style={{ display: "flex", gap: 10, marginBottom: 22 }}>
                  <button
                    type="button"
                    style={profileActionButton}
                    onClick={() => {
                      setMemberProfileOpen(false)
                      setActivePane({ type: "dm", id: selectedMember.id })
                    }}
                  >
                    <MessageCircle size={18} />
                  </button>
                  <button type="button" style={profileActionButton}>
                    <Users size={18} />
                  </button>
                  <button type="button" style={profileActionButton}>
                    <Shield size={18} />
                  </button>
                  <button type="button" style={profileActionButton}>
                    <Plus size={18} />
                  </button>
                </div>
              </div>

              <div
                style={{
                  borderRadius: 22,
                  background: "rgba(255,255,255,0.14)",
                  backdropFilter: "blur(10px)",
                  padding: 18,
                }}
              >
                <ProfileLine icon={<MapPin size={18} />} label={selectedMember.location || "Location not set"} />
                <ProfileLine icon={<Clock3 size={18} />} label={`Last active: ${formatDateTime(selectedMember.last_active_at)}`} />
                <ProfileLine icon={<Clock3 size={18} />} label={`Last login: ${formatDateTime(selectedMember.last_login_at)}`} />
                <ProfileLine icon={<Users size={18} />} label={`${selectedMember.title || selectedMember.role}`} />
                <ProfileLine icon={<Shield size={18} />} label={`Role: ${selectedMember.role}`} />
                <ProfileLine icon={<Mail size={18} />} label={selectedMember.email || "No email"} />
                <ProfileLine icon={<Phone size={18} />} label={selectedMember.phone_number || "No phone"} />
                <ProfileLine icon={<Clock3 size={18} />} label={`Joined: ${formatDate(selectedMember.created_at)}`} />
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {(editingChannelMessage || editingDmMessage) && (
        <div
          onClick={() => {
            if (!savingMessageEdit) {
              setEditingChannelMessage(null)
              setEditingDmMessage(null)
              setEditMessageText("")
            }
          }}
          style={modalOverlayStyle}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ ...modalCardStyle, width: 560 }}>
            <div style={modalHeaderStyle}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>Edit Message</div>
              <button
                type="button"
                onClick={() => {
                  setEditingChannelMessage(null)
                  setEditingDmMessage(null)
                  setEditMessageText("")
                }}
                style={modalCloseStyle}
              >
                <X size={16} />
              </button>
            </div>
            <div style={{ padding: 18 }}>
              <textarea
                value={editMessageText}
                onChange={(e) => setEditMessageText(e.target.value)}
                rows={6}
                style={{
                  ...inputStyle,
                  height: "auto",
                  minHeight: 160,
                  paddingTop: 10,
                  resize: "vertical",
                  marginBottom: 14,
                }}
              />

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => {
                    setEditingChannelMessage(null)
                    setEditingDmMessage(null)
                    setEditMessageText("")
                  }}
                  style={secondaryActionStyle}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => void saveMessageEdit()}
                  disabled={savingMessageEdit}
                  style={primaryActionStyle}
                >
                  {savingMessageEdit ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {inviteMemberOpen ? (
        <div onClick={() => setInviteMemberOpen(false)} style={modalOverlayStyle}>
          <div onClick={(event) => event.stopPropagation()} style={{ ...modalCardStyle, width: 460 }}>
            <div style={modalHeaderStyle}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>Invite member</div>
              <button type="button" onClick={() => setInviteMemberOpen(false)} style={modalCloseStyle}>
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: 18 }}>
              <div style={{ marginBottom: 14 }}>
                <div style={labelStyle}>Email</div>
                <input
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                  placeholder="member@example.com"
                  style={inputStyle}
                />
              </div>

              <div
                style={{
                  borderRadius: 10,
                  background: "rgba(217,119,6,0.08)",
                  color: "#92400e",
                  padding: "10px 12px",
                  fontSize: 12.5,
                  lineHeight: 1.5,
                  marginBottom: 14,
                }}
              >
                Invite UI is ready. Persistent invitations need a backend route, because the current workspace API has no invite endpoint.
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button type="button" onClick={() => setInviteMemberOpen(false)} style={secondaryActionStyle}>
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setError("Invite member backend route is not implemented yet.")
                    setInviteMemberOpen(false)
                  }}
                  style={primaryActionStyle}
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {forwardPickerOpen && pendingForward ? (
        <div
          onClick={() => {
            if (!forwardSubmitting) resetForwardState()
          }}
          style={modalOverlayStyle}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ ...modalCardStyle, width: 620 }}>
            <div style={modalHeaderStyle}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>Forward to</div>
              <button type="button" onClick={() => resetForwardState()} style={modalCloseStyle}>
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: 18 }}>
              <input
                value={forwardSearch}
                onChange={(e) => setForwardSearch(e.target.value)}
                placeholder="Search channels or people..."
                style={{ ...inputStyle, marginBottom: 14 }}
              />

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <div style={labelStyle}>Channels</div>
                  <div style={recipientPanelStyle}>
                    {filteredForwardChannels.length === 0 ? (
                      <div style={{ padding: "8px 10px", fontSize: 12, color: "#94a3b8" }}>No channels found</div>
                    ) : (
                      filteredForwardChannels.map((channel) => (
                        <button
                          key={channel.id}
                          type="button"
                          onClick={() => void forwardToChannel(channel.slug)}
                          disabled={forwardSubmitting}
                          style={{
                            width: "100%",
                            border: "none",
                            background: "#ffffff",
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            padding: "8px 10px",
                            borderRadius: 10,
                            cursor: "pointer",
                            textAlign: "left",
                          }}
                        >
                          <span
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: 8,
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              background: "rgba(99,102,241,0.10)",
                              color: normalizeColor(channel.color_hex),
                              flexShrink: 0,
                              fontWeight: 700,
                            }}
                          >
                            {channel.icon_symbol || "#"}
                          </span>
                          <span style={{ minWidth: 0 }}>
                            <span
                              style={{
                                display: "block",
                                fontSize: 13,
                                color: "#111827",
                                fontWeight: 600,
                              }}
                            >
                              {channel.name}
                            </span>
                            <span
                              style={{
                                display: "block",
                                fontSize: 12,
                                color: "#64748b",
                              }}
                            >
                              {channel.description || channel.slug}
                            </span>
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                <div>
                  <div style={labelStyle}>Direct messages</div>
                  <div style={recipientPanelStyle}>
                    {filteredForwardMembers.length === 0 ? (
                      <div style={{ padding: "8px 10px", fontSize: 12, color: "#94a3b8" }}>No people found</div>
                    ) : (
                      filteredForwardMembers.map((member) => (
                        <button
                          key={member.id}
                          type="button"
                          onClick={() => void forwardToDm(member.id)}
                          disabled={forwardSubmitting}
                          style={{
                            width: "100%",
                            border: "none",
                            background: "#ffffff",
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            padding: "8px 10px",
                            borderRadius: 10,
                            cursor: "pointer",
                            textAlign: "left",
                          }}
                        >
                          <span
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: "50%",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 11,
                              fontWeight: 700,
                              flexShrink: 0,
                              ...avatarStyle(getInitials(member.name)),
                            }}
                          >
                            {getInitials(member.name)}
                          </span>
                          <span style={{ minWidth: 0 }}>
                            <span
                              style={{
                                display: "block",
                                fontSize: 13,
                                color: "#111827",
                                fontWeight: 600,
                              }}
                            >
                              {member.name}
                            </span>
                            <span
                              style={{
                                display: "block",
                                fontSize: 12,
                                color: "#64748b",
                              }}
                            >
                              {member.email || member.title || member.role}
                            </span>
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                <button type="button" onClick={() => resetForwardState()} style={secondaryActionStyle}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}

function ProfileLine({
  icon,
  label,
}: {
  icon: React.ReactNode
  label: string
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        fontSize: 15,
        lineHeight: 1.5,
        marginBottom: 10,
      }}
    >
      <span style={{ opacity: 0.92 }}>{icon}</span>
      <span>{label}</span>
    </div>
  )
}

const iconButtonStyle: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 10,
  border: "1px solid rgba(15,23,42,0.08)",
  background: "#ffffff",
  color: "#64748b",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
}

const tinyIconButtonStyle: React.CSSProperties = {
  width: 22,
  height: 22,
  border: "none",
  borderRadius: 6,
  background: "transparent",
  color: "#64748b",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
}

const smallGhostButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  padding: "4px 8px",
  borderRadius: 999,
  border: "1px solid rgba(15,23,42,0.10)",
  background: "#ffffff",
  color: "#475569",
  fontSize: 12,
  cursor: "pointer",
}

const tinyTextButtonStyle: React.CSSProperties = {
  border: "none",
  background: "transparent",
  color: "#64748b",
  cursor: "pointer",
  fontSize: 11,
}

const primaryButtonStyle: React.CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: 10,
  border: "none",
  background: "#6c72ff",
  color: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
}

const notePickerStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(6, 1fr)",
  gap: 6,
  marginBottom: 14,
  padding: 10,
  borderRadius: 12,
  background: "#ffffff",
  border: "1px solid rgba(15,23,42,0.08)",
}

const emojiOptionStyle: React.CSSProperties = {
  height: 34,
  borderRadius: 8,
  border: "none",
  background: "#f8fafc",
  cursor: "pointer",
  fontSize: 18,
}

const noteTitleInputStyle: React.CSSProperties = {
  width: "100%",
  height: 44,
  borderRadius: 10,
  border: "1px solid rgba(15,23,42,0.10)",
  background: "#ffffff",
  color: "#111827",
  padding: "0 12px",
  fontSize: 16,
  fontWeight: 700,
  outline: "none",
  marginBottom: 12,
}

const noteBodyInputStyle: React.CSSProperties = {
  width: "100%",
  borderRadius: 10,
  border: "1px solid rgba(15,23,42,0.10)",
  background: "#ffffff",
  color: "#111827",
  padding: "10px 12px",
  fontSize: 14,
  outline: "none",
  resize: "vertical",
  minHeight: 180,
  marginBottom: 12,
}

const modalOverlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(15,23,42,0.18)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
}

const modalCardStyle: React.CSSProperties = {
  width: 420,
  borderRadius: 16,
  background: "#ffffff",
  border: "1px solid rgba(15,23,42,0.08)",
  boxShadow: "0 24px 60px rgba(15,23,42,0.18)",
  overflow: "hidden",
}

const modalHeaderStyle: React.CSSProperties = {
  height: 56,
  display: "flex",
  alignItems: "center",
  padding: "0 18px",
  borderBottom: "1px solid rgba(15,23,42,0.08)",
}

const modalCloseStyle: React.CSSProperties = {
  marginLeft: "auto",
  width: 30,
  height: 30,
  border: "none",
  borderRadius: 8,
  background: "transparent",
  color: "#64748b",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
}

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: "#111827",
  marginBottom: 6,
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 42,
  borderRadius: 10,
  border: "1px solid rgba(15,23,42,0.10)",
  background: "#ffffff",
  color: "#111827",
  padding: "0 12px",
  fontSize: 13,
  outline: "none",
}

const checkboxLabelStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  fontSize: 13,
  color: "#334155",
}

const secondaryActionStyle: React.CSSProperties = {
  flex: 1,
  height: 42,
  borderRadius: 10,
  border: "1px solid rgba(15,23,42,0.10)",
  background: "#ffffff",
  color: "#475569",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
}

const primaryActionStyle: React.CSSProperties = {
  flex: 1,
  height: 42,
  borderRadius: 10,
  border: "none",
  background: "#6c72ff",
  color: "#ffffff",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
}

const recipientPanelStyle: React.CSSProperties = {
  maxHeight: 220,
  overflowY: "auto",
  borderRadius: 12,
  border: "1px solid rgba(15,23,42,0.08)",
  background: "#ffffff",
  padding: 8,
  display: "flex",
  flexDirection: "column",
  gap: 6,
}

const recipientOptionStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "8px 10px",
  borderRadius: 10,
  cursor: "pointer",
}

const recipientChipStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "4px 8px",
  borderRadius: 999,
  border: "1px solid rgba(15,23,42,0.08)",
  background: "#ffffff",
  color: "#334155",
  fontSize: 12,
  cursor: "pointer",
}

const sectionHeaderRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: 10,
}


const darkSectionToggleStyle: React.CSSProperties = {
  border: "none",
  background: "transparent",
  color: "#7c869d",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  cursor: "pointer",
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: 1.1,
  textTransform: "uppercase",
  fontFamily: '"DM Mono", ui-monospace, monospace',
}

const darkTinyIconButtonStyle: React.CSSProperties = {
  width: 24,
  height: 24,
  border: "none",
  borderRadius: 8,
  background: "rgba(255,255,255,0.06)",
  color: "#94a3b8",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
}

const sectionToggleStyle: React.CSSProperties = {
  border: "none",
  background: "transparent",
  color: "#94a3b8",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  cursor: "pointer",
  fontSize: 10,
  letterSpacing: 1.2,
  textTransform: "uppercase",
  fontFamily: '"DM Mono", ui-monospace, monospace',
}

const inviteButtonStyle: React.CSSProperties = {
  width: "100%",
  height: 36,
  borderRadius: 10,
  border: "1px solid rgba(15,23,42,0.10)",
  background: "#ffffff",
  color: "#475569",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  cursor: "pointer",
  fontSize: 12.5,
  fontWeight: 600,
}

const profileActionButton: React.CSSProperties = {
  width: 42,
  height: 42,
  borderRadius: 12,
  border: "none",
  background: "rgba(255,255,255,0.22)",
  color: "inherit",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  backdropFilter: "blur(8px)",
}

const recipientAvatarStyle = (name: string): React.CSSProperties => ({
  width: 28,
  height: 28,
  borderRadius: "50%",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 11,
  fontWeight: 700,
  flexShrink: 0,
  ...avatarStyle(getInitials(name)),
})

function ToolbarButton({
  children,
  onClick,
}: {
  children: React.ReactNode
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: 26,
        height: 26,
        borderRadius: 6,
        border: "none",
        background: "transparent",
        color: "#64748b",
        cursor: "pointer",
        fontSize: 13,
        fontWeight: 600,
      }}
    >
      {children}
    </button>
  )
}

function ToolbarIconButton({
  children,
  onClick,
}: {
  children: React.ReactNode
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: 26,
        height: 26,
        borderRadius: 6,
        border: "none",
        background: "transparent",
        color: "#64748b",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 10,
        letterSpacing: 1.2,
        textTransform: "uppercase",
        color: "#94a3b8",
        marginBottom: 10,
        padding: "0 16px",
        fontFamily: '"DM Mono", ui-monospace, monospace',
      }}
    >
      {children}
    </div>
  )
}