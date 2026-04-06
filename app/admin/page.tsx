import { prisma } from "@/lib/prisma"
import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"

function startOfToday() {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return now
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value)
}

function safeName(fullName: string | null, email: string) {
  if (fullName && fullName.trim()) return fullName
  return email.split("@")[0]
}

export default async function AdminDashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const todayStart = startOfToday()

  const [
    currentProfile,
    totalUsers,
    paidSubscribers,
    trialUsers,
    blockedUsers,
    recentSignups,
    mbeAttemptsToday,
    ruleAttemptsToday,
    activeTodayRows,
  ] = await Promise.all([
    prisma.profiles.findUnique({
      where: { id: user.id },
      select: {
        is_admin: true,
        role: true,
        admin_role: true,
        is_blocked: true,
        can_view_billing: true,
      },
    }),

    prisma.profiles.count({
      where: {
        deleted_at: null,
      },
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

    prisma.profiles.findMany({
      where: {
        deleted_at: null,
      },
      orderBy: {
        created_at: "desc",
      },
      take: 5,
      select: {
        id: true,
        full_name: true,
        email: true,
        subscription_tier: true,
        exam_month: true,
        exam_year: true,
        is_blocked: true,
        created_at: true,
      },
    }),

    prisma.user_mbe_attempts.count({
      where: {
        created_at: {
          gte: todayStart,
        },
      },
    }),

    prisma.user_rule_attempts.count({
      where: {
        created_at: {
          gte: todayStart,
        },
      },
    }),

    prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*)::int AS count
      FROM (
        SELECT DISTINCT user_id
        FROM public."user_mbe_attempts"
        WHERE created_at >= ${todayStart}

        UNION

        SELECT DISTINCT user_id
        FROM public."user_rule_attempts"
        WHERE created_at >= ${todayStart}
      ) AS active_users
    `,
  ])

  if (
    !currentProfile ||
    currentProfile.is_blocked ||
    (!currentProfile.is_admin && currentProfile.role !== "admin")
  ) {
    redirect("/dashboard")
  }

  const isSuperAdmin = currentProfile.admin_role === "super_admin"

  const attemptsToday = mbeAttemptsToday + ruleAttemptsToday
  const activeToday = Number(activeTodayRows?.[0]?.count ?? 0)
  const realMRR = 0

  const metrics = [
    {
      label: "Total Users",
      value: totalUsers.toLocaleString(),
      delta: `${trialUsers} trial`,
      tone: "text-[#2A6041]",
    },
    {
      label: "Paid Subscribers",
      value: paidSubscribers.toLocaleString(),
      delta: `${blockedUsers} blocked`,
      tone: "text-[#2A6041]",
    },
    {
      label: "Active Today",
      value: activeToday.toLocaleString(),
      delta: "unique active users",
      tone: "text-[#2A6041]",
    },
    {
      label: "Attempts Today",
      value: attemptsToday.toLocaleString(),
      delta: `${mbeAttemptsToday.toLocaleString()} MBE · ${ruleAttemptsToday.toLocaleString()} BLL`,
      tone: "text-[#7B7B7B]",
    },
    ...(isSuperAdmin
      ? [
          {
            label: "MRR",
            value: formatCurrency(realMRR),
            delta: "billing not connected",
            tone: "text-[#7B7B7B]",
          },
        ]
      : []),
  ]

  const snapshotItems = [
    {
      label: "Paid subscribers",
      value: paidSubscribers.toLocaleString(),
      status: "Live",
    },
    {
      label: "Trial users",
      value: trialUsers.toLocaleString(),
      status: "Live",
    },
    {
      label: "Blocked users",
      value: blockedUsers.toLocaleString(),
      status: "Live",
    },
    {
      label: "MBE attempts today",
      value: mbeAttemptsToday.toLocaleString(),
      status: "Live",
    },
    {
      label: "BLL attempts today",
      value: ruleAttemptsToday.toLocaleString(),
      status: "Live",
    },
    ...(isSuperAdmin
      ? [
          {
            label: "Revenue",
            value: "$0",
            status: "Not connected",
          },
        ]
      : []),
  ]

  return (
    <div className="space-y-4">
      <div className={`grid gap-2 md:grid-cols-2 ${isSuperAdmin ? "xl:grid-cols-5" : "xl:grid-cols-4"}`}>
        {metrics.map((item) => (
          <div
            key={item.label}
            className="rounded-md border border-[#E4E0D8] bg-white px-3 py-3"
          >
            <div className="font-mono text-[9px] uppercase tracking-[0.08em] text-[#9B9B9B]">
              {item.label}
            </div>

            <div className="mt-2 font-serif text-[24px] leading-none text-[#0F0F0F]">
              {item.value}
            </div>

            <div className={`mt-1 font-mono text-[10px] ${item.tone}`}>
              {item.delta}
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-3 xl:grid-cols-[2fr_1fr]">
        <section className="overflow-hidden rounded-md border border-[#E4E0D8] bg-white">
          <div className="flex items-center justify-between border-b border-[#EDE9E1] px-4 py-3">
            <div className="text-[11px] font-medium text-[#0F0F0F]">
              Recent Signups
            </div>
            <div className="font-mono text-[10px] text-[#9B9B9B]">
              Last 5 users
            </div>
          </div>

          {recentSignups.length === 0 ? (
            <div className="p-4 text-[12px] text-[#6B6B6B]">
              No users yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="border-b border-[#EDE9E1] bg-[#FBF8F2]">
                  <tr className="font-mono text-[9px] uppercase tracking-[0.08em] text-[#9B9B9B]">
                    <th className="px-4 py-2.5 font-medium">User</th>
                    <th className="px-4 py-2.5 font-medium">Plan</th>
                    <th className="px-4 py-2.5 font-medium">Exam</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                    <th className="px-4 py-2.5 font-medium">Created</th>
                  </tr>
                </thead>

                <tbody>
                  {recentSignups.map((user) => {
                    const initials = safeName(user.full_name, user.email)
                      .split(" ")
                      .map((p) => p[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()

                    const plan =
                      user.subscription_tier && user.subscription_tier.trim()
                        ? user.subscription_tier
                        : "free"

                    const examDate =
                      user.exam_month && user.exam_year
                        ? `${user.exam_month}/${user.exam_year}`
                        : "—"

                    return (
                      <tr
                        key={user.id}
                        className="border-b border-[#EDE9E1] text-[12px] text-[#3A3A3A]"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#EEF2F7] font-mono text-[10px] font-semibold text-[#3A3A3A]">
                              {initials || "U"}
                            </div>

                            <div>
                              <div className="font-medium text-[#0F0F0F]">
                                {safeName(user.full_name, user.email)}
                              </div>
                              <div className="text-[11px] text-[#9B9B9B]">
                                {user.email}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <span className="rounded bg-[#EEF2F7] px-2 py-0.5 text-[11px] capitalize text-[#4B5D7A]">
                            {plan}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-[11px]">{examDate}</td>

                        <td className="px-4 py-3">
                          {user.is_blocked ? (
                            <span className="rounded bg-[#FDECEC] px-2 py-0.5 text-[11px] text-[#B44C4C]">
                              Blocked
                            </span>
                          ) : (
                            <span className="rounded bg-[#EDF7EE] px-2 py-0.5 text-[11px] text-[#2A6041]">
                              Active
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3 text-[11px] text-[#9B9B9B]">
                          {new Date(user.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-md border border-[#E4E0D8] bg-white">
          <div className="flex items-center justify-between border-b border-[#EDE9E1] px-4 py-3">
            <div className="text-[11px] font-medium text-[#0F0F0F]">
              Live Snapshot
            </div>
            <div className="font-mono text-[10px] text-[#9B9B9B]">
              Real DB
            </div>
          </div>

          <div className="divide-y divide-[#EDE9E1]">
            {snapshotItems.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between px-4 py-3"
              >
                <div className="text-[12px] font-medium text-[#0F0F0F]">
                  {item.label}
                </div>

                <div className="text-right">
                  <div className="text-[12px] font-medium text-[#0F0F0F]">
                    {item.value}
                  </div>
                  <div className="font-mono text-[9px] text-[#9B9B9B]">
                    {item.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}