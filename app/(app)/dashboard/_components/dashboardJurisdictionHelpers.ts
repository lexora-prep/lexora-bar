import {
  CALIFORNIA_SUBJECTS,
  FLORIDA_CURRENT_SUBJECTS,
  JURISDICTION_OPTIONS,
  LOCAL_COMPONENT_SUBJECTS,
  NEXTGEN_SUBJECTS,
  STATE_SPECIFIC_SUBJECTS,
  UBE_CURRENT_SUBJECTS,
} from "./dashboardConstants"
import type {
  ExamRegime,
  JurisdictionGroup,
  SubjectPlanItem,
} from "./dashboardTypes"

export function normalizeJurisdictionCode(value?: string | null) {
  const clean = String(value ?? "").trim()

  if (!clean) return "UBE"
  if (clean.toUpperCase() === "UBE") return "UBE"

  const direct = JURISDICTION_OPTIONS.find(
    (j) => j.code.toLowerCase() === clean.toLowerCase()
  )

  if (direct) return direct.code

  const byName = JURISDICTION_OPTIONS.find(
    (j) => j.name.toLowerCase() === clean.toLowerCase()
  )

  return byName?.code ?? "UBE"
}

export function getSelectedJurisdictionOption(code: string) {
  const normalized = normalizeJurisdictionCode(code)

  if (normalized === "UBE") {
    return {
      code: "UBE",
      name: "UBE / Uniform Current",
      group: "UBE / Uniform Current" as JurisdictionGroup,
    }
  }

  return JURISDICTION_OPTIONS.find((j) => j.code === normalized) ?? null
}

export function getJurisdictionDisplayName(code: string) {
  const option = getSelectedJurisdictionOption(code)
  return option?.name ?? "UBE / Uniform Current"
}

export function getEffectiveExamRegime(
  code: string,
  selectedExamDate?: string
): ExamRegime {
  const normalized = normalizeJurisdictionCode(code)

  if (normalized === "UBE") return "UBE_CURRENT"

  const option = getSelectedJurisdictionOption(normalized)

  if (!option) return "UBE_CURRENT"

  if (option.code === "CA") return "CALIFORNIA_CURRENT"

  const examDateValue = selectedExamDate
    ? new Date(`${selectedExamDate.slice(0, 10)}T00:00:00`)
    : null
  const nextGenDateValue = option.nextGenStart
    ? new Date(`${option.nextGenStart}T00:00:00`)
    : null

  const hasNextGenStarted =
    examDateValue &&
    nextGenDateValue &&
    !isNaN(examDateValue.getTime()) &&
    !isNaN(nextGenDateValue.getTime()) &&
    examDateValue >= nextGenDateValue

  if (option.code === "FL") {
    return hasNextGenStarted ? "FLORIDA_NEXTGEN" : "FLORIDA_CURRENT"
  }

  if (hasNextGenStarted) return "NEXTGEN"

  if (option.group === "Territories / Special") return "TERRITORY_SPECIAL"
  if (option.group === "State-Specific / Non-UBE") return "STATE_SPECIFIC"
  if (option.group === "Local Component") return "LOCAL_COMPONENT"

  return "UBE_CURRENT"
}

export function getRegimeLabel(regime: ExamRegime) {
  if (regime === "UBE_CURRENT") return "UBE / Uniform Current"
  if (regime === "NEXTGEN") return "NextGen"
  if (regime === "CALIFORNIA_CURRENT") return "California"
  if (regime === "FLORIDA_CURRENT") return "Florida Current"
  if (regime === "FLORIDA_NEXTGEN") return "NextGen + Florida Component"
  if (regime === "STATE_SPECIFIC") return "State-Specific"
  if (regime === "TERRITORY_SPECIAL") return "Territory / Special"
  return "Local Component"
}

export function getJurisdictionSubjects(
  code: string,
  selectedExamDate?: string
): SubjectPlanItem[] {
  const regime = getEffectiveExamRegime(code, selectedExamDate)

  if (regime === "CALIFORNIA_CURRENT") return CALIFORNIA_SUBJECTS
  if (regime === "FLORIDA_CURRENT") return FLORIDA_CURRENT_SUBJECTS
  if (regime === "FLORIDA_NEXTGEN") {
    return [
      ...NEXTGEN_SUBJECTS,
      { name: "Florida Civil Procedure", weight: 6, system: "FLORIDA_NEXTGEN" },
      { name: "Florida Evidence", weight: 5, system: "FLORIDA_NEXTGEN" },
      {
        name: "Rules Regulating The Florida Bar",
        weight: 4,
        system: "FLORIDA_NEXTGEN",
      },
      { name: "Professionalism", weight: 4, system: "FLORIDA_NEXTGEN" },
    ]
  }
  if (regime === "NEXTGEN") return NEXTGEN_SUBJECTS
  if (regime === "STATE_SPECIFIC") return STATE_SPECIFIC_SUBJECTS
  if (regime === "TERRITORY_SPECIAL") return UBE_CURRENT_SUBJECTS
  if (regime === "LOCAL_COMPONENT") return LOCAL_COMPONENT_SUBJECTS

  return UBE_CURRENT_SUBJECTS
}
