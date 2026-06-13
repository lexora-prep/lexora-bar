"use client"

import { useMemo, useState } from "react"
import type {
  AnalyticsPresetName,
  StrengthsWeaknessesAnalyticsSettings,
} from "@/lib/analytics-settings"

type UpdatedBy = {
  id: string
  email: string
  name: string | null
} | null

type PresetDefinition = {
  name: AnalyticsPresetName
  title: string
  description: string
  settings: StrengthsWeaknessesAnalyticsSettings
}

type Props = {
  initialSettings: StrengthsWeaknessesAnalyticsSettings
  presets: PresetDefinition[]
  initialUpdatedAt: string | null
  initialUpdatedBy: UpdatedBy
  initialIsDefault: boolean
  canUseAdvanced: boolean
}

type SaveState =
  | { type: "idle"; message: "" }
  | { type: "saving"; message: string }
  | { type: "success"; message: string }
  | { type: "error"; message: string }

const fieldGroups: Array<{
  title: string
  description: string
  fields: Array<{
    key: keyof StrengthsWeaknessesAnalyticsSettings
    label: string
    suffix: string
    help: string
  }>
}> = [
  {
    title: "Classification",
    description: "Controls how recorded scores are classified.",
    fields: [
      {
        key: "strongSubjectThreshold",
        label: "Strong subject at or above",
        suffix: "%",
        help: "Subjects at or above this average appear as strengths.",
      },
      {
        key: "weakSubjectThreshold",
        label: "Weak subject below",
        suffix: "%",
        help: "Subjects below this average appear as weaknesses.",
      },
      {
        key: "weakRuleThreshold",
        label: "Weak rule below",
        suffix: "%",
        help: "Rules below this average remain in the weakness table.",
      },
      {
        key: "correctScoreThreshold",
        label: "Correct attempt at or above",
        suffix: "%",
        help: "Used for correct-versus-incorrect attempt counts.",
      },
    ],
  },
  {
    title: "Confidence Requirements",
    description: "Early data still appears; these values mark it confirmed.",
    fields: [
      {
        key: "confirmedSubjectAttempts",
        label: "Confirmed subject after",
        suffix: "attempts",
        help: "Minimum scored attempts before subject data is confirmed.",
      },
      {
        key: "confirmedRuleAttempts",
        label: "Confirmed rule after",
        suffix: "attempts",
        help: "Minimum scored attempts before rule data is confirmed.",
      },
    ],
  },
  {
    title: "Priority Levels",
    description: "Thresholds must remain ordered: Critical < High < Moderate.",
    fields: [
      {
        key: "criticalPriorityThreshold",
        label: "Critical below",
        suffix: "%",
        help: "Rules below this average receive critical priority.",
      },
      {
        key: "highPriorityThreshold",
        label: "High below",
        suffix: "%",
        help: "Rules below this average receive high priority.",
      },
      {
        key: "moderatePriorityThreshold",
        label: "Moderate below",
        suffix: "%",
        help: "Rules below this average receive moderate priority.",
      },
    ],
  },
]

function sameSettings(
  left: StrengthsWeaknessesAnalyticsSettings,
  right: StrengthsWeaknessesAnalyticsSettings
) {
  return Object.keys(left).every((key) => {
    const typedKey = key as keyof StrengthsWeaknessesAnalyticsSettings
    return left[typedKey] === right[typedKey]
  })
}

function formatUpdatedAt(value: string | null) {
  if (!value) return "Using the Balanced preset"

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Updated"

  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date)
}

