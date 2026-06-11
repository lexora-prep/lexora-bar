import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"

export const STRENGTHS_WEAKNESSES_SETTINGS_KEY =
  "strengths_weaknesses_analytics_settings"

export type StrengthsWeaknessesAnalyticsSettings = {
  correctScoreThreshold: number
  confirmedSubjectAttempts: number
  confirmedRuleAttempts: number
  strongSubjectThreshold: number
  weakSubjectThreshold: number
  weakRuleThreshold: number
  criticalPriorityThreshold: number
  highPriorityThreshold: number
  moderatePriorityThreshold: number
}

export type AnalyticsPresetName =
  | "conservative"
  | "balanced"
  | "early_intervention"
  | "custom"

export type AnalyticsPresetDefinition = {
  name: Exclude<AnalyticsPresetName, "custom">
  title: string
  description: string
  settings: StrengthsWeaknessesAnalyticsSettings
}

export const ANALYTICS_SETTING_PRESETS: AnalyticsPresetDefinition[] = [
  {
    name: "conservative",
    title: "Conservative",
    description:
      "Requires more evidence and uses stricter standards before calling an area strong.",
    settings: {
      correctScoreThreshold: 80,
      confirmedSubjectAttempts: 8,
      confirmedRuleAttempts: 5,
      strongSubjectThreshold: 80,
      weakSubjectThreshold: 65,
      weakRuleThreshold: 65,
      criticalPriorityThreshold: 35,
      highPriorityThreshold: 45,
      moderatePriorityThreshold: 65,
    },
  },
  {
    name: "balanced",
    title: "Balanced",
    description:
      "Recommended production preset with practical classification and confidence thresholds.",
    settings: {
      correctScoreThreshold: 80,
      confirmedSubjectAttempts: 5,
      confirmedRuleAttempts: 3,
      strongSubjectThreshold: 75,
      weakSubjectThreshold: 70,
      weakRuleThreshold: 70,
      criticalPriorityThreshold: 40,
      highPriorityThreshold: 50,
      moderatePriorityThreshold: 70,
    },
  },
  {
    name: "early_intervention",
    title: "Early Intervention",
    description:
      "Flags weak areas sooner and confirms patterns with fewer attempts.",
    settings: {
      correctScoreThreshold: 80,
      confirmedSubjectAttempts: 3,
      confirmedRuleAttempts: 2,
      strongSubjectThreshold: 75,
      weakSubjectThreshold: 75,
      weakRuleThreshold: 75,
      criticalPriorityThreshold: 40,
      highPriorityThreshold: 55,
      moderatePriorityThreshold: 75,
    },
  },
]

export const DEFAULT_STRENGTHS_WEAKNESSES_ANALYTICS_SETTINGS =
  ANALYTICS_SETTING_PRESETS.find((preset) => preset.name === "balanced")!
    .settings

type StoredSettingsValue = Partial<StrengthsWeaknessesAnalyticsSettings> & {
  version?: number
  updatedBy?: string | null
  presetName?: AnalyticsPresetName
  reason?: string | null
}

export type AnalyticsSettingsRecord = {
  settings: StrengthsWeaknessesAnalyticsSettings
  updatedAt: Date | null
  updatedBy: string | null
  isDefault: boolean
  presetName: AnalyticsPresetName
  reason: string | null
}

const percentageFields: Array<keyof StrengthsWeaknessesAnalyticsSettings> = [
  "correctScoreThreshold",
  "strongSubjectThreshold",
  "weakSubjectThreshold",
  "weakRuleThreshold",
  "criticalPriorityThreshold",
  "highPriorityThreshold",
  "moderatePriorityThreshold",
]

