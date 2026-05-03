export default function ContactPage() {
  return (
    <main className="min-h-screen bg-[#F7F8FC] px-6 py-10 text-[#0E1B35]">
      <div className="mx-auto max-w-4xl">
        <a
          href="/"
          className="mb-8 inline-flex items-center rounded-full border border-[#D8E0EF] bg-white px-5 py-3 text-sm font-bold text-[#0E1B35] shadow-sm transition hover:border-[#7C3AED] hover:text-[#7C3AED]"
        >
          ← Back to Lexora Prep
        </a>

        <section className="rounded-[32px] border border-[#D8E0EF] bg-white p-8 shadow-[0_24px_80px_rgba(14,27,53,0.08)] md:p-12">
          <p className="mb-4 text-xs font-black uppercase tracking-[0.22em] text-[#7C3AED]">
            Contact
          </p>

          <h1 className="font-serif text-4xl font-semibold tracking-[-0.04em] text-[#0E1B35] md:text-6xl">
            Contact Lexora Prep
          </h1>

          <p className="mt-5 max-w-3xl text-base leading-8 text-[#475569] md:text-lg">
            For account questions, billing questions, refund requests, platform issues, or general support, contact Lexora Prep LLC.
          </p>

          <div className="mt-10 grid gap-5 md:grid-cols-2">
            <a
              href="mailto:support@lexoraprep.com?subject=Lexora%20Prep%20Support%20Request"
              className="rounded-[24px] border border-[#E2E8F0] bg-[#FBFCFF] p-6 transition hover:border-[#7C3AED]"
            >
              <h2 className="text-xl font-black text-[#0E1B35]">Email Support</h2>
              <p className="mt-3 text-[15px] leading-8 text-[#475569]">
                support@lexoraprep.com
              </p>
            </a>

            <div className="rounded-[24px] border border-[#E2E8F0] bg-[#FBFCFF] p-6">
              <h2 className="text-xl font-black text-[#0E1B35]">Social</h2>
              <div className="mt-4 flex flex-wrap gap-3">
                <a
                  href="https://www.instagram.com/LexoraPrep"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-[#D8E0EF] bg-white px-5 py-3 text-sm font-bold text-[#0E1B35] hover:border-[#7C3AED] hover:text-[#7C3AED]"
                >
                  Instagram
                </a>
                <a
                  href="https://www.tiktok.com/@LexoraPrep"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-[#D8E0EF] bg-white px-5 py-3 text-sm font-bold text-[#0E1B35] hover:border-[#7C3AED] hover:text-[#7C3AED]"
                >
                  TikTok
                </a>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
