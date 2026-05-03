"use client"

import { FormEvent, useState } from "react"
import Link from "next/link"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState("")

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus("If this email is registered, password reset instructions will be sent.")
  }

  return (
    <main className="min-h-screen bg-[#F7F8FC] px-5 py-5 text-[#0E1B35]">
      <div className="mx-auto max-w-5xl">
        <nav className="mb-8 flex h-12 items-center justify-between">
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
            href="/login"
            className="rounded-2xl border border-[#CBD5E1] bg-white px-4 py-2.5 text-sm font-black shadow-sm transition hover:border-[#7C3AED] hover:text-[#7C3AED]"
          >
            Back to log in
          </Link>
        </nav>

        <section className="mx-auto grid max-w-4xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="mb-3 inline-flex rounded-full border border-[#DDD6FE] bg-[#F3F0FF] px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-[#7C3AED]">
              Account access
            </p>

            <h1 className="font-serif text-[44px] font-semibold leading-[1.04] tracking-[-0.045em] md:text-[54px]">
              Reset your Lexora Prep password.
            </h1>

            <p className="mt-4 max-w-lg text-[15px] leading-7 text-[#475569]">
              Enter the email linked to your account. If it exists in the system, you will receive reset instructions.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="rounded-[28px] border border-[#D8E0EF] bg-white p-6 shadow-[0_18px_55px_rgba(14,27,53,0.07)]"
          >
            <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl border border-[#DDD6FE] bg-[#F3F0FF] text-2xl text-[#7C3AED]">
              🔐
            </div>

            <h2 className="text-center font-serif text-3xl font-semibold tracking-[-0.04em]">
              Forgot password?
            </h2>

            <p className="mx-auto mt-2 max-w-sm text-center text-sm leading-6 text-[#64748B]">
              We will send reset instructions if this email is connected to a Lexora Prep account.
            </p>

            <label className="mt-6 grid gap-2">
              <span className="text-[11px] font-black uppercase tracking-[0.18em] text-[#94A3B8]">
                Email
              </span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-12 rounded-2xl border border-[#D8E0EF] bg-[#F8FAFF] px-4 text-sm font-bold outline-none transition focus:border-[#7C3AED]"
                placeholder="you@example.com"
              />
            </label>

            <button
              type="submit"
              className="mt-5 w-full rounded-2xl bg-[#0E1B35] px-5 py-3.5 text-sm font-black text-white shadow-xl transition hover:bg-[#162B55]"
            >
              Send reset instructions
            </button>

            {status && (
              <p className="mt-4 rounded-2xl border border-[#DDD6FE] bg-[#F8F5FF] p-4 text-sm font-bold leading-6 text-[#5B21B6]">
                {status}
              </p>
            )}

            <Link
              href="/login"
              className="mt-5 block text-center text-sm font-black text-[#64748B] hover:text-[#7C3AED]"
            >
              ← Return to log in
            </Link>
          </form>
        </section>
      </div>
    </main>
  )
}
