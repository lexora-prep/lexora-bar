import { prisma } from "@/lib/prisma"
import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value)
}

export default async function AdminBillingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const profile = await prisma.profiles.findUnique({
    where: { id: user.id },
    select: {
      is_admin: true,
      role: true,
      admin_role: true,
      is_blocked: true,
      can_view_billing: true,
    },
  })

  if (
    !profile ||
    profile.is_blocked ||
    (!profile.is_admin && profile.role !== "admin")
  ) {
    redirect("/dashboard")
  }

  const isSuperAdmin = profile.admin_role === "super_admin"
  const canViewBilling = isSuperAdmin || !!profile.can_view_billing

  if (!canViewBilling) {
    redirect("/admin")
  }

  const [
    totalUsers,
    paidSubscribers,
    trialUsers,
    blockedUsers,
    freeUsers,
  ] = await Promise.all([
    prisma.profiles.count({
      where: { deleted_at: null },
    }),

    prisma.profiles.count({
      where: {
        deleted_at: null,
        is_blocked: false,
        subscription_tier: {
          in: ["pro", "monthly", "annual", "pro_monthly", "pro_annual", "premium"],
        },
      },
    }),

    prisma.profiles.count({
      where: {
        deleted_at: null,
        is_blocked: false,
        subscription_tier: "trial",
      },
    }),

    prisma.profiles.count({
      where: {
        deleted_at: null,
        is_blocked: true,
      },
    }),

    prisma.profiles.count({
      where: {
        deleted_at: null,
        is_blocked: false,
        OR: [
          { subscription_tier: null },
          { subscription_tier: "" },
          { subscription_tier: "free" },
        ],
      },
    }),
  ])

  const pausedCount = 0
  const canceledCount = 0
  const refundedCount = 0
  const paymentErrorCount = 0
  const mrr = 0

  const statusRows = [
    {
      label: "Paid",
      count: paidSubscribers,
      note: "Active paid subscriptions",
      tone: "text-[#2A6041] bg-[#EDF7EE]",
    },
    {
      label: "Trial",
      count: trialUsers,
      note: "Trial access users",
      tone: "text-[#9A6A00] bg-[#FFF4D6]",
    },
    {
      label: "Free",
      count: freeUsers,
      note: "No paid plan",
      tone: "text-[#4B5D7A] bg-[#EEF2F7]",
    },
    {
      label: "Blocked",
      count: blockedUsers,
      note: "Blocked accounts",
      tone: "text-[#B44C4C] bg-[#FDECEC]",
    },
    {
      label: "Paused",
      count: pausedCount,
      note: "Subscription paused",
      tone: "text-[#7A5B2E] bg-[#F8F1E5]",
    },
    {
      label: "Canceled",
      count: canceledCount,
      note: "Canceled by user",
      tone: "text-[#6B7280] bg-[#F3F4F6]",
    },
    {
      label: "Refunded",
      count: refundedCount,
      note: "Returned payment",
      tone: "text-[#7C3AED] bg-[#F5F3FF]",
    },
    {
      label: "Errors",
      count: paymentErrorCount,
      note: "Processor or charge failure",
      tone: "text-[#B44C4C] bg-[#FDECEC]",
    },
  ]

  return (
    <div className="min-w-0">
      <section className="border-b border-[#DDD7CC] bg-white px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-semibold text-[#111827]">Billing</h1>
            <p className="mt-1 text-[14px] text-[#6B7280]">
              Subscription status, payment health, and billing operations.
            </p>
          </div>

          <div className="text-right">
            <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-[#9B9B9B]">
              Access
            </div>
            <div className="mt-1 text-[13px] font-medium text-[#111827]">
              {isSuperAdmin ? "Super admin financial view" : "Operational billing only"}
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-[#E6E0D4] bg-[#FCFBF8] px-6 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded bg-[#EEF2F7] px-2.5 py-1 text-[11px] text-[#4B5D7A]">
            Total users {totalUsers}
          </span>
          <span className="rounded bg-[#EDF7EE] px-2.5 py-1 text-[11px] text-[#2A6041]">
            Paid {paidSubscribers}
          </span>
          <span className="rounded bg-[#FFF4D6] px-2.5 py-1 text-[11px] text-[#9A6A00]">
            Trial {trialUsers}
          </span>
          <span className="rounded bg-[#FDECEC] px-2.5 py-1 text-[11px] text-[#B44C4C]">
            Blocked {blockedUsers}
          </span>
          {!isSuperAdmin ? (
            <span className="rounded bg-[#F3F4F6] px-2.5 py-1 text-[11px] text-[#6B7280]">
              Revenue hidden
            </span>
          ) : null}
        </div>
      </section>

      {isSuperAdmin ? (
        <section className="border-b border-[#E6E0D4] bg-white">
          <div className="grid grid-cols-1 md:grid-cols-3">
            <div className="border-r border-[#E6E0D4] px-6 py-5">
              <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-[#9B9B9B]">
                MRR
              </div>
              <div className="mt-2 text-[34px] font-semibold text-[#111827]">
                {formatCurrency(mrr)}
              </div>
              <div className="mt-1 text-[12px] text-[#6B7280]">
                Visible only to super admin
              </div>
            </div>

            <div className="border-r border-[#E6E0D4] px-6 py-5">
              <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-[#9B9B9B]">
                Revenue Visibility
              </div>
              <div className="mt-2 text-[20px] font-semibold text-[#111827]">
                Locked
              </div>
              <div className="mt-1 text-[12px] text-[#6B7280]">
                Other admins never see earnings
              </div>
            </div>

            <div className="px-6 py-5">
              <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-[#9B9B9B]">
                Payment Events
              </div>
              <div className="mt-2 text-[20px] font-semibold text-[#111827]">
                Refunds {refundedCount} · Canceled {canceledCount}
              </div>
              <div className="mt-1 text-[12px] text-[#6B7280]">
                Wire provider events later
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="bg-white">
        <div className="border-b border-[#E6E0D4] px-6 py-4">
          <div className="text-[16px] font-medium text-[#111827]">Billing Status Overview</div>
          <div className="mt-1 text-[12px] text-[#6B7280]">
            Operational billing data for authorized admins.
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="border-b border-[#E6E0D4] bg-[#FBF8F2]">
              <tr className="font-mono text-[10px] uppercase tracking-[0.08em] text-[#9B9B9B]">
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Count</th>
                <th className="px-6 py-3 font-medium">Meaning</th>
              </tr>
            </thead>
            <tbody>
              {statusRows.map((row) => (
                <tr key={row.label} className="border-b border-[#EEE8DD] text-[14px] text-[#3A3A3A]">
                  <td className="px-6 py-4">
                    <span className={`inline-flex rounded px-2 py-1 text-[12px] ${row.tone}`}>
                      {row.label}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-medium text-[#111827]">{row.count}</td>
                  <td className="px-6 py-4 text-[#6B7280]">{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="border-t border-[#E6E0D4] bg-[#FCFBF8] px-6 py-3">
        <div className="text-[12px] text-[#6B7280]">
          {isSuperAdmin
            ? "Super admin sees both operational billing data and platform earnings."
            : "Revenue, MRR, and total money earned are hidden from non-super-admin users."}
        </div>
      </section>
    </div>
  )
}