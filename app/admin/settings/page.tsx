import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/utils/supabase/server"

function safeName(fullName: string | null, email: string) {
  if (fullName && fullName.trim()) return fullName
  return email.split("@")[0]
}

type TeamMemberRow = {
  id: string
  full_name: string | null
  email: string
  admin_role: string | null
  role: string
  is_blocked: boolean
  can_manage_questions: boolean
  can_manage_rules: boolean
  can_manage_users: boolean
  can_manage_announcements: boolean
  can_view_billing: boolean
  can_manage_coupons: boolean
  can_manage_settings: boolean
  can_view_audit_log: boolean
}

type FeatureFlagRow = {
  key: string
  value: unknown
  description: string | null
  created_at: Date | string | null
  updated_at: Date | string | null
}

function permissionCount(member: TeamMemberRow) {
  return [
    member.can_manage_questions,
    member.can_manage_rules,
    member.can_manage_users,
    member.can_manage_announcements,
    member.can_view_billing,
    member.can_manage_coupons,
    member.can_manage_settings,
    member.can_view_audit_log,
  ].filter(Boolean).length
}

function roleTone(role: string) {
  const normalized = role.toLowerCase()

  if (normalized === "super_admin") return "bg-[#F5F0FF] text-[#6A4BBC]"
  if (normalized === "admin") return "bg-[#EEF2F7] text-[#4B5D7A]"
  if (normalized === "editor") return "bg-[#EDF7EE] text-[#2A6041]"
  return "bg-[#F3F4F6] text-[#6B7280]"
}

function parseBooleanFlag(value: unknown) {
  if (typeof value === "boolean") return value

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase()
    return normalized === "true"
  }

  if (value && typeof value === "object") {
    const maybeRecord = value as Record<string, unknown>

    if (typeof maybeRecord.value === "boolean") {
      return maybeRecord.value
    }

    if (typeof maybeRecord.enabled === "boolean") {
      return maybeRecord.enabled
    }
  }

  return false
}

const FEATURE_DEFINITIONS = {
  mbe_public_visible: {
    title: "MBE Premium Visibility",
    description:
      "Controls whether the Premium MBE offer is publicly visible on the landing page and subscription page.",
  },
  mbe_premium_enabled: {
    title: "MBE Premium Access",
    description:
      "Controls whether MBE premium features are actually enabled inside the platform.",
  },
} as const

type FeatureKey = keyof typeof FEATURE_DEFINITIONS

async function requireSettingsAccess() {
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
      id: true,
      is_admin: true,
      role: true,
      admin_role: true,
      is_blocked: true,
      can_manage_settings: true,
    },
  })

  const isSuperAdmin = profile?.admin_role === "super_admin"
  const canManageSettings = isSuperAdmin || !!profile?.can_manage_settings

  if (
    !profile ||
    profile.is_blocked ||
    (!profile.is_admin && profile.role !== "admin") ||
    !canManageSettings
  ) {
    redirect("/admin")
  }

  return {
    user,
    profile,
    isSuperAdmin,
    canManageSettings,
  }
}

async function upsertBooleanFeatureFlag(
  key: FeatureKey,
  value: boolean,
  description: string
) {
  const jsonValue = JSON.stringify(value)

  await prisma.$executeRaw(
    Prisma.sql`
      insert into public.feature_flags ("key", "value", "description", "created_at", "updated_at")
      values (${key}, CAST(${jsonValue} AS jsonb), ${description}, now(), now())
      on conflict ("key")
      do update set
        "value" = CAST(${jsonValue} AS jsonb),
        "description" = excluded."description",
        "updated_at" = now()
    `
  )
}

