import { STATUS_GATES } from "./config"
import type { MasteryResult, StatusResult } from "./types"

export function classifyLearningStatus(result: MasteryResult): StatusResult {
  if (result.attemptCount === 0) return { status: "UNTRAINED", isWeak: false, isMastered: false, reason: "No scored evidence exists yet." }

  const mastered = result.mastery >= STATUS_GATES.mastered.minimumMastery && result.confidence >= STATUS_GATES.mastered.minimumConfidence && result.successfulRecallCount >= STATUS_GATES.mastered.minimumSuccessfulRecalls && result.distinctModes >= STATUS_GATES.mastered.minimumDistinctModes
  if (mastered) return { status: "MASTERED", isWeak: false, isMastered: true, reason: "Repeated successful recall is supported by sufficient confidence and mode diversity." }

  const strong = result.mastery >= STATUS_GATES.strong.minimumMastery && result.confidence >= STATUS_GATES.strong.minimumConfidence && result.successfulRecallCount >= STATUS_GATES.strong.minimumSuccessfulRecalls
  if (strong) return { status: "STRONG", isWeak: false, isMastered: false, reason: "Performance is strong, but the mastery gates are not all satisfied." }
  if (result.mastery >= 60) return { status: "IMPROVING", isWeak: false, isMastered: false, reason: "Recall is improving but is not yet reliably strong." }
  if (result.mastery >= 35) return { status: "NEEDS_WORK", isWeak: true, isMastered: false, reason: "Current mastery remains below the reliable-recall range." }
  return { status: "CRITICAL", isWeak: true, isMastered: false, reason: "Performance or evidence confidence is critically low." }
}
