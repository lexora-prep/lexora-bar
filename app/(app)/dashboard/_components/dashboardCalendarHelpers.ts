import type { CalendarDay } from "./dashboardTypes"

export function normalizeLocalDate(date: Date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export function formatDateInput(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export function normalizeDateString(value?: string | Date | null) {
  if (!value) return ""
  if (value instanceof Date) return formatDateInput(value)

  const clean = String(value).trim()
  if (!clean) return ""

  const match = clean.match(/^(\d{4}-\d{2}-\d{2})/)
  if (match) return match[1]

  const parsed = new Date(clean)
  if (isNaN(parsed.getTime())) return ""

  return formatDateInput(parsed)
}

export function formatMonthLabel(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  })
}

export function formatShortDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function isWeekendDate(date: Date) {
  const day = date.getDay()
  return day === 0 || day === 6
}

export function isDateOff(
  date: Date,
  offMap: Record<string, boolean>,
  onMap: Record<string, boolean>,
  shouldStudyWeekends: boolean
) {
  const key = formatDateInput(date)

  if (onMap[key]) return false
  if (offMap[key]) return true

  return !shouldStudyWeekends && isWeekendDate(date)
}

export function getPlanDateRange(start: string, end: string) {
  const dates: Date[] = []
  if (!start || !end) return dates

  const cursor = normalizeLocalDate(new Date(`${start}T00:00:00`))
  const endDt = normalizeLocalDate(new Date(`${end}T00:00:00`))

  while (cursor <= endDt) {
    dates.push(new Date(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }

  return dates
}

export function getDaysUntilExamForDate(value?: string) {
  if (!value) return 0

  const today = normalizeLocalDate(new Date())
  const exam = normalizeLocalDate(new Date(`${value.slice(0, 10)}T00:00:00`))
  const diff = exam.getTime() - today.getTime()

  return Math.max(0, Math.ceil(diff / 86400000))
}

export function buildDistributedRuleMap(
  start: string,
  end: string,
  totalRules: number,
  offMap: Record<string, boolean>,
  onMap: Record<string, boolean>,
  shouldStudyWeekends = true,
  preserveBeforeDate?: string,
  previousRuleMap: Record<string, number> = {}
) {
  const allDates = getPlanDateRange(start, end)
  if (allDates.length === 0) return {}

  const safeTotalRules =
    Number.isFinite(totalRules) && totalRules > 0 ? Math.floor(totalRules) : 0

  const requestedPreserveBefore = preserveBeforeDate
    ? normalizeLocalDate(new Date(`${preserveBeforeDate}T00:00:00`))
    : normalizeLocalDate(new Date(`${start}T00:00:00`))

  const ruleMap: Record<string, number> = {}
  let lockedRules = 0

  for (const d of allDates) {
    const key = formatDateInput(d)

    if (d < requestedPreserveBefore) {
      const previousValue = Number(previousRuleMap?.[key] ?? 0)
      const safePreviousValue =
        Number.isFinite(previousValue) && previousValue > 0
          ? Math.floor(previousValue)
          : 0

      ruleMap[key] = safePreviousValue
      lockedRules += safePreviousValue
    }
  }

  const redistributionDates = allDates.filter((d) => d >= requestedPreserveBefore)
  const activeRedistributionDates = redistributionDates.filter(
    (d) => !isDateOff(d, offMap, onMap, shouldStudyWeekends)
  )

  const remainingRules = Math.max(0, safeTotalRules - lockedRules)

  if (activeRedistributionDates.length === 0) {
    for (const d of redistributionDates) {
      ruleMap[formatDateInput(d)] = 0
    }

    for (const d of allDates) {
      const key = formatDateInput(d)
      if (!(key in ruleMap)) ruleMap[key] = 0
    }

    return ruleMap
  }

  const base = Math.floor(remainingRules / activeRedistributionDates.length)
  let remainder = remainingRules % activeRedistributionDates.length

  for (const d of activeRedistributionDates) {
    const key = formatDateInput(d)
    ruleMap[key] = base + (remainder > 0 ? 1 : 0)

    if (remainder > 0) remainder--
  }

  for (const d of redistributionDates) {
    const key = formatDateInput(d)
    if (!(key in ruleMap)) ruleMap[key] = 0
  }

  for (const d of allDates) {
    const key = formatDateInput(d)
    if (!(key in ruleMap)) ruleMap[key] = 0
  }

  return ruleMap
}

export function buildCalendarDays(
  start: string,
  end: string,
  monthDate?: Date,
  offMap?: Record<string, boolean>,
  onMap?: Record<string, boolean>,
  shouldStudyWeekends = true
) {
  if (!start || !end) return []

  const startDt = normalizeLocalDate(new Date(`${start}T00:00:00`))
  const endDt = normalizeLocalDate(new Date(`${end}T00:00:00`))
  const viewMonth = monthDate
    ? new Date(monthDate)
    : new Date(startDt.getFullYear(), startDt.getMonth(), 1)

  viewMonth.setDate(1)

  const firstDayOfMonth = new Date(
    viewMonth.getFullYear(),
    viewMonth.getMonth(),
    1
  )
  const lastDayOfMonth = new Date(
    viewMonth.getFullYear(),
    viewMonth.getMonth() + 1,
    0
  )

  const firstWeekday = firstDayOfMonth.getDay()
  const daysInMonth = lastDayOfMonth.getDate()
  const cells: CalendarDay[] = []

  for (let i = 0; i < firstWeekday; i++) {
    cells.push({
      date: new Date(
        firstDayOfMonth.getFullYear(),
        firstDayOfMonth.getMonth(),
        i - firstWeekday + 1
      ),
      isOff: false,
      isPadding: true,
    })
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const current = normalizeLocalDate(
      new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day)
    )
    const inStudyRange = current >= startDt && current <= endDt

    cells.push({
      date: current,
      isOff: inStudyRange
        ? isDateOff(current, offMap ?? {}, onMap ?? {}, shouldStudyWeekends)
        : false,
      isPadding: !inStudyRange,
      isExamDay: isSameDay(current, endDt),
    })
  }

  while (cells.length % 7 !== 0) {
    const nextIndex = cells.length - (firstWeekday + daysInMonth) + 1
    cells.push({
      date: new Date(
        lastDayOfMonth.getFullYear(),
        lastDayOfMonth.getMonth(),
        lastDayOfMonth.getDate() + nextIndex
      ),
      isOff: false,
      isPadding: true,
    })
  }

  return cells
}

export function getRemainingStudyDays(
  start: string,
  end: string,
  offMap: Record<string, boolean>,
  onMap: Record<string, boolean>,
  shouldStudyWeekends = true
) {
  return getPlanDateRange(start, end).filter(
    (d) => !isDateOff(d, offMap, onMap, shouldStudyWeekends)
  ).length
}
