import { prisma } from "@/lib/prisma"

function safeName(fullName: string | null, email: string) {
  if (fullName && fullName.trim()) return fullName
  return email.split("@")[0]
}

export default async function AdminSubscriptionsPage() {
  const rows = await prisma.profiles.findMany({
    where: { deleted_at: null },
    orderBy: { created_at: "desc" },
    take: 50,
    select: {
      id: true,
      full_name: true,
      email: true,
      subscription_tier: true,
      is_blocked: true,
      created_at: true,
    },
  })

  return (
    <div className="px-6 py-6">
      <div className="mx-auto max-w-[1400px] space-y-4">
        <div className="border border-[#DDD7CC] bg-white px-5 py-4">
          <div className="text-[28px] font-semibold text-[#111827]">Subscriptions</div>
          <div className="mt-1 text-[14px] text-[#6B7280]">
            Subscription visibility and payment-state monitoring.
          </div>
        </div>

        <div className="overflow-hidden border border-[#DDD7CC] bg-white">
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr] border-b border-[#E8E1D6] bg-[#FBF8F2] px-5 py-3 text-[11px] uppercase tracking-[0.12em] text-[#8E96A3]">
            <div>User</div>
            <div>Plan</div>
            <div>Status</div>
            <div>Created</div>
          </div>

          {rows.map((row) => (
            <div
              key={row.id}
              className="grid grid-cols-[2fr_1fr_1fr_1fr] items-center border-b border-[#E8E1D6] px-5 py-4 text-[14px] last:border-b-0"
            >
              <div>
                <div className="font-medium text-[#111827]">{safeName(row.full_name, row.email)}</div>
                <div className="text-[12px] text-[#6B7280]">{row.email}</div>
              </div>
              <div className="capitalize text-[#374151]">{row.subscription_tier || "free"}</div>
              <div>
                {row.is_blocked ? (
                  <span className="bg-[#FDECEC] px-2 py-1 text-[11px] text-[#B44C4C]">Blocked</span>
                ) : (
                  <span className="bg-[#EDF7EE] px-2 py-1 text-[11px] text-[#2A6041]">Active</span>
                )}
              </div>
              <div className="text-[12px] text-[#6B7280]">
                {new Date(row.created_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}