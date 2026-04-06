"use client"

import { useEffect, useMemo, useState } from "react"
import {
  CheckCircle2,
  ChevronDown,
  Flag,
  Lock,
  MessageCircle,
  Pin,
  Search,
  Send,
  ThumbsUp,
  Users,
  X,
} from "lucide-react"

type AdminNote = {
  id: string
  author_id: string
  author_name?: string | null
  author_role?: string | null
  title?: string | null
  body: string
  priority?: string | null
  status?: string | null
  audience?: string | null
  recipient_ids?: string[]
  recipient_names?: string[]
  confidential?: boolean
  assignee_id?: string | null
  assignee_name?: string | null
  due_at?: string | null
  is_pinned: boolean
  checked_by?: string[]
  checked_count?: number
  is_checked_by_me?: boolean
  comments_count?: number
  reactions_count?: number
  my_reactions?: string[]
  created_at: string
  updated_at: string
}

type TeamMember = {
  id: string
  email: string
  full_name: string | null
  admin_role: string | null
}

type NoteComment = {
  id: string
  note_id: string
  author_id: string
  body: string
  created_at: string
  updated_at: string
  author_name: string
  author_role: string
}

type ReactionUser = {
  user_id: string
  author_name: string
  author_role: string
}

function prettyLabel(value?: string | null) {
  if (!value || typeof value !== "string") return "admin"
  return value.replaceAll("_", " ")
}

function getInitials(name?: string | null) {
  if (!name) return "A"
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return "A"
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("")
}

function formatCompactDate(dateString?: string | null) {
  if (!dateString) return ""
  return new Date(dateString).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function roleText(role?: string | null) {
  if (role === "super_admin") return "text-violet-600"
  if (role === "editor") return "text-sky-600"
  return "text-emerald-600"
}

function priorityText(priority?: string | null) {
  if (priority === "urgent") return "text-red-600"
  if (priority === "high") return "text-amber-600"
  if (priority === "low") return "text-slate-400"
  return "text-blue-600"
}

function statusText(status?: string | null) {
  if (status === "resolved") return "text-emerald-600"
  if (status === "in_progress") return "text-violet-600"
  return "text-slate-500"
}

function lineTone(priority?: string | null) {
  if (priority === "urgent") return "bg-red-500"
  if (priority === "high") return "bg-amber-500"
  if (priority === "low") return "bg-slate-300"
  return "bg-blue-500"
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
      {children}
    </div>
  )
}

function SelectField({
  value,
  onChange,
  children,
}: {
  value: string
  onChange: (value: string) => void
  children: React.ReactNode
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none border-b border-slate-200 bg-transparent px-0 py-2 text-[13px] text-slate-800 outline-none transition focus:border-blue-400"
      >
        {children}
      </select>
      <ChevronDown
        size={14}
        className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-slate-400"
      />
    </div>
  )
}

