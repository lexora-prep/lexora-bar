import { type RuleSet } from "./dashboardTypes"
import {
  getEffectiveExamRegime,
  getJurisdictionDisplayName,
  normalizeJurisdictionCode,
} from "./dashboardJurisdictionHelpers"

export function buildStudyPlanRequestBodyForDashboard({
  currentUserId,
  startDate,
  examDate,
  selectedStudyJurisdiction,
  nextOffDates,
  nextOnDates,
  nextStudyWeekends,
  nextRuleSet,
  customRulesEnabled,
  studyRound,
  manualPackage,
}: {
  currentUserId: string | null
  startDate: string
  examDate: string
  selectedStudyJurisdiction: string
  nextOffDates: string[]
  nextOnDates: string[]
  nextStudyWeekends: boolean
  nextRuleSet: RuleSet
  customRulesEnabled: boolean
  studyRound: number
  manualPackage: boolean
}) {
  const jurisdictionCode = normalizeJurisdictionCode(selectedStudyJurisdiction)
  const jurisdictionName = getJurisdictionDisplayName(jurisdictionCode)
  const examRegime = getEffectiveExamRegime(jurisdictionCode, examDate)

  return {
    userId: currentUserId,
    startDate,
    examDate,
    studyWeekends: nextStudyWeekends,
    offDates: nextOffDates,
    onDates: nextOnDates,
    ruleSet: nextRuleSet,
    rulePackages: [nextRuleSet],
    jurisdictionCode,
    jurisdictionName,
    examRegime,
    customRulesEnabled,
    studyRound,
    userManuallySelectedRulePackage: manualPackage,
  }
}
