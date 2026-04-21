import { prisma } from "@/lib/prisma"
import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

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

type FeatureFlagRow = {
  key: string
  value: boolean
  description: string | null
}

async function ensureAdminAccess(userId: string) {
  const profile = await prisma.profiles.findUnique({
    where: { id: userId },
    select: {
      is_admin: true,
      role: true,
      admin_role: true,
      is_blocked: true,
      can_manage_settings: true,
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

  return {
    profile,
    isSuperAdmin: profile.admin_role === "super_admin",
    canManageSettings:
      profile.admin_role === "super_admin" || !!profile.can_manage_settings,
  }
}

async function getFeatureFlags() {
  const rows = await prisma.$queryRaw<FeatureFlagRow[]>`
    SELECT key, value, description
    FROM public.feature_flags
    WHERE key IN ('mbe_premium_enabled', 'mbe_public_visible')
    ORDER BY key
  `

  const map = new Map(rows.map((row) => [row.key, row]))

  return {
    mbePremiumEnabled: map.get("mbe_premium_enabled")?.value ?? false,
    mbePublicVisible: map.get("mbe_public_visible")?.value ?? false,
  }
}

export default async function AdminDashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const updateFeatureFlag = async (formData: FormData) => {
    "use server"

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      redirect("/login")
    }

    const { canManageSettings } = await ensureAdminAccess(user.id)

    if (!canManageSettings) {
      redirect("/admin")
    }

    const key = String(formData.get("key") || "")
    const nextValue = String(formData.get("value") || "") === "true"

    const allowedKeys = ["mbe_premium_enabled", "mbe_public_visible"] as const

    if (!allowedKeys.includes(key as (typeof allowedKeys)[number])) {
      redirect("/admin")
    }

    const descriptions: Record<string, string> = {
      mbe_premium_enabled:
        "Controls whether MBE premium features are enabled",
      mbe_public_visible:
        "Controls whether MBE premium offering is publicly visible",
    }

    await prisma.$executeRaw`
      INSERT INTO public.feature_flags ("key", "value", "description", "created_at", "updated_at")
      VALUES (${key}, ${nextValue}, ${descriptions[key]}, NOW(), NOW())
      ON CONFLICT ("key")
      DO UPDATE SET
        "value" = EXCLUDED."value",
        "description" = EXCLUDED."description",
        "updated_at" = NOW()
    `

    revalidatePath("/admin")
    revalidatePath("/subscription")
    revalidatePath("/")
  }

  const todayStart = startOfToday()

  const [
    access,
    flags,
    totalUsers,
    paidSubscribers,
    trialUsers,
    blockedUsers,
    recentSignups,
    mbeAttemptsToday,
    ruleAttemptsToday,
    activeTodayRows,
  ] = await Promise.all([
    ensureAdminAccess(user.id),
    getFeatureFlags(),

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

  const { isSuperAdmin, canManageSettings } = access

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
      status: flags.mbePremiumEnabled ? "Enabled" : "Disabled",
    },
    {
      label: "BLL attempts today",
      value: ruleAttemptsToday.toLocaleString(),
      status: "Live",
    },
    {
      label: "MBE public visibility",
      value: flags.mbePublicVisible ? "Visible" : "Hidden",
      status: "Feature flag",
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

      {canManageSettings ? (
        <section className="overflow-hidden rounded-md border border-[#E4E0D8] bg-white">
          <div className="flex items-center justify-between border-b border-[#EDE9E1] px-4 py-3">
            <div className="text-[11px] font-medium text-[#0F0F0F]">
              Feature Flags
            </div>
            <div className="font-mono text-[10px] text-[#9B9B9B]">
              Admin control
            </div>
          </div>

          <div className="grid gap-3 p-4 md:grid-cols-2">
            <div className="rounded-md border border-[#EDE9E1] bg-[#FCFBF8] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[14px] font-medium text-[#111827]">
                    MBE Premium Enabled
                  </div>
                  <div className="mt-1 text-[12px] text-[#6B7280]">
                    Controls MBE access inside the platform.
                  </div>
                </div>

                <span
                  className={`rounded px-2 py-1 text-[11px] ${
                    flags.mbePremiumEnabled
                      ? "bg-[#EDF7EE] text-[#2A6041]"
                      : "bg-[#FDECEC] text-[#B44C4C]"
                  }`}
                >
                  {flags.mbePremiumEnabled ? "ON" : "OFF"}
                </span>
              </div>

              <div className="mt-4">
                <form action={updateFeatureFlag}>
                  <input type="hidden" name="key" value="mbe_premium_enabled" />
                  <input
                    type="hidden"
                    name="value"
                    value={String(!flags.mbePremiumEnabled)}
                  />
                  <button
                    type="submit"
                    className={`rounded px-3 py-2 text-[12px] font-medium ${
                      flags.mbePremiumEnabled
                        ? "bg-[#111827] text-white"
                        : "bg-[#2563EB] text-white"
                    }`}
                  >
                    {flags.mbePremiumEnabled ? "Turn OFF" : "Turn ON"}
                  </button>
                </form>
              </div>
            </div>

            <div className="rounded-md border border-[#EDE9E1] bg-[#FCFBF8] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[14px] font-medium text-[#111827]">
                    MBE Public Visibility
                  </div>
                  <div className="mt-1 text-[12px] text-[#6B7280]">
                    Controls whether Premium MBE is shown publicly or as Coming Soon.
                  </div>
                </div>

                <span
                  className={`rounded px-2 py-1 text-[11px] ${
                    flags.mbePublicVisible
                      ? "bg-[#EDF7EE] text-[#2A6041]"
                      : "bg-[#FFF4D6] text-[#9A6A00]"
                  }`}
                >
                  {flags.mbePublicVisible ? "VISIBLE" : "COMING SOON"}
                </span>
              </div>

              <div className="mt-4">
                <form action={updateFeatureFlag}>
                  <input type="hidden" name="key" value="mbe_public_visible" />
                  <input
                    type="hidden"
                    name="value"
                    value={String(!flags.mbePublicVisible)}
                  />
                  <button
                    type="submit"
                    className={`rounded px-3 py-2 text-[12px] font-medium ${
                      flags.mbePublicVisible
                        ? "bg-[#111827] text-white"
                        : "bg-[#2563EB] text-white"
                    }`}
                  >
                    {flags.mbePublicVisible ? "Hide Premium" : "Show Premium"}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </section>
      ) : null}

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