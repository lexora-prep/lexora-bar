import type { CanonicalRule } from "./normalize-subject-file"

export function mapCanonicalRuleToDb(rule: CanonicalRule) {
  return {
    title: rule.title,
    prompt_question: rule.prompt_question,
    rule_text: rule.rule_statement,
    buzzwords: rule.keywords,
    application_example: rule.application_example,
    how_to_apply: rule.how_to_apply,
    common_traps: rule.common_traps,
    exam_tip: rule.exam_tip,
    common_trap: rule.common_trap,
    priority: rule.priority,
    is_active: true,
  }
}