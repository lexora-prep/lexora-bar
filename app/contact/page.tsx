"use client"

import { ChangeEvent, FormEvent, useMemo, useState } from "react"
import Link from "next/link"

const MAX_FILE_SIZE = 5 * 1024 * 1024
const allowedTypes = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
]

export default function ContactPage() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [topic, setTopic] = useState("General inquiry")
  const [message, setMessage] = useState("")
  const [fileName, setFileName] = useState("")
  const [fileError, setFileError] = useState("")
  const [status, setStatus] = useState("")

  const canSubmit = useMemo(() => {
    return name.trim() && email.trim() && message.trim() && !fileError
  }, [name, email, message, fileError])

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    setFileError("")
    setFileName("")

    const file = event.target.files?.[0]
    if (!file) return

    if (file.size > MAX_FILE_SIZE) {
      setFileError("File must be 5 MB or smaller.")
      event.target.value = ""
      return
    }

    if (!allowedTypes.includes(file.type)) {
      setFileError("Allowed files: PDF, DOC, DOCX, PNG, JPG, JPEG.")
      event.target.value = ""
      return
    }

    setFileName(file.name)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!canSubmit) {
      setStatus("Please complete the required fields before sending.")
      return
    }

    const subject = encodeURIComponent(`[Lexora Prep] ${topic}`)
    const body = encodeURIComponent(
      `Name: ${name}\nEmail: ${email}\nTopic: ${topic}\n\nMessage:\n${message}\n\nAttachment note: ${
        fileName
          ? `The user selected this file: ${fileName}. Please attach it manually if your email app does not include it automatically.`
          : "No file selected."
      }`
    )

    window.location.href = `mailto:support@lexoraprep.com?subject=${subject}&body=${body}`
    setStatus("Your email app should open now. If the attachment does not carry over, attach it manually before sending.")
  }

  return (
    <main className="min-h-screen bg-[#F7F8FC] px-5 py-6 text-[#0E1B35]">
      <div className="mx-auto max-w-5xl">
        <nav className="mb-6 flex h-12 items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-3 text-base font-black">
            <img
              src="/icon.png"
              alt="Lexora Prep"
              className="h-9 w-9 rounded-xl bg-white object-contain p-1 shadow-sm"
            />
            <span>
              Lexora <span className="text-[#7C3AED]">Prep</span>
            </span>
          </Link>

          <Link
            href="/"
            className="rounded-2xl border border-[#CBD5E1] bg-white px-4 py-2.5 text-sm font-black shadow-sm transition hover:border-[#7C3AED] hover:text-[#7C3AED]"
          >
            ← Back to main page
          </Link>
        </nav>

        <section className="rounded-[28px] border border-[#D8E0EF] bg-white p-6 shadow-[0_18px_55px_rgba(14,27,53,0.07)] md:p-8">
          <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
            <div>
              <p className="mb-3 text-[11px] font-black uppercase tracking-[0.22em] text-[#7C3AED]">
                Contact
              </p>

              <h1 className="font-serif text-[42px] font-semibold leading-[1.02] tracking-[-0.045em]">
                Contact Lexora Prep
              </h1>

              <p className="mt-4 text-[15px] leading-7 text-[#475569]">
                Send a message about billing, refunds, account access, product questions, or technical issues.
              </p>

              <div className="mt-6 rounded-[22px] border border-[#E2E8F0] bg-[#FBFCFF] p-5">
                <p className="text-sm font-black text-[#0E1B35]">
                  Direct email
                </p>
                <a
                  href="mailto:support@lexoraprep.com"
                  className="mt-2 inline-block text-lg font-black text-[#7C3AED]"
                >
                  support@lexoraprep.com
                </a>
              </div>

              <div className="mt-4 rounded-[22px] border border-[#E2E8F0] bg-[#FBFCFF] p-5">
                <p className="text-sm font-black text-[#0E1B35]">
                  Follow Lexora Prep
                </p>
                <div className="mt-3 flex gap-3">
                  <a
                    href="https://www.instagram.com/LexoraPrep"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-10 items-center rounded-full border border-[#CBD5E1] bg-white px-4 text-sm font-black hover:border-[#7C3AED] hover:text-[#7C3AED]"
                  >
                    Instagram
                  </a>
                  <a
                    href="https://www.tiktok.com/@LexoraPrep"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-10 items-center rounded-full border border-[#CBD5E1] bg-white px-4 text-sm font-black hover:border-[#7C3AED] hover:text-[#7C3AED]"
                  >
                    TikTok
                  </a>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="grid gap-4">
              <label className="grid gap-2">
                <span className="text-[11px] font-black uppercase tracking-[0.18em] text-[#64748B]">
                  Name
                </span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="h-12 rounded-2xl border border-[#D8E0EF] bg-white px-4 text-sm font-bold outline-none transition focus:border-[#7C3AED]"
                  placeholder="Your name"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-[11px] font-black uppercase tracking-[0.18em] text-[#64748B]">
                  Email
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-12 rounded-2xl border border-[#D8E0EF] bg-white px-4 text-sm font-bold outline-none transition focus:border-[#7C3AED]"
                  placeholder="you@example.com"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-[11px] font-black uppercase tracking-[0.18em] text-[#64748B]">
                  Topic
                </span>
                <select
                  value={topic}
                  onChange={(event) => setTopic(event.target.value)}
                  className="h-12 rounded-2xl border border-[#D8E0EF] bg-white px-4 text-sm font-bold outline-none transition focus:border-[#7C3AED]"
                >
                  <option>General inquiry</option>
                  <option>Billing or Paddle checkout</option>
                  <option>Refund request</option>
                  <option>Account access</option>
                  <option>Technical issue</option>
                  <option>Product feedback</option>
                </select>
              </label>

              <label className="grid gap-2">
                <span className="text-[11px] font-black uppercase tracking-[0.18em] text-[#64748B]">
                  Message
                </span>
                <textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  className="min-h-[150px] resize-none rounded-2xl border border-[#D8E0EF] bg-white p-4 text-sm font-bold leading-7 outline-none transition focus:border-[#7C3AED]"
                  placeholder="Write your message..."
                />
              </label>

              <label className="grid gap-2">
                <span className="text-[11px] font-black uppercase tracking-[0.18em] text-[#64748B]">
                  Attachment, optional
                </span>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                  onChange={handleFile}
                  className="rounded-2xl border border-dashed border-[#CBD5E1] bg-[#FBFCFF] p-4 text-sm font-bold text-[#475569]"
                />
                <span className={`text-xs font-bold ${fileError ? "text-red-500" : "text-[#64748B]"}`}>
                  {fileError || fileName || "PDF, DOC, DOCX, PNG, JPG, JPEG. Maximum 5 MB."}
                </span>
              </label>

              <button
                type="submit"
                className="mt-2 rounded-2xl bg-[#0E1B35] px-5 py-3.5 text-sm font-black text-white shadow-xl transition hover:bg-[#162B55]"
              >
                Send message
              </button>

              {status && (
                <p className="rounded-2xl border border-[#DDD6FE] bg-[#F8F5FF] p-4 text-sm font-bold leading-6 text-[#5B21B6]">
                  {status}
                </p>
              )}
            </form>
          </div>
        </section>
      </div>
    </main>
  )
}
