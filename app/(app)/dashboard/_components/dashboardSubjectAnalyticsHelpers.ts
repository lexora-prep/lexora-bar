import { buildLevelAndProgress } from "./dashboardProgressHelpers"
import {
  getEffectiveExamRegime,
  getJurisdictionSubjects,
} from "./dashboardJurisdictionHelpers"
import type { SubjectAnalyticsRow } from "./dashboardTypes"

export function shouldUseGlobalSubjectProgressForJurisdiction({
  selectedStudyJurisdiction,
  examDate,
}: {
  selectedStudyJurisdiction: string
  examDate: string
}) {
  const regime = getEffectiveExamRegime(selectedStudyJurisdiction, examDate)
  return regime === "UBE_CURRENT" || regime === "NEXTGEN"
}

export function getSubjectProgressPercentForJurisdiction({
  subjectName,
  subjectRows,
  selectedStudyJurisdiction,
  examDate,
}: {
  subjectName: string
  subjectRows: SubjectAnalyticsRow[]
  selectedStudyJurisdiction: string
  examDate: string
}) {
  if (
    !shouldUseGlobalSubjectProgressForJurisdiction({
      selectedStudyJurisdiction,
      examDate,
    })
  ) {
    return 0
  }

  const normalized = subjectName.trim().toLowerCase()
  const direct = subjectRows.find(
    (row) => row.name.trim().toLowerCase() === normalized
  )

  if (direct && direct.total > 0) {
    return Math.round((direct.completed / Math.max(direct.total, 1)) * 100)
  }

  return 0
}

export function getSubjectAnalyticsForJurisdiction({
  subjectRows,
  selectedStudyJurisdiction,
  examDate,
}: {
  subjectRows: SubjectAnalyticsRow[]
  selectedStudyJurisdiction: string
  examDate: string
}) {
  const jurisdictionSubjects = getJurisdictionSubjects(
    selectedStudyJurisdiction,
    examDate
  )

  const shouldUseGlobalProgress = shouldUseGlobalSubjectProgressForJurisdiction({
    selectedStudyJurisdiction,
    examDate,
  })

  return jurisdictionSubjects.map((subject) => {
    const normalized = subject.name.trim().toLowerCase()
    const direct = shouldUseGlobalProgress
      ? subjectRows.find((row) => row.name.trim().toLowerCase() === normalized)
      : null

    const completed = direct?.completed ?? 0
    const total = direct?.total ?? subject.weight
    const accuracy = direct?.accuracy ?? 0
    const derived = buildLevelAndProgress(completed, accuracy)

    return {
      name: subject.name,
      accuracy,
      completed,
      total,
      level: completed > 0 ? derived.level : "Limited",
      progressWidth: completed > 0 ? derived.progressWidth : 0,
    }
  })
}
