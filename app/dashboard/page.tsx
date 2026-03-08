import { prisma } from "@/lib/prisma"
import {
  ClipboardList,
  TrendingUp,
  Flame,
  GraduationCap,
  Users
} from "lucide-react"

export default async function Dashboard() {

  const totalRules = await prisma.rule.count()

  return (
    <div className="p-8 space-y-8 bg-[#F6F8FC] min-h-screen">

      {/* TOP CARDS */}

      <div className="grid grid-cols-4 gap-6">

        <StatCard
          title="MBE QUESTIONS"
          value="0 / 60"
          subtitle="0 of 60 today"
        />

        <StatCard
          title="RULES (BLL)"
          value={`0 / ${totalRules}`}
          subtitle="Black letter law memorization"
        />

        <StatCard
          title="OVERALL MBE"
          value="65%"
          subtitle="State avg: 62%"
          color="text-orange-500"
        />

        <StatCard
          title="BLL SCORE"
          value="54%"
          subtitle="State avg: 66%"
          color="text-red-500"
        />

      </div>


      {/* SMART PLAN */}

      <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl p-6 flex justify-between items-center shadow">

        <div className="flex gap-4 items-center">
          <ClipboardList size={28} />

          <div>
            <div className="font-semibold text-lg">
              Today's Smart Plan
            </div>

            <div className="text-sm opacity-90">
              60 MBE questions • 10 rules • 6 spaced reviews
            </div>
          </div>
        </div>

        <button className="bg-white text-blue-600 px-4 py-2 rounded-lg font-medium hover:bg-gray-100">
          Train Weak Areas →
        </button>

      </div>


      {/* MAIN GRID */}

      <div className="grid grid-cols-2 gap-8">


        {/* SUBJECT ACCURACY */}

        <Card title="MBE Subject Accuracy">

          {[
            "Contracts",
            "Torts",
            "Evidence",
            "Civil Procedure",
            "Criminal Law",
            "Property",
            "Constitutional Law"
          ].map((subject) => (

            <div key={subject} className="space-y-1">

              <div className="flex justify-between text-sm">
                <span>{subject}</span>
                <span className="text-gray-500">62%</span>
              </div>

              <div className="h-2 bg-gray-200 rounded-full">

                <div className="h-2 bg-orange-500 rounded-full w-[62%]" />

              </div>

            </div>

          ))}

        </Card>


        {/* STATE COMPARISON */}

        <Card title="State Comparison">

          <div className="space-y-6">

            <Progress
              label="MBE Accuracy"
              value="65%"
              width="65%"
              color="bg-blue-600"
            />

            <Progress
              label="BLL Score"
              value="54%"
              width="54%"
              color="bg-purple-500"
            />

            <div className="grid grid-cols-2 gap-4 pt-4">

              <div className="border rounded-xl p-4 flex flex-col items-center">

                <Users className="text-gray-400" />

                <div className="text-xl font-semibold">206</div>

                <div className="text-sm text-gray-500">
                  State Users
                </div>

              </div>

              <div className="border rounded-xl p-4 flex flex-col items-center">

                <GraduationCap className="text-gray-400" />

                <div className="text-xl font-semibold">66%</div>

                <div className="text-sm text-gray-500">
                  Pass Rate
                </div>

              </div>

            </div>

          </div>

        </Card>



        {/* WEAK AREAS */}

        <Card title="Weak Areas">

          <div className="text-gray-400 text-sm">
            No weak areas detected yet
          </div>

        </Card>


        {/* STUDY STREAK */}

        <Card title="Study Streak">

          <div className="flex gap-2">

            {Array.from({ length: 7 }).map((_, i) => (

              <div
                key={i}
                className="w-8 h-8 rounded bg-orange-500"
              />

            ))}

          </div>

        </Card>


      </div>

    </div>
  )
}



function StatCard({ title, value, subtitle, color }) {

  return (

    <div className="bg-white p-5 rounded-xl shadow-sm">

      <div className="text-xs text-gray-500 tracking-wide">
        {title}
      </div>

      <div className={`text-2xl font-semibold mt-1 ${color || ""}`}>
        {value}
      </div>

      <div className="text-xs text-gray-400 mt-1">
        {subtitle}
      </div>

    </div>

  )

}



function Card({ title, children }) {

  return (

    <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">

      <h2 className="font-semibold text-gray-700">
        {title}
      </h2>

      {children}

    </div>

  )

}



function Progress({ label, value, width, color }) {

  return (

    <div className="space-y-1">

      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span>{value}</span>
      </div>

      <div className="h-2 bg-gray-200 rounded-full">

        <div
          className={`h-2 rounded-full ${color}`}
          style={{ width }}
        />

      </div>

    </div>

  )

}