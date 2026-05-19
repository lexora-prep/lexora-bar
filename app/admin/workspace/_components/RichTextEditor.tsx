"use client"

import Color from "@tiptap/extension-color"
import Link from "@tiptap/extension-link"
import Placeholder from "@tiptap/extension-placeholder"
import { TextStyle } from "@tiptap/extension-text-style"
import Underline from "@tiptap/extension-underline"
import { EditorContent, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import {
  AtSign,
  Bold,
  Italic,
  Link2,
  List,
  ListOrdered,
  Palette,
  Pilcrow,
  Quote,
  Redo2,
  Smile,
  Strikethrough,
  Underline as UnderlineIcon,
  Undo2,
} from "lucide-react"
import { useEffect, useMemo, useState } from "react"

type RichTextMentionMember = {
  id: string
  name: string
  email?: string | null
  role?: string | null
}

type RichTextEditorProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  minHeight?: number
  compact?: boolean
  frameless?: boolean
  mentionMembers?: RichTextMentionMember[]
}

const SYMBOLS = [
  "✅",
  "⚠️",
  "🔥",
  "⭐",
  "📌",
  "📎",
  "📝",
  "💡",
  "🎯",
  "🚀",
  "⏳",
  "📅",
  "📍",
  "🔒",
  "🔔",
  "👀",
  "👍",
  "🙏",
  "❗",
  "❓",
  "➡️",
  "⬅️",
  "🔵",
  "🟢",
]

const COLORS = [
  "#111827",
  "#1d4ed8",
  "#047857",
  "#b45309",
  "#dc2626",
  "#7c3aed",
  "#0f766e",
  "#be123c",
]

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

