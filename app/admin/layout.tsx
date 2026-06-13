import { prisma } from "@/lib/prisma"
import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import AdminShell from "./_components/AdminShell"

type CachedAdminProfile = {
  id: string
  email: string | null
  full_name: string | null
  role: string | null
  admin_role: string | null
  is_admin: boolean | null
  is_blocked: boolean | null
  can_manage_questions: boolean | null
  can_manage_rules: boolean | null
  can_manage_users: boolean | null
  can_manage_announcements: boolean | null
  can_view_billing: boolean | null
  can_manage_coupons: boolean | null
  can_manage_settings: boolean | null
  can_view_audit_log: boolean | null
}

type AdminCountsCache = {
  expiresAt: number
  totalUsers: number
  paidSubscribers: number
}

const ADMIN_LAYOUT_PROFILE_CACHE_MS = 15_000
const ADMIN_LAYOUT_COUNTS_CACHE_MS = 60_000

const adminLayoutProfileCache = new Map<
  string,
  {
    expiresAt: number
    profile: CachedAdminProfile | null
  }
>()

let adminLayoutCountsCache: AdminCountsCache | null = null

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const startedAt = Date.now()

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()


  if (!user) {
    redirect("/login")
  }

  const cachedProfile = adminLayoutProfileCache.get(user.id)
  let profile: CachedAdminProfile | null = null

  if (cachedProfile && cachedProfile.expiresAt > Date.now()) {
    profile = cachedProfile.profile
  } else {
    profile = await prisma.profiles.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        full_name: true,
        role: true,
        admin_role: true,
        is_admin: true,
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
    })

    adminLayoutProfileCache.set(user.id, {
      expiresAt: Date.now() + ADMIN_LAYOUT_PROFILE_CACHE_MS,
      profile,
    })

  }

  if (
    !profile ||
    profile.is_blocked ||
    (!profile.is_admin && profile.role !== "admin")
  ) {
    redirect("/dashboard")
  }

  const isSuperAdmin = profile.admin_role === "super_admin"

  // Do not block every admin page render with global user/subscriber counts.
  // Pages that need exact user metrics should fetch them inside that page.
  const totalUsers = adminLayoutCountsCache?.totalUsers ?? 0
  const paidSubscribers = adminLayoutCountsCache?.paidSubscribers ?? 0



  return (
    <AdminShell
      currentUser={{
        id: profile.id,
        email: profile.email ?? "",
        fullName: profile.full_name,
        role: profile.role,
        adminRole: profile.admin_role,
        isSuperAdmin,
        permissions: {
          canManageQuestions: isSuperAdmin || !!profile.can_manage_questions,
          canManageRules: isSuperAdmin || !!profile.can_manage_rules,
          canManageUsers: isSuperAdmin || !!profile.can_manage_users,
          canManageAnnouncements: isSuperAdmin || !!profile.can_manage_announcements,
          canViewBilling: isSuperAdmin || !!profile.can_view_billing,
          canManageCoupons: isSuperAdmin || !!profile.can_manage_coupons,
          canManageSettings: isSuperAdmin || !!profile.can_manage_settings,
          canViewAuditLog: isSuperAdmin || !!profile.can_view_audit_log,
        },
      }}
      counts={{
        totalUsers,
        paidSubscribers,
      }}
    >
      {children}
    </AdminShell>
  )
}
