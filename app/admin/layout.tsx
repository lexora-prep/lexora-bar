import { prisma } from "@/lib/prisma"
import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import AdminShell from "./_components/AdminShell"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
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

  if (
    !profile ||
    profile.is_blocked ||
    (!profile.is_admin && profile.role !== "admin")
  ) {
    redirect("/dashboard")
  }

  const isSuperAdmin = profile.admin_role === "super_admin"

  const counts = await Promise.allSettled([
    prisma.profiles.count({ where: { deleted_at: null } }),
    prisma.profiles.count({
      where: {
        deleted_at: null,
        is_blocked: false,
        subscription_tier: {
          in: ["pro", "monthly", "annual", "pro_monthly", "pro_annual", "premium"],
        },
      },
    }),
  ])

  const totalUsers = counts[0].status === "fulfilled" ? counts[0].value : 0
  const paidSubscribers = counts[1].status === "fulfilled" ? counts[1].value : 0

  return (
    <AdminShell
      currentUser={{
        id: profile.id,
        email: profile.email,
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