function FlatAction({
  icon,
  children,
  active = false,
  activeClass = "",
  onClick,
  disabled,
}: {
  icon: React.ReactNode
  children: React.ReactNode
  active?: boolean
  activeClass?: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] transition ${
        active
          ? activeClass || "bg-blue-50 text-blue-700"
          : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
      }`}
    >
      {icon}
      <span>{children}</span>
    </button>
  )
}

function HoverList({
  label,
  users,
  open,
  onEnter,
  onLeave,
}: {
  label: string
  users: ReactionUser[]
  open: boolean
  onEnter: () => void
  onLeave: () => void
}) {
  return (
    <div className="relative" onMouseEnter={onEnter} onMouseLeave={onLeave}>
      <button
        type="button"
        className="rounded-full px-2.5 py-1 text-[12px] text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
      >
        {label}
      </button>

      {open ? (
        <div className="absolute left-0 top-full z-20 mt-2 min-w-[190px] border border-slate-200 bg-white px-3 py-3 shadow-lg">
          {users.length ? (
            <div className="space-y-2">
              {users.map((user) => (
                <div key={user.user_id} className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-[9px] font-semibold text-blue-700">
                    {getInitials(user.author_name)}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-[11px] font-medium text-slate-900">
                      {user.author_name}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {prettyLabel(user.author_role)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-[11px] text-slate-400">Nobody yet.</div>
          )}
        </div>
      ) : null}
    </div>
  )
}

export default function AdminNotesPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [notes, setNotes] = useState<AdminNote[]>([])
  const [team, setTeam] = useState<TeamMember[]>([])
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [commentsOpen, setCommentsOpen] = useState<Record<string, boolean>>({})
  const [commentsByNote, setCommentsByNote] = useState<Record<string, NoteComment[]>>({})
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({})
  const [reactionUsersOpen, setReactionUsersOpen] = useState<Record<string, boolean>>({})
  const [checkedUsersOpen, setCheckedUsersOpen] = useState<Record<string, boolean>>({})
  const [reactionUsersByNote, setReactionUsersByNote] = useState<Record<string, ReactionUser[]>>({})
  const [checkedUsersByNote, setCheckedUsersByNote] = useState<Record<string, ReactionUser[]>>({})
  const [searchQuery, setSearchQuery] = useState("")
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null)

  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [priority, setPriority] = useState("normal")
  const [status, setStatus] = useState("open")
  const [audience, setAudience] = useState("all_admins")
  const [assigneeId, setAssigneeId] = useState("")
  const [dueAt, setDueAt] = useState("")
  const [isPinned, setIsPinned] = useState(false)
  const [confidential, setConfidential] = useState(false)
  const [recipientIds, setRecipientIds] = useState<string[]>([])
  const [sendMode, setSendMode] = useState<"broadcast" | "direct">("broadcast")

  useEffect(() => {
    loadAll()
  }, [])

  const recipientOptions = useMemo(
    () =>
      team.map((member) => ({
        id: member.id,
        name: member.full_name || member.email,
      })),
    [team]
  )

  const filteredNotes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return notes
    return notes.filter((note) => {
      return (
        (note.title || "").toLowerCase().includes(q) ||
        (note.body || "").toLowerCase().includes(q) ||
        (note.author_name || "").toLowerCase().includes(q) ||
        (note.recipient_names || []).join(" ").toLowerCase().includes(q)
      )
    })
  }, [notes, searchQuery])

  useEffect(() => {
    if (!activeNoteId && filteredNotes.length > 0) {
      setActiveNoteId(filteredNotes[0].id)
      return
    }

    if (activeNoteId && !filteredNotes.some((n) => n.id === activeNoteId)) {
      setActiveNoteId(filteredNotes[0]?.id || null)
    }
  }, [filteredNotes, activeNoteId])

  const activeNote =
    filteredNotes.find((note) => note.id === activeNoteId) || filteredNotes[0] || null

  async function loadAll() {
    try {
      setLoading(true)
      setError("")

      const [notesRes, teamRes] = await Promise.all([
        fetch("/api/admin/notes", { cache: "no-store" }),
        fetch("/api/admin/team", { cache: "no-store" }),
      ])

      const notesData = await notesRes.json().catch(() => null)
      const teamData = await teamRes.json().catch(() => null)

      if (!notesRes.ok) {
        setError(notesData?.error || "Failed to load notes.")
        return
      }

      const nextNotes = Array.isArray(notesData?.notes) ? notesData.notes : []
      setNotes(nextNotes)
      setTeam(Array.isArray(teamData?.team) ? teamData.team : [])

      setExpanded((prev) => {
        const copy = { ...prev }
        for (const note of nextNotes) {
          if (copy[note.id] === undefined) {
            copy[note.id] = note.priority === "urgent"
          }
        }
        return copy
      })
    } catch (err) {
      console.error("LOAD NOTES PAGE ERROR:", err)
      setError("Something went wrong while loading notes.")
    } finally {
      setLoading(false)
    }
  }

  async function createNote() {
    try {
      setSaving(true)
      setError("")
      setSuccess("")

      const res = await fetch("/api/admin/notes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          body,
          priority,
          status,
          send_mode: sendMode,
          audience,
          assignee_id: assigneeId || null,
          due_at: dueAt || null,
          is_pinned: isPinned,
          confidential,
          recipient_ids: sendMode === "direct" ? recipientIds : [],
        }),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok || !data?.ok) {
        setError(data?.error || "Failed to create note.")
        return
      }

      setSuccess("Note posted.")
      setTitle("")
      setBody("")
      setPriority("normal")
      setStatus("open")
      setAudience("all_admins")
      setAssigneeId("")
      setDueAt("")
      setIsPinned(false)
      setConfidential(false)
      setRecipientIds([])
      setSendMode("broadcast")
      await loadAll()
    } catch (err) {
      console.error("CREATE NOTE ERROR:", err)
      setError("Something went wrong while creating the note.")
    } finally {
      setSaving(false)
    }
  }

  function toggleExpanded(id: string) {
    setExpanded((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  function toggleRecipient(id: string) {
    setRecipientIds((prev) =>
      prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]
    )
  }

  async function handleReact(noteId: string) {
    try {
      setActionLoading(`react-${noteId}`)
      setError("")

      const res = await fetch(`/api/admin/notes/${noteId}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji: "👍" }),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok || !data?.ok) {
        setError(data?.error || "Failed to react to note.")
        return
      }

      await loadAll()
      await loadReactionUsers(noteId)
    } catch (err) {
      console.error("REACT NOTE ERROR:", err)
      setError("Something went wrong while reacting to note.")
    } finally {
      setActionLoading(null)
    }
  }

  async function handleCheck(noteId: string) {
    try {
      setActionLoading(`check-${noteId}`)
      setError("")

      const res = await fetch(`/api/admin/notes/${noteId}/check`, {
        method: "POST",
      })

      const data = await res.json().catch(() => null)

      if (!res.ok || !data?.ok) {
        setError(data?.error || "Failed to update checked state.")
        return
      }

      await loadAll()
      await loadCheckedUsers(noteId)
    } catch (err) {
      console.error("CHECK NOTE ERROR:", err)
      setError("Something went wrong while checking note.")
    } finally {
      setActionLoading(null)
    }
  }

  async function loadComments(noteId: string) {
    try {
      const res = await fetch(`/api/admin/notes/${noteId}/comments`, {
        cache: "no-store",
      })
      const data = await res.json().catch(() => null)

      if (!res.ok || !data?.ok) {
        setError(data?.error || "Failed to load comments.")
        return
      }

      setCommentsByNote((prev) => ({
        ...prev,
        [noteId]: Array.isArray(data?.comments) ? data.comments : [],
      }))
    } catch (err) {
      console.error("LOAD COMMENTS ERROR:", err)
      setError("Something went wrong while loading comments.")
    }
  }

  async function toggleComments(noteId: string) {
    const next = !commentsOpen[noteId]
    setCommentsOpen((prev) => ({ ...prev, [noteId]: next }))
    if (next) {
      await loadComments(noteId)
    }
  }

  async function handleComment(noteId: string) {
    const commentBody = (commentDrafts[noteId] || "").trim()
    if (!commentBody) {
      setError("Comment cannot be empty.")
      return
    }

    try {
      setActionLoading(`comment-${noteId}`)
      setError("")

      const res = await fetch(`/api/admin/notes/${noteId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: commentBody }),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok || !data?.ok) {
        setError(data?.error || "Failed to add comment.")
        return
      }

      setCommentDrafts((prev) => ({ ...prev, [noteId]: "" }))
      await loadComments(noteId)
      await loadAll()
      setCommentsOpen((prev) => ({ ...prev, [noteId]: true }))
    } catch (err) {
      console.error("COMMENT NOTE ERROR:", err)
      setError("Something went wrong while posting comment.")
    } finally {
      setActionLoading(null)
    }
  }

  async function loadReactionUsers(noteId: string) {
    try {
      const res = await fetch(`/api/admin/notes/${noteId}/reactions`, {
        cache: "no-store",
      })
      const data = await res.json().catch(() => null)

      if (!res.ok || !data?.ok) {
        setError(data?.error || "Failed to load reactions.")
        return
      }

      setReactionUsersByNote((prev) => ({
        ...prev,
        [noteId]: Array.isArray(data?.users) ? data.users : [],
      }))
    } catch (err) {
      console.error("LOAD REACTION USERS ERROR:", err)
      setError("Something went wrong while loading reactions.")
    }
  }

  async function loadCheckedUsers(noteId: string) {
    try {
      const res = await fetch(`/api/admin/notes/${noteId}/checked-users`, {
        cache: "no-store",
      })
      const data = await res.json().catch(() => null)

      if (!res.ok || !data?.ok) {
        setError(data?.error || "Failed to load checked users.")
        return
      }

      setCheckedUsersByNote((prev) => ({
        ...prev,
        [noteId]: Array.isArray(data?.users) ? data.users : [],
      }))
    } catch (err) {
      console.error("LOAD CHECKED USERS ERROR:", err)
      setError("Something went wrong while loading checked users.")
    }
  }

  async function openReactionUsers(noteId: string) {
    if (!reactionUsersByNote[noteId]) {
      await loadReactionUsers(noteId)
    }
    setReactionUsersOpen((prev) => ({ ...prev, [noteId]: true }))
  }

  async function openCheckedUsers(noteId: string) {
    if (!checkedUsersByNote[noteId]) {
      await loadCheckedUsers(noteId)
    }
    setCheckedUsersOpen((prev) => ({ ...prev, [noteId]: true }))
  }

  return (
    <div className="min-h-screen bg-[#F5F7FB]">
      <div className="mx-auto max-w-[1120px] px-4 py-5">
        {(error || success) && (
          <div className="mb-3 space-y-2">
            {error ? (
              <div className="border-b border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">
                {error}
              </div>
            ) : null}
            {success ? (
              <div className="border-b border-emerald-200 bg-emerald-50 px-3 py-2 text-[12px] text-emerald-700">
                {success}
              </div>
            ) : null}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[250px_minmax(0,1fr)]">
          <aside className="border-r border-slate-200 bg-transparent">
            <div className="border-b border-slate-200 pb-3">
              <button
                type="button"
                className="mb-3 flex w-full items-center justify-center gap-2 rounded-full bg-[#3860F0] px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-[#2E54DE]"
              >
                <Send size={14} />
                New Note
              </button>

              <div className="relative">
                <Search
                  size={14}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search notes..."
                  className="w-full border-b border-slate-200 bg-transparent py-2 pl-9 pr-2 text-[13px] outline-none placeholder:text-slate-400"
                />
              </div>
            </div>

            <div className="pt-3">
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                Notes
              </div>

              <div className="divide-y divide-slate-200">
                {loading ? (
                  <div className="py-3 text-[12px] text-slate-400">Loading…</div>
                ) : filteredNotes.length === 0 ? (
                  <div className="py-3 text-[12px] text-slate-400">No notes found.</div>
                ) : (
                  filteredNotes.map((note) => (
                    <button
                      key={note.id}
                      type="button"
                      onClick={() => setActiveNoteId(note.id)}
                      className={`block w-full px-0 py-3 text-left transition ${
                        activeNote?.id === note.id ? "text-slate-900" : "text-slate-700"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <div className={`mt-1 h-2 w-2 rounded-full ${lineTone(note.priority)}`} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[13px] font-semibold">
                            {note.title?.trim() || "Untitled Note"}
                          </div>
                          <div className="mt-1 line-clamp-2 text-[12px] leading-5 text-slate-500">
                            {note.body}
                          </div>
                          <div className="mt-1 text-[11px] text-slate-400">
                            {formatCompactDate(note.created_at)}
                          </div>
                        </div>
                        {note.is_pinned ? (
                          <Pin size={12} className="mt-0.5 shrink-0 text-blue-500" />
                        ) : null}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </aside>

          <main className="min-w-0">
            <div className="border-b border-slate-200 bg-transparent px-1 pb-4">
              <div className="mb-3 text-[22px] font-semibold text-slate-900">Team Notes</div>

              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[11px] font-semibold text-blue-700">
                  ME
                </div>

                <div className="min-w-0 flex-1">
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Title"
                    className="w-full border-b border-slate-200 bg-transparent px-0 py-2 text-[18px] font-semibold text-slate-900 outline-none placeholder:text-slate-400"
                  />

                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Write an internal note..."
                    rows={3}
                    className="mt-2 w-full resize-none border-b border-slate-200 bg-transparent px-0 py-2 text-[13px] leading-7 text-slate-700 outline-none placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div className="mt-3 grid gap-x-4 gap-y-3 md:grid-cols-2 xl:grid-cols-4">
                <div>
                  <FieldLabel>Priority</FieldLabel>
                  <SelectField value={priority} onChange={setPriority}>
                    <option value="low">low</option>
                    <option value="normal">normal</option>
                    <option value="high">high</option>
                    <option value="urgent">urgent</option>
                  </SelectField>
                </div>

                <div>
                  <FieldLabel>Status</FieldLabel>
                  <SelectField value={status} onChange={setStatus}>
                    <option value="open">open</option>
                    <option value="in_progress">in progress</option>
                    <option value="resolved">resolved</option>
                  </SelectField>
                </div>

                <div>
                  <FieldLabel>Assign</FieldLabel>
                  <SelectField value={assigneeId} onChange={setAssigneeId}>
                    <option value="">Unassigned</option>
                    {team.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.full_name || member.email}
                      </option>
                    ))}
                  </SelectField>
                </div>

                <div>
                  <FieldLabel>Due</FieldLabel>
                  <input
                    type="datetime-local"
                    value={dueAt}
                    onChange={(e) => setDueAt(e.target.value)}
                    className="w-full border-b border-slate-200 bg-transparent px-0 py-2 text-[13px] text-slate-800 outline-none transition focus:border-blue-400"
                  />
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSendMode("broadcast")}
                  className={`rounded-full px-3 py-1.5 text-[12px] font-medium ${
                    sendMode === "broadcast"
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  Broadcast
                </button>

                <button
                  type="button"
                  onClick={() => setSendMode("direct")}
                  className={`rounded-full px-3 py-1.5 text-[12px] font-medium ${
                    sendMode === "direct"
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  Direct recipients
                </button>

                <label className="ml-2 flex items-center gap-1.5 text-[12px] text-slate-600">
                  <input
                    type="checkbox"
                    checked={isPinned}
                    onChange={(e) => setIsPinned(e.target.checked)}
                  />
                  Pin
                </label>

                <label className="flex items-center gap-1.5 text-[12px] text-slate-600">
                  <input
                    type="checkbox"
                    checked={confidential}
                    onChange={(e) => setConfidential(e.target.checked)}
                  />
                  Confidential
                </label>
              </div>

              {sendMode === "broadcast" ? (
                <div className="mt-3 max-w-[260px]">
                  <FieldLabel>Send to</FieldLabel>
                  <SelectField value={audience} onChange={setAudience}>
                    <option value="all_admins">all admins</option>
                    <option value="super_admin_only">super admin only</option>
                    <option value="admins_only">admins only</option>
                    <option value="editors_only">editors only</option>
                    <option value="content_team">content team</option>
                    <option value="billing_team">billing team</option>
                  </SelectField>
                </div>
              ) : (
                <div className="mt-3">
                  <FieldLabel>Direct recipients</FieldLabel>
                  <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                    {recipientOptions.map((recipient) => {
                      const selected = recipientIds.includes(recipient.id)

                      return (
                        <label
                          key={recipient.id}
                          className={`flex items-center gap-2 border-b py-2 text-[12px] ${
                            selected
                              ? "border-blue-300 text-blue-700"
                              : "border-slate-200 text-slate-700"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleRecipient(recipient.id)}
                          />
                          <span>{recipient.name}</span>
                        </label>
                      )
                    })}
                  </div>

                  {recipientIds.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {recipientIds.map((id) => {
                        const recipient = recipientOptions.find((item) => item.id === id)
                        if (!recipient) return null

                        return (
                          <span
                            key={id}
                            className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] text-blue-700"
                          >
                            {recipient.name}
                            <button
                              type="button"
                              onClick={() => toggleRecipient(id)}
                              className="text-blue-400 hover:text-blue-700"
                            >
                              <X size={12} />
                            </button>
                          </span>
                        )
                      })}
                    </div>
                  ) : null}
                </div>
              )}

              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={createNote}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-[12px] font-medium text-white transition hover:bg-blue-700 disabled:opacity-60"
                >
                  <Send size={13} />
                  {saving ? "Posting..." : "Post note"}
                </button>
              </div>
            </div>

            <div className="px-1 pt-4">
              {loading ? (
                <div className="py-6 text-[12px] text-slate-400">Loading note…</div>
              ) : !activeNote ? (
                <div className="py-6 text-[12px] text-slate-400">Select a note.</div>
              ) : (
                (() => {
                  const note = activeNote
                  const urgent = note.priority === "urgent"
                  const liked = !!note.my_reactions?.includes("👍")
                  const checked = !!note.is_checked_by_me
                  const isExpanded = !!expanded[note.id]

                  return (
                    <article className="border-b border-slate-200 pb-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[11px] font-semibold text-blue-700">
                          {getInitials(note.author_name)}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[13px] font-semibold text-slate-900">
                                  {note.author_name || "Admin"}
                                </span>
                                <span className={`text-[11px] font-medium ${roleText(note.author_role)}`}>
                                  {prettyLabel(note.author_role)}
                                </span>
                                <span className={`text-[11px] font-medium ${priorityText(note.priority)}`}>
                                  {prettyLabel(note.priority)}
                                </span>
                                <span className={`text-[11px] font-medium ${statusText(note.status)}`}>
                                  {prettyLabel(note.status)}
                                </span>
                              </div>

                              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-slate-500">
                                <span>{formatCompactDate(note.created_at)}</span>
                                <span>Assigned: {note.assignee_name || "Unassigned"}</span>
                                {note.due_at ? <span>Due: {formatCompactDate(note.due_at)}</span> : null}
                              </div>

                              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-slate-600">
                                <span className="inline-flex items-center gap-1.5">
                                  <Users size={13} />
                                  To:{" "}
                                  {note.recipient_names?.length
                                    ? note.recipient_names.join(", ")
                                    : prettyLabel(note.audience)}
                                </span>

                                {note.confidential ? (
                                  <span className="inline-flex items-center gap-1.5 text-amber-700">
                                    <Lock size={13} />
                                    Confidential
                                  </span>
                                ) : null}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {note.is_pinned ? (
                                <Pin size={14} className="text-blue-500" />
                              ) : null}
                              {urgent ? <Flag size={14} className="text-red-500" /> : null}
                            </div>
                          </div>

                          {note.title?.trim() ? (
                            <h2 className="mt-4 text-[30px] font-semibold leading-tight text-slate-900">
                              {note.title}
                            </h2>
                          ) : null}

                          <div
                            className={`mt-3 text-[15px] leading-8 text-slate-700 ${
                              isExpanded ? "whitespace-pre-wrap" : "line-clamp-4"
                            }`}
                          >
                            {note.body}
                          </div>

                          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                            <FlatAction
                              active={liked}
                              activeClass="bg-blue-50 text-blue-700"
                              icon={<ThumbsUp size={13} />}
                              onClick={() => handleReact(note.id)}
                              disabled={actionLoading === `react-${note.id}`}
                            >
                              Like {note.reactions_count ?? 0}
                            </FlatAction>

                            <FlatAction
                              icon={<MessageCircle size={13} />}
                              onClick={() => toggleComments(note.id)}
                            >
                              Comment {note.comments_count ?? 0}
                            </FlatAction>

                            <FlatAction
                              active={checked}
                              activeClass="bg-emerald-50 text-emerald-700"
                              icon={<CheckCircle2 size={13} />}
                              onClick={() => handleCheck(note.id)}
                              disabled={actionLoading === `check-${note.id}`}
                            >
                              Check {note.checked_count ?? 0}
                            </FlatAction>

                            <HoverList
                              label="Liked by"
                              users={reactionUsersByNote[note.id] || []}
                              open={!!reactionUsersOpen[note.id]}
                              onEnter={() => openReactionUsers(note.id)}
                              onLeave={() =>
                                setReactionUsersOpen((prev) => ({ ...prev, [note.id]: false }))
                              }
                            />

                            <HoverList
                              label="Checked by"
                              users={checkedUsersByNote[note.id] || []}
                              open={!!checkedUsersOpen[note.id]}
                              onEnter={() => openCheckedUsers(note.id)}
                              onLeave={() =>
                                setCheckedUsersOpen((prev) => ({ ...prev, [note.id]: false }))
                              }
                            />

                            <FlatAction
                              icon={
                                <ChevronDown
                                  size={13}
                                  className={isExpanded ? "rotate-180 transition" : "transition"}
                                />
                              }
                              onClick={() => toggleExpanded(note.id)}
                            >
                              {isExpanded ? "Collapse" : "Expand"}
                            </FlatAction>
                          </div>

                          {commentsOpen[note.id] ? (
                            <div className="mt-4 border-t border-slate-100 pt-4">
                              <div className="space-y-3">
                                {commentsByNote[note.id]?.length ? (
                                  commentsByNote[note.id].map((comment) => (
                                    <div key={comment.id} className="flex gap-3 border-b border-slate-100 pb-3">
                                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[10px] font-semibold text-blue-700">
                                        {getInitials(comment.author_name)}
                                      </div>

                                      <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <span className="text-[12px] font-medium text-slate-900">
                                            {comment.author_name}
                                          </span>
                                          <span className={`text-[11px] ${roleText(comment.author_role)}`}>
                                            {prettyLabel(comment.author_role)}
                                          </span>
                                          <span className="text-[11px] text-slate-400">
                                            {formatCompactDate(comment.created_at)}
                                          </span>
                                        </div>

                                        <div className="mt-1 whitespace-pre-wrap text-[13px] leading-7 text-slate-700">
                                          {comment.body}
                                        </div>
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <div className="text-[12px] text-slate-400">No comments yet.</div>
                                )}

                                <div className="flex items-center gap-3 pt-1">
                                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-semibold text-blue-700">
                                    ME
                                  </div>

                                  <input
                                    value={commentDrafts[note.id] || ""}
                                    onChange={(e) =>
                                      setCommentDrafts((prev) => ({
                                        ...prev,
                                        [note.id]: e.target.value,
                                      }))
                                    }
                                    placeholder="Write a comment..."
                                    className="flex-1 border-b border-slate-200 bg-transparent px-0 py-2 text-[13px] text-slate-700 outline-none placeholder:text-slate-400"
                                  />

                                  <button
                                    type="button"
                                    onClick={() => handleComment(note.id)}
                                    disabled={actionLoading === `comment-${note.id}`}
                                    className="rounded-full bg-blue-600 px-3 py-1.5 text-[12px] font-medium text-white disabled:opacity-60"
                                  >
                                    Post
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </article>
                  )
                })()
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}