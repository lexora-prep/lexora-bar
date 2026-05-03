"use client"

import { useEffect } from "react"
import Link from "next/link"

export default function AboutPage() {
  useEffect(() => {
    const blockContextMenu = (event: MouseEvent) => {
      event.preventDefault()
    }

    const blockCopyKeys = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      const blocked =
        (event.ctrlKey || event.metaKey) &&
        ["c", "x", "a", "s", "p", "u"].includes(key)

      if (blocked) {
        event.preventDefault()
      }
    }

    const blockCopy = (event: ClipboardEvent) => {
      event.preventDefault()
    }

    document.addEventListener("contextmenu", blockContextMenu)
    document.addEventListener("keydown", blockCopyKeys)
    document.addEventListener("copy", blockCopy)
    document.addEventListener("cut", blockCopy)

    return () => {
      document.removeEventListener("contextmenu", blockContextMenu)
      document.removeEventListener("keydown", blockCopyKeys)
      document.removeEventListener("copy", blockCopy)
      document.removeEventListener("cut", blockCopy)
    }
  }, [])

  return (
    <main className="min-h-screen select-none bg-[#F7F8FC] text-[#0E1B35]" onCopy={(event) => event.preventDefault()} onCut={(event) => event.preventDefault()} onContextMenu={(event) => event.preventDefault()} draggable={false}>
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

      <section className="mx-auto max-w-4xl px-5 py-14 md:py-16">
        <p className="mb-4 text-[11px] font-black uppercase tracking-[0.22em] text-[#7C3AED]">
          About Lexora Prep
        </p>

        <h1 className="max-w-3xl font-serif text-[34px] font-semibold leading-[1.08] tracking-[-0.035em] text-[#0E1B35] md:text-[44px]">
          Built to make Black Letter Law easier to recall.
        </h1>

        <div className="mt-8 space-y-5 text-[16px] leading-8 text-[#475569]">
          <p>
            Lexora Prep was created from a simple problem: bar candidates often understand the rule when they read it, but struggle to recall it clearly when they need to write it from memory.
          </p>

          <p>
            That problem matters most in essay practice. For the MEE, knowing the law is not enough. You need to remember the rule, organize it quickly, and notice which legal elements you missed.
          </p>

          <p>
            I built Lexora Prep because I experienced that same struggle while preparing for the bar exam. Reading outlines helped, but it did not fully train active recall. The harder part was repeating the rule, comparing it against a model answer, and reviewing the weak parts until the language became natural.
          </p>

          <p>
            Lexora Prep focuses on that exact skill. The platform helps users practice Black Letter Law recall through structured rule training, flashcards, spaced review, weak-area targeting, and simple study analytics.
          </p>

          <p>
            Lexora Prep is not a replacement for a full bar course and does not guarantee exam success. It is a focused educational tool designed to help bar candidates build rule memory with more structure and less chaos.
          </p>
        </div>

        <div className="mt-10 grid gap-5 border-t border-[#E2E8F0] pt-8 md:grid-cols-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#94A3B8]">
              Read
            </p>
            <p className="mt-2 text-sm leading-6 text-[#475569]">
              Review the rule statement and understand the legal elements.
            </p>
          </div>

          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#94A3B8]">
              Recall
            </p>
            <p className="mt-2 text-sm leading-6 text-[#475569]">
              Type the rule from memory instead of passively rereading it.
            </p>
          </div>

          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#94A3B8]">
              Retain
            </p>
            <p className="mt-2 text-sm leading-6 text-[#475569]">
              Repeat weak rules through focused review and spaced practice.
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
