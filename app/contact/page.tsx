"use client"

import { FormEvent, useState } from "react"
import Link from "next/link"

export default function ContactPage() {
  const [status, setStatus] = useState("")

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const form = event.currentTarget
    const formData = new FormData(form)

    const name = String(formData.get("name") || "").trim()
    const email = String(formData.get("email") || "").trim()
    const topic = String(formData.get("topic") || "").trim()
    const message = String(formData.get("message") || "").trim()

    const subject = encodeURIComponent(`Lexora Prep Contact: ${topic || "General inquiry"}`)
    const body = encodeURIComponent(
      `Name: ${name}\nEmail: ${email}\nTopic: ${topic}\n\nMessage:\n${message}`
    )

    window.location.href = `mailto:support@lexoraprep.com?subject=${subject}&body=${body}`
    setStatus("Your email app should open now. If it does not, email support@lexoraprep.com directly.")
  }

  return (
    <main className="min-h-screen bg-[#F7F8FC] px-5 py-8 text-[#0E1B35]">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/"
          className="mb-6 inline-flex items-center rounded-full border border-[#D8E0EF] bg-white px-4 py-2.5 text-sm font-bold text-[#0E1B35] shadow-sm transition hover:border-[#7C3AED] hover:text-[#7C3AED]"
        >
          ← Back to Lexora Prep
        </Link>

        <section className="grid gap-6 rounded-[28px] border border-[#D8E0EF] bg-white p-6 shadow-[0_18px_60px_rgba(14,27,53,0.07)] md:grid-cols-[0.9fr_1.1fr] md:p-8">
          <div>
            <p className="mb-3 text-[11px] font-black uppercase tracking-[0.2em] text-[#7C3AED]">
              Contact
            </p>

            <h1 className="font-serif text-3xl font-semibold tracking-[-0.035em] text-[#0E1B35] md:text-4xl">
              Contact Lexora Prep
            </h1>

            <p className="mt-4 text-[15px] leading-7 text-[#475569]">
              Send a message about billing, refunds, account access, product questions, or technical issues.
            </p>

            <div className="mt-6 rounded-[20px] border border-[#E2E8F0] bg-[#FBFCFF] p-5">
              <p className="text-sm font-black text-[#0E1B35]">Direct email</p>
              <a
                href="mailto:support@lexoraprep.com"
                className="mt-2 inline-flex text-sm font-bold text-[#7C3AED]"
              >
                support@lexoraprep.com
              </a>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-[#64748B]">
                Name
              </label>
              <input
                name="name"
                required
                className="h-11 w-full rounded-2xl border border-[#D8E0EF] bg-white px-4 text-sm font-semibold outline-none transition focus:border-[#7C3AED]"
                placeholder="Your name"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-[#64748B]">
                Email
              </label>
              <input
                name="email"
                type="email"
                required
                className="h-11 w-full rounded-2xl border border-[#D8E0EF] bg-white px-4 text-sm font-semibold outline-none transition focus:border-[#7C3AED]"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-[#64748B]">
                Topic
              </label>
              <select
                name="topic"
                className="h-11 w-full rounded-2xl border border-[#D8E0EF] bg-white px-4 text-sm font-semibold outline-none transition focus:border-[#7C3AED]"
                defaultValue="General inquiry"
              >
                <option>General inquiry</option>
                <option>Billing or Paddle checkout</option>
                <option>Refund request</option>
                <option>Account access</option>
                <option>Technical issue</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-[#64748B]">
                Message
              </label>
              <textarea
                name="message"
                required
                rows={5}
                className="w-full resize-none rounded-2xl border border-[#D8E0EF] bg-white px-4 py-3 text-sm font-semibold leading-6 outline-none transition focus:border-[#7C3AED]"
                placeholder="Write your message..."
              />
            </div>

            <button
              type="submit"
              className="h-11 w-full rounded-2xl bg-[#0E1B35] px-5 text-sm font-black text-white shadow-lg transition hover:bg-[#162B55]"
            >
              Send message
            </button>

            {status && (
              <p className="rounded-2xl border border-[#D8E0EF] bg-[#FBFCFF] p-3 text-sm leading-6 text-[#475569]">
                {status}
              </p>
            )}
          </form>
        </section>
      </div>
    </main>
  )
}
