import { buildCalendarDays } from "./dashboardStudyPlanCalendarHelpers"

type BuildDraftCalendarPreviewParams = {
  nextStartDate: string
  nextExamDate: string
  nextOffMap: Record<string, boolean>
  nextOnMap: Record<string, boolean>
  nextStudyWeekends: boolean
  calendarMonth: Date | null
  setCalendarMonth: (value: Date | null) => void
  setCalendarDays: (value: ReturnType<typeof buildCalendarDays>) => void
}

export function buildDraftCalendarPreviewForPlan({
  nextStartDate,
  nextExamDate,
  nextOffMap,
  nextOnMap,
  nextStudyWeekends,
  calendarMonth,
  setCalendarMonth,
  setCalendarDays,
}: BuildDraftCalendarPreviewParams) {
  if (!nextStartDate || !nextExamDate) return

  const baseMonth =
    calendarMonth ?? new Date(`${nextStartDate.slice(0, 10)}T00:00:00`)

  const viewMonth = new Date(
    baseMonth.getFullYear(),
    baseMonth.getMonth(),
    1
  )

  setCalendarMonth(viewMonth)
  setCalendarDays(
    buildCalendarDays(
      nextStartDate,
      nextExamDate,
      viewMonth,
      nextOffMap,
      nextOnMap,
      nextStudyWeekends
    )
  )
}
