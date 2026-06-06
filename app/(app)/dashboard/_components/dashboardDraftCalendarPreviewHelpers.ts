import { buildCalendarDays } from "./dashboardStudyPlanCalendarHelpers"

export function buildDraftCalendarPreviewForDashboard({
  nextStartDate,
  nextExamDate,
  nextOffMap,
  nextOnMap,
  nextStudyWeekends,
  calendarMonth,
}: {
  nextStartDate: string
  nextExamDate: string
  nextOffMap: Record<string, boolean>
  nextOnMap: Record<string, boolean>
  nextStudyWeekends: boolean
  calendarMonth: Date | null
}) {
  if (!nextStartDate || !nextExamDate) return null

  const baseMonth =
    calendarMonth ?? new Date(`${nextStartDate.slice(0, 10)}T00:00:00`)

  const viewMonth = new Date(
    baseMonth.getFullYear(),
    baseMonth.getMonth(),
    1
  )

  return {
    viewMonth,
    calendarDays: buildCalendarDays(
      nextStartDate,
      nextExamDate,
      viewMonth,
      nextOffMap,
      nextOnMap,
      nextStudyWeekends
    ),
  }
}
