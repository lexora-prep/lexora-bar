import type { AnalyticsTab } from "./types"

export const ALL_BLL_SUBJECTS = [
  "Contracts",
  "Torts",
  "Evidence",
  "Civil Procedure",
  "Criminal Law and Procedure",
  "Real Property",
  "Constitutional Law",
  "Business Associations",
  "Family Law",
  "Trusts",
  "Wills",
  "Secured Transactions",
] as const

export const ANALYTICS_TABS: AnalyticsTab[] = [
  {
    key: "overview",
    label: "Overview",
  },
  {
    key: "learning",
    label: "Learning Insights",
  },
  {
    key: "rules",
    label: "Rule Analytics",
  },
  {
    key: "time",
    label: "Time Analysis",
  },
  {
    key: "strengths",
    label: "Strengths & Weaknesses",
  },
  {
    key: "history",
    label: "Progress History",
  },
]