const attemptFields: Array<keyof StrengthsWeaknessesAnalyticsSettings> = [
  "confirmedSubjectAttempts",
  "confirmedRuleAttempts",
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function integerOrDefault(value: unknown, fallback: number) {
  const parsed = Number(value)
  return Number.isInteger(parsed) ? parsed : fallback
}

function sameSettings(
  left: StrengthsWeaknessesAnalyticsSettings,
  right: StrengthsWeaknessesAnalyticsSettings
) {
  return Object.keys(left).every((key) => {
    const typedKey = key as keyof StrengthsWeaknessesAnalyticsSettings
    return left[typedKey] === right[typedKey]
  })
}

export function detectAnalyticsPreset(
  settings: StrengthsWeaknessesAnalyticsSettings
): AnalyticsPresetName {
  const match = ANALYTICS_SETTING_PRESETS.find((preset) =>
    sameSettings(preset.settings, settings)
  )

  return match?.name ?? "custom"
}

export function getAnalyticsPreset(
  name: unknown
): AnalyticsPresetDefinition | null {
  if (typeof name !== "string") return null
  return ANALYTICS_SETTING_PRESETS.find((preset) => preset.name === name) ?? null
}

export function normalizeStrengthsWeaknessesAnalyticsSettings(
  value: unknown
): StrengthsWeaknessesAnalyticsSettings {
  const source = isRecord(value) ? value : {}
  const defaults = DEFAULT_STRENGTHS_WEAKNESSES_ANALYTICS_SETTINGS

  return {
    correctScoreThreshold: integerOrDefault(
      source.correctScoreThreshold,
      defaults.correctScoreThreshold
    ),
    confirmedSubjectAttempts: integerOrDefault(
      source.confirmedSubjectAttempts,
      defaults.confirmedSubjectAttempts
    ),
    confirmedRuleAttempts: integerOrDefault(
      source.confirmedRuleAttempts,
      defaults.confirmedRuleAttempts
    ),
    strongSubjectThreshold: integerOrDefault(
      source.strongSubjectThreshold,
      defaults.strongSubjectThreshold
    ),
    weakSubjectThreshold: integerOrDefault(
      source.weakSubjectThreshold,
      defaults.weakSubjectThreshold
    ),
    weakRuleThreshold: integerOrDefault(
      source.weakRuleThreshold,
      defaults.weakRuleThreshold
    ),
    criticalPriorityThreshold: integerOrDefault(
      source.criticalPriorityThreshold,
      defaults.criticalPriorityThreshold
    ),
    highPriorityThreshold: integerOrDefault(
      source.highPriorityThreshold,
      defaults.highPriorityThreshold
    ),
    moderatePriorityThreshold: integerOrDefault(
      source.moderatePriorityThreshold,
      defaults.moderatePriorityThreshold
    ),
  }
}

export function validateStrengthsWeaknessesAnalyticsSettings(
  settings: StrengthsWeaknessesAnalyticsSettings
) {
  const errors: string[] = []

  for (const field of percentageFields) {
    const value = settings[field]
    if (!Number.isInteger(value) || value < 0 || value > 100) {
      errors.push(`${field} must be a whole number from 0 to 100.`)
    }
  }

  for (const field of attemptFields) {
    const value = settings[field]
    if (!Number.isInteger(value) || value < 1 || value > 50) {
      errors.push(`${field} must be a whole number from 1 to 50.`)
    }
  }

  if (
    settings.strongSubjectThreshold < 60 ||
    settings.strongSubjectThreshold > 95
  ) {
    errors.push("Strong subject threshold must be from 60 to 95.")
  }

  if (
    settings.weakSubjectThreshold < 40 ||
    settings.weakSubjectThreshold > 90
  ) {
    errors.push("Weak subject threshold must be from 40 to 90.")
  }

  if (settings.weakRuleThreshold < 40 || settings.weakRuleThreshold > 90) {
    errors.push("Weak rule threshold must be from 40 to 90.")
  }

  if (
    settings.correctScoreThreshold < 50 ||
    settings.correctScoreThreshold > 100
  ) {
    errors.push("Correct score threshold must be from 50 to 100.")
  }

  if (settings.weakSubjectThreshold > settings.strongSubjectThreshold) {
    errors.push(
      "Weak subject threshold cannot be higher than the strong subject threshold."
    )
  }

  if (
    !(
      settings.criticalPriorityThreshold < settings.highPriorityThreshold &&
      settings.highPriorityThreshold < settings.moderatePriorityThreshold
    )
  ) {
    errors.push(
      "Priority thresholds must be ordered: Critical < High < Moderate."
    )
  }

  if (settings.moderatePriorityThreshold > settings.weakRuleThreshold) {
    errors.push(
      "Moderate priority threshold cannot be higher than the weak rule threshold."
    )
  }

  return errors
}

export async function getStrengthsWeaknessesAnalyticsSettingsRecord(): Promise<AnalyticsSettingsRecord> {
  const row = await prisma.feature_flags.findUnique({
    where: { key: STRENGTHS_WEAKNESSES_SETTINGS_KEY },
    select: {
      value: true,
      updated_at: true,
    },
  })

  if (!row) {
    return {
      settings: DEFAULT_STRENGTHS_WEAKNESSES_ANALYTICS_SETTINGS,
      updatedAt: null,
      updatedBy: null,
      isDefault: true,
      presetName: "balanced",
      reason: null,
    }
  }

  const stored = isRecord(row.value)
    ? (row.value as StoredSettingsValue)
    : {}

  const settings = normalizeStrengthsWeaknessesAnalyticsSettings(stored)
  const validationErrors = validateStrengthsWeaknessesAnalyticsSettings(settings)

  if (validationErrors.length > 0) {
    console.error(
      "Invalid stored strengths and weaknesses analytics settings. Falling back to Balanced.",
      validationErrors
    )

    return {
      settings: DEFAULT_STRENGTHS_WEAKNESSES_ANALYTICS_SETTINGS,
      updatedAt: row.updated_at,
      updatedBy:
        typeof stored.updatedBy === "string" ? stored.updatedBy : null,
      isDefault: true,
      presetName: "balanced",
      reason: null,
    }
  }

  const presetName = detectAnalyticsPreset(settings)

  return {
    settings,
    updatedAt: row.updated_at,
    updatedBy:
      typeof stored.updatedBy === "string" ? stored.updatedBy : null,
    isDefault: presetName === "balanced",
    presetName,
    reason: typeof stored.reason === "string" ? stored.reason : null,
  }
}

export async function getStrengthsWeaknessesAnalyticsSettings() {
  const record = await getStrengthsWeaknessesAnalyticsSettingsRecord()
  return record.settings
}

export async function saveStrengthsWeaknessesAnalyticsSettings(params: {
  settings: StrengthsWeaknessesAnalyticsSettings
  updatedBy: string
  presetName: AnalyticsPresetName
  reason?: string | null
}) {
  const errors = validateStrengthsWeaknessesAnalyticsSettings(params.settings)

  if (errors.length > 0) {
    throw new Error(errors.join(" "))
  }

  const storedValue: StoredSettingsValue = {
    version: 2,
    ...params.settings,
    updatedBy: params.updatedBy,
    presetName: params.presetName,
    reason: params.reason?.trim() || null,
  }

  return prisma.feature_flags.upsert({
    where: { key: STRENGTHS_WEAKNESSES_SETTINGS_KEY },
    create: {
      key: STRENGTHS_WEAKNESSES_SETTINGS_KEY,
      value: storedValue as Prisma.InputJsonValue,
      description:
        "Admin-controlled thresholds for Strengths & Weaknesses analytics.",
    },
    update: {
      value: storedValue as Prisma.InputJsonValue,
      description:
        "Admin-controlled thresholds for Strengths & Weaknesses analytics.",
      updated_at: new Date(),
    },
    select: {
      updated_at: true,
    },
  })
}
