"use client"

import { FormEvent, useRef, useState } from "react"
import Link from "next/link"

const topics = [
  "General inquiry",
  "Account access",
  "Billing",
  "Refund request",
  "Technical issue",
  "Product question",
]

const allowedExtensions = ".pdf,.doc,.docx,.png,.jpg,.jpeg"

export default function ContactPage() {
  const formRef = useRef<HTMLFormElement | null>(null)
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle")
  const [message, setMessage] = useState("")

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const form = event.currentTarget
    const formData = new FormData(form)

    setStatus("sending")
    setMessage("Sending your message...")

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        body: formData,
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        setStatus("error")
        setMessage(data?.error || "Message could not be sent. Please try again.")
        return
      }

      setStatus("success")
      setMessage("Your message was sent successfully. Lexora Prep will reply by email.")
      formRef.current?.reset()
    } catch {
      setStatus("error")
      setMessage("Message could not be sent. Please check your connection and try again.")
    }
  }

  return (
    <main className="min-h-screen bg-[#F7F8FC] text-[#0E1B35]">
      <header className="border-b border-[#E2E8F0] bg-[#F7F8FC]/95">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
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
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-5 py-12 md:py-14">
        <div className="mb-9 max-w-2xl">
          <p className="mb-3 text-[11px] font-black uppercase tracking-[0.22em] text-[#7C3AED]">
            Contact
          </p>

          <h1 className="font-serif text-[34px] font-semibold leading-[1.08] tracking-[-0.035em] md:text-[44px]">
            Contact Lexora Prep
          </h1>

          <p className="mt-4 text-[15px] leading-7 text-[#475569]">
            Send a message about account access, billing, refunds, product questions,
            or technical issues. Your message will be sent directly to Lexora Prep support.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <aside className="space-y-4">
            <div className="rounded-[24px] border border-[#D8E0EF] bg-white p-5 shadow-[0_16px_40px_rgba(14,27,53,0.05)]">
              <h2 className="text-base font-black tracking-[-0.02em]">
                Direct email
              </h2>
              <a
                href="mailto:support@lexoraprep.com"
                className="mt-3 block text-[17px] font-black text-[#7C3AED] hover:text-[#5B21B6]"
              >
                support@lexoraprep.com
              </a>
            </div>

            <div className="rounded-[24px] border border-[#D8E0EF] bg-white p-5 shadow-[0_16px_40px_rgba(14,27,53,0.05)]">
              <h2 className="text-base font-black tracking-[-0.02em]">
                Connect
              </h2>

              <div className="mt-4 flex flex-wrap gap-3">
                <a
                  href="https://www.instagram.com/LexoraPrep"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-2xl border border-[#CBD5E1] bg-white px-4 py-2 text-sm font-black transition hover:border-[#7C3AED] hover:text-[#7C3AED]"
                >
                  Instagram
                </a>
                <a
                  href="https://www.tiktok.com/@LexoraPrep"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-2xl border border-[#CBD5E1] bg-white px-4 py-2 text-sm font-black transition hover:border-[#7C3AED] hover:text-[#7C3AED]"
                >
                  TikTok
                </a>
              </div>
            </div>

            <p className="px-1 text-xs leading-6 text-[#64748B]">
              For payment, cancellation, and refund matters, please include the email address used for your Lexora Prep account.
            </p>
          </aside>

          <form
            ref={formRef}
            onSubmit={handleSubmit}
            className="rounded-[28px] border border-[#D8E0EF] bg-white p-5 shadow-[0_18px_55px_rgba(14,27,53,0.07)] md:p-6"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-[11px] font-black uppercase tracking-[0.18em] text-[#94A3B8]">
                  Name
                </span>
                <input
                  name="name"
                  required
                  className="h-12 rounded-2xl border border-[#D8E0EF] bg-[#F8FAFF] px-4 text-sm font-bold outline-none transition focus:border-[#7C3AED] focus:ring-4 focus:ring-[#7C3AED]/10"
                  placeholder="Your name"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-[11px] font-black uppercase tracking-[0.18em] text-[#94A3B8]">
                  Email
                </span>
                <input
                  name="email"
                  type="email"
                  required
                  className="h-12 rounded-2xl border border-[#D8E0EF] bg-[#F8FAFF] px-4 text-sm font-bold outline-none transition focus:border-[#7C3AED] focus:ring-4 focus:ring-[#7C3AED]/10"
                  placeholder="you@example.com"
                />
              </label>
            </div>

            <label className="mt-4 grid gap-2">
              <span className="text-[11px] font-black uppercase tracking-[0.18em] text-[#94A3B8]">
                Topic
              </span>
              <select
                name="topic"
                required
                className="h-12 rounded-2xl border border-[#D8E0EF] bg-[#F8FAFF] px-4 text-sm font-bold outline-none transition focus:border-[#7C3AED] focus:ring-4 focus:ring-[#7C3AED]/10"
                defaultValue="General inquiry"
              >
                {topics.map((topic) => (
                  <option key={topic} value={topic}>
                    {topic}
                  </option>
                ))}
              </select>
            </label>

            <label className="mt-4 grid gap-2">
              <span className="text-[11px] font-black uppercase tracking-[0.18em] text-[#94A3B8]">
                Message
              </span>
              <textarea
                name="message"
                required
                rows={6}
                className="resize-y rounded-2xl border border-[#D8E0EF] bg-[#F8FAFF] px-4 py-4 text-sm font-bold leading-7 outline-none transition focus:border-[#7C3AED] focus:ring-4 focus:ring-[#7C3AED]/10"
                placeholder="Write your message..."
              />
            </label>

            <label className="mt-4 grid gap-2">
              <span className="text-[11px] font-black uppercase tracking-[0.18em] text-[#94A3B8]">
                Attachment, optional
              </span>
              <input
                name="attachment"
                type="file"
                accept={allowedExtensions}
                className="rounded-2xl border border-dashed border-[#CBD5E1] bg-[#F8FAFF] px-4 py-4 text-sm font-bold text-[#475569] file:mr-4 file:rounded-xl file:border-0 file:bg-[#0E1B35] file:px-4 file:py-2 file:text-sm file:font-black file:text-white"
              />
              <span className="text-xs font-bold leading-6 text-[#64748B]">
                PDF, DOC, DOCX, PNG, JPG, JPEG. Maximum 5 MB.
              </span>
            </label>

            <button
              type="submit"
              disabled={status === "sending"}
              className="mt-5 w-full rounded-2xl bg-[#0E1B35] px-5 py-3.5 text-sm font-black text-white shadow-xl transition hover:bg-[#162B55] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {status === "sending" ? "Sending..." : "Send message"}
            </button>

            {message && (
              <div
                className={`mt-4 rounded-2xl border p-4 text-sm font-bold leading-6 ${
                  status === "success"
                    ? "border-[#A7F3D0] bg-[#ECFDF5] text-[#047857]"
                    : status === "error"
                      ? "border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]"
                      : "border-[#DDD6FE] bg-[#F8F5FF] text-[#5B21B6]"
                }`}
              >
                {message}
              </div>
            )}
          </form>
        </div>
      </section>
    </main>
  )
}
