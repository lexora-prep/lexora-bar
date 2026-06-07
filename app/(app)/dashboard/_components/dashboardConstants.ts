import type { JurisdictionOption, RuleSet, SubjectPlanItem } from "./dashboardTypes"

export const COMPARISON_STATE_STORAGE_KEY = "lexora-comparison-state"

export const RULE_PACKAGE_META: Record<
  RuleSet,
  {
    label: string
    shortLabel: string
    description: string
    multiplier: number
    minDays: number
  }
> = {
  emergency: {
    label: "Emergency Pack",
    shortLabel: "Emergency",
    description: "Compressed high-yield plan for very short timelines.",
    multiplier: 0.45,
    minDays: 0,
  },
  priority: {
    label: "Priority Rules",
    shortLabel: "Priority",
    description: "Focused plan for short timelines.",
    multiplier: 0.7,
    minDays: 15,
  },
  core: {
    label: "Core Rules Only",
    shortLabel: "Core",
    description: "Balanced core black-letter-law memorization plan.",
    multiplier: 1,
    minDays: 45,
  },
  full: {
    label: "Full Rule Bank",
    shortLabel: "Full",
    description: "Broader plan for users with enough time.",
    multiplier: 1.25,
    minDays: 90,
  },
}

export const UBE_CURRENT_SUBJECTS: SubjectPlanItem[] = [
  { name: "Civil Procedure", weight: 8, system: "UBE_CURRENT" },
  { name: "Constitutional Law", weight: 8, system: "UBE_CURRENT" },
  { name: "Contracts", weight: 8, system: "UBE_CURRENT" },
  { name: "Criminal Law and Procedure", weight: 8, system: "UBE_CURRENT" },
  { name: "Evidence", weight: 8, system: "UBE_CURRENT" },
  { name: "Real Property", weight: 8, system: "UBE_CURRENT" },
  { name: "Torts", weight: 8, system: "UBE_CURRENT" },
  { name: "Business Associations", weight: 7, system: "UBE_CURRENT" },
  { name: "Family Law", weight: 5, system: "UBE_CURRENT" },
  { name: "Secured Transactions", weight: 5, system: "UBE_CURRENT" },
  { name: "Trusts", weight: 4, system: "UBE_CURRENT" },
  { name: "Wills and Estates", weight: 4, system: "UBE_CURRENT" },
]

export const NEXTGEN_SUBJECTS: SubjectPlanItem[] = [
  { name: "Civil Procedure", weight: 10, system: "NEXTGEN" },
  { name: "Contracts", weight: 10, system: "NEXTGEN" },
  { name: "Evidence", weight: 10, system: "NEXTGEN" },
  { name: "Torts", weight: 10, system: "NEXTGEN" },
  { name: "Business Associations", weight: 9, system: "NEXTGEN" },
  { name: "Constitutional Law", weight: 9, system: "NEXTGEN" },
  { name: "Criminal Law and Procedure", weight: 9, system: "NEXTGEN" },
  { name: "Real Property", weight: 8, system: "NEXTGEN" },
  { name: "Family Law", weight: 7, system: "NEXTGEN" },
]

export const CALIFORNIA_SUBJECTS: SubjectPlanItem[] = [
  { name: "Civil Procedure", weight: 8, system: "CALIFORNIA_CURRENT" },
  { name: "Constitutional Law", weight: 7, system: "CALIFORNIA_CURRENT" },
  { name: "Contracts", weight: 7, system: "CALIFORNIA_CURRENT" },
  { name: "Criminal Law and Procedure", weight: 7, system: "CALIFORNIA_CURRENT" },
  { name: "Evidence", weight: 8, system: "CALIFORNIA_CURRENT" },
  { name: "Real Property", weight: 6, system: "CALIFORNIA_CURRENT" },
  { name: "Torts", weight: 7, system: "CALIFORNIA_CURRENT" },
  { name: "Business Associations", weight: 7, system: "CALIFORNIA_CURRENT" },
  { name: "Community Property", weight: 7, system: "CALIFORNIA_CURRENT" },
  { name: "Professional Responsibility", weight: 8, system: "CALIFORNIA_CURRENT" },
  { name: "Remedies", weight: 7, system: "CALIFORNIA_CURRENT" },
  { name: "Trusts", weight: 5, system: "CALIFORNIA_CURRENT" },
  { name: "Wills and Succession", weight: 5, system: "CALIFORNIA_CURRENT" },
]

