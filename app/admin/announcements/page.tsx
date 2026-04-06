import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/utils/supabase/server"

export default async function AdminAnnouncementsPage() {
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
      can_manage_announcements: true,
    },
  })

  const canManageAnnouncements =
    profile?.admin_role === "super_admin" || !!profile?.can_manage_announcements

  if (
    !profile ||
    profile.is_blocked ||
    (!profile.is_admin && profile.role !== "admin") ||
    !canManageAnnouncements
  ) {
    redirect("/admin")
  }

  const rows = [
    {
      id: "ann-1",
      title: "July Bar Push",
      body:
        "The July bar exam is approaching. Make sure users review weak areas and complete their remaining black letter rules.",
      placement: "Announcement Bar",
      audience: "All Users",
      status: "Live",
      updated: "6h ago",
    },
    {
      id: "ann-2",
      title: "New Feature: Spaced Repetition Mode",
      body:
        "Spaced Repetition for Black Letter Rules is available. Users can enable it from study settings.",
      placement: "Banner",
      audience: "All Users",
      status: "Live",
      updated: "2d ago",
    },
    {
      id: "ann-3",
      title: "Trial Reminder",
      body:
        "Trial users will see a reminder before paywall when they approach their free access limit.",
      placement: "Notification Bell",
      audience: "Trial Users",
      status: "Draft",
      updated: "Today",
    },
    {
      id: "ann-4",
      title: "February Bar Results",
      body:
        "Congratulations message for users who completed the February cycle.",
      placement: "Banner",
      audience: "Archived",
      status: "Archived",
      updated: "Mar 2025",
    },
  ]

  return (
    <div className="min-w-0">
      <section className="border-b border-[#DDD7CC] bg-white px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-semibold text-[#111827]">Announcements</h1>
            <p className="mt-1 text-[14px] text-[#6B7280]">
              Platform-wide messages shown in banner, bell, or announcement bar.
            </p>
          </div>

          <button
            type="button"
            className="rounded bg-[#111111] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#222222]"
          >
            New Announcement
          </button>
        </div>
      </section>

      <section className="border-b border-[#E6E0D4] bg-[#FCFBF8] px-6 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded bg-[#EDF7EE] px-2.5 py-1 text-[11px] text-[#2A6041]">
            Live 2
          </span>
          <span className="rounded bg-[#EEF2F7] px-2.5 py-1 text-[11px] text-[#4B5D7A]">
            Draft 1
          </span>
          <span className="rounded bg-[#F3F4F6] px-2.5 py-1 text-[11px] text-[#6B7280]">
            Archived 1
          </span>
        </div>
      </section>

      <section className="bg-white">
        <div className="border-b border-[#E6E0D4] px-6 py-4">
          <div className="flex flex-wrap items-center gap-3">
            <input
              readOnly
              value=""
              placeholder="Search announcement, audience, placement..."
              className="w-full max-w-[420px] border border-[#DDD7CC] bg-white px-3 py-2 text-[13px] outline-none placeholder:text-[#9B9B9B]"
            />
            <button
              type="button"
              className="border border-[#DDD7CC] bg-white px-3 py-2 text-[13px] text-[#3A3A3A] hover:bg-[#F7F3EC]"
            >
              All
            </button>
            <button
              type="button"
              className="border border-[#DDD7CC] bg-white px-3 py-2 text-[13px] text-[#3A3A3A] hover:bg-[#F7F3EC]"
            >
              Live
            </button>
            <button
              type="button"
              className="border border-[#DDD7CC] bg-white px-3 py-2 text-[13px] text-[#3A3A3A] hover:bg-[#F7F3EC]"
            >
              Draft
            </button>
            <button
              type="button"
              className="border border-[#DDD7CC] bg-white px-3 py-2 text-[13px] text-[#3A3A3A] hover:bg-[#F7F3EC]"
            >
              Archived
            </button>
          </div>
        </div>

        <div>
          {rows.map((row) => (
            <div key={row.id} className="border-b border-[#EEE8DD] px-6 py-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded px-2 py-1 text-[11px] ${
                        row.status === "Live"
                          ? "bg-[#EDF7EE] text-[#2A6041]"
                          : row.status === "Draft"
                          ? "bg-[#EEF2F7] text-[#4B5D7A]"
                          : "bg-[#F3F4F6] text-[#6B7280]"
                      }`}
                    >
                      {row.status}
                    </span>

                    <h2 className="text-[18px] font-medium text-[#111827]">{row.title}</h2>
                  </div>

                  <p className="mt-3 max-w-[960px] text-[14px] leading-7 text-[#3A3A3A]">
                    {row.body}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="rounded bg-[#EEF2F7] px-2 py-1 text-[11px] text-[#4B5D7A]">
                      {row.placement}
                    </span>
                    <span className="rounded bg-[#FBF8F2] px-2 py-1 text-[11px] text-[#6B7280]">
                      {row.audience}
                    </span>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <div className="text-[12px] text-[#9B9B9B]">{row.updated}</div>

                  <div className="mt-3 flex items-center justify-end gap-2">
                    {row.status === "Archived" ? (
                      <button
                        type="button"
                        className="border border-[#DDD7CC] bg-white px-3 py-1.5 text-[12px] text-[#3A3A3A] hover:bg-[#F7F3EC]"
                      >
                        Restore
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="border border-[#DDD7CC] bg-white px-3 py-1.5 text-[12px] text-[#3A3A3A] hover:bg-[#F7F3EC]"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="border border-[#F2D6D6] bg-[#FDECEC] px-3 py-1.5 text-[12px] text-[#B44C4C] hover:bg-[#FBE2E2]"
                        >
                          {row.status === "Draft" ? "Delete" : "Archive"}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}