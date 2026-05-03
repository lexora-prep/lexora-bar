import Link from "next/link"

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#F7F8FC] px-5 py-6 text-[#0E1B35]">
      <div className="mx-auto max-w-4xl">
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

        <article className="rounded-[30px] border border-[#D8E0EF] bg-white p-7 shadow-[0_18px_55px_rgba(14,27,53,0.07)] md:p-10">
          <p className="mb-3 text-[11px] font-black uppercase tracking-[0.22em] text-[#7C3AED]">
            About
          </p>

          <h1 className="font-serif text-[46px] font-semibold leading-[1.02] tracking-[-0.045em] md:text-[58px]">
            Built for the part of bar prep students quietly struggle with.
          </h1>

          <div className="mt-6 space-y-5 text-[16px] leading-8 text-[#475569]">
            <p>
              Lexora Prep was created from a simple problem: memorizing Black Letter Law is not just about reading rules. For essay practice, especially the MEE, you need to recall the rule clearly, write it from memory, and notice which legal elements you missed.
            </p>

            <p>
              I built Lexora Prep because I experienced that struggle myself while preparing for the bar exam. Reading outlines was not enough. The harder part was forcing myself to recite the rule, compare it against the model rule, and repeat the weak parts until the language became natural.
            </p>

            <p>
              Lexora Prep is designed to help bar candidates train that exact skill. The platform focuses on structured Black Letter Law recall, rule memorization, weak area review, spaced repetition, and simple analytics that show what you remembered and what you missed.
            </p>

            <p>
              The goal is not to replace a full bar course or guarantee exam success. The goal is to give students a focused tool for building rule memory in good faith, with a practical system that makes daily recall training easier to repeat.
            </p>
          </div>

          <div className="mt-8 rounded-[24px] border border-[#DDD6FE] bg-[#F8F5FF] p-5">
            <p className="text-lg font-black tracking-[-0.02em] text-[#0E1B35]">
              The mission
            </p>
            <p className="mt-2 text-[15px] leading-7 text-[#475569]">
              Help bar candidates read, recall, review, and retain the rules they need with more confidence and less chaos.
            </p>
          </div>
        </article>
      </div>
    </main>
  )
}