export const FLORIDA_CURRENT_SUBJECTS: SubjectPlanItem[] = [
  { name: "Constitutional Law", weight: 7, system: "FLORIDA_CURRENT" },
  { name: "Contracts", weight: 6, system: "FLORIDA_CURRENT" },
  { name: "Criminal Law and Procedure", weight: 7, system: "FLORIDA_CURRENT" },
  { name: "Evidence", weight: 7, system: "FLORIDA_CURRENT" },
  { name: "Real Property", weight: 6, system: "FLORIDA_CURRENT" },
  { name: "Torts", weight: 6, system: "FLORIDA_CURRENT" },
  { name: "Civil Procedure", weight: 7, system: "FLORIDA_CURRENT" },
  { name: "Business Entities", weight: 5, system: "FLORIDA_CURRENT" },
  { name: "Family Law", weight: 5, system: "FLORIDA_CURRENT" },
  { name: "Wills and Estates", weight: 6, system: "FLORIDA_CURRENT" },
  { name: "Trusts", weight: 5, system: "FLORIDA_CURRENT" },
  { name: "Commercial Law / UCC", weight: 5, system: "FLORIDA_CURRENT" },
  { name: "Professional Responsibility", weight: 5, system: "FLORIDA_CURRENT" },
  { name: "Professionalism", weight: 4, system: "FLORIDA_CURRENT" },
]

export const STATE_SPECIFIC_SUBJECTS: SubjectPlanItem[] = [
  { name: "Civil Procedure", weight: 7, system: "STATE_SPECIFIC" },
  { name: "Constitutional Law", weight: 7, system: "STATE_SPECIFIC" },
  { name: "Contracts", weight: 7, system: "STATE_SPECIFIC" },
  { name: "Criminal Law and Procedure", weight: 7, system: "STATE_SPECIFIC" },
  { name: "Evidence", weight: 7, system: "STATE_SPECIFIC" },
  { name: "Real Property", weight: 7, system: "STATE_SPECIFIC" },
  { name: "Torts", weight: 7, system: "STATE_SPECIFIC" },
  { name: "Business Associations", weight: 5, system: "STATE_SPECIFIC" },
  { name: "Family Law", weight: 5, system: "STATE_SPECIFIC" },
  { name: "Wills and Estates", weight: 5, system: "STATE_SPECIFIC" },
  { name: "Trusts", weight: 5, system: "STATE_SPECIFIC" },
  { name: "Secured Transactions", weight: 5, system: "STATE_SPECIFIC" },
  { name: "Professional Responsibility", weight: 4, system: "STATE_SPECIFIC" },
  { name: "Remedies", weight: 4, system: "STATE_SPECIFIC" },
  { name: "Commercial Law / UCC", weight: 4, system: "STATE_SPECIFIC" },
]

export const LOCAL_COMPONENT_SUBJECTS: SubjectPlanItem[] = [
  { name: "Civil Procedure", weight: 8, system: "LOCAL_COMPONENT" },
  { name: "Criminal Law and Procedure", weight: 7, system: "LOCAL_COMPONENT" },
  { name: "Evidence", weight: 7, system: "LOCAL_COMPONENT" },
  { name: "Professional Responsibility", weight: 7, system: "LOCAL_COMPONENT" },
  { name: "Real Property", weight: 6, system: "LOCAL_COMPONENT" },
  { name: "Family Law", weight: 6, system: "LOCAL_COMPONENT" },
  { name: "Trusts", weight: 6, system: "LOCAL_COMPONENT" },
  { name: "Wills and Estates", weight: 6, system: "LOCAL_COMPONENT" },
]

