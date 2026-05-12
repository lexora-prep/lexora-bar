import {
  BarChart3,
  CreditCard,
  FileCheck2,
  LayoutDashboard,
  Settings,
  Shield,
  Users,
  UserCog,
  Waypoints,
} from "lucide-react"

export type AdminPermissionKey =
  | "can_manage_questions"
  | "can_manage_rules"
  | "can_manage_users"
  | "can_manage_announcements"
  | "can_view_billing"
  | "can_manage_coupons"
  | "can_manage_settings"
  | "can_view_audit_log"

export type AdminNavItem = {
  label: string
  href: string
  icon: any
  permission?: AdminPermissionKey
  badgeKey?: "questions" | "rules" | "users" | "subscribers"
}

export const adminNavGroups: {
  label: string
  items: AdminNavItem[]
}[] = [
  {
    label: "Overview",
    items: [
      {
        label: "Dashboard",
        href: "/admin",
        icon: LayoutDashboard,
      },
      {
        label: "Analytics",
        href: "/admin/analytics",
        icon: BarChart3,
      },
      {
        label: "Billing",
        href: "/admin/subscriptions",
        icon: CreditCard,
        permission: "can_view_billing",
        badgeKey: "subscribers",
      },
    ],
  },
  {
    label: "Management",
    items: [
      {
        label: "Users",
        href: "/admin/users",
        icon: Users,
        permission: "can_manage_users",
        badgeKey: "users",
      },
      {
        label: "Teams",
        href: "/admin/team",
        icon: UserCog,
        permission: "can_manage_users",
      },
      {
        label: "Workspace",
        href: "/admin/workspace",
        icon: Waypoints,
      },
    ],
  },
  {
    label: "System",
    items: [
      {
        label: "Legal Acceptances",
        href: "/admin/legal-acceptances",
        icon: FileCheck2,
        permission: "can_view_audit_log",
      },
      {
        label: "Settings",
        href: "/admin/settings",
        icon: Settings,
        permission: "can_manage_settings",
      },
      {
        label: "Logs",
        href: "/admin/audit-log",
        icon: Shield,
        permission: "can_view_audit_log",
      },
    ],
  },
]

export const adminPageMeta: Record<
  string,
  {
    title: string
    subtitle: string
    primaryAction?: string
    secondaryAction?: string
  }
> = {
  "/admin": {
    title: "Dashboard",
    subtitle: "Admin overview and operational summary.",
  },
  "/admin/analytics": {
    title: "Analytics",
    subtitle: "Performance, usage, and operational metrics.",
  },
  "/admin/subscriptions": {
    title: "Billing",
    subtitle: "Revenue, subscribers, plans, and subscription controls.",
  },
  "/admin/users": {
    title: "Users",
    subtitle: "Manage users, roles, access, and account actions.",
    primaryAction: "Add User",
  },
  "/admin/team": {
    title: "Teams",
    subtitle: "Manage internal teams, roles, and access structure.",
    primaryAction: "Add Team",
  },
  "/admin/workspace": {
    title: "Workspace",
    subtitle: "Channels, shared notes, and direct communication.",
    primaryAction: "New Channel",
    secondaryAction: "Members",
  },
  "/admin/legal-acceptances": {
    title: "Legal Acceptances",
    subtitle:
      "Review user consent records, policy versions, IP address, user agent, and acceptance timestamps.",
  },
  "/admin/settings": {
    title: "Settings",
    subtitle: "System-wide admin settings and controls.",
  },
  "/admin/audit-log": {
    title: "Logs",
    subtitle: "Track actions, events, and administrative history.",
  },
}