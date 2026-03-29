"use client"

import { useEffect, useMemo, useState } from "react"
import { Users, GraduationCap, Check } from "lucide-react"

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

export default function StateComparison() {
  const [state, setState] = useState("KY")
  const [data, setData] = useState<any>(null)
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")

  useEffect(() => {
    fetch(`/api/state-comparison?state=${state}`)
      .then((res) => res.json())
      .then(setData)
  }, [state])

  const selectedState = useMemo(
    () => STATES.find((s) => s.code === state),
    [state]
  )

  const filteredStates = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return STATES
    return STATES.filter((s) => s.name.toLowerCase().includes(q))
  }, [search])

  if (!data) return null

  const userMBE = data.userMBE ?? 0
  const userBLL = data.userBLL ?? 0
  const stateMBEAvg = data.stateMBEAvg ?? 0
  const stateBLLAvg = data.stateBLLAvg ?? 0
  const topMBE = data.topMBE ?? 0
  const topBLL = Math.min(stateBLLAvg + 6, 100)

  const mbeDiff = userMBE - stateMBEAvg
  const bllDiff = userBLL - stateBLLAvg

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
      {/* HEADER */}
      <div className="flex justify-between items-start">
        <div>
          <div className="font-semibold text-gray-800">
            State Comparison
          </div>
          <div className="text-sm text-gray-500 mt-1">
            You vs {selectedState?.name ?? state} Average
          </div>
        </div>

        <button
          onClick={() => setOpen(true)}
          className="text-sm text-blue-600 font-medium hover:underline"
        >
          {selectedState?.name ?? state} ▾
        </button>
      </div>

      {/* MBE */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>MBE Accuracy</span>

          <div className="space-x-3">
            <span className="text-green-600 font-medium">
              You: {userMBE}%
            </span>
            <span className="text-gray-500">
              Avg: {stateMBEAvg}%
            </span>
            <span className="text-orange-500">
              Top: {topMBE}%
            </span>
          </div>
        </div>

        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-2 bg-blue-600 rounded-full"
            style={{ width: `${userMBE}%` }}
          />
        </div>

        <div className={`text-sm text-right ${mbeDiff >= 0 ? "text-green-600" : "text-red-500"}`}>
          {mbeDiff >= 0 ? "+" : ""}
          {mbeDiff}% vs {selectedState?.name ?? state} avg
        </div>
      </div>

      {/* BLL */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>BLL Score</span>

          <div className="space-x-3">
            <span className="text-red-500 font-medium">
              You: {userBLL}%
            </span>
            <span className="text-gray-500">
              Avg: {stateBLLAvg}%
            </span>
            <span className="text-orange-500">
              Top: {topBLL}%
            </span>
          </div>
        </div>

        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-2 bg-purple-500 rounded-full"
            style={{ width: `${userBLL}%` }}
          />
        </div>

        <div className={`text-sm text-right ${bllDiff >= 0 ? "text-green-600" : "text-red-500"}`}>
          {bllDiff >= 0 ? "+" : ""}
          {bllDiff}% vs {selectedState?.name ?? state} avg
        </div>
      </div>

      {/* STATE STATS */}
      <div className="grid grid-cols-2 gap-4 pt-2">
        <div className="border rounded-xl p-4 flex flex-col items-center bg-gray-50">
          <Users className="text-gray-400" />
          <div className="text-xl font-semibold">
            {data.stateUsers}
          </div>
          <div className="text-sm text-gray-500">
            {selectedState?.name ?? state} Users
          </div>
        </div>

        <div className="border rounded-xl p-4 flex flex-col items-center bg-gray-50">
          <GraduationCap className="text-gray-400" />
          <div className="text-xl font-semibold">
            {data.passRate}%
          </div>
          <div className="text-sm text-gray-500">
            {selectedState?.name ?? state} Pass Rate
          </div>
        </div>
      </div>

      {/* MODAL */}
      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-[520px] max-h-[620px] p-6 shadow-xl">
            <h2 className="text-xl font-semibold mb-4">
              Select Your Bar Exam State
            </h2>

            <input
              placeholder="Search states..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 outline-none"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <div className="overflow-y-auto max-h-[420px] space-y-2 pr-1">
              {filteredStates.map((s) => {
                const active = s.code === state

                return (
                  <div
                    key={s.code}
                    onClick={() => {
                      setState(s.code)
                      setOpen(false)
                    }}
                    className={`p-3 rounded-lg border cursor-pointer flex justify-between items-center transition ${
                      active
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {active && <Check size={16} className="text-blue-600" />}
                      <span className={`font-medium ${active ? "text-blue-700" : "text-gray-800"}`}>
                        {s.name}
                      </span>
                    </div>

                    <span className="text-xs text-gray-500">
                      {s.code}
                    </span>
                  </div>
                )
              })}
            </div>

            <div className="flex justify-end pt-4">
              <button
                onClick={() => setOpen(false)}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}