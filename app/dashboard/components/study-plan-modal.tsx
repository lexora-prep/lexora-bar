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
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-3 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="h-[88vh] w-[1120px] max-w-[96vw] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <CalendarDays size={20} />
              </div>

              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Study Plan
                </h2>
                <p className="mt-0.5 text-sm text-slate-500">
                  Build and manage your schedule.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            >
              <X size={18} />
            </button>
          </div>

          {/* Content */}
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 p-5 lg:grid-cols-[1fr_300px]">
            {/* Calendar */}
            <div className="min-h-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-5">
              <div className="mb-4 flex items-center justify-between">
                <button
                  onClick={() => onChangeMonth("prev")}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100"
                >
                  <ChevronLeft size={18} />
                </button>

                <div className="text-base font-bold text-slate-900">
                  {calendarMonth
                    ? formatMonthLabel(calendarMonth)
                    : formatMonthLabel(new Date())}
                </div>

                <button
                  onClick={() => onChangeMonth("next")}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100"
                >
                  <ChevronRight size={18} />
                </button>
              </div>

              <div className="mb-4 text-sm text-slate-500">
                Click a study date to mark it off. Exam day is highlighted in
                amber.
              </div>

              <div className="mb-3 grid grid-cols-7 gap-2 text-center text-xs font-semibold text-slate-500">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div key={day} className="py-1.5">
                    {day}
                  </div>
                ))}
              </div>

              {calendarDays.length === 0 ? (
                <div className="flex h-[520px] items-center justify-center rounded-lg border border-dashed border-slate-300 text-sm text-slate-500">
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
                        "min-h-[74px] rounded-lg px-2.5 py-2.5 text-left transition-all border"

                      if (d.isPadding) {
                        cellClass +=
                          " cursor-default border-transparent bg-slate-100/50 text-slate-300"
                      } else if (d.isExamDay) {
                        cellClass += " border-amber-300 bg-amber-50"
                      } else if (d.isOff) {
                        cellClass += " border-rose-300 bg-rose-50"
                      } else if (isFinished) {
                        cellClass += " border-emerald-300 bg-emerald-50"
                      } else if (isWeekend) {
                        cellClass +=
                          " border-slate-200 bg-blue-50/50 hover:bg-blue-50"
                      } else {
                        cellClass +=
                          " border-slate-200 bg-white hover:bg-slate-50"
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
                            <span className="text-sm font-bold text-slate-800">
                              {d.date.getDate()}
                            </span>

                            {d.isExamDay && (
                              <span className="text-[10px] font-bold text-amber-600">
                                EXAM
                              </span>
                            )}
                          </div>

                          {!d.isPadding && !d.isExamDay && !d.isOff && (
                            <>
                              <div className="text-xs font-semibold text-emerald-600">
                                {planData?.rulesByDate?.[formatDateInput(d.date)] ??
                                  planData?.dailyRules ??
                                  0}{" "}
                                rules
                              </div>

                              {isFinished && (
                                <div className="mt-1 text-[10px] font-semibold text-emerald-600">
                                  Completed
                                </div>
                              )}

                              {isWeekend && !isFinished && (
                                <div className="mt-1 text-[10px] text-blue-600">
                                  Weekend
                                </div>
                              )}
                            </>
                          )}

                          {d.isOff && (
                            <div className="text-xs font-bold text-rose-500">
                              OFF
                            </div>
                          )}

                          {d.isExamDay && (
                            <div className="mt-1 text-[10px] text-amber-600">
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
            <div className="min-h-0 space-y-4 overflow-y-auto">
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <div>
                  <div className="text-base font-bold text-slate-900">
                    Your Remaining Study Schedule
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    Workload updates automatically when you mark a day off.
                  </div>
                </div>

                <div className="mt-5 space-y-4">
                  <div className="grid gap-3">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                        Start Date
                      </label>
                      <input
                        type="date"
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-emerald-500 focus:bg-white"
                        value={startDate}
                        onChange={(e) => onStartDateChange(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                        Exam Date
                      </label>
                      <input
                        type="date"
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-emerald-500 focus:bg-white"
                        value={examDate}
                        onChange={(e) => onExamDateChange(e.target.value)}
                      />
                    </div>

                    <label className="flex items-center gap-2.5 text-sm font-medium text-slate-700">
                      <input
                        type="checkbox"
                        checked={studyWeekends}
                        onChange={(e) => onStudyWeekendsChange(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500"
                      />
                      Study on weekends
                    </label>
                  </div>

                  <div className="grid gap-2.5 border-t border-slate-200 pt-4">
                    <InfoRow
                      label="Base Avg Rules Per Day"
                      value={
                        <span className="font-bold text-emerald-600">
                          {planData?.dailyRules ?? "-"}
                        </span>
                      }
                    />

                    <InfoRow
                      label="Daily MBE"
                      value={
                        isPremium ? (
                          <span className="font-bold text-blue-600">
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
                        <span className="font-bold text-slate-800">
                          {planData?.totalRules ?? 1200}
                        </span>
                      }
                    />

                    <InfoRow
                      label="Remaining Study Days"
                      value={
                        <span className="font-bold text-slate-800">
                          {planData?.totalDays ?? "-"}
                        </span>
                      }
                    />

                    <InfoRow
                      label="Days Off Saved"
                      value={
                        <span className="font-bold text-slate-800">
                          {planData?.offDates?.length ?? 0}
                        </span>
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="mb-4 text-base font-bold text-slate-900">
                  Daily Breakdown
                </div>

                <div className="space-y-2.5">
                  <InfoRow
                    label="New Rules"
                    value={
                      <span className="font-bold text-emerald-600">
                        {todayRuleTarget}
                      </span>
                    }
                  />

                  <InfoRow
                    label="Review Rules"
                    value={
                      <span className="font-bold text-slate-800">
                        {todayRuleTarget ? Math.max(6, todayRuleTarget * 2) : 0}
                      </span>
                    }
                  />

                  <InfoRow
                    label="MBE Questions"
                    value={
                      isPremium ? (
                        <span className="font-bold text-blue-600">
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
                  className="rounded-lg bg-emerald-500 px-3 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-600"
                >
                  Generate
                </button>

                <button
                  onClick={onSave}
                  className="rounded-lg bg-blue-500 px-3 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-600"
                >
                  Save
                </button>

                <button
                  onClick={onReset}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100"
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
