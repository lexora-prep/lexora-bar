"use client"

import { X, Check } from "lucide-react"

const STATES = [
  { code: "AL", name: "Alabama" },
  { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" },
  { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" },
  { code: "DE", name: "Delaware" },
  { code: "DC", name: "District of Columbia" },
  { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" },
  { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" },
  { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" },
  { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" },
  { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" },
  { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" },
  { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" },
  { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" },
  { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" },
  { code: "WY", name: "Wyoming" },
]

interface StateSelectorModalProps {
  open: boolean
  onClose: () => void
  currentState: string
  onSelectState: (state: string) => void
  search: string
  onSearchChange: (value: string) => void
}

export function StateSelectorModal({
  open,
  onClose,
  currentState,
  onSelectState,
  search,
  onSearchChange,
}: StateSelectorModalProps) {
  if (!open) return null

  const filteredStates = STATES.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl border border-border bg-card p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Select Your Bar Exam State
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Choose the state used for your comparison data.
            </p>
          </div>

          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <X size={16} />
          </button>
        </div>

        <input
          placeholder="Search states..."
          className="mb-4 w-full rounded-lg border border-border bg-secondary px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-emerald-500"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />

        <div className="max-h-80 space-y-1 overflow-y-auto pr-1">
          {filteredStates.map((s) => (
            <button
              key={s.code}
              onClick={() => {
                onSelectState(s.name)
                onClose()
              }}
              className={`flex w-full items-center justify-between rounded-lg border p-3 text-left transition-colors ${
                currentState === s.name
                  ? "border-emerald-500/50 bg-emerald-500/10"
                  : "border-border hover:bg-secondary"
              }`}
            >
              <span className="font-medium text-foreground">{s.name}</span>

              {currentState === s.name ? (
                <Check size={16} className="text-emerald-400" />
              ) : (
                <span className="text-xs text-muted-foreground">Select</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
