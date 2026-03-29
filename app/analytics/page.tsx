"use client"

import { useEffect, useMemo, useState } from "react"
import {
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import {
  Keyboard,
  PenLine,
  Highlighter,
  ArrowUpDown,
  PanelsTopLeft,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"

type DashboardData = {
  totalMBEQuestions: number
  mbeAccuracy: number
  bllScore: number
  ruleAttempts: number
  prevMBE: number
  prevBLL: number
}

type TrendPoint = {
  date: string
  mbe: number
  bll: number
}

type SubjectStat = {
  subject: string
  accuracy: number
}

type BLLSubjectStat = {
  name: string
  accuracy: number
  completed: number
  total: number
}

type ModeStats = {
  typing: number
  fillBlank: number
  buzzwords: number
  ordering: number
  flashcard: number
}

type WeakArea = {
  subject: string
  mastery: number
  critical: number
  needsWork: number
  improving: number
  mastered: number
}

const ALL_BLL_SUBJECTS = [
  "Contracts",
  "Torts",
  "Evidence",
  "Civil Procedure",
  "Criminal Law",
  "Property",
  "Constitutional Law",
  "Family Law",
  "Trusts",
  "Wills",
  "Secured Transactions",
  "Corporations",
  "Partnerships",
]

export default function AnalyticsPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [userId, setUserId] = useState<string | null>(null)
  const [loadingUser, setLoadingUser] = useState(true)

  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [trend, setTrend] = useState<TrendPoint[]>([])
  const [subjects, setSubjects] = useState<SubjectStat[]>([])
  const [bllSubjects, setBLLSubjects] = useState<BLLSubjectStat[]>([])
  const [tab, setTab] = useState<"mbe" | "bll">("mbe")
  const [modeStats, setModeStats] = useState<ModeStats | null>(null)
  const [weakAreas, setWeakAreas] = useState<WeakArea[]>([])

  const [range, setRange] = useState("30d")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  useEffect(() => {
    async function loadUser() {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser()

        if (error) {
          console.error("SUPABASE GET USER ERROR:", error)
          setLoadingUser(false)
          return
        }

        if (!user) {
          router.push("/login")
          return
        }

        setUserId(user.id)
      } catch (error) {
        console.error("LOAD USER ERROR:", error)
      } finally {
        setLoadingUser(false)
      }
    }

    loadUser()
  }, [router, supabase])

  useEffect(() => {
    async function load() {
      if (!userId) return

      try {
        const dashRes = await fetch(`/api/dashboard-analytics?userId=${userId}`)
        const dashData = await dashRes.json()
        setDashboard(dashData)

        const subRes = await fetch(`/api/mbe-subject-analytics?userId=${userId}`)
        const subData = await subRes.json()
        setSubjects(subData.subjects ?? [])

        const bllRes = await fetch(`/api/bll-subject-analytics?userId=${userId}`)
        const bllData = await bllRes.json()
        setBLLSubjects(bllData.subjects ?? [])

        const modeRes = await fetch(`/api/bll-mode-analytics?userId=${userId}`)
        const modeData = await modeRes.json()
        setModeStats(modeData)

        const weakRes = await fetch(`/api/rule-weak-areas?userId=${userId}`)
        const weakData = await weakRes.json()
        setWeakAreas(weakData.subjects ?? [])
      } catch (error) {
        console.error("Analytics load error:", error)
      }
    }

    load()
  }, [userId])

  useEffect(() => {
    async function loadTrend() {
      if (!userId) return

      try {
        let url = `/api/trend-analytics?userId=${userId}&range=${range}`

        if (range === "custom") {
          url = `/api/trend-analytics?userId=${userId}&start=${startDate}&end=${endDate}`
        }

        const res = await fetch(url)
        const data = await res.json()

        setTrend(data.trend ?? [])
      } catch (error) {
        console.error("Trend analytics load error:", error)
        setTrend([])
      }
    }

    loadTrend()
  }, [userId, range, startDate, endDate])

  if (loadingUser || !userId) {
    return <div className="p-10">Loading analytics...</div>
  }

  if (!dashboard) {
    return <div className="p-10">Loading analytics...</div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-6 md:p-10 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
          Analytics
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Performance overview
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="TOTAL MBE QS" value={dashboard.totalMBEQuestions} delta={0} />
        <StatCard
          title="MBE ACCURACY"
          value={`${dashboard.mbeAccuracy}%`}
          delta={dashboard.mbeAccuracy - dashboard.prevMBE}
        />
        <StatCard
          title="BLL SCORE"
          value={`${dashboard.bllScore}%`}
          delta={dashboard.bllScore - dashboard.prevBLL}
        />
        <StatCard title="RULE ATTEMPTS" value={dashboard.ruleAttempts} delta={0} />
      </div>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[1.7fr_1fr]">
        <div className="bg-white/80 backdrop-blur rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-5">
            <h2 className="text-sm font-semibold text-slate-800">
              Accuracy Trend
            </h2>

            <div className="flex flex-wrap gap-2">
              <RangeBtn label="Today" value="today" range={range} setRange={setRange} />
              <RangeBtn label="7D" value="7d" range={range} setRange={setRange} />
              <RangeBtn label="30D" value="30d" range={range} setRange={setRange} />
              <RangeBtn label="3M" value="90d" range={range} setRange={setRange} />
              <RangeBtn label="All" value="all" range={range} setRange={setRange} />
              <RangeBtn label="Custom" value="custom" range={range} setRange={setRange} />
            </div>
          </div>

          {range === "custom" && (
            <div className="flex flex-wrap gap-3 mb-4">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="border border-slate-200 px-3 py-2 rounded-lg text-sm bg-white"
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="border border-slate-200 px-3 py-2 rounded-lg text-sm bg-white"
              />
            </div>
          )}

          <div className="h-[320px]">
            <ResponsiveContainer>
              <AreaChart data={trend}>
                <CartesianGrid stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="mbe" stroke="#2563eb" fillOpacity={0.15} />
                <Area type="monotone" dataKey="bll" stroke="#7c3aed" fillOpacity={0.15} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-800">
              Subjects
            </h2>

            <div className="flex gap-2">
              <button
                onClick={() => setTab("mbe")}
                className={`px-3 py-1 text-xs rounded-full ${
                  tab === "mbe" ? "bg-blue-600 text-white" : "bg-slate-100"
                }`}
              >
                MBE
              </button>

              <button
                onClick={() => setTab("bll")}
                className={`px-3 py-1 text-xs rounded-full ${
                  tab === "bll" ? "bg-violet-600 text-white" : "bg-slate-100"
                }`}
              >
                BLL
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {tab === "mbe" &&
              subjects.map((s) => (
                <SubjectRow
                  key={s.subject}
                  label={s.subject}
                  value={s.accuracy}
                  pillClass="bg-blue-100 text-blue-600"
                  barClass="bg-blue-500"
                />
              ))}

            {tab === "bll" &&
              ALL_BLL_SUBJECTS.map((name) => {
                const subject = bllSubjects.find((s) => s.name === name)
                const percent = subject
                  ? subject.total === 0
                    ? 0
                    : Math.round((subject.completed / subject.total) * 100)
                  : 0

                return (
                  <SubjectRow
                    key={name}
                    label={name}
                    value={percent}
                    pillClass="bg-violet-100 text-violet-600"
                    barClass="bg-violet-500"
                  />
                )
              })}
          </div>
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-800 mb-4">
          Training Modes
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <ModeCard icon={<Keyboard />} title="Typing" percent={`${modeStats?.typing ?? 0}%`} attempts="accuracy" accent="text-red-500" />
          <ModeCard icon={<PenLine />} title="Fill Blank" percent={`${modeStats?.fillBlank ?? 0}%`} attempts="accuracy" accent="text-red-500" />
          <ModeCard icon={<Highlighter />} title="Buzzwords" percent={`${modeStats?.buzzwords ?? 0}%`} attempts="accuracy" accent="text-emerald-500" />
          <ModeCard icon={<ArrowUpDown />} title="Ordering" percent={`${modeStats?.ordering ?? 0}%`} attempts="accuracy" accent="text-red-500" />
          <ModeCard icon={<PanelsTopLeft />} title="Flashcard" percent={`${modeStats?.flashcard ?? 0}%`} attempts="accuracy" accent="text-orange-500" />
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-800 mb-4">
          Rule Mastery
        </h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {weakAreas.map((s) => (
            <div key={s.subject} className="border rounded-xl p-4 bg-slate-50">
              <div className="flex justify-between mb-2">
                <span>{s.subject}</span>
                <span>{s.mastery}%</span>
              </div>
              <div className="text-xs text-slate-500">
                Critical {s.critical} · Needs {s.needsWork} · Improving {s.improving} · Done {s.mastered}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function StatCard({
  title,
  value,
  delta,
}: {
  title: string
  value: any
  delta: number
}) {
  const color =
    delta > 0 ? "text-green-600" : delta < 0 ? "text-red-600" : "text-slate-400"

  const arrow =
    delta > 0 ? "↑" : delta < 0 ? "↓" : "→"

  return (
    <div className="bg-white/80 backdrop-blur border border-slate-200 p-5 rounded-2xl shadow-sm hover:shadow-md transition">
      <div className="text-[11px] tracking-wide text-slate-400 uppercase">
        {title}
      </div>

      <div className="text-3xl font-semibold mt-2 text-slate-900">
        {value}
      </div>

      <div className={`text-xs mt-2 ${color}`}>
        {arrow} {Math.abs(delta)}%
      </div>
    </div>
  )
}

function SubjectRow({
  label,
  value,
  pillClass,
  barClass,
}: {
  label: string
  value: number
  pillClass: string
  barClass: string
}) {
  return (
    <div>
      <div className="flex justify-between items-center text-sm mb-2">
        <span className="text-slate-700">{label}</span>
        <span
          className={`text-xs px-2.5 py-1 rounded-full font-semibold ${pillClass}`}
        >
          {value}%
        </span>
      </div>

      <div className="w-full h-2.5 bg-slate-100 rounded-full">
        <div
          className={`h-2.5 rounded-full ${barClass}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  )
}

function ModeCard({
  icon,
  title,
  percent,
  attempts,
  accent,
}: {
  icon: React.ReactNode
  title: string
  percent: string
  attempts: string
  accent: string
}) {
  return (
    <div className="border border-slate-200 rounded-2xl p-4 text-center bg-white/80 backdrop-blur hover:shadow-md transition cursor-pointer">
      <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500">
        {icon}
      </div>

      <div className="text-sm font-medium text-slate-800">
        {title}
      </div>

      <div className={`text-2xl font-semibold mt-2 ${accent}`}>
        {percent}
      </div>

      <div className="text-xs text-slate-400 mt-1">
        {attempts}
      </div>
    </div>
  )
}

function RangeBtn({
  label,
  value,
  range,
  setRange,
}: {
  label: string
  value: string
  range: string
  setRange: (v: string) => void
}) {
  const active = range === value

  return (
    <button
      onClick={() => setRange(value)}
      className={`px-3 py-1.5 text-xs rounded-full transition ${
        active
          ? "bg-blue-600 text-white shadow-sm"
          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
      }`}
    >
      {label}
    </button>
  )
}