export function AnalyticsSettingsForm({
  initialSettings,
  presets,
  initialUpdatedAt,
  initialUpdatedBy,
  initialIsDefault,
  canUseAdvanced,
}: Props) {
  const balancedPreset =
    presets.find((preset) => preset.name === "balanced") ?? presets[0]

  const [settings, setSettings] = useState(initialSettings)
  const [savedSettings, setSavedSettings] = useState(initialSettings)
  const [selectedPreset, setSelectedPreset] = useState<AnalyticsPresetName>(() => {
    const match = presets.find((preset) =>
      sameSettings(preset.settings, initialSettings)
    )
    return match?.name ?? "custom"
  })
  const [updatedAt, setUpdatedAt] = useState(initialUpdatedAt)
  const [updatedBy, setUpdatedBy] = useState<UpdatedBy>(initialUpdatedBy)
  const [isDefault, setIsDefault] = useState(initialIsDefault)
  const [advancedUnlocked, setAdvancedUnlocked] = useState(false)
  const [unlockText, setUnlockText] = useState("")
  const [reason, setReason] = useState("")
  const [saveState, setSaveState] = useState<SaveState>({
    type: "idle",
    message: "",
  })

  const isDirty = useMemo(
    () => !sameSettings(settings, savedSettings),
    [settings, savedSettings]
  )

  const updaterLabel = updatedBy
    ? updatedBy.name?.trim() || updatedBy.email
    : "No administrator update recorded"

  function choosePreset(preset: PresetDefinition) {
    setSelectedPreset(preset.name)
    setSettings(preset.settings)
    setAdvancedUnlocked(false)
    setUnlockText("")
    setReason("")
    setSaveState({ type: "idle", message: "" })
  }

  function updateField(
    key: keyof StrengthsWeaknessesAnalyticsSettings,
    rawValue: string
  ) {
    const parsed = Number(rawValue)

    setSettings((current) => ({
      ...current,
      [key]: Number.isFinite(parsed) ? Math.trunc(parsed) : 0,
    }))
    setSelectedPreset("custom")
    setSaveState({ type: "idle", message: "" })
  }

  async function savePreset() {
    if (selectedPreset === "custom") {
      setSaveState({
        type: "error",
        message: "Choose an approved preset or use Advanced Configuration.",
      })
      return
    }

    const preset = presets.find((item) => item.name === selectedPreset)
    if (!preset) return

    const confirmed = window.confirm(
      `Apply the ${preset.title} preset? This changes how all users are classified on their next analytics request. Historical attempts will not be modified.`
    )

    if (!confirmed) return

    await saveRequest({
      mode: "preset",
      presetName: preset.name,
    })
  }

  async function saveAdvanced() {
    if (!advancedUnlocked || !canUseAdvanced) return

    if (reason.trim().length < 10) {
      setSaveState({
        type: "error",
        message: "Enter a clear reason of at least 10 characters.",
      })
      return
    }

    const confirmed = window.confirm(
      "Save this custom analytics configuration? This can reclassify users immediately. Historical attempts will not be modified."
    )

    if (!confirmed) return

    await saveRequest({
      mode: "advanced",
      settings,
      reason: reason.trim(),
    })
  }

  async function saveRequest(payload: Record<string, unknown>) {
    setSaveState({
      type: "saving",
      message: "Saving analytics settings...",
    })

    try {
      const response = await fetch("/api/admin/analytics-settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      const result = await response.json().catch(() => null)

      if (!response.ok || !result?.ok) {
        throw new Error(result?.error || "Analytics settings could not be saved.")
      }

      setSettings(result.settings)
      setSavedSettings(result.settings)
      setUpdatedAt(result.updatedAt)
      setUpdatedBy(result.updatedBy)
      setIsDefault(Boolean(result.isDefault))
      setSelectedPreset(result.activePreset ?? "custom")
      setAdvancedUnlocked(false)
      setUnlockText("")
      setReason("")
      setSaveState({
        type: "success",
        message: "Analytics settings saved. New analytics requests will use them immediately.",
      })
    } catch (error) {
      setSaveState({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Analytics settings could not be saved.",
      })
    }
  }

  function unlockAdvanced() {
    if (unlockText.trim().toUpperCase() !== "ADVANCED") {
      setSaveState({
        type: "error",
        message: 'Type "ADVANCED" exactly to unlock manual configuration.',
      })
      return
    }

    setAdvancedUnlocked(true)
    setSelectedPreset("custom")
    setSaveState({ type: "idle", message: "" })
  }

  return (
    <section className="border-t border-[#E6E0D4] bg-white">
      <div className="border-b border-[#E6E0D4] px-6 py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-[16px] font-medium text-[#111827]">
              Analytics Configuration
            </div>
            <div className="mt-1 max-w-[760px] text-[12px] leading-5 text-[#6B6B6B]">
              Use an approved preset for safe classification. Balanced is the recommended production setting.
            </div>
          </div>

          <span
            className={`rounded px-2.5 py-1 text-[11px] ${
              selectedPreset === "balanced" || isDefault
                ? "bg-[#EDF7EE] text-[#2A6041]"
                : selectedPreset === "custom"
                  ? "bg-[#FFF4D6] text-[#9A6A00]"
                  : "bg-[#EEF2F7] text-[#4B5D7A]"
            }`}
          >
            {selectedPreset === "custom"
              ? "Custom configuration"
              : `${presets.find((item) => item.name === selectedPreset)?.title ?? "Preset"} selected`}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 border-b border-[#E6E0D4] lg:grid-cols-3">
        {presets.map((preset, index) => {
          const selected = selectedPreset === preset.name
          const isBalanced = preset.name === "balanced"

          return (
            <button
              key={preset.name}
              type="button"
              onClick={() => choosePreset(preset)}
              disabled={saveState.type === "saving"}
              className={`px-6 py-5 text-left transition ${
                index < presets.length - 1
                  ? "border-b border-[#EEE8DD] lg:border-b-0 lg:border-r"
                  : ""
              } ${selected ? "bg-[#F7F4FF]" : "bg-white hover:bg-[#FCFBF8]"}`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-[14px] font-medium text-[#111827]">
                  {preset.title}
                </span>
                {isBalanced ? (
                  <span className="rounded bg-[#EDF7EE] px-2 py-1 text-[10px] text-[#2A6041]">
                    Recommended
                  </span>
                ) : null}
              </div>

              <p className="mt-2 text-[11px] leading-5 text-[#6B7280]">
                {preset.description}
              </p>

              <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-[10px] text-[#6B7280]">
                <span>Strong ≥ {preset.settings.strongSubjectThreshold}%</span>
                <span>Weak &lt; {preset.settings.weakSubjectThreshold}%</span>
                <span>Weak rule &lt; {preset.settings.weakRuleThreshold}%</span>
                <span>Correct ≥ {preset.settings.correctScoreThreshold}%</span>
                <span>Subject: {preset.settings.confirmedSubjectAttempts} attempts</span>
                <span>Rule: {preset.settings.confirmedRuleAttempts} attempts</span>
              </div>

              <div className="mt-4 text-[11px] text-[#6A4BBC]">
                {selected ? "Selected" : "Select preset"}
              </div>
            </button>
          )
        })}
      </div>

      <div className="flex flex-col gap-3 border-b border-[#E6E0D4] bg-[#FCFBF8] px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-[11px] leading-5 text-[#6B7280]">
          Presets are saved exactly as approved. The browser cannot alter their values.
        </div>

        <div className="flex flex-wrap gap-2">
          {balancedPreset ? (
            <button
              type="button"
              onClick={() => choosePreset(balancedPreset)}
              disabled={saveState.type === "saving"}
              className="border border-[#DDD7CC] bg-white px-3 py-2 text-[12px] text-[#3A3A3A] hover:bg-[#F7F3EC] disabled:opacity-50"
            >
              Select Balanced
            </button>
          ) : null}

          <button
            type="button"
            onClick={savePreset}
            disabled={
              selectedPreset === "custom" ||
              !isDirty ||
              saveState.type === "saving"
            }
            className="rounded bg-[#111111] px-4 py-2 text-[12px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saveState.type === "saving" ? "Saving..." : "Apply Selected Preset"}
          </button>
        </div>
      </div>

      <div className="border-b border-[#E6E0D4] px-6 py-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-[14px] font-medium text-[#111827]">
              Advanced Configuration
            </div>
            <div className="mt-1 max-w-[760px] text-[11px] leading-5 text-[#6B7280]">
              Manual values are for exceptional cases only. Presets are safer for production.
            </div>
          </div>

          {!canUseAdvanced ? (
            <span className="rounded bg-[#EEF2F7] px-2.5 py-1 text-[10px] text-[#4B5D7A]">
              Super Admin only
            </span>
          ) : null}
        </div>

        {canUseAdvanced && !advancedUnlocked ? (
          <div className="mt-4 flex flex-col gap-3 border border-[#E5D7B2] bg-[#FFF9E8] p-4 sm:flex-row sm:items-end">
            <label className="min-w-0 flex-1">
              <span className="block text-[11px] text-[#6B5A24]">
                Type ADVANCED to unlock manual values
              </span>
              <input
                value={unlockText}
                onChange={(event) => setUnlockText(event.target.value)}
                className="mt-2 w-full border border-[#E5D7B2] bg-white px-3 py-2 text-[12px] outline-none"
              />
            </label>

            <button
              type="button"
              onClick={unlockAdvanced}
              className="border border-[#E5D7B2] bg-white px-3 py-2 text-[12px] text-[#6B5A24] hover:bg-[#FFF4D6]"
            >
              Unlock Advanced
            </button>
          </div>
        ) : null}

        {canUseAdvanced && advancedUnlocked ? (
          <div className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-3">
              {fieldGroups.map((group, groupIndex) => (
                <div
                  key={group.title}
                  className={`py-4 lg:px-5 ${
                    groupIndex < fieldGroups.length - 1
                      ? "border-b border-[#EEE8DD] lg:border-b-0 lg:border-r"
                      : ""
                  } ${groupIndex === 0 ? "lg:pl-0" : ""}`}
                >
                  <div className="text-[13px] font-medium text-[#111827]">
                    {group.title}
                  </div>
                  <div className="mt-1 text-[10px] leading-4 text-[#6B7280]">
                    {group.description}
                  </div>

                  <div className="mt-3 divide-y divide-[#EEE8DD]">
                    {group.fields.map((field) => (
                      <label
                        key={field.key}
                        className="grid grid-cols-[1fr_106px] items-center gap-3 py-3"
                      >
                        <span className="min-w-0">
                          <span className="block text-[11px] text-[#111827]">
                            {field.label}
                          </span>
                          <span className="mt-1 block text-[9px] leading-4 text-[#8E96A3]">
                            {field.help}
                          </span>
                        </span>

                        <span className="flex items-center border border-[#DDD7CC] bg-white">
                          <input
                            type="number"
                            min={field.suffix === "%" ? 0 : 1}
                            max={field.suffix === "%" ? 100 : 50}
                            step={1}
                            value={settings[field.key]}
                            onChange={(event) =>
                              updateField(field.key, event.target.value)
                            }
                            className="min-w-0 flex-1 bg-transparent px-3 py-2 text-right text-[11px] text-[#111827] outline-none"
                          />
                          <span className="border-l border-[#EEE8DD] px-2 py-2 text-[9px] text-[#8E96A3]">
                            {field.suffix}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <label className="mt-4 block">
              <span className="text-[11px] text-[#111827]">
                Required reason for custom configuration
              </span>
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={3}
                placeholder="Explain why the approved presets are not suitable."
                className="mt-2 w-full resize-none border border-[#DDD7CC] bg-white px-3 py-2 text-[11px] leading-5 outline-none"
              />
            </label>

            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={saveAdvanced}
                disabled={!isDirty || saveState.type === "saving"}
                className="rounded bg-[#7A3E00] px-4 py-2 text-[12px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                Save Custom Configuration
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-2 bg-[#FCFBF8] px-6 py-4 text-[11px] leading-5 text-[#6B7280] sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div>{formatUpdatedAt(updatedAt)}</div>
          <div>Last updated by: {updaterLabel}</div>
          {saveState.message ? (
            <div
              className={`mt-1 ${
                saveState.type === "error"
                  ? "text-[#B44C4C]"
                  : saveState.type === "success"
                    ? "text-[#2A6041]"
                    : "text-[#6A4BBC]"
              }`}
            >
              {saveState.message}
            </div>
          ) : null}
        </div>

        <div className="text-[10px] text-[#8E96A3]">
          Historical attempts are never changed.
        </div>
      </div>
    </section>
  )
}
