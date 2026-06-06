import {
  getPlanDateRange,
  isDateOff,
  normalizeLocalDate,
} from "./dashboardCalendarHelpers"

export function getStudyPlanDayStatsForPlan({
  startDate,
  examDate,
  savedOffMap,
  savedOnMap,
  studyWeekends,
}: {
  startDate: string
  examDate: string
  savedOffMap: Record<string, boolean>
  savedOnMap: Record<string, boolean>
  studyWeekends: boolean
}) {
  const allDates = getPlanDateRange(startDate, examDate)
  const today = normalizeLocalDate(new Date())

  const totalStudyDays = allDates.filter(
    (d) => !isDateOff(d, savedOffMap, savedOnMap, studyWeekends)
  ).length

  const completedStudyDays = allDates.filter(
    (d) =>
      d < today &&
      !isDateOff(d, savedOffMap, savedOnMap, studyWeekends)
  ).length

  return { totalStudyDays, completedStudyDays }
}
