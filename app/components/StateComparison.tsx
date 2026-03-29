"use client"

import { useEffect, useState } from "react"
import { Users, GraduationCap } from "lucide-react"

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
  { code: "WY", name: "Wyoming" }
]

export default function StateComparison() {

  const [state, setState] = useState("KY")
  const [data, setData] = useState<any>(null)
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")

  useEffect(() => {
    fetch(`/api/state-comparison?state=${state}`)
      .then(res => res.json())
      .then(setData)
  }, [state])

  if (!data) return null

  const filteredStates = STATES.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 space-y-6">

      {/* HEADER */}

      <div className="flex justify-between items-center">

        <div className="font-semibold text-gray-700">
          State Comparison
        </div>

        <button
          onClick={() => setOpen(true)}
          className="text-sm text-blue-600 hover:underline"
        >
          Change State →
        </button>

      </div>

      {/* STATE MODAL */}

      {open && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">

          <div className="bg-white rounded-xl shadow-xl w-[500px] max-h-[600px] p-6">

            <h2 className="text-lg font-semibold mb-3">
              Select Your Bar Exam State
            </h2>

            <input
              placeholder="Search states..."
              className="w-full border rounded-md p-2 mb-4"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <div className="overflow-y-auto max-h-[400px] space-y-2">

              {filteredStates.map((s) => (

                <div
                  key={s.code}
                  onClick={() => {
                    setState(s.code)
                    setOpen(false)
                  }}
                  className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50 flex justify-between"
                >
                  <span className="font-medium">{s.name}</span>
                  <span className="text-xs text-gray-500">
                    MBE: {data.userMBE}% · BLL: {data.userBLL}%
                  </span>
                </div>

              ))}

            </div>

          </div>

        </div>
      )}

      {/* MBE BAR */}

      <div>
        <div className="flex justify-between text-sm">
          <span>MBE Accuracy</span>
          <span>{data.userMBE}%</span>
        </div>

        <div className="h-2 bg-gray-200 rounded mt-1">
          <div
            className="h-2 bg-blue-600 rounded"
            style={{ width: `${data.userMBE}%` }}
          />
        </div>
      </div>

      {/* BLL BAR */}

      <div>
        <div className="flex justify-between text-sm">
          <span>BLL Score</span>
          <span>{data.userBLL}%</span>
        </div>

        <div className="h-2 bg-gray-200 rounded mt-1">
          <div
            className="h-2 bg-purple-500 rounded"
            style={{ width: `${data.userBLL}%` }}
          />
        </div>
      </div>

      {/* STATS */}

      <div className="grid grid-cols-2 gap-4 pt-2">

        <div className="border rounded-xl p-4 flex flex-col items-center">
          <Users className="text-gray-400" />
          <div className="text-xl font-semibold">{data.stateUsers}</div>
          <div className="text-sm text-gray-500">State Users</div>
        </div>

        <div className="border rounded-xl p-4 flex flex-col items-center">
          <GraduationCap className="text-gray-400" />
          <div className="text-xl font-semibold">{data.passRate}%</div>
          <div className="text-sm text-gray-500">Pass Rate</div>
        </div>

      </div>

    </div>
  )
}