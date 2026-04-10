"use client"

import { CalendarDays, X, ChevronLeft, ChevronRight } from "lucide-react"
import { InfoRow } from "./info-row"
import { PremiumBadge } from "./premium-badge"

export type CalendarDay = {
  date: Date
  isOff: boolean
  isPadding?: boolean
  isExamDay?: boolean
}

interface StudyPlanModalProps {
  open: boolean
  onClose: () => void
  isPremium: boolean
  startDate: string
  examDate: string
  studyWeekends: boolean
  onStartDateChange: (value: string) => void
  onExamDateChange: (value: string) => void
  onStudyWeekendsChange: (value: boolean) => void
  planData: {
    dailyRules?: number
    dailyMBE?: number
    totalRules?: number
    totalDays?: number
    offDates?: string[]
    rulesByDate?: Record<string, number>
  } | null
  todayRuleTarget: number
  calendarMonth: Date | null
  calendarDays: CalendarDay[]
  onChangeMonth: (direction: "prev" | "next") => void
  onToggleDay: (day: CalendarDay) => void
  onGenerate: () => void
  onSave: () => void
  onReset: () => void
  formatDateInput: (date: Date) => string
  formatMonthLabel: (date: Date) => string
  formatShortDate: (date: Date) => string
  isSameDay: (a: Date, b: Date) => boolean
  normalizeLocalDate: (date: Date) => Date
}

