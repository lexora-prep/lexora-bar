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
  Lock,
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
  completed?: number
  total?: number
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

type ProfileData = {
  mbe_access?: boolean
}

const ALL_BLL_SUBJECTS = [
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
]

export default function AnalyticsPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [userId, setUserId] = useState<string | null>(null)
  const [loadingUser, setLoadingUser] = useState(true)
  const [isPremium, setIsPremium] = useState(false)

  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [trend, setTrend] = useState<TrendPoint[]>([])
  const [subjects, setSubjects] = useState<SubjectStat[]>([])
  const [bllSubjects, setBLLSubjects] = useState<BLLSubjectStat[]>([])
  const [tab, setTab] = useState<"mbe" | "bll">("bll")
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

        const profileRes = await fetch(`/api/profile?userId=${user.id}`, {
          cache: "no-store",
        })

        if (profileRes.ok) {
          const profile: ProfileData = await profileRes.json()
          setIsPremium(!!profile?.mbe_access)
        }
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
        const [dashRes, subRes, bllRes, modeRes, weakRes] = await Promise.all([
          fetch(`/api/dashboard-analytics?userId=${userId}`, { cache: "no-store" }),
          fetch(`/api/mbe-subject-analytics?userId=${userId}`, { cache: "no-store" }),
          fetch(`/api/bll-subject-analytics?userId=${userId}`, { cache: "no-store" }),
          fetch(`/api/bll-mode-analytics?userId=${userId}`, { cache: "no-store" }),
          fetch(`/api/weak-areas?userId=${userId}`, { cache: "no-store" }),
        ])

        const dashData = await dashRes.json()
        const subData = await subRes.json()
        const bllData = await bllRes.json()
        const modeData = await modeRes.json()
        const weakData = await weakRes.json()

        setDashboard(dashData)
        setSubjects(Array.isArray(subData?.subjects) ? subData.subjects : [])
        setBLLSubjects(Array.isArray(bllData?.subjects) ? bllData.subjects : [])
        setModeStats(modeData ?? null)
        setWeakAreas(Array.isArray(weakData?.weakAreas) ? weakData.weakAreas : [])
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
          if (!startDate || !endDate) {
            setTrend([])
            return
          }
          url = `/api/trend-analytics?userId=${userId}&start=${startDate}&end=${endDate}`
        }

        const res = await fetch(url, {
          cache: "no-store",
        })
        const data = await res.json()

        setTrend(Array.isArray(data?.trend) ? data.trend : [])
      } catch (error) {
        console.error("Trend analytics load error:", error)
        setTrend([])
      }
    }

    loadTrend()
  }, [userId, range, startDate, endDate])

  if (loadingUser || !userId) {
    return <div className="p-6 text-sm text-slate-500">Loading analytics...</div>
  }

  if (!dashboard) {
    return <div className="p-6 text-sm text-slate-500">Loading analytics...</div>
  }

  const chartData =
    tab === "mbe" && !isPremium
      ? []
      : trend.map((item) => ({
          date: shortDateLabel(item.date),
          score: tab === "mbe" ? Number(item.mbe ?? 0) : Number(item.bll ?? 0),
        }))

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-4 md:p-5 space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
          Analytics
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Compact performance overview
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          title="TOTAL MBE QS"
          value={isPremium ? dashboard.totalMBEQuestions : "—"}
          delta={0}
          locked={!isPremium}
        />
        <StatCard
          title="MBE ACCURACY"
          value={isPremium ? `${dashboard.mbeAccuracy}%` : "—"}
          delta={isPremium ? dashboard.mbeAccuracy - dashboard.prevMBE : 0}
          locked={!isPremium}
        />
        <StatCard
          title="BLL SCORE"
          value={`${dashboard.bllScore}%`}
          delta={dashboard.bllScore - dashboard.prevBLL}
        />
        <StatCard
          title="RULE ATTEMPTS"
          value={dashboard.ruleAttempts}
          delta={0}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.45fr_1fr]">
        <div className="bg-white/90 backdrop-blur rounded-2xl border border-slate-200 p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-slate-800">
                Accuracy Trend
              </h2>

              <div className="flex gap-2">
                <button
                  onClick={() => setTab("bll")}
                  className={`px-3 py-1 text-xs rounded-full ${
                    tab === "bll" ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  BLL
                </button>

                <button
                  onClick={() => {
                    if (!isPremium) {
                      router.push("/subscription")
                      return
                    }
                    setTab("mbe")
                  }}
                  className={`px-3 py-1 text-xs rounded-full ${
                    tab === "mbe" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  MBE
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <RangeBtn label="Today" value="today" range={range} setRange={setRange} />
              <RangeBtn label="7D" value="7d" range={range} setRange={setRange} />
              <RangeBtn label="14D" value="14d" range={range} setRange={setRange} />
              <RangeBtn label="30D" value="30d" range={range} setRange={setRange} />
              <RangeBtn label="3M" value="90d" range={range} setRange={setRange} />
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

          <div className="h-[230px]">
            {tab === "mbe" && !isPremium ? (
              <LockedPanel text="Upgrade to Premium to see MBE trend data." />
            ) : chartData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">
                No trend data yet.
              </div>
            ) : (
              <ResponsiveContainer>
                <AreaChart data={chartData}>
                  <CartesianGrid stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="score"
                    name={tab === "mbe" ? "MBE Accuracy" : "BLL Accuracy"}
                    stroke={tab === "mbe" ? "#2563eb" : "#7c3aed"}
                    fillOpacity={0.15}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur rounded-2xl border border-slate-200 p-4 shadow-sm min-h-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-800">
              Accuracy by Subject
            </h2>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (!isPremium) {
                    router.push("/subscription")
                    return
                  }
                  setTab("mbe")
                }}
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

          <div className="max-h-[320px] space-y-3 overflow-y-auto pr-1">
            {tab === "mbe" &&
              (isPremium ? (
                subjects.map((s) => (
                  <SubjectRow
                    key={s.subject}
                    label={s.subject}
                    value={s.accuracy}
                    secondary={`${s.completed ?? 0} / ${s.total ?? 0}`}
                    pillClass="bg-blue-100 text-blue-600"
                    barClass="bg-blue-500"
                  />
                ))
              ) : (
                <LockedPanel text="Upgrade to Premium to see MBE subject analytics." compact />
              ))}

            {tab === "bll" &&
              ALL_BLL_SUBJECTS.map((name) => {
                const subject = bllSubjects.find((s) => s.name === name)
                const percent = subject?.accuracy ?? 0
                const completed = subject?.completed ?? 0
                const total = subject?.total ?? 0

                return (
                  <SubjectRow
                    key={name}
                    label={name}
                    value={percent}
                    secondary={`${completed} / ${total}`}
                    pillClass="bg-violet-100 text-violet-600"
                    barClass="bg-violet-500"
                  />
                )
              })}
          </div>
        </div>
      </div>

      <div className="bg-white/90 backdrop-blur rounded-2xl border border-slate-200 p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-800 mb-3">
          Training Modes
        </h2>

        <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
          <ModeCard icon={<Keyboard size={16} />} title="Typing" percent={`${modeStats?.typing ?? 0}%`} attempts="accuracy" accent="text-red-500" />
          <ModeCard icon={<PenLine size={16} />} title="Fill Blank" percent={`${modeStats?.fillBlank ?? 0}%`} attempts="accuracy" accent="text-red-500" />
          <ModeCard icon={<Highlighter size={16} />} title="Buzzwords" percent={`${modeStats?.buzzwords ?? 0}%`} attempts="accuracy" accent="text-emerald-500" />
          <ModeCard icon={<ArrowUpDown size={16} />} title="Ordering" percent={`${modeStats?.ordering ?? 0}%`} attempts="accuracy" accent="text-red-500" />
          <ModeCard icon={<PanelsTopLeft size={16} />} title="Flashcard" percent={`${modeStats?.flashcard ?? 0}%`} attempts="accuracy" accent="text-orange-500" />
        </div>
      </div>

      <div className="bg-white/90 backdrop-blur rounded-2xl border border-slate-200 p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-800 mb-3">
          Weak Areas Snapshot
        </h2>

        {weakAreas.length === 0 ? (
          <div className="text-sm text-slate-500">
            No weak areas yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {weakAreas.slice(0, 6).map((s, index) => (
              <div key={`${s.subject}-${index}`} className="border rounded-xl p-3 bg-slate-50">
                <div className="flex justify-between mb-2 text-sm font-medium text-slate-800">
                  <span>{s.subject}</span>
                  <span>{s.mastery}%</span>
                </div>
                <div className="text-xs text-slate-500">
                  Critical {s.critical} • Needs {s.needsWork} • Improving {s.improving} • Done {s.mastered}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function shortDateLabel(value: string) {
  const date = new Date(value)
  if (isNaN(date.getTime())) return value
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}

function StatCard({
  title,
  value,
  delta,
  locked = false,
}: {
  title: string
  value: any
  delta: number
  locked?: boolean
}) {
  const color =
    delta > 0 ? "text-green-600" : delta < 0 ? "text-red-600" : "text-slate-400"

  const arrow =
    delta > 0 ? "↑" : delta < 0 ? "↓" : "→"

  return (
    <div className="bg-white/90 backdrop-blur border border-slate-200 p-4 rounded-2xl shadow-sm">
      <div className="flex items-center justify-between">
        <div className="text-[10px] tracking-wide text-slate-400 uppercase">
          {title}
        </div>
        {locked && <Lock size={12} className="text-amber-500" />}
      </div>

      <div className="text-2xl font-semibold mt-2 text-slate-900">
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
  secondary,
  pillClass,
  barClass,
}: {
  label: string
  value: number
  secondary?: string
  pillClass: string
  barClass: string
}) {
  return (
    <div>
      <div className="flex justify-between items-center text-sm mb-2 gap-3">
        <div className="min-w-0">
          <span className="text-slate-700">{label}</span>
          {secondary ? (
            <div className="text-[11px] text-slate-400 mt-0.5">{secondary}</div>
          ) : null}
        </div>

        <span
          className={`shrink-0 text-xs px-2.5 py-1 rounded-full font-semibold ${pillClass}`}
        >
          {value}%
        </span>
      </div>

      <div className="w-full h-2 bg-slate-100 rounded-full">
        <div
          className={`h-2 rounded-full ${barClass}`}
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
    <div className="border border-slate-200 rounded-2xl p-3 text-center bg-white/80 backdrop-blur transition">
      <div className="w-9 h-9 mx-auto mb-2 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500">
        {icon}
      </div>

      <div className="text-sm font-medium text-slate-800">
        {title}
      </div>

      <div className={`text-xl font-semibold mt-2 ${accent}`}>
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

function LockedPanel({
  text,
  compact = false,
}: {
  text: string
  compact?: boolean
}) {
  return (
    <div
      className={`flex w-full items-center justify-center rounded-xl border border-dashed border-amber-300 bg-amber-50/50 text-center ${
        compact ? "min-h-[120px]" : "h-full min-h-[220px]"
      }`}
    >
      <div>
        <div className="mb-2 flex justify-center">
          <Lock size={18} className="text-amber-600" />
        </div>
        <div className="text-sm font-semibold text-slate-800">Premium required</div>
        <div className="mt-1 text-xs text-slate-500">{text}</div>
      </div>
    </div>
  )
}