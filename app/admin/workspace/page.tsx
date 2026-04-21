"use client"

import {
  AtSign,
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
  "👎",
  "❤️",
  "😂",
  "😮",
  "😢",
  "👏",
  "🔥",
  "🎯",
  "✅",
  "👀",
  "🚀",
  "🙌",
  "🤝",
  "💯",
  "😎",
  "🤔",
  "😅",
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
  const [currentUserStatus, setCurrentUserStatus] = useState<"online" | "away" | "busy" | "offline">(
    "online"
  )

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

  useEffect(() => {
    void bootstrap()
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
    try {
      setDmLoading(true)
      setError("")
      setDmMessages([])
      setDmThreadId(null)

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

      const threadId = String(bootstrapData.threadId)
      setDmThreadId(threadId)

      const threadRes = await fetch(`/api/admin/workspace/dms/${threadId}`, {
        cache: "no-store",
      })

      const threadData: DMMessagesResponse | null = await threadRes.json().catch(() => null)

      if (!threadRes.ok || !threadData?.ok) {
        setError(threadData?.error || "Failed to load direct messages.")
        return
      }

      setDmMessages(Array.isArray(threadData.messages) ? threadData.messages : [])
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
        return
      }

      setDmMessageText("")
      setDmThreadId(String(data.threadId))
      setComposerEmojiOpen(false)

      const threadRes = await fetch(`/api/admin/workspace/dms/${String(data.threadId)}`, {
        cache: "no-store",
      })
      const threadData: DMMessagesResponse | null = await threadRes.json().catch(() => null)

      if (!threadRes.ok || !threadData?.ok) {
        setError(threadData?.error || "Failed to refresh direct messages.")
        return
      }

      setDmMessages(Array.isArray(threadData.messages) ? threadData.messages : [])
    } catch (err) {
      console.error("SEND DM MESSAGE ERROR:", err)
      setError("Something went wrong while sending the direct message.")
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

      setNotes((prev) =>
        prev.map((note) =>
          note.id === noteId
            ? {
                ...note,
                ...data.note,
                my_emojis: data.note.my_emojis || [],
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
              ↵ to send · Shift+↵ newline · @ to mention
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
      <div
        style={{
          height: "100dvh",
          minHeight: "100dvh",
          background: "#f6f7fb",
          color: "#111827",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: membersOpen ? "280px minmax(0,1fr) 300px" : "280px minmax(0,1fr)",
            height: "100%",
            transition: "grid-template-columns 0.2s ease",
          }}
        >
          <aside
            style={{
              background: "#fbfbfd",
              borderRight: "1px solid rgba(15,23,42,0.08)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              minHeight: 0,
            }}
          >
            <div
              style={{
                padding: "18px 18px 14px",
                borderBottom: "1px solid rgba(15,23,42,0.08)",
                flexShrink: 0,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 14,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: 14,
                    background: "linear-gradient(135deg, #8b5cf6, #6366f1)",
                    color: "#fff",
                    flexShrink: 0,
                  }}
                >
                  O
                </div>

                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>
                    {activeTeam?.name || "Internal Admin Team"}
                  </div>
                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2, lineHeight: 1.45 }}>
                    {activeTeam?.description || "Core internal workspace for admins and editors"}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ overflowY: "auto", padding: "14px 0", flex: 1, minHeight: 0 }}>
              <div style={{ padding: "0 18px 16px" }}>
                <div style={sectionHeaderRow}>
                  <button type="button" onClick={() => setChannelsCollapsed((v) => !v)} style={sectionToggleStyle}>
                    {channelsCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                    <span>Channels</span>
                  </button>

                  {canCreateChannels ? (
                    <button type="button" onClick={openCreateChannelModal} style={tinyIconButtonStyle}>
                      <Plus size={14} />
                    </button>
                  ) : null}
                </div>

                {!channelsCollapsed ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {channels.map((channel) => {
                      const active = activePane.type === "channel" && activePane.slug === channel.slug
                      const accent = normalizeColor(channel.color_hex)

                      return (
                        <div
                          key={channel.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setComposerMode("message")
                              setReplyingTo(null)
                              setForwardingMessage(null)
                              setForwardingNote(null)
                              setActivePane({ type: "channel", slug: channel.slug })
                            }}
                            style={{
                              flex: 1,
                              height: 40,
                              border: "none",
                              textAlign: "left",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                              padding: "0 12px",
                              background: active ? "rgba(99,102,241,0.10)" : "transparent",
                              color: "#475569",
                              fontWeight: active ? 600 : 500,
                              borderRadius: 8,
                              fontSize: 12.5,
                            }}
                          >
                            <span
                              style={{
                                color: accent,
                                fontWeight: 700,
                                width: 14,
                                textAlign: "center",
                                flexShrink: 0,
                              }}
                            >
                              {channel.icon_symbol || "#"}
                            </span>
                            <span
                              style={{
                                color: accent,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {channel.name}
                            </span>
                            {channel.is_hidden ? <EyeOff size={12} color="#94a3b8" /> : null}
                            {channel.is_private ? <Lock size={12} color="#94a3b8" /> : null}
                          </button>

                          <button
                            type="button"
                            onClick={() => openEditChannelModal(channel)}
                            style={tinyIconButtonStyle}
                            title="Edit channel"
                          >
                            <Edit3 size={13} />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                ) : null}
              </div>

              <div style={{ padding: "0 18px 16px" }}>
                <div style={sectionHeaderRow}>
                  <button type="button" onClick={() => setNotesCollapsed((v) => !v)} style={sectionToggleStyle}>
                    {notesCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                    <span>Notes</span>
                  </button>

                  {canCreateNotes ? (
                    <button
                      type="button"
                      onClick={() => {
                        resetNoteForm()
                        setNoteModalOpen(true)
                      }}
                      style={tinyIconButtonStyle}
                    >
                      <Plus size={14} />
                    </button>
                  ) : null}
                </div>

                {!notesCollapsed ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {notes.length === 0 ? (
                      <div style={{ padding: "4px 12px", fontSize: 12, color: "#94a3b8" }}>No notes yet</div>
                    ) : (
                      notes.map((note) => {
                        const active = activePane.type === "note" && activePane.id === note.id
                        const isShared = note.note_type === "shared" || note.visibility === "shared"

                        return (
                          <button
                            key={note.id}
                            type="button"
                            onClick={() => setActivePane({ type: "note", id: note.id })}
                            style={{
                              minHeight: 44,
                              border: "none",
                              textAlign: "left",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                              padding: "8px 12px",
                              background: active ? "rgba(99,102,241,0.10)" : "transparent",
                              color: active ? "#4f46e5" : "#475569",
                              borderRadius: 8,
                              fontSize: 12.5,
                            }}
                          >
                            {isShared ? <FileText size={14} color="#16a34a" /> : <Pin size={14} color="#ca8a04" />}

                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <div
                                  style={{
                                    fontSize: 12.5,
                                    fontWeight: 500,
                                    color: active ? "#4f46e5" : "#334155",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                    maxWidth: 144,
                                  }}
                                >
                                  {note.title}
                                </div>

                                <span
                                  style={{
                                    fontSize: 10,
                                    fontWeight: 700,
                                    color: isShared ? "#16a34a" : "#64748b",
                                    background: isShared ? "rgba(22,163,74,0.10)" : "rgba(100,116,139,0.10)",
                                    padding: "2px 6px",
                                    borderRadius: 999,
                                  }}
                                >
                                  {isShared ? "Shared" : "Personal"}
                                </span>
                              </div>
                            </div>
                          </button>
                        )
                      })
                    )}
                  </div>
                ) : null}
              </div>

              <div style={{ padding: "0 18px" }}>
                <div style={sectionHeaderRow}>
                  <button type="button" onClick={() => setDmsCollapsed((v) => !v)} style={sectionToggleStyle}>
                    {dmsCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                    <span>Direct Messages</span>
                  </button>
                </div>

                {!dmsCollapsed ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {directMembers.length === 0 ? (
                      <div style={{ padding: "4px 12px", fontSize: 12, color: "#94a3b8" }}>
                        No direct members
                      </div>
                    ) : (
                      directMembers.map((dm) => {
                        const active = activePane.type === "dm" && activePane.id === dm.id

                        return (
                          <button
                            key={dm.id}
                            type="button"
                            onClick={() => setActivePane({ type: "dm", id: dm.id })}
                            style={{
                              height: 40,
                              border: "none",
                              textAlign: "left",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                              padding: "0 10px",
                              background: active ? "rgba(99,102,241,0.10)" : "transparent",
                              color: active ? "#4f46e5" : "#475569",
                              borderRadius: 8,
                              fontSize: 12.5,
                            }}
                          >
                            <span
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: "50%",
                                flexShrink: 0,
                                ...statusDot(dm.status),
                              }}
                            />
                            <div
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: "50%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontWeight: 700,
                                fontSize: 11,
                                flexShrink: 0,
                                ...avatarStyle(getInitials(dm.name)),
                              }}
                            >
                              {getInitials(dm.name)}
                            </div>
                            <span
                              style={{
                                minWidth: 0,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {dm.name}
                            </span>
                          </button>
                        )
                      })
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          </aside>

          <main
            style={{
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              background: "#ffffff",
              minHeight: 0,
            }}
          >
            <div
              style={{
                height: 72,
                borderBottom: "1px solid rgba(15,23,42,0.08)",
                display: "flex",
                alignItems: "center",
                padding: "0 26px",
                gap: 12,
                flexShrink: 0,
              }}
            >
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>{renderCenterTitle()}</div>
                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{renderCenterSubtitle()}</div>
              </div>

              <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                <button type="button" style={iconButtonStyle} onClick={() => setError("")}>
                  <Search size={16} />
                </button>

                <button
                  type="button"
                  style={iconButtonStyle}
                  onClick={() => {
                    setForwardingNote(null)
                    setReplyingTo(null)
                    if (activePane.type === "note" && activeNote) {
                      setEditingNote(true)
                      setNoteTitle(activeNote.title)
                      setNoteBody(activeNote.body || "")
                      setNoteSharedScope(
                        activeNote.shared_scope === "specific_users" ? "specific_users" : "workspace"
                      )
                      setSelectedNoteRecipientIds(activeNote.recipient_ids || [])
                    } else if (activePane.type === "channel") {
                      setComposerMode("note")
                    }
                  }}
                >
                  <Pin size={16} />
                </button>

                {activePane.type === "channel" && activeChannel ? (
                  <button
                    type="button"
                    style={iconButtonStyle}
                    onClick={() => openEditChannelModal(activeChannel)}
                    title="Edit channel"
                  >
                    <Edit3 size={16} />
                  </button>
                ) : null}

                <button
                  type="button"
                  style={{
                    ...iconButtonStyle,
                    background: membersOpen ? "rgba(99,102,241,0.12)" : "#ffffff",
                    color: membersOpen ? "#4f46e5" : "#64748b",
                  }}
                  onClick={() => setMembersOpen((prev) => !prev)}
                >
                  <Users size={16} />
                </button>
              </div>
            </div>

            <div
              style={{
                flex: 1,
                minHeight: 0,
                overflowY: "auto",
                padding: "18px 26px 16px",
                background: "#ffffff",
              }}
            >
              {error ? (
                <div
                  style={{
                    marginBottom: 16,
                    borderRadius: 10,
                    border: "1px solid rgba(239,68,68,0.18)",
                    background: "rgba(239,68,68,0.06)",
                    color: "#dc2626",
                    padding: "12px 14px",
                    fontSize: 13,
                  }}
                >
                  {error}
                </div>
              ) : null}

              {activePane.type === "note" ? (
                <div
                  style={{
                    border:
                      activeNote?.note_type === "shared" || activeNote?.visibility === "shared"
                        ? "1px solid rgba(22,163,74,0.25)"
                        : "1px solid rgba(202,138,4,0.25)",
                    background:
                      activeNote?.note_type === "shared" || activeNote?.visibility === "shared"
                        ? "rgba(22,163,74,0.06)"
                        : "rgba(234,179,8,0.08)",
                    borderRadius: 12,
                    padding: "18px",
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      color:
                        activeNote?.note_type === "shared" || activeNote?.visibility === "shared"
                          ? "#16a34a"
                          : "#a16207",
                      textTransform: "uppercase",
                      letterSpacing: 0.8,
                      marginBottom: 8,
                      fontFamily: '"DM Mono", ui-monospace, monospace',
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    {activeNote?.note_type === "shared" || activeNote?.visibility === "shared" ? (
                      <FileText size={12} />
                    ) : (
                      <Pin size={12} />
                    )}
                    {activeNote?.note_type === "shared"
                      ? activeNote.shared_scope === "specific_users"
                        ? "Shared Note • Selected Users"
                        : "Shared Note • Workspace"
                      : "Personal Note"}
                  </div>

                  {activeNote?.forwarded_original_author_name ? (
                    <div
                      style={{
                        fontSize: 12,
                        color: "#64748b",
                        marginBottom: 10,
                      }}
                    >
                      Forwarded from {activeNote.forwarded_original_author_name}
                    </div>
                  ) : null}

                  {editingNote ? (
                    <>
                      <input
                        value={noteTitle}
                        onChange={(e) => setNoteTitle(e.target.value)}
                        style={noteTitleInputStyle}
                      />

                      {activeNote?.note_type === "shared" ? (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                          <select
                            value={noteSharedScope}
                            onChange={(e) =>
                              setNoteSharedScope(e.target.value as "workspace" | "specific_users")
                            }
                            style={inputStyle}
                          >
                            <option value="workspace">Whole workspace</option>
                            <option value="specific_users">Specific users</option>
                          </select>

                          <div />
                        </div>
                      ) : null}

                      {activeNote?.note_type === "shared" && noteSharedScope === "specific_users" ? (
                        <div style={{ marginBottom: 12 }}>
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
                        </div>
                      ) : null}

                      <textarea
                        value={noteBody}
                        onChange={(e) => setNoteBody(e.target.value)}
                        rows={8}
                        style={noteBodyInputStyle}
                      />
                      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                        <button type="button" style={smallGhostButtonStyle} onClick={() => void updateNote()}>
                          <Edit3 size={14} />
                          Save
                        </button>
                        <button
                          type="button"
                          style={smallGhostButtonStyle}
                          onClick={() => {
                            setEditingNote(false)
                            setNoteTitle("")
                            setNoteBody("")
                            setNoteRecipientSearch("")
                          }}
                        >
                          <X size={14} />
                          Cancel
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: 18, fontWeight: 700, color: "#111827", marginBottom: 8 }}>
                        {activeNote?.title || "Untitled note"}
                      </div>

                      <div style={{ fontSize: 14, color: "#334155", lineHeight: 1.7, marginBottom: 16 }}>
                        {activeNote?.body || activeNote?.description || "No note content."}
                      </div>
                    </>
                  )}

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
                    <button type="button" style={smallGhostButtonStyle} onClick={() => setEditingNote(true)}>
                      <Edit3 size={14} />
                      Edit
                    </button>
                    <button type="button" style={smallGhostButtonStyle} onClick={() => setNoteReactionPickerOpen((v) => !v)}>
                      <Smile size={14} />
                      React
                    </button>
                    <button
                      type="button"
                      style={smallGhostButtonStyle}
                      onClick={() => {
                        if (!activeNote) return
                        openForwardPickerForNote(activeNote)
                      }}
                    >
                      <Forward size={14} />
                      Forward
                    </button>
                    <button type="button" style={smallGhostButtonStyle} onClick={() => void withdrawNote()}>
                      <Trash2 size={14} />
                      Withdraw
                    </button>
                  </div>

                  {noteReactionPickerOpen ? (
                    <div style={notePickerStyle}>
                      {EMOJI_SET.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => void reactToNote(emoji)}
                          style={emojiOptionStyle}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  ) : null}

                  <div style={{ marginTop: 20 }}>
                    <div
                      style={{
                        fontSize: 11,
                        letterSpacing: 0.8,
                        color: "#94a3b8",
                        textTransform: "uppercase",
                        marginBottom: 10,
                        fontFamily: '"DM Mono", ui-monospace, monospace',
                      }}
                    >
                      Comments
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
                      {noteComments.length === 0 ? (
                        <div style={{ fontSize: 13, color: "#94a3b8" }}>No comments yet.</div>
                      ) : (
                        noteComments.map((comment) => (
                          <div
                            key={comment.id}
                            style={{
                              borderRadius: 10,
                              background: "#ffffff",
                              border: "1px solid rgba(15,23,42,0.08)",
                              padding: "10px 12px",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                              <span style={{ fontWeight: 700, fontSize: 13 }}>{comment.author_name}</span>
                              <span
                                style={{
                                  ...roleTagStyle(comment.author_role),
                                  fontSize: 9.5,
                                  padding: "2px 6px",
                                  borderRadius: 4,
                                  fontFamily: '"DM Mono", ui-monospace, monospace',
                                  textTransform: "uppercase",
                                }}
                              >
                                {comment.author_role}
                              </span>
                              <span style={{ fontSize: 11, color: "#94a3b8" }}>{formatTime(comment.created_at)}</span>
                              {!comment.is_deleted ? (
                                <button
                                  type="button"
                                  onClick={() => void deleteComment(comment.id)}
                                  style={{ marginLeft: "auto", ...tinyTextButtonStyle }}
                                >
                                  Delete
                                </button>
                              ) : null}
                            </div>
                            <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.6 }}>{comment.body}</div>
                          </div>
                        ))
                      )}
                    </div>

                    <div style={{ display: "flex", gap: 8 }}>
                      <textarea
                        value={noteCommentText}
                        onChange={(e) => setNoteCommentText(e.target.value)}
                        placeholder="Add a comment..."
                        rows={2}
                        style={{
                          flex: 1,
                          resize: "none",
                          borderRadius: 10,
                          border: "1px solid rgba(15,23,42,0.10)",
                          padding: "10px 12px",
                          fontSize: 13,
                          outline: "none",
                          background: "#ffffff",
                        }}
                      />
                      <button type="button" onClick={() => void addNoteComment()} style={primaryButtonStyle}>
                        <Send size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ) : activePane.type === "dm" ? (
                <>
                  {dmLoading ? (
                    <div style={{ padding: "60px 0", textAlign: "center", color: "#94a3b8", fontSize: 14 }}>
                      Loading direct messages...
                    </div>
                  ) : dmMessages.length === 0 ? (
                    <div style={{ padding: "40px 0", color: "#64748b", fontSize: 14 }}>
                      <div style={{ fontWeight: 600, color: "#111827", marginBottom: 6 }}>
                        Direct message with {activeDm?.name || "Unknown"}
                      </div>
                      <div>No messages yet. Send the first message below.</div>
                    </div>
                  ) : (
                    <>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          color: "#94a3b8",
                          fontSize: 11,
                          fontFamily: '"DM Mono", ui-monospace, monospace',
                          marginBottom: 18,
                        }}
                      >
                        <div style={{ height: 1, flex: 1, background: "rgba(15,23,42,0.08)" }} />
                        <span>Direct Message</span>
                        <div style={{ height: 1, flex: 1, background: "rgba(15,23,42,0.08)" }} />
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
                        {dmMessages.map((message) => {
                          const initials = getInitials(message.author)
                          const canDeleteDmMessage =
                            currentUser?.id === message.author_id ||
                            currentUser?.role === "super_admin" ||
                            currentUser?.admin_role === "super_admin"
                          const canEditDmMessage = canDeleteDmMessage

                          return (
                            <div key={message.id}>
                              <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                                <div
                                  style={{
                                    width: 38,
                                    height: 38,
                                    borderRadius: "50%",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontWeight: 700,
                                    fontSize: 12,
                                    flexShrink: 0,
                                    ...avatarStyle(initials),
                                  }}
                                >
                                  {initials}
                                </div>

                                <div style={{ minWidth: 0, flex: 1 }}>
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "baseline",
                                      gap: 8,
                                      flexWrap: "wrap",
                                      marginBottom: 6,
                                    }}
                                  >
                                    <span style={{ fontWeight: 700, color: "#111827", fontSize: 13.5 }}>
                                      {message.author}
                                    </span>
                                    <span
                                      style={{
                                        ...roleTagStyle(message.role),
                                        fontSize: 9.5,
                                        padding: "2px 6px",
                                        borderRadius: 4,
                                        fontFamily: '"DM Mono", ui-monospace, monospace',
                                        textTransform: "uppercase",
                                        letterSpacing: 0.4,
                                      }}
                                    >
                                      {message.role}
                                    </span>
                                    <span
                                      style={{
                                        fontSize: 11,
                                        color: "#94a3b8",
                                        fontFamily: '"DM Mono", ui-monospace, monospace',
                                      }}
                                    >
                                      {formatTime(message.created_at)}
                                    </span>
                                    {message.edited_at ? (
                                      <span style={{ fontSize: 11, color: "#cbd5e1" }}>(edited)</span>
                                    ) : null}
                                  </div>

                                  <div style={message.is_deleted ? deletedMessageTextStyle : normalMessageTextStyle}>
                                    {message.content}
                                  </div>

                                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
                                    {!message.is_deleted && canEditDmMessage ? (
                                      <button
                                        type="button"
                                        style={smallGhostButtonStyle}
                                        onClick={() => openDmMessageEdit(message)}
                                      >
                                        <Edit3 size={14} />
                                        Edit
                                      </button>
                                    ) : null}

                                    {!message.is_deleted ? (
                                      <button
                                        type="button"
                                        style={smallGhostButtonStyle}
                                        onClick={() =>
                                          openForwardPickerForMessage({
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
                                          })
                                        }
                                      >
                                        <Forward size={14} />
                                        Forward
                                      </button>
                                    ) : null}

                                    {!message.is_deleted && canDeleteDmMessage ? (
                                      <button
                                        type="button"
                                        style={smallGhostButtonStyle}
                                        onClick={() => void deleteDMMessage(message.id)}
                                        disabled={dmDeletingId === message.id}
                                      >
                                        <Trash2 size={14} />
                                        {dmDeletingId === message.id ? "Deleting..." : "Delete"}
                                      </button>
                                    ) : null}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </>
                  )}
                </>
              ) : loading ? (
                <div style={{ padding: "60px 0", textAlign: "center", color: "#94a3b8", fontSize: 14 }}>
                  Loading messages...
                </div>
              ) : messages.length === 0 ? (
                <div style={{ padding: "60px 0", textAlign: "center", color: "#94a3b8", fontSize: 14 }}>
                  No messages yet in this channel.
                </div>
              ) : (
                <>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      color: "#94a3b8",
                      fontSize: 11,
                      fontFamily: '"DM Mono", ui-monospace, monospace',
                      marginBottom: 18,
                    }}
                  >
                    <div style={{ height: 1, flex: 1, background: "rgba(15,23,42,0.08)" }} />
                    <span>Today</span>
                    <div style={{ height: 1, flex: 1, background: "rgba(15,23,42,0.08)" }} />
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
                    {messages.map((message) => {
                      const initials = getInitials(message.author)
                      const canDeleteChannelMessage =
                        currentUser?.id === message.author_id ||
                        currentUser?.role === "super_admin" ||
                        currentUser?.admin_role === "super_admin"
                      const canEditChannelMessage = canDeleteChannelMessage

                      return (
                        <div key={message.id}>
                          <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                            <div
                              style={{
                                width: 38,
                                height: 38,
                                borderRadius: "50%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontWeight: 700,
                                fontSize: 12,
                                flexShrink: 0,
                                ...avatarStyle(initials),
                              }}
                            >
                              {initials}
                            </div>

                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "baseline",
                                  gap: 8,
                                  flexWrap: "wrap",
                                  marginBottom: 6,
                                }}
                              >
                                <span style={{ fontWeight: 700, color: "#111827", fontSize: 13.5 }}>
                                  {message.author}
                                </span>
                                <span
                                  style={{
                                    ...roleTagStyle(message.role),
                                    fontSize: 9.5,
                                    padding: "2px 6px",
                                    borderRadius: 4,
                                    fontFamily: '"DM Mono", ui-monospace, monospace',
                                    textTransform: "uppercase",
                                    letterSpacing: 0.4,
                                  }}
                                >
                                  {message.role}
                                </span>
                                <span
                                  style={{
                                    fontSize: 11,
                                    color: "#94a3b8",
                                    fontFamily: '"DM Mono", ui-monospace, monospace',
                                  }}
                                >
                                  {formatTime(message.created_at)}
                                </span>
                                {message.edited_at ? (
                                  <span style={{ fontSize: 11, color: "#cbd5e1" }}>(edited)</span>
                                ) : null}
                              </div>

                              {message.reply_preview ? (
                                <div
                                  style={{
                                    borderLeft: "2px solid rgba(99,102,241,0.22)",
                                    paddingLeft: 10,
                                    marginBottom: 8,
                                    fontSize: 12,
                                    color: "#64748b",
                                  }}
                                >
                                  <div style={{ fontWeight: 600 }}>{message.reply_preview.author}</div>
                                  <div
                                    style={{
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    {message.reply_preview.content}
                                  </div>
                                </div>
                              ) : null}

                              {message.forwarded_original_author_name ? (
                                <div
                                  style={{
                                    fontSize: 12,
                                    color: "#64748b",
                                    marginBottom: 8,
                                  }}
                                >
                                  Forwarded from {message.forwarded_original_author_name}
                                </div>
                              ) : null}

                              <div style={message.is_deleted ? deletedMessageTextStyle : normalMessageTextStyle}>
                                {message.content}
                              </div>

                              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
                                {!message.is_deleted &&
                                  message.reactions.map((reaction) => {
                                    const mine = message.my_emojis.includes(reaction.emoji)

                                    return (
                                      <button
                                        key={`${message.id}-${reaction.emoji}`}
                                        type="button"
                                        onClick={() => void react(message.id, reaction.emoji)}
                                        style={{
                                          display: "inline-flex",
                                          alignItems: "center",
                                          gap: 5,
                                          padding: "4px 8px",
                                          borderRadius: 999,
                                          border: mine
                                            ? "1px solid rgba(79,70,229,0.28)"
                                            : "1px solid rgba(15,23,42,0.10)",
                                          background: mine ? "rgba(79,70,229,0.08)" : "#ffffff",
                                          color: mine ? "#4f46e5" : "#475569",
                                          fontSize: 12,
                                          cursor: "pointer",
                                        }}
                                      >
                                        <span>{reaction.emoji}</span>
                                        <span style={{ fontSize: 11, color: mine ? "#4f46e5" : "#64748b" }}>
                                          {reaction.count}
                                        </span>
                                      </button>
                                    )
                                  })}

                                {!message.is_deleted ? (
                                  <button
                                    type="button"
                                    style={smallGhostButtonStyle}
                                    onClick={() => {
                                      setReplyingTo(message)
                                      setForwardingMessage(null)
                                      setForwardingNote(null)
                                    }}
                                  >
                                    <CornerDownRight size={14} />
                                    Reply
                                  </button>
                                ) : null}

                                {!message.is_deleted ? (
                                  <button
                                    type="button"
                                    style={smallGhostButtonStyle}
                                    onClick={() => openForwardPickerForMessage(message)}
                                  >
                                    <Forward size={14} />
                                    Forward
                                  </button>
                                ) : null}

                                {!message.is_deleted && canEditChannelMessage ? (
                                  <button
                                    type="button"
                                    style={smallGhostButtonStyle}
                                    onClick={() => openChannelMessageEdit(message)}
                                  >
                                    <Edit3 size={14} />
                                    Edit
                                  </button>
                                ) : null}

                                {!message.is_deleted && canDeleteChannelMessage ? (
                                  <button
                                    type="button"
                                    style={smallGhostButtonStyle}
                                    onClick={() => void deleteMessage(message.id)}
                                  >
                                    <Trash2 size={14} />
                                    Delete
                                  </button>
                                ) : null}

                                {!message.is_deleted ? (
                                  <div style={{ position: "relative" }}>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setEmojiPickerFor((prev) => (prev === message.id ? null : message.id))
                                      }
                                      style={{
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
                                      }}
                                    >
                                      <Smile size={13} />
                                      React
                                    </button>

                                    {emojiPickerFor === message.id ? (
                                      <div
                                        style={{
                                          position: "absolute",
                                          top: "calc(100% + 8px)",
                                          left: 0,
                                          zIndex: 20,
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
                                          Reactions
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
                                              key={`${message.id}-${emoji}`}
                                              type="button"
                                              onClick={() => void react(message.id, emoji)}
                                              style={emojiOptionStyle}
                                            >
                                              {emoji}
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                    ) : null}
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </div>

            {activePane.type === "channel" ? renderSharedComposer("channel") : null}
            {activePane.type === "dm" ? renderSharedComposer("dm") : null}
          </main>

          {membersOpen && (
            <aside
              style={{
                background: "#fbfbfd",
                borderLeft: "1px solid rgba(15,23,42,0.08)",
                overflowY: "auto",
                minHeight: 0,
              }}
            >
              <div
                style={{
                  padding: "16px",
                  borderBottom: "1px solid rgba(15,23,42,0.08)",
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    letterSpacing: 1.2,
                    textTransform: "uppercase",
                    color: "#94a3b8",
                    marginBottom: 12,
                    fontFamily: '"DM Mono", ui-monospace, monospace',
                  }}
                >
                  Presence
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <div
                    style={{
                      position: "relative",
                      width: 38,
                      height: 38,
                      flexShrink: 0,
                    }}
                  >
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        fontSize: 12,
                        ...avatarStyle(getInitials(currentUserDisplayName)),
                      }}
                    >
                      {getInitials(currentUserDisplayName)}
                    </div>

                    <span
                      style={{
                        position: "absolute",
                        right: 0,
                        bottom: 0,
                        width: 12,
                        height: 12,
                        borderRadius: "50%",
                        border: "2px solid #ffffff",
                        boxSizing: "border-box",
                        ...statusDot(currentUserStatus),
                      }}
                    />
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>
                      {currentUserDisplayName}
                    </div>
                    <div style={{ fontSize: 11.5, color: "#6b7280" }}>
                      {currentUser?.admin_role || currentUser?.role || "Admin"}
                    </div>
                  </div>
                </div>

                <select
                  value={currentUserStatus}
                  onChange={(e) =>
                    setCurrentUserStatus(e.target.value as "online" | "away" | "busy" | "offline")
                  }
                  style={{
                    width: "100%",
                    height: 40,
                    borderRadius: 10,
                    border: "1px solid rgba(15,23,42,0.10)",
                    background: "#ffffff",
                    color: "#111827",
                    padding: "0 12px",
                    fontSize: 13,
                    outline: "none",
                  }}
                >
                  <option value="online">Online</option>
                  <option value="away">Away</option>
                  <option value="busy">Busy</option>
                  <option value="offline">Offline</option>
                </select>
              </div>

              <div style={{ padding: "14px 0" }}>
                <SectionLabel>Members</SectionLabel>

                <div style={{ padding: "0 16px 10px" }}>
                  <button type="button" style={inviteButtonStyle}>
                    <UserPlus size={14} />
                    Invite member
                  </button>
                </div>

                {teamMembers.length === 0 ? (
                  <div style={{ padding: "0 16px", fontSize: 12, color: "#94a3b8" }}>No members loaded</div>
                ) : (
                  teamMembers.map((member) => (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => openMemberProfile(member)}
                      style={{
                        width: "100%",
                        border: "none",
                        background: "transparent",
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "10px 16px",
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          flexShrink: 0,
                          ...statusDot(member.status),
                        }}
                      />
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 700,
                          fontSize: 11,
                          flexShrink: 0,
                          ...avatarStyle(getInitials(member.name)),
                        }}
                      >
                        {getInitials(member.name)}
                      </div>

                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: 13, color: "#111827", fontWeight: 600 }}>{member.name}</div>
                        <div style={{ fontSize: 11.5, color: "#6b7280" }}>
                          {member.title || member.role}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </aside>
          )}
        </div>
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