export function StudyPlanModal({
  open,
  onClose,
  isPremium,
  startDate,
  examDate,
  studyWeekends,
  onStartDateChange,
  onExamDateChange,
  onStudyWeekendsChange,
  planData,
  todayRuleTarget,
  calendarMonth,
  calendarDays,
  onChangeMonth,
  onToggleDay,
  onGenerate,
  onSave,
  onReset,
  formatDateInput,
  formatMonthLabel,
  formatShortDate,
  isSameDay,
  normalizeLocalDate,
}: StudyPlanModalProps) {
  if (!open) return null

  const todayDate = normalizeLocalDate(new Date())

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-3 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="h-[88vh] w-[1120px] max-w-[96vw] overflow-hidden rounded-xl border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
                <CalendarDays size={17} />
              </div>

              <div>
                <h2 className="text-base font-semibold text-foreground">
                  Study Plan
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Build and manage your schedule.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <X size={16} />
            </button>
          </div>

          {/* Content */}
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 p-4 lg:grid-cols-[1fr_280px]">
            {/* Calendar */}
            <div className="min-h-0 overflow-hidden rounded-xl border border-border bg-secondary/30 p-4">
              <div className="mb-3 flex items-center justify-between">
                <button
                  onClick={() => onChangeMonth("prev")}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  <ChevronLeft size={16} />
                </button>

                <div className="text-sm font-semibold text-foreground">
                  {calendarMonth
                    ? formatMonthLabel(calendarMonth)
                    : formatMonthLabel(new Date())}
                </div>

                <button
                  onClick={() => onChangeMonth("next")}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              <div className="mb-3 text-xs text-muted-foreground">
                Click a study date to mark it off. Exam day is highlighted in
                amber.
              </div>

              <div className="mb-2 grid grid-cols-7 gap-2 text-center text-[10px] font-medium text-muted-foreground">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div key={day} className="py-1">
                    {day}
                  </div>
                ))}
              </div>

              {calendarDays.length === 0 ? (
                <div className="flex h-[520px] items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
                  Select your start date and exam date, then click Generate
                  Plan.
                </div>
              ) : (
                <div className="h-[520px] overflow-y-auto pr-1">
                  <div className="grid grid-cols-7 gap-2">
                    {calendarDays.map((d, i) => {
                      const isWeekend =
                        d.date.getDay() === 0 || d.date.getDay() === 6
                      const isToday = isSameDay(d.date, todayDate)
                      const isPastDay = normalizeLocalDate(d.date) < todayDate
                      const isFinished =
                        isPastDay && !d.isPadding && !d.isExamDay && !d.isOff

                      let cellClass =
                        "min-h-[74px] rounded-lg px-2 py-2 text-left transition-all border"

                      if (d.isPadding) {
                        cellClass +=
                          " cursor-default border-transparent bg-secondary/30 text-muted-foreground/50"
                      } else if (d.isExamDay) {
                        cellClass += " border-amber-500/50 bg-amber-500/15"
                      } else if (d.isOff) {
                        cellClass += " border-rose-500/50 bg-rose-500/15"
                      } else if (isFinished) {
                        cellClass += " border-emerald-500/50 bg-emerald-500/15"
                      } else if (isWeekend) {
                        cellClass +=
                          " border-border bg-blue-500/5 hover:bg-blue-500/10"
                      } else {
                        cellClass +=
                          " border-border bg-card hover:bg-secondary/50"
                      }

                      if (isToday && !d.isPadding) {
                        cellClass += " ring-2 ring-emerald-500"
                      }

                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => onToggleDay(d)}
                          disabled={d.isPadding}
                          className={cellClass}
                        >
                          <div className="mb-1 flex items-center justify-between">
                            <span className="text-xs font-semibold text-foreground">
                              {d.date.getDate()}
                            </span>

                            {d.isExamDay && (
                              <span className="text-[9px] font-semibold text-amber-400">
                                EXAM
                              </span>
                            )}
                          </div>

                          {!d.isPadding && !d.isExamDay && !d.isOff && (
                            <>
                              <div className="text-[10px] font-semibold text-emerald-400">
                                {planData?.rulesByDate?.[formatDateInput(d.date)] ??
                                  planData?.dailyRules ??
                                  0}{" "}
                                rules
                              </div>

                              {isFinished && (
                                <div className="mt-1 text-[10px] font-medium text-emerald-400">
                                  Completed
                                </div>
                              )}

                              {isWeekend && !isFinished && (
                                <div className="mt-1 text-[10px] text-blue-400">
                                  Weekend
                                </div>
                              )}
                            </>
                          )}

                          {d.isOff && (
                            <div className="text-[10px] font-semibold text-rose-400">
                              OFF
                            </div>
                          )}

                          {d.isExamDay && (
                            <div className="mt-1 text-[9px] text-amber-400">
                              {formatShortDate(d.date)}
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="min-h-0 space-y-3 overflow-y-auto">
              <div className="rounded-xl border border-border bg-card p-4">
                <div>
                  <div className="text-sm font-semibold text-foreground">
                    Your Remaining Study Schedule
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Workload updates automatically when you mark a day off.
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  <div className="grid gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">
                        Start Date
                      </label>
                      <input
                        type="date"
                        className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-emerald-500"
                        value={startDate}
                        onChange={(e) => onStartDateChange(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">
                        Exam Date
                      </label>
                      <input
                        type="date"
                        className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-emerald-500"
                        value={examDate}
                        onChange={(e) => onExamDateChange(e.target.value)}
                      />
                    </div>

                    <label className="flex items-center gap-2 text-sm text-foreground">
                      <input
                        type="checkbox"
                        checked={studyWeekends}
                        onChange={(e) => onStudyWeekendsChange(e.target.checked)}
                        className="h-4 w-4 rounded border-border bg-secondary text-emerald-500"
                      />
                      Study on weekends
                    </label>
                  </div>

                  <div className="grid gap-2 border-t border-border pt-3">
                    <InfoRow
                      label="Base Avg Rules Per Day"
                      value={
                        <span className="font-semibold text-emerald-400">
                          {planData?.dailyRules ?? "-"}
                        </span>
                      }
                    />

                    <InfoRow
                      label="Daily MBE"
                      value={
                        isPremium ? (
                          <span className="font-semibold text-blue-400">
                            {planData?.dailyMBE ?? 50}
                          </span>
                        ) : (
                          <PremiumBadge />
                        )
                      }
                    />

                    <InfoRow
                      label="Remaining Rules"
                      value={
                        <span className="font-semibold">
                          {planData?.totalRules ?? 1200}
                        </span>
                      }
                    />

                    <InfoRow
                      label="Remaining Study Days"
                      value={
                        <span className="font-semibold">
                          {planData?.totalDays ?? "-"}
                        </span>
                      }
                    />

                    <InfoRow
                      label="Days Off Saved"
                      value={
                        <span className="font-semibold">
                          {planData?.offDates?.length ?? 0}
                        </span>
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-4">
                <div className="mb-3 text-sm font-semibold text-foreground">
                  Daily Breakdown
                </div>

                <div className="space-y-2">
                  <InfoRow
                    label="New Rules"
                    value={
                      <span className="font-semibold text-emerald-400">
                        {todayRuleTarget}
                      </span>
                    }
                  />

                  <InfoRow
                    label="Review Rules"
                    value={
                      <span className="font-semibold">
                        {todayRuleTarget ? Math.max(6, todayRuleTarget * 2) : 0}
                      </span>
                    }
                  />

                  <InfoRow
                    label="MBE Questions"
                    value={
                      isPremium ? (
                        <span className="font-semibold text-blue-400">
                          {planData?.dailyMBE ?? 50}
                        </span>
                      ) : (
                        <PremiumBadge />
                      )
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={onGenerate}
                  className="rounded-lg bg-emerald-500 px-3 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-600"
                >
                  Generate
                </button>

                <button
                  onClick={onSave}
                  className="rounded-lg bg-blue-500 px-3 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-600"
                >
                  Save
                </button>

                <button
                  onClick={onReset}
                  className="rounded-lg border border-border bg-secondary px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