function editorButtonStyle(active?: boolean): React.CSSProperties {
  return {
    height: 30,
    minWidth: 30,
    borderRadius: 8,
    border: active ? "1px solid rgba(29,78,216,0.30)" : "1px solid rgba(15,23,42,0.08)",
    background: active ? "rgba(29,78,216,0.10)" : "#ffffff",
    color: active ? "#1d4ed8" : "#334155",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: "0 8px",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 700,
  }
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "Write something...",
  minHeight = 180,
  compact = false,
  frameless = false,
  mentionMembers = [],
}: RichTextEditorProps) {
  const [symbolPickerOpen, setSymbolPickerOpen] = useState(false)
  const [colorPickerOpen, setColorPickerOpen] = useState(false)
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)

  const extensions = useMemo(
    () => [
      StarterKit.configure({
        heading: {
          levels: [2, 3],
        },
      }),
      Underline,
      TextStyle,
      Color,
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    [placeholder],
  )

  const editor = useEditor({
    extensions,
    content: value || "",
    editorProps: {
      attributes: {
        class: "lexora-rich-editor-content",
      },
    },
    onUpdate({ editor }) {
      onChange(editor.getHTML())

      const from = editor.state.selection.from
      const textBefore = editor.state.doc.textBetween(Math.max(0, from - 80), from, "\n", "\n")
      const match = textBefore.match(/(?:^|\s)@([A-Za-z0-9._ -]{0,40})$/)

      if (match) {
        setMentionQuery(match[1] || "")
      } else {
        setMentionQuery(null)
      }
    },
  })

  useEffect(() => {
    if (!editor) return

    const current = editor.getHTML()
    const next = value || ""

    if (current !== next) {
      editor.commands.setContent(next, { emitUpdate: false })
    }
  }, [editor, value])

  if (!editor) return null

  const filteredMentionMembers = useMemo(() => {
    const q = (mentionQuery || "").trim().toLowerCase()

    return mentionMembers
      .filter((member) => {
        if (!q) return true

        return (
          member.name.toLowerCase().includes(q) ||
          (member.email || "").toLowerCase().includes(q) ||
          (member.role || "").toLowerCase().includes(q)
        )
      })
      .slice(0, 8)
  }, [mentionMembers, mentionQuery])

  function insertMention(member: RichTextMentionMember) {
    const from = editor.state.selection.from
    const query = mentionQuery || ""
    const start = Math.max(0, from - query.length - 1)
    const safeName = escapeHtml(member.name || member.email || "Admin")

    editor
      .chain()
      .focus()
      .deleteRange({ from: start, to: from })
      .insertContent(`<span style="color:#1d4ed8;font-weight:700;">@${safeName}</span>&nbsp;`)
      .run()

    setMentionQuery(null)
  }

  function setLink() {
    const previousUrl = editor.getAttributes("link").href as string | undefined
    const url = window.prompt("Paste link URL", previousUrl || "")

    if (url === null) return

    const trimmed = url.trim()

    if (!trimmed) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run()
      return
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: trimmed }).run()
  }

  return (
    <div
      style={{
        border: frameless ? "none" : "1px solid rgba(15,23,42,0.10)",
        borderRadius: frameless ? 0 : compact ? 14 : 16,
        background: frameless ? "transparent" : "#ffffff",
        boxShadow: frameless ? "none" : compact ? "none" : "0 18px 50px rgba(15,23,42,0.06)",
        overflow: frameless ? "visible" : "hidden",
      }}
    >
      <style jsx global>{`
        .lexora-rich-editor-content {
          min-height: ${minHeight}px;
          padding: ${frameless ? "24px 8px 80px" : compact ? "10px 12px" : "18px 20px"};
          outline: none;
          color: #111827;
          font-size: ${frameless ? "16px" : compact ? "13.5px" : "15px"};
          line-height: 1.72;
          font-weight: 400;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .lexora-rich-editor-content p {
          margin: 0 0 0.72em;
        }

        .lexora-rich-editor-content p:last-child {
          margin-bottom: 0;
        }

        .lexora-rich-editor-content ul,
        .lexora-rich-editor-content ol {
          margin: 0.6em 0 0.8em 1.3em;
          padding: 0;
        }

        .lexora-rich-editor-content blockquote {
          margin: 0.8em 0;
          padding-left: 12px;
          border-left: 3px solid #cbd5e1;
          color: #475569;
        }

        .lexora-rich-editor-content a {
          color: #1d4ed8;
          text-decoration: underline;
          text-underline-offset: 2px;
        }

        .lexora-rich-editor-content .is-editor-empty:first-child::before {
          color: #94a3b8;
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }
      `}</style>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          flexWrap: "wrap",
          padding: frameless ? "8px 0 12px" : compact ? "8px 10px" : "10px 12px",
          borderBottom: frameless ? "none" : "1px solid rgba(15,23,42,0.08)",
          background: frameless ? "transparent" : "#f8fafc",
          position: "relative",
        }}
      >
        <button type="button" style={editorButtonStyle(editor.isActive("bold"))} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold size={14} />
        </button>

        <button type="button" style={editorButtonStyle(editor.isActive("italic"))} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic size={14} />
        </button>

        <button type="button" style={editorButtonStyle(editor.isActive("underline"))} onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <UnderlineIcon size={14} />
        </button>

        <button type="button" style={editorButtonStyle(editor.isActive("strike"))} onClick={() => editor.chain().focus().toggleStrike().run()}>
          <Strikethrough size={14} />
        </button>

        <button type="button" style={editorButtonStyle(editor.isActive("bulletList"))} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List size={14} />
        </button>

        <button type="button" style={editorButtonStyle(editor.isActive("orderedList"))} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered size={14} />
        </button>

        <button type="button" style={editorButtonStyle(editor.isActive("blockquote"))} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
          <Quote size={14} />
        </button>

        <button type="button" style={editorButtonStyle()} onClick={setLink}>
          <Link2 size={14} />
        </button>

        <button type="button" style={editorButtonStyle(colorPickerOpen)} onClick={() => setColorPickerOpen((v) => !v)}>
          <Palette size={14} />
        </button>

        <button type="button" style={editorButtonStyle(symbolPickerOpen)} onClick={() => setSymbolPickerOpen((v) => !v)}>
          <Smile size={14} />
        </button>

        <button
          type="button"
          style={editorButtonStyle(mentionQuery !== null)}
          onClick={() => {
            editor.chain().focus().insertContent("@").run()
            setMentionQuery("")
          }}
          title="Mention admin"
        >
          <AtSign size={14} />
        </button>

        <button type="button" style={editorButtonStyle()} onClick={() => editor.chain().focus().setParagraph().run()}>
          <Pilcrow size={14} />
        </button>

        <button type="button" style={editorButtonStyle()} onClick={() => editor.chain().focus().undo().run()}>
          <Undo2 size={14} />
        </button>

        <button type="button" style={editorButtonStyle()} onClick={() => editor.chain().focus().redo().run()}>
          <Redo2 size={14} />
        </button>

        {colorPickerOpen ? (
          <div
            style={{
              position: "absolute",
              top: 46,
              left: 12,
              zIndex: 30,
              display: "flex",
              gap: 6,
              padding: 8,
              borderRadius: 12,
              border: "1px solid rgba(15,23,42,0.10)",
              background: "#ffffff",
              boxShadow: "0 18px 45px rgba(15,23,42,0.15)",
            }}
          >
            {COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => {
                  editor.chain().focus().setColor(color).run()
                  setColorPickerOpen(false)
                }}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 999,
                  border: "1px solid rgba(15,23,42,0.12)",
                  background: color,
                  cursor: "pointer",
                }}
              />
            ))}
          </div>
        ) : null}

        {mentionQuery !== null && filteredMentionMembers.length > 0 ? (
          <div
            style={{
              position: "absolute",
              top: 46,
              left: 12,
              zIndex: 35,
              width: 280,
              padding: 8,
              borderRadius: 14,
              border: "1px solid rgba(15,23,42,0.10)",
              background: "#ffffff",
              boxShadow: "0 18px 45px rgba(15,23,42,0.15)",
            }}
          >
            <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 0.8, color: "#94a3b8", marginBottom: 6 }}>
              Mention admin
            </div>

            {filteredMentionMembers.map((member) => (
              <button
                key={member.id}
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault()
                  insertMention(member)
                }}
                style={{
                  width: "100%",
                  border: "none",
                  background: "transparent",
                  borderRadius: 10,
                  padding: "8px 9px",
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                <span
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 999,
                    background: "#eef2ff",
                    color: "#1d4ed8",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    fontWeight: 800,
                  }}
                >
                  {(member.name || member.email || "A").slice(0, 2).toUpperCase()}
                </span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#111827" }}>{member.name}</span>
                  <span style={{ display: "block", fontSize: 11.5, color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {member.email || member.role || "admin"}
                  </span>
                </span>
              </button>
            ))}
          </div>
        ) : null}

        {symbolPickerOpen ? (
          <div
            style={{
              position: "absolute",
              top: 46,
              right: 12,
              zIndex: 30,
              width: 260,
              display: "grid",
              gridTemplateColumns: "repeat(8, 1fr)",
              gap: 6,
              padding: 10,
              borderRadius: 14,
              border: "1px solid rgba(15,23,42,0.10)",
              background: "#ffffff",
              boxShadow: "0 18px 45px rgba(15,23,42,0.15)",
            }}
          >
            {SYMBOLS.map((symbol) => (
              <button
                key={symbol}
                type="button"
                onClick={() => {
                  editor.chain().focus().insertContent(`${symbol} `).run()
                  setSymbolPickerOpen(false)
                }}
                style={{
                  height: 28,
                  borderRadius: 8,
                  border: "1px solid rgba(15,23,42,0.08)",
                  background: "#ffffff",
                  cursor: "pointer",
                  fontSize: 15,
                }}
              >
                {symbol}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <EditorContent editor={editor} />
    </div>
  )
}