export default async function AdminSettingsPage() {
  await requireSettingsAccess()

  async function updateFeatureFlag(formData: FormData) {
    "use server"

    await requireSettingsAccess()

    const key = String(formData.get("key") || "") as FeatureKey
    const nextValueRaw = String(formData.get("nextValue") || "").trim().toLowerCase()

    if (!(key in FEATURE_DEFINITIONS)) {
      throw new Error("Invalid feature flag key.")
    }

    if (nextValueRaw !== "true" && nextValueRaw !== "false") {
      throw new Error("Invalid feature flag value.")
    }

    const nextValue = nextValueRaw === "true"

    await upsertBooleanFeatureFlag(
      key,
      nextValue,
      FEATURE_DEFINITIONS[key].description
    )

    revalidatePath("/admin/settings")
    revalidatePath("/")
    revalidatePath("/subscription")
    revalidatePath("/dashboard")
  }

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
      can_manage_settings: true,
    },
  })

  const isSuperAdmin = profile?.admin_role === "super_admin"
  const canManageSettings = isSuperAdmin || !!profile?.can_manage_settings

  if (
    !profile ||
    profile.is_blocked ||
    (!profile.is_admin && profile.role !== "admin") ||
    !canManageSettings
  ) {
    redirect("/admin")
  }

  const [teamMembers, rawFeatureFlags] = await Promise.all([
    prisma.profiles.findMany({
      where: {
        deleted_at: null,
        OR: [
          { is_admin: true },
          { role: "admin" },
          { admin_role: { not: null } },
        ],
      },
      orderBy: [{ admin_role: "asc" }, { created_at: "desc" }],
      take: 50,
      select: {
        id: true,
        full_name: true,
        email: true,
        admin_role: true,
        role: true,
        is_blocked: true,
        can_manage_questions: true,
        can_manage_rules: true,
        can_manage_users: true,
        can_manage_announcements: true,
        can_view_billing: true,
        can_manage_coupons: true,
        can_manage_settings: true,
        can_view_audit_log: true,
      },
    }),

    prisma.$queryRaw<FeatureFlagRow[]>(
      Prisma.sql`
        select "key", "value", "description", "created_at", "updated_at"
        from public.feature_flags
        where "key" in ('mbe_public_visible', 'mbe_premium_enabled')
        order by "key" asc
      `
    ),
  ])

  const flagMap = new Map(rawFeatureFlags.map((row) => [row.key, row]))

  const mbePublicVisible = parseBooleanFlag(
    flagMap.get("mbe_public_visible")?.value ?? false
  )

  const mbePremiumEnabled = parseBooleanFlag(
    flagMap.get("mbe_premium_enabled")?.value ?? false
  )

  const totalTeamMembers = teamMembers.length
  const blockedTeamMembers = teamMembers.filter((m) => m.is_blocked).length
  const editors = teamMembers.filter(
    (m) => (m.admin_role || "").toLowerCase() === "editor"
  ).length
  const admins = teamMembers.filter((m) =>
    ["admin", "super_admin"].includes((m.admin_role || "").toLowerCase())
  ).length

  const featureCards = [
    {
      key: "mbe_public_visible" as const,
      title: FEATURE_DEFINITIONS.mbe_public_visible.title,
      description: FEATURE_DEFINITIONS.mbe_public_visible.description,
      enabled: mbePublicVisible,
      liveEffect: "Landing page and subscription page",
    },
    {
      key: "mbe_premium_enabled" as const,
      title: FEATURE_DEFINITIONS.mbe_premium_enabled.title,
      description: FEATURE_DEFINITIONS.mbe_premium_enabled.description,
      enabled: mbePremiumEnabled,
      liveEffect: "Dashboard and in-app MBE premium access",
    },
  ]

  return (
    <div className="min-w-0">
      <section className="border-b border-[#DDD7CC] bg-white px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-semibold text-[#111827]">Settings</h1>
            <p className="mt-1 text-[14px] text-[#6B7280]">
              Admin access, feature controls, and platform configuration.
            </p>
          </div>

          <div className="text-right">
            <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-[#9B9B9B]">
              Access level
            </div>
            <div className="mt-1 text-[13px] font-medium text-[#111827]">
              {isSuperAdmin ? "Super Admin" : "Settings Permission"}
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-[#E6E0D4] bg-[#FCFBF8] px-6 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded bg-[#EEF2F7] px-2.5 py-1 text-[11px] text-[#4B5D7A]">
            Team {totalTeamMembers}
          </span>
          <span className="rounded bg-[#F5F0FF] px-2.5 py-1 text-[11px] text-[#6A4BBC]">
            Admins {admins}
          </span>
          <span className="rounded bg-[#EDF7EE] px-2.5 py-1 text-[11px] text-[#2A6041]">
            Editors {editors}
          </span>
          <span className="rounded bg-[#FDECEC] px-2.5 py-1 text-[11px] text-[#B44C4C]">
            Blocked {blockedTeamMembers}
          </span>
          <span
            className={`rounded px-2.5 py-1 text-[11px] ${
              mbePublicVisible
                ? "bg-[#EDF7EE] text-[#2A6041]"
                : "bg-[#FFF4D6] text-[#9A6A00]"
            }`}
          >
            Public MBE {mbePublicVisible ? "On" : "Off"}
          </span>
          <span
            className={`rounded px-2.5 py-1 text-[11px] ${
              mbePremiumEnabled
                ? "bg-[#EDF7EE] text-[#2A6041]"
                : "bg-[#FFF4D6] text-[#9A6A00]"
            }`}
          >
            Premium MBE {mbePremiumEnabled ? "On" : "Off"}
          </span>
        </div>
      </section>

      <section className="bg-white">
        <div className="border-b border-[#E6E0D4] px-6 py-4">
          <div className="text-[16px] font-medium text-[#111827]">Platform Controls</div>
          <div className="mt-1 text-[12px] text-[#6B6B6B]">
            These controls are live and write directly to the database.
          </div>
        </div>

        <div className="grid grid-cols-1 gap-0 lg:grid-cols-2">
          {featureCards.map((card) => (
            <div
              key={card.key}
              className="border-b border-[#EEE8DD] px-6 py-5 lg:border-r last:border-r-0"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[14px] font-medium text-[#111827]">
                    {card.title}
                  </div>
                  <div className="mt-2 text-[13px] leading-6 text-[#6B7280]">
                    {card.description}
                  </div>
                  <div className="mt-2 text-[12px] text-[#9B9B9B]">
                    Affects: {card.liveEffect}
                  </div>
                </div>

                <span
                  className={`inline-flex rounded px-2 py-1 text-[12px] ${
                    card.enabled
                      ? "bg-[#EDF7EE] text-[#2A6041]"
                      : "bg-[#FFF4D6] text-[#9A6A00]"
                  }`}
                >
                  {card.enabled ? "Enabled" : "Disabled"}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <form action={updateFeatureFlag}>
                  <input type="hidden" name="key" value={card.key} />
                  <input type="hidden" name="nextValue" value="true" />
                  <button
                    type="submit"
                    className="rounded border border-[#D6EAD8] bg-[#EDF7EE] px-3 py-2 text-[12px] font-medium text-[#2A6041] hover:bg-[#E4F3E6]"
                  >
                    Turn On
                  </button>
                </form>

                <form action={updateFeatureFlag}>
                  <input type="hidden" name="key" value={card.key} />
                  <input type="hidden" name="nextValue" value="false" />
                  <button
                    type="submit"
                    className="rounded border border-[#E5D7B2] bg-[#FFF4D6] px-3 py-2 text-[12px] font-medium text-[#9A6A00] hover:bg-[#FCECC2]"
                  >
                    Turn Off
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-[#E6E0D4] bg-white">
        <div className="border-b border-[#E6E0D4] px-6 py-4">
          <div className="flex flex-wrap items-center gap-3">
            <input
              readOnly
              value=""
              placeholder="Search admin member, role, permission..."
              className="w-full max-w-[420px] border border-[#DDD7CC] bg-white px-3 py-2 text-[13px] outline-none placeholder:text-[#9B9B9B]"
            />

            <button
              type="button"
              className="rounded bg-[#111111] px-3 py-2 text-[12px] font-medium text-white"
            >
              All
            </button>

            <button
              type="button"
              className="border border-[#DDD7CC] bg-white px-3 py-2 text-[12px] text-[#3A3A3A] hover:bg-[#F7F3EC]"
            >
              Super Admin
            </button>

            <button
              type="button"
              className="border border-[#DDD7CC] bg-white px-3 py-2 text-[12px] text-[#3A3A3A] hover:bg-[#F7F3EC]"
            >
              Admin
            </button>

            <button
              type="button"
              className="border border-[#DDD7CC] bg-white px-3 py-2 text-[12px] text-[#3A3A3A] hover:bg-[#F7F3EC]"
            >
              Editor
            </button>

            <button
              type="button"
              className="border border-[#DDD7CC] bg-white px-3 py-2 text-[12px] text-[#3A3A3A] hover:bg-[#F7F3EC]"
            >
              Blocked
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="border-b border-[#E6E0D4] bg-[#FBF8F2]">
              <tr className="font-mono text-[10px] uppercase tracking-[0.08em] text-[#9B9B9B]">
                <th className="px-6 py-3 font-medium">Member</th>
                <th className="px-6 py-3 font-medium">Role</th>
                <th className="px-6 py-3 font-medium">Permissions</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Access</th>
              </tr>
            </thead>

            <tbody>
              {teamMembers.map((member) => {
                const role = member.admin_role || member.role || "user"
                const perms = permissionCount(member)

                return (
                  <tr
                    key={member.id}
                    className="border-b border-[#EEE8DD] text-[14px] text-[#3A3A3A]"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#EEF2F7] text-[11px] font-semibold text-[#4B5D7A]">
                          {safeName(member.full_name, member.email)
                            .split(" ")
                            .map((p) => p[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>

                        <div className="min-w-0">
                          <div className="truncate font-medium text-[#111827]">
                            {safeName(member.full_name, member.email)}
                          </div>
                          <div className="truncate text-[12px] text-[#6B7280]">
                            {member.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded px-2 py-1 text-[12px] ${roleTone(role)}`}
                      >
                        {role}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-[#6B7280]">
                      {perms} enabled permissions
                    </td>

                    <td className="px-6 py-4">
                      {member.is_blocked ? (
                        <span className="inline-flex rounded bg-[#FDECEC] px-2 py-1 text-[12px] text-[#B44C4C]">
                          Blocked
                        </span>
                      ) : (
                        <span className="inline-flex rounded bg-[#EDF7EE] px-2 py-1 text-[12px] text-[#2A6041]">
                          Active
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="border border-[#DDD7CC] bg-white px-3 py-1.5 text-[12px] text-[#3A3A3A] hover:bg-[#F7F3EC]"
                        >
                          Edit Access
                        </button>
                        <button
                          type="button"
                          className="border border-[#DDD7CC] bg-white px-3 py-1.5 text-[12px] text-[#3A3A3A] hover:bg-[#F7F3EC]"
                        >
                          Move Team
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="border-t border-[#E6E0D4] bg-[#FCFBF8] px-6 py-3">
        <div className="text-[12px] text-[#6B7280]">
          Settings now includes live feature controls for MBE visibility and MBE premium access.
        </div>
      </section>
    </div>
  )
}