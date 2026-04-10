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
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Select Your Bar Exam State
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Choose the state used for your comparison data.
            </p>
          </div>

          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        <input
          placeholder="Search states..."
          className="mb-4 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-emerald-500 focus:bg-white"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />

        <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
          {filteredStates.map((s) => (
            <button
              key={s.code}
              onClick={() => {
                onSelectState(s.name)
                onClose()
              }}
              className={`flex w-full items-center justify-between rounded-lg border p-3.5 text-left transition-colors ${
                currentState === s.name
                  ? "border-emerald-400 bg-emerald-50"
                  : "border-slate-200 hover:bg-slate-50"
              }`}
            >
              <span className="font-medium text-slate-800">{s.name}</span>

              {currentState === s.name ? (
                <Check size={18} className="text-emerald-600" />
              ) : (
                <span className="text-xs text-slate-400">Select</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
