
import Link from "next/link"

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-[#F7F8FC] px-5 py-12 text-[#0E1B35]">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <Link href="/" className="inline-flex items-center gap-3 text-[15px] font-bold text-[#0E1B35]">
            <img
              src="/lexora-icon-transparent.png"
              alt="Lexora Prep"
              className="h-10 w-10 rounded-xl bg-white p-1 shadow-sm ring-1 ring-[#E2E6F0]"
            />
            <span>Lexora <span className="text-[#7C3AED]">Prep</span></span>
          </Link>

          <Link
            href="/"
            className="rounded-full border border-[#CDD3E6] bg-white px-4 py-2 text-[13px] font-semibold text-[#475569] shadow-sm transition hover:border-[#0E1B35] hover:text-[#0E1B35]"
          >
            Back to Home
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
          <section className="rounded-[28px] border border-[#E2E6F0] bg-white p-7 shadow-[0_24px_60px_rgba(14,27,53,0.10)] md:p-12">
            <div className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#7C3AED]">
              Contact
            </div>

            <h1 className="mb-4 text-[36px] font-extrabold tracking-[-0.04em] text-[#0E1B35] md:text-[48px]">
              Contact Lexora Prep
            </h1>

            <p className="mb-8 max-w-2xl text-[15px] leading-8 text-[#475569]">
              Questions about your account, subscription, rule training, billing, or support? Send a message and the Lexora Prep team will review it.
            </p>

            <form
              action="mailto:support@lexoraprep.com"
              method="post"
              encType="text/plain"
              className="space-y-5"
            >
              <div>
                <label className="mb-2 block text-[13px] font-bold text-[#0E1B35]">
                  Name
                </label>
                <input
                  name="name"
                  type="text"
                  required
                  className="h-12 w-full rounded-[14px] border border-[#CDD3E6] bg-[#F7F8FC] px-4 text-[15px] outline-none transition focus:border-[#7C3AED] focus:bg-white focus:ring-4 focus:ring-[#F3F0FF]"
                  placeholder="Your name"
                />
              </div>

              <div>
                <label className="mb-2 block text-[13px] font-bold text-[#0E1B35]">
                  Email
                </label>
                <input
                  name="email"
                  type="email"
                  required
                  className="h-12 w-full rounded-[14px] border border-[#CDD3E6] bg-[#F7F8FC] px-4 text-[15px] outline-none transition focus:border-[#7C3AED] focus:bg-white focus:ring-4 focus:ring-[#F3F0FF]"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label className="mb-2 block text-[13px] font-bold text-[#0E1B35]">
                  Topic
                </label>
                <select
                  name="topic"
                  className="h-12 w-full rounded-[14px] border border-[#CDD3E6] bg-[#F7F8FC] px-4 text-[15px] outline-none transition focus:border-[#7C3AED] focus:bg-white focus:ring-4 focus:ring-[#F3F0FF]"
                >
                  <option>General question</option>
                  <option>Billing or subscription</option>
                  <option>Technical issue</option>
                  <option>Rule content feedback</option>
                  <option>Partnership or business inquiry</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-[13px] font-bold text-[#0E1B35]">
                  Message
                </label>
                <textarea
                  name="message"
                  required
                  rows={7}
                  className="w-full resize-none rounded-[14px] border border-[#CDD3E6] bg-[#F7F8FC] px-4 py-3 text-[15px] leading-7 outline-none transition focus:border-[#7C3AED] focus:bg-white focus:ring-4 focus:ring-[#F3F0FF]"
                  placeholder="Write your message here..."
                />
              </div>

              <button
                type="submit"
                className="inline-flex h-12 items-center justify-center rounded-[14px] bg-[#0E1B35] px-6 text-[14px] font-bold text-white shadow-[0_10px_24px_rgba(14,27,53,0.22)] transition hover:-translate-y-0.5 hover:bg-[#162B55]"
              >
                Send Message
              </button>
            </form>
          </section>

          <aside className="space-y-5">
            <div className="rounded-[24px] border border-[#E2E6F0] bg-white p-7 shadow-sm">
              <h2 className="mb-3 text-[18px] font-bold text-[#0E1B35]">
                Email Support
              </h2>
              <p className="mb-4 text-[14px] leading-7 text-[#475569]">
                For account, billing, refund, or technical support, contact us directly.
              </p>
              <a
                href="mailto:support@lexoraprep.com"
                className="text-[14px] font-bold text-[#7C3AED]"
              >
                support@lexoraprep.com
              </a>
            </div>

            <div className="rounded-[24px] border border-[#E2E6F0] bg-white p-7 shadow-sm">
              <h2 className="mb-3 text-[18px] font-bold text-[#0E1B35]">
                Follow Lexora Prep
              </h2>
              <p className="mb-5 text-[14px] leading-7 text-[#475569]">
                Follow product updates, bar prep tips, and Black Letter Law content.
              </p>

              <div className="flex flex-wrap gap-3">
                <a
                  href="https://www.instagram.com/LexoraPrep"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-[#DDD6FE] bg-[#F3F0FF] px-4 py-2 text-[13px] font-bold text-[#5B21B6] transition hover:bg-[#DDD6FE]"
                >
                  Instagram
                </a>

                <a
                  href="https://www.tiktok.com/@LexoraPrep"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-[#CDD3E6] bg-[#F7F8FC] px-4 py-2 text-[13px] font-bold text-[#0E1B35] transition hover:bg-[#E2E6F0]"
                >
                  TikTok
                </a>
              </div>
            </div>

            <div className="rounded-[24px] border border-[#DDD6FE] bg-[#F3F0FF] p-7">
              <h2 className="mb-3 text-[18px] font-bold text-[#5B21B6]">
                Response Note
              </h2>
              <p className="text-[14px] leading-7 text-[#5B21B6]">
                Lexora Prep is a supplemental legal education platform. We cannot provide legal advice, bar admission advice, or guaranteed exam results.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  )
}