export const JURISDICTION_OPTIONS: JurisdictionOption[] = [
  { code: "AL", name: "Alabama", group: "UBE / Uniform Current", nextGenStart: "2028-07-01" },
  { code: "AK", name: "Alaska", group: "UBE / Uniform Current", nextGenStart: "2028-07-01" },
  { code: "AZ", name: "Arizona", group: "UBE / Uniform Current", nextGenStart: "2027-07-01" },
  { code: "AR", name: "Arkansas", group: "UBE / Uniform Current" },
  { code: "CO", name: "Colorado", group: "UBE / Uniform Current", nextGenStart: "2028-07-01" },
  { code: "CT", name: "Connecticut", group: "UBE / Uniform Current", nextGenStart: "2026-07-01" },
  { code: "DC", name: "District of Columbia", group: "UBE / Uniform Current", nextGenStart: "2028-02-01" },
  { code: "GU", name: "Guam", group: "Territories / Special", nextGenStart: "2026-07-01" },
  { code: "ID", name: "Idaho", group: "UBE / Uniform Current", nextGenStart: "2026-07-01" },
  { code: "IL", name: "Illinois", group: "UBE / Uniform Current", nextGenStart: "2028-02-01" },
  { code: "IN", name: "Indiana", group: "UBE / Uniform Current", nextGenStart: "2028-07-01" },
  { code: "IA", name: "Iowa", group: "UBE / Uniform Current", nextGenStart: "2027-07-01" },
  { code: "KS", name: "Kansas", group: "UBE / Uniform Current", nextGenStart: "2028-07-01" },
  { code: "KY", name: "Kentucky", group: "UBE / Uniform Current", nextGenStart: "2027-07-01" },
  { code: "ME", name: "Maine", group: "UBE / Uniform Current", nextGenStart: "2028-07-01" },
  { code: "MD", name: "Maryland", group: "UBE / Uniform Current", nextGenStart: "2026-07-01" },
  { code: "MA", name: "Massachusetts", group: "UBE / Uniform Current", nextGenStart: "2028-07-01" },
  { code: "MI", name: "Michigan", group: "UBE / Uniform Current", nextGenStart: "2028-07-01" },
  { code: "MN", name: "Minnesota", group: "UBE / Uniform Current", nextGenStart: "2027-07-01" },
  { code: "MO", name: "Missouri", group: "UBE / Uniform Current", nextGenStart: "2026-07-01" },
  { code: "MT", name: "Montana", group: "UBE / Uniform Current" },
  { code: "NE", name: "Nebraska", group: "UBE / Uniform Current", nextGenStart: "2027-07-01" },
  { code: "NH", name: "New Hampshire", group: "UBE / Uniform Current", nextGenStart: "2028-07-01" },
  { code: "NJ", name: "New Jersey", group: "UBE / Uniform Current", nextGenStart: "2028-07-01" },
  { code: "NM", name: "New Mexico", group: "UBE / Uniform Current", nextGenStart: "2027-07-01" },
  { code: "NY", name: "New York", group: "UBE / Uniform Current", nextGenStart: "2028-07-01", localComponent: true },
  { code: "NC", name: "North Carolina", group: "UBE / Uniform Current", nextGenStart: "2028-07-01" },
  { code: "ND", name: "North Dakota", group: "UBE / Uniform Current", nextGenStart: "2027-07-01" },
  { code: "MP", name: "Northern Mariana Islands", group: "Territories / Special", nextGenStart: "2026-07-01" },
  { code: "OH", name: "Ohio", group: "UBE / Uniform Current", nextGenStart: "2028-07-01" },
  { code: "OK", name: "Oklahoma", group: "UBE / Uniform Current", nextGenStart: "2027-07-01" },
  { code: "OR", name: "Oregon", group: "UBE / Uniform Current", nextGenStart: "2026-07-01" },
  { code: "PW", name: "Palau", group: "Territories / Special", nextGenStart: "2026-07-01" },
  { code: "PA", name: "Pennsylvania", group: "UBE / Uniform Current", nextGenStart: "2028-07-01" },
  { code: "RI", name: "Rhode Island", group: "UBE / Uniform Current", nextGenStart: "2028-07-01" },
  { code: "SC", name: "South Carolina", group: "UBE / Uniform Current", nextGenStart: "2028-07-01" },
  { code: "TN", name: "Tennessee", group: "UBE / Uniform Current", nextGenStart: "2027-07-01" },
  { code: "TX", name: "Texas", group: "UBE / Uniform Current", nextGenStart: "2028-07-01" },
  { code: "VI", name: "U.S. Virgin Islands", group: "Territories / Special", nextGenStart: "2026-07-01" },
  { code: "UT", name: "Utah", group: "UBE / Uniform Current", nextGenStart: "2028-07-01" },
  { code: "VT", name: "Vermont", group: "UBE / Uniform Current", nextGenStart: "2027-07-01" },
  { code: "WA", name: "Washington", group: "UBE / Uniform Current", nextGenStart: "2026-07-01" },
  { code: "WV", name: "West Virginia", group: "UBE / Uniform Current", nextGenStart: "2027-07-01" },
  { code: "WI", name: "Wisconsin", group: "UBE / Uniform Current", nextGenStart: "2028-07-01" },
  { code: "WY", name: "Wyoming", group: "UBE / Uniform Current", nextGenStart: "2027-07-01" },
  { code: "CA", name: "California", group: "California", needsVerification: true },
  { code: "FL", name: "Florida", group: "Florida", nextGenStart: "2028-07-01" },
  { code: "DE", name: "Delaware", group: "State-Specific / Non-UBE", nextGenStart: "2028-02-01" },
  { code: "GA", name: "Georgia", group: "State-Specific / Non-UBE", nextGenStart: "2028-07-01" },
  { code: "HI", name: "Hawaii", group: "State-Specific / Non-UBE", nextGenStart: "2028-07-01" },
  { code: "LA", name: "Louisiana", group: "State-Specific / Non-UBE", needsVerification: true },
  { code: "MS", name: "Mississippi", group: "State-Specific / Non-UBE", needsVerification: true },
  { code: "NV", name: "Nevada", group: "State-Specific / Non-UBE", needsVerification: true },
  { code: "SD", name: "South Dakota", group: "State-Specific / Non-UBE", nextGenStart: "2027-07-01" },
  { code: "VA", name: "Virginia", group: "State-Specific / Non-UBE", nextGenStart: "2028-07-01" },
  { code: "PR", name: "Puerto Rico", group: "Territories / Special", needsVerification: true },
]

export const MBE_SUBJECTS = [
  "Contracts",
  "Torts",
  "Evidence",
  "Civil Procedure",
  "Criminal Law and Procedure",
  "Real Property",
  "Constitutional Law",
]

export const STATES = JURISDICTION_OPTIONS.map((j) => ({
  code: j.code,
  name: j.name,
})).filter(
  (item, index, arr) => arr.findIndex((x) => x.name === item.name) === index
)