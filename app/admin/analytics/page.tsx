export default function AdminAnalyticsPage() {
  return (
    <div className="px-6 py-6">
      <div className="mx-auto max-w-[1400px] space-y-4">
        <div className="border border-[#DDD7CC] bg-white px-5 py-4">
          <div className="text-[28px] font-semibold text-[#111827]">Analytics</div>
          <div className="mt-1 text-[14px] text-[#6B7280]">
            Platform analytics and performance overview.
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="border border-[#DDD7CC] bg-white px-5 py-4">
            <div className="text-[11px] uppercase tracking-[0.12em] text-[#8E96A3]">
              User growth
            </div>
            <div className="mt-3 text-[24px] font-semibold text-[#111827]">Coming soon</div>
          </div>

          <div className="border border-[#DDD7CC] bg-white px-5 py-4">
            <div className="text-[11px] uppercase tracking-[0.12em] text-[#8E96A3]">
              Attempt trends
            </div>
            <div className="mt-3 text-[24px] font-semibold text-[#111827]">Coming soon</div>
          </div>

          <div className="border border-[#DDD7CC] bg-white px-5 py-4">
            <div className="text-[11px] uppercase tracking-[0.12em] text-[#8E96A3]">
              Retention
            </div>
            <div className="mt-3 text-[24px] font-semibold text-[#111827]">Coming soon</div>
          </div>
        </div>
      </div>
    </div>
  )
}