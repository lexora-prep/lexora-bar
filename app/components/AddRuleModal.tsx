"use client"

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/utils/supabase/client"

export default function AddRuleModal({
  open,
  onClose,
  onCreated
}: any) {
  const supabase = useMemo(() => createClient(), [])

  const [userId, setUserId] = useState<string | null>(null)

  const [title, setTitle] = useState("")
  const [ruleText, setRuleText] = useState("")
  const [example, setExample] = useState("")
  const [subject, setSubject] = useState("")
  const [topic, setTopic] = useState("")
  const [keywords, setKeywords] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function loadUser() {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser()

        if (error) {
          console.error("SUPABASE GET USER ERROR:", error)
          return
        }

        if (!user) {
          setUserId(null)
          return
        }

        setUserId(user.id)
      } catch (err) {
        console.error("LOAD USER ERROR:", err)
      }
    }

    if (open) {
      loadUser()
    }
  }, [open, supabase])

  if (!open) return null

  async function submit() {
    if (!userId) {
      alert("Please log in again.")
      return
    }

    if (!title.trim() || !ruleText.trim()) {
      alert("Rule title and rule statement are required.")
      return
    }

    try {
      setSaving(true)

      const res = await fetch("/api/user-rules", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          userId,
          title: title.trim(),
          ruleText: ruleText.trim(),
          applicationExample: example.trim(),
          subject: subject.trim(),
          topic: topic.trim(),
          keywords: keywords
            .split(",")
            .map((k) => k.trim())
            .filter(Boolean)
        })
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        alert(data?.error || "Failed to save rule.")
        return
      }

      setTitle("")
      setRuleText("")
      setExample("")
      setSubject("")
      setTopic("")
      setKeywords("")

      onCreated?.()
      onClose?.()
    } catch (err) {
      console.error("ADD RULE ERROR:", err)
      alert("Failed to save rule.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white w-[600px] rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold">
          Add Custom Rule
        </h2>

        <input
          placeholder="Rule title"
          className="w-full border p-2 rounded"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <input
          placeholder="Subject"
          className="w-full border p-2 rounded"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />

        <input
          placeholder="Topic"
          className="w-full border p-2 rounded"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
        />

        <textarea
          placeholder="Rule statement"
          className="w-full border p-2 rounded h-[120px]"
          value={ruleText}
          onChange={(e) => setRuleText(e.target.value)}
        />

        <textarea
          placeholder="Application example"
          className="w-full border p-2 rounded h-[100px]"
          value={example}
          onChange={(e) => setExample(e.target.value)}
        />

        <input
          placeholder="Keywords (comma separated)"
          className="w-full border p-2 rounded"
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
        />

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded"
            disabled={saving}
          >
            Cancel
          </button>

          <button
            onClick={submit}
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Rule"}
          </button>
        </div>
      </div>
    </div>
  )
}