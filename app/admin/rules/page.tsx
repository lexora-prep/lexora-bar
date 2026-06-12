"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  AlertCircle,
  Archive,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Database,
  Download,
  FileSpreadsheet,
  Filter,
  History,
  LoaderCircle,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react"

type Metadata = {
  jurisdictions: Array<{ id: string; code: string; name: string; jurisdiction_type: string }>
  examRegimes: Array<{ id: string; code: string; name: string; description: string | null }>
  subjects: Array<{
    id: string
    name: string
    exam_status: string
    show_in_rule_training: boolean
    show_in_analytics: boolean
    _count: { rules: number; topics: number }
  }>
  batches: Array<{
    id: string
    file_name: string
    file_format: string
    status: string
    total_rows: number
    valid_rows: number
    invalid_rows: number
    created_rows: number
    updated_rows: number
    skipped_rows: number
    created_at: string
    published_at: string | null
  }>
  totals: { all: number; published: number; draft: number; archived: number; applicability: number }
}

type RuleRow = {
  id: string
  external_key: string | null
  title: string
  rule_text: string
  prompt_question: string | null
  buzzwords: unknown
  priority: string | null
  publication_status: string
  current_version: number
  source_type: string
  is_active: boolean
  updated_at: string
  subjects: { id: string; name: string } | null
  topics: { id: string; name: string } | null
  subtopics: { id: string; name: string } | null
  registry_applicability: Array<{
    id: string
    source_package: string
    priority_weight: number
    jurisdiction: { code: string; name: string } | null
    exam_regime: { code: string; name: string }
  }>
}

type RuleDetail = RuleRow & {
  explanation: string | null
  application_example: string | null
  common_traps: unknown
  exam_tip: string | null
  how_to_apply: unknown
  registry_versions: Array<{
    id: string
    version_number: number
    publication_status: string
    change_note: string | null
    created_at: string
    created_by: string | null
  }>
}

type ImportPreview = {
  batchId: string
  status: string
  summary: { total: number; valid: number; invalid: number; create: number; update: number }
  rows: Array<{
    rowNumber: number
    externalKey: string | null
    title: string
    subject: string
    jurisdiction: string
    examRegime: string
    action: string
    status: string
    errors: string[]
  }>
  truncated: boolean
}

type RuleForm = {
  id: string
  externalKey: string
  title: string
  ruleText: string
  explanation: string
  promptQuestion: string
  subjectName: string
  topicName: string
  subtopicName: string
  buzzwords: string
  howToApply: string
  commonTraps: string
  applicationExample: string
  examTip: string
  priority: string
  publicationStatus: string
  jurisdictionCode: string
  examRegimeCode: string
  sourcePackage: string
  priorityWeight: string
  effectiveFrom: string
  effectiveUntil: string
  changeNote: string
}

const EMPTY_FORM: RuleForm = {
  id: "",
  externalKey: "",
  title: "",
  ruleText: "",
  explanation: "",
  promptQuestion: "",
  subjectName: "",
  topicName: "",
  subtopicName: "",
  buzzwords: "",
  howToApply: "",
  commonTraps: "",
  applicationExample: "",
  examTip: "",
  priority: "medium",
  publicationStatus: "DRAFT",
  jurisdictionCode: "",
  examRegimeCode: "UBE_CURRENT",
  sourcePackage: "core",
  priorityWeight: "1",
  effectiveFrom: "",
  effectiveUntil: "",
  changeNote: "",
}

function asListText(value: unknown) {
  if (!Array.isArray(value)) return ""
  return value.map(String).filter(Boolean).join(" | ")
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—"
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(date)
}

function statusTone(status: string) {
  if (status === "PUBLISHED") return "bg-emerald-50 text-emerald-700 border-emerald-200"
  if (status === "DRAFT") return "bg-amber-50 text-amber-700 border-amber-200"
  if (status.includes("ERROR")) return "bg-rose-50 text-rose-700 border-rose-200"
  if (status === "ARCHIVED") return "bg-slate-100 text-slate-600 border-slate-200"
  return "bg-blue-50 text-blue-700 border-blue-200"
}

function Badge({ children, tone = "default" }: { children: React.ReactNode; tone?: string }) {
  const styles =
    tone === "published"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : tone === "draft"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : tone === "danger"
          ? "border-rose-200 bg-rose-50 text-rose-700"
          : "border-slate-200 bg-slate-50 text-slate-600"
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium ${styles}`}>{children}</span>
}

function SectionTitle({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h2 className="text-[16px] font-semibold text-slate-900">{title}</h2>
      <p className="mt-1 text-[13px] leading-5 text-slate-500">{description}</p>
    </div>
  )
}

function StatCard({ label, value, note, icon: Icon }: { label: string; value: number; note: string; icon: typeof Database }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-slate-500">{label}</p>
          <p className="mt-2 text-[26px] font-semibold tracking-tight text-slate-950">{value.toLocaleString()}</p>
          <p className="mt-1 text-[12px] text-slate-500">{note}</p>
        </div>
        <div className="rounded-xl border border-violet-100 bg-violet-50 p-2.5 text-violet-700">
          <Icon size={18} />
        </div>
      </div>
    </div>
  )
}

export default function AdminRulesPage() {
  const [activeTab, setActiveTab] = useState<"library" | "import" | "registry">("library")
  const [metadata, setMetadata] = useState<Metadata | null>(null)
  const [rows, setRows] = useState<RuleRow[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [q, setQ] = useState("")
  const [status, setStatus] = useState("all")
  const [subjectId, setSubjectId] = useState("all")
  const [regime, setRegime] = useState("all")
  const [jurisdiction, setJurisdiction] = useState("all")
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 })
  const [editorOpen, setEditorOpen] = useState(false)
  const [form, setForm] = useState<RuleForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [detail, setDetail] = useState<RuleDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null)
  const [importing, setImporting] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [syncingRegistry, setSyncingRegistry] = useState(false)

  const loadMetadata = useCallback(async () => {
    const response = await fetch("/api/admin/rules/metadata", { cache: "no-store" })
    const data = await response.json()
    if (!response.ok || !data.ok) throw new Error(data.error || "Rule registry metadata could not be loaded.")
    setMetadata(data)
  }, [])

  const loadRules = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        q,
        status,
        subjectId,
        regime,
        jurisdiction,
        page: String(page),
        pageSize: "50",
      })
      const response = await fetch(`/api/admin/rules?${params.toString()}`, { cache: "no-store" })
      const data = await response.json()
      if (!response.ok || !data.ok) throw new Error(data.error || "Rules could not be loaded.")
      setRows(data.rows)
      setPagination(data.pagination)
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Rules could not be loaded." })
    } finally {
      setLoading(false)
    }
  }, [jurisdiction, page, q, regime, status, subjectId])

  useEffect(() => {
    Promise.all([loadMetadata(), loadRules()]).catch((error) => {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Rule management could not be loaded." })
      setLoading(false)
    })
  }, [loadMetadata, loadRules])

  const openNewRule = () => {
    setDetail(null)
    setForm({
      ...EMPTY_FORM,
      subjectName: metadata?.subjects[0]?.name ?? "",
      examRegimeCode: metadata?.examRegimes.find((item) => item.code === "UBE_CURRENT")?.code ?? metadata?.examRegimes[0]?.code ?? "UBE_CURRENT",
    })
    setEditorOpen(true)
  }

  const openRule = async (id: string) => {
    setDetailLoading(true)
    setEditorOpen(true)
    try {
      const response = await fetch(`/api/admin/rules/${id}`, { cache: "no-store" })
      const data = await response.json()
      if (!response.ok || !data.ok) throw new Error(data.error || "Rule details could not be loaded.")
      const rule = data.rule as RuleDetail
      const applicability = rule.registry_applicability[0]
      setDetail(rule)
      setForm({
        id: rule.id,
        externalKey: rule.external_key ?? "",
        title: rule.title,
        ruleText: rule.rule_text,
        explanation: rule.explanation ?? "",
        promptQuestion: rule.prompt_question ?? "",
        subjectName: rule.subjects?.name ?? "",
        topicName: rule.topics?.name ?? "",
        subtopicName: rule.subtopics?.name ?? "",
        buzzwords: asListText(rule.buzzwords),
        howToApply: asListText(rule.how_to_apply),
        commonTraps: asListText(rule.common_traps),
        applicationExample: rule.application_example ?? "",
        examTip: rule.exam_tip ?? "",
        priority: rule.priority ?? "medium",
        publicationStatus: rule.publication_status,
        jurisdictionCode: applicability?.jurisdiction?.code ?? "",
        examRegimeCode: applicability?.exam_regime.code ?? "UBE_CURRENT",
        sourcePackage: applicability?.source_package ?? "core",
        priorityWeight: String(applicability?.priority_weight ?? 1),
        effectiveFrom: "",
        effectiveUntil: "",
        changeNote: "",
      })
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Rule details could not be loaded." })
      setEditorOpen(false)
    } finally {
      setDetailLoading(false)
    }
  }

  const saveRule = async () => {
    if (!form.title.trim() || !form.ruleText.trim() || !form.subjectName.trim() || !form.examRegimeCode) {
      setMessage({ type: "error", text: "Title, rule text, subject, and exam regime are required." })
      return
    }
    setSaving(true)
    setMessage(null)
    try {
      const response = await fetch(form.id ? `/api/admin/rules/${form.id}` : "/api/admin/rules", {
        method: form.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await response.json()
      if (!response.ok || !data.ok) throw new Error(data.error || "Rule could not be saved.")
      setEditorOpen(false)
      setMessage({
        type: "success",
        text: form.id ? `Rule updated as version ${data.version}.` : "Rule created successfully.",
      })
      await Promise.all([loadMetadata(), loadRules()])
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Rule could not be saved." })
    } finally {
      setSaving(false)
    }
  }

  const previewImport = async () => {
    if (!importFile) {
      setMessage({ type: "error", text: "Select a CSV or XLSX file first." })
      return
    }
    setImporting(true)
    setImportPreview(null)
    setMessage(null)
    try {
      const body = new FormData()
      body.append("file", importFile)
      const response = await fetch("/api/admin/rules/import/preview", { method: "POST", body })
      const data = await response.json()
      if (!response.ok || !data.ok) throw new Error(data.error || "The import could not be validated.")
      setImportPreview(data)
      setMessage({
        type: data.summary.invalid > 0 ? "error" : "success",
        text:
          data.summary.invalid > 0
            ? `${data.summary.invalid} row(s) require correction before publishing.`
            : `${data.summary.valid} row(s) passed validation and are ready to publish.`,
      })
      await loadMetadata()
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "The import could not be validated." })
    } finally {
      setImporting(false)
    }
  }

  const publishImport = async () => {
    if (!importPreview || importPreview.summary.invalid > 0) return
    setPublishing(true)
    setMessage(null)
    try {
      const response = await fetch("/api/admin/rules/import/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchId: importPreview.batchId }),
      })
      const data = await response.json()
      if (!response.ok || !data.ok) throw new Error(data.error || "The import could not be published.")
      setMessage({ type: "success", text: `Import published: ${data.created} created, ${data.updated} updated.` })
      setImportPreview(null)
      setImportFile(null)
      await Promise.all([loadMetadata(), loadRules()])
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "The import could not be published." })
    } finally {
      setPublishing(false)
    }
  }


  const syncRegistry = async () => {
    setSyncingRegistry(true)
    setMessage(null)
    try {
      const response = await fetch("/api/admin/rules/registry/sync", { method: "POST" })
      const data = await response.json()
      if (!response.ok || !data.ok) throw new Error(data.error || "Jurisdictions could not be synchronized.")
      setMessage({
        type: "success",
        text: `Registry synchronized: ${data.jurisdictionsCreated} created, ${data.jurisdictionsUpdated} updated, ${data.mappingsUpserted} exam mappings confirmed.`,
      })
      await loadMetadata()
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Jurisdictions could not be synchronized." })
    } finally {
      setSyncingRegistry(false)
    }
  }

  const filteredSubjectNames = useMemo(
    () => metadata?.subjects.map((item) => item.name) ?? [],
    [metadata]
  )

  return (
    <div className="min-h-screen bg-[#f7f8fb] px-5 py-6 lg:px-7">
      <div className="mx-auto max-w-[1580px] space-y-5">
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-5 bg-gradient-to-r from-violet-50 via-white to-blue-50 px-6 py-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-violet-700">
                <ShieldCheck size={15} /> Content operations
              </div>
              <h1 className="text-[28px] font-semibold tracking-tight text-slate-950">Rule Library Management</h1>
              <p className="mt-2 max-w-3xl text-[14px] leading-6 text-slate-600">
                Create, review, version, and publish Black Letter Law rules by jurisdiction and exam regime. Changes preserve each rule UUID so existing study history remains connected.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                href="/api/admin/rules/template"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[13px] font-medium text-slate-700 shadow-sm hover:bg-slate-50"
              >
                <Download size={16} /> Import template
              </a>
              <button
                onClick={openNewRule}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-[13px] font-medium text-white shadow-sm hover:bg-slate-800"
              >
                <Plus size={16} /> Add rule
              </button>
            </div>
          </div>

          <div className="flex gap-1 border-t border-slate-100 px-4 pt-3">
            {([
              ["library", "Rule library", BookOpen],
              ["import", "Bulk import", Upload],
              ["registry", "Registry health", Database],
            ] as const).map(([key, label, Icon]) => (
              <button
                key={String(key)}
                onClick={() => setActiveTab(key as typeof activeTab)}
                className={`inline-flex items-center gap-2 rounded-t-xl px-4 py-3 text-[13px] font-medium ${
                  activeTab === key
                    ? "border-b-2 border-violet-600 bg-violet-50 text-violet-800"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                }`}
              >
                <Icon size={15} /> {label}
              </button>
            ))}
          </div>
        </section>

        {message && (
          <div
            className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-[13px] ${
              message.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-rose-200 bg-rose-50 text-rose-800"
            }`}
          >
            {message.type === "success" ? <CheckCircle2 size={17} className="mt-0.5" /> : <AlertCircle size={17} className="mt-0.5" />}
            <span>{message.text}</span>
            <button className="ml-auto" onClick={() => setMessage(null)} aria-label="Dismiss message"><X size={16} /></button>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard label="All rules" value={metadata?.totals.all ?? 0} note="Stored rule records" icon={Database} />
          <StatCard label="Published" value={metadata?.totals.published ?? 0} note="Active for eligible users" icon={CheckCircle2} />
          <StatCard label="Drafts" value={metadata?.totals.draft ?? 0} note="Awaiting publication" icon={Clock3} />
          <StatCard label="Archived" value={metadata?.totals.archived ?? 0} note="Retained for history" icon={Archive} />
          <StatCard label="Applicability" value={metadata?.totals.applicability ?? 0} note="Active curriculum links" icon={ShieldCheck} />
        </div>

        {activeTab === "library" && (
          <>
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="grid gap-3 lg:grid-cols-[minmax(280px,1.6fr)_180px_220px_210px_210px_auto]">
                <label className="relative">
                  <Search size={16} className="absolute left-3 top-3 text-slate-400" />
                  <input
                    value={q}
                    onChange={(event) => { setQ(event.target.value); setPage(1) }}
                    placeholder="Search title, text, external key, or subject"
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-[13px] outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                  />
                </label>
                <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1) }} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[13px] outline-none">
                  <option value="all">All statuses</option>
                  <option value="PUBLISHED">Published</option>
                  <option value="DRAFT">Draft</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
                <select value={subjectId} onChange={(event) => { setSubjectId(event.target.value); setPage(1) }} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[13px] outline-none">
                  <option value="all">All subjects</option>
                  {metadata?.subjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
                <select value={jurisdiction} onChange={(event) => { setJurisdiction(event.target.value); setPage(1) }} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[13px] outline-none">
                  <option value="all">All jurisdictions</option>
                  {metadata?.jurisdictions.map((item) => <option key={item.id} value={item.code}>{item.code} · {item.name}</option>)}
                </select>
                <select value={regime} onChange={(event) => { setRegime(event.target.value); setPage(1) }} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[13px] outline-none">
                  <option value="all">All exam regimes</option>
                  {metadata?.examRegimes.map((item) => <option key={item.id} value={item.code}>{item.name}</option>)}
                </select>
                <button onClick={() => { setQ(""); setStatus("all"); setSubjectId("all"); setRegime("all"); setJurisdiction("all"); setPage(1) }} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-[13px] text-slate-600 hover:bg-slate-50">
                  <Filter size={15} /> Reset
                </button>
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <SectionTitle title="Rule library" description={`${pagination.total.toLocaleString()} matching rule records`} />
                <button onClick={() => { loadRules(); loadMetadata() }} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-[12px] text-slate-600 hover:bg-slate-50">
                  <RefreshCw size={14} /> Refresh
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-left">
                  <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.08em] text-slate-500">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Rule</th>
                      <th className="px-4 py-3 font-semibold">Curriculum</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold">Version</th>
                      <th className="px-4 py-3 font-semibold">Updated</th>
                      <th className="px-4 py-3 text-right font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr><td colSpan={6} className="px-5 py-16 text-center text-[13px] text-slate-500"><LoaderCircle className="mx-auto mb-3 animate-spin" size={22} />Loading rule library…</td></tr>
                    ) : rows.length === 0 ? (
                      <tr><td colSpan={6} className="px-5 py-16 text-center text-[13px] text-slate-500">No rules match the selected filters.</td></tr>
                    ) : rows.map((row) => {
                      const applicability = row.registry_applicability[0]
                      return (
                        <tr key={row.id} className="align-top hover:bg-slate-50/70">
                          <td className="max-w-[560px] px-5 py-4">
                            <div className="font-medium text-slate-900">{row.title}</div>
                            <div className="mt-1 line-clamp-2 text-[12px] leading-5 text-slate-500">{row.rule_text}</div>
                            <div className="mt-2 font-mono text-[10px] text-slate-400">{row.external_key ?? "No external key"}</div>
                          </td>
                          <td className="px-4 py-4 text-[12px] text-slate-600">
                            <div className="font-medium text-slate-800">{row.subjects?.name ?? "Unassigned"}</div>
                            <div className="mt-1">{row.topics?.name ?? "General"}{row.subtopics?.name ? ` · ${row.subtopics.name}` : ""}</div>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              <Badge>{applicability?.jurisdiction?.code ?? "Global"}</Badge>
                              <Badge>{applicability?.exam_regime.code ?? "Unmapped"}</Badge>
                            </div>
                          </td>
                          <td className="px-4 py-4"><span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium ${statusTone(row.publication_status)}`}>{row.publication_status}</span></td>
                          <td className="px-4 py-4 text-[12px] font-medium text-slate-700">v{row.current_version}</td>
                          <td className="px-4 py-4 text-[12px] text-slate-500">{formatDate(row.updated_at)}</td>
                          <td className="px-4 py-4 text-right">
                            <button onClick={() => openRule(row.id)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12px] font-medium text-slate-700 hover:border-violet-200 hover:bg-violet-50 hover:text-violet-800">
                              <Pencil size={14} /> Review
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4 text-[12px] text-slate-500">
                <span>Page {pagination.page} of {pagination.totalPages}</span>
                <div className="flex gap-2">
                  <button disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded-lg border border-slate-200 p-2 disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft size={15} /></button>
                  <button disabled={page >= pagination.totalPages} onClick={() => setPage((value) => Math.min(pagination.totalPages, value + 1))} className="rounded-lg border border-slate-200 p-2 disabled:cursor-not-allowed disabled:opacity-40"><ChevronRight size={15} /></button>
                </div>
              </div>
            </section>
          </>
        )}

        {activeTab === "import" && (
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_420px]">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <SectionTitle title="Validate a rule import" description="Upload a CSV or XLSX file. Lexora validates every row and shows proposed creates and updates before any rule is published." />
              <div className="mt-5 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                <FileSpreadsheet className="mx-auto text-violet-600" size={34} />
                <p className="mt-3 text-[14px] font-medium text-slate-900">Select a CSV or XLSX file</p>
                <p className="mt-1 text-[12px] text-slate-500">Maximum 10 MB and 5,000 rows per import.</p>
                <input
                  type="file"
                  accept=".csv,.xlsx"
                  onChange={(event) => setImportFile(event.target.files?.[0] ?? null)}
                  className="mx-auto mt-5 block max-w-full text-[12px] text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-violet-100 file:px-3 file:py-2 file:text-[12px] file:font-medium file:text-violet-800"
                />
                {importFile && <p className="mt-3 text-[12px] font-medium text-slate-700">{importFile.name}</p>}
                <button onClick={previewImport} disabled={importing || !importFile} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-[13px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-50">
                  {importing ? <LoaderCircle size={16} className="animate-spin" /> : <ShieldCheck size={16} />} Validate import
                </button>
              </div>

              {importPreview && (
                <div className="mt-6 space-y-4">
                  <div className="grid gap-3 sm:grid-cols-5">
                    {Object.entries(importPreview.summary).map(([key, value]) => (
                      <div key={key} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                        <p className="text-[10px] uppercase tracking-[0.08em] text-slate-500">{key}</p>
                        <p className="mt-1 text-[20px] font-semibold text-slate-900">{value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="overflow-hidden rounded-xl border border-slate-200">
                    <div className="max-h-[520px] overflow-auto">
                      <table className="min-w-full text-left">
                        <thead className="sticky top-0 bg-slate-50 text-[10px] uppercase tracking-[0.08em] text-slate-500">
                          <tr><th className="px-3 py-2">Row</th><th className="px-3 py-2">Rule</th><th className="px-3 py-2">Curriculum</th><th className="px-3 py-2">Action</th><th className="px-3 py-2">Validation</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {importPreview.rows.map((row) => (
                            <tr key={row.rowNumber} className="align-top">
                              <td className="px-3 py-3 text-[11px] text-slate-500">{row.rowNumber}</td>
                              <td className="max-w-[360px] px-3 py-3"><div className="text-[12px] font-medium text-slate-800">{row.title || "Untitled row"}</div><div className="mt-1 font-mono text-[10px] text-slate-400">{row.externalKey || "Missing external key"}</div></td>
                              <td className="px-3 py-3 text-[11px] text-slate-600">{row.subject}<br />{row.jurisdiction} · {row.examRegime}</td>
                              <td className="px-3 py-3"><Badge>{row.action}</Badge></td>
                              <td className="px-3 py-3">{row.status === "VALID" ? <Badge tone="published">Valid</Badge> : <div><Badge tone="danger">Invalid</Badge><ul className="mt-2 max-w-[320px] space-y-1 text-[10px] text-rose-700">{row.errors.map((error) => <li key={error}>• {error}</li>)}</ul></div>}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  {importPreview.truncated && <p className="text-[11px] text-slate-500">The preview shows the first 250 rows. All rows were validated.</p>}
                  <div className="flex justify-end">
                    <button onClick={publishImport} disabled={publishing || importPreview.summary.invalid > 0} className="inline-flex items-center gap-2 rounded-xl bg-violet-700 px-4 py-2.5 text-[13px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-40">
                      {publishing ? <LoaderCircle size={16} className="animate-spin" /> : <Upload size={16} />} Publish validated rows
                    </button>
                  </div>
                </div>
              )}
            </section>

            <aside className="space-y-5">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <SectionTitle title="Required import structure" description="Use the template to keep field names and list formatting consistent." />
                <div className="mt-4 space-y-3 text-[12px] leading-5 text-slate-600">
                  <p><strong className="text-slate-800">Required:</strong> external_key, title, rule_text, subject, exam_regime_code.</p>
                  <p><strong className="text-slate-800">Jurisdiction:</strong> leave jurisdiction_code blank for a global rule, or use an active code such as CA or FL.</p>
                  <p><strong className="text-slate-800">Lists:</strong> separate buzzwords, application steps, and common traps with a vertical bar.</p>
                  <p><strong className="text-slate-800">Updates:</strong> an existing external_key updates the same rule UUID and creates a new version.</p>
                </div>
                <a href="/api/admin/rules/template" className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-[13px] font-medium text-slate-700 hover:bg-slate-50"><Download size={15} /> Download CSV template</a>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <SectionTitle title="Recent imports" description="Validation and publication history for the latest files." />
                <div className="mt-4 space-y-3">
                  {metadata?.batches.length ? metadata.batches.map((batch) => (
                    <div key={batch.id} className="rounded-xl border border-slate-200 p-3">
                      <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-[12px] font-medium text-slate-800">{batch.file_name}</p><p className="mt-1 text-[10px] text-slate-500">{batch.total_rows} rows · {formatDate(batch.created_at)}</p></div><span className={`rounded-full border px-2 py-1 text-[9px] font-semibold ${statusTone(batch.status)}`}>{batch.status}</span></div>
                      <div className="mt-3 grid grid-cols-3 gap-2 text-center"><div className="rounded-lg bg-emerald-50 p-2"><div className="text-[14px] font-semibold text-emerald-700">{batch.valid_rows}</div><div className="text-[9px] text-emerald-700">Valid</div></div><div className="rounded-lg bg-rose-50 p-2"><div className="text-[14px] font-semibold text-rose-700">{batch.invalid_rows}</div><div className="text-[9px] text-rose-700">Invalid</div></div><div className="rounded-lg bg-blue-50 p-2"><div className="text-[14px] font-semibold text-blue-700">{batch.created_rows + batch.updated_rows}</div><div className="text-[9px] text-blue-700">Published</div></div></div>
                    </div>
                  )) : <p className="text-[12px] text-slate-500">No import batches have been created.</p>}
                </div>
              </section>
            </aside>
          </div>
        )}

        {activeTab === "registry" && (
          <div className="grid gap-5 xl:grid-cols-2">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <SectionTitle title="Jurisdictions and exam regimes" description="These registry records determine which rules are available for a user's selected jurisdiction and exam date." />
                <button onClick={syncRegistry} disabled={syncingRegistry} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-[12px] font-medium text-violet-800 hover:bg-violet-100 disabled:opacity-50">
                  {syncingRegistry ? <LoaderCircle size={14} className="animate-spin" /> : <RefreshCw size={14} />} Sync scheduler jurisdictions
                </button>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {metadata?.jurisdictions.map((item) => (
                  <div key={item.id} className="rounded-xl border border-slate-200 p-3"><div className="flex items-center justify-between"><div><p className="text-[12px] font-semibold text-slate-800">{item.code} · {item.name}</p><p className="mt-1 text-[10px] uppercase tracking-[0.08em] text-slate-400">{item.jurisdiction_type}</p></div><CheckCircle2 size={16} className="text-emerald-600" /></div></div>
                ))}
              </div>
              {!metadata?.jurisdictions.length && <p className="mt-5 rounded-xl bg-amber-50 p-4 text-[12px] text-amber-800">Only jurisdictions registered in the dynamic rule registry can receive jurisdiction-specific rule mappings.</p>}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <SectionTitle title="Active exam regimes" description="Use these codes in manual entries and import files. Effective dates remain controlled by the registry foundation." />
              <div className="mt-5 space-y-3">
                {metadata?.examRegimes.map((item) => (
                  <div key={item.id} className="rounded-xl border border-slate-200 p-3"><div className="flex items-start justify-between gap-3"><div><p className="text-[12px] font-semibold text-slate-800">{item.name}</p><p className="mt-1 font-mono text-[10px] text-violet-700">{item.code}</p>{item.description && <p className="mt-2 text-[11px] leading-4 text-slate-500">{item.description}</p>}</div><Badge tone="published">Active</Badge></div></div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
              <SectionTitle title="Subject coverage" description="Subjects are created automatically when an approved manual rule or validated import introduces a new jurisdiction-specific subject." />
              <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
                <table className="min-w-full text-left"><thead className="bg-slate-50 text-[10px] uppercase tracking-[0.08em] text-slate-500"><tr><th className="px-4 py-3">Subject</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Rules</th><th className="px-4 py-3">Topics</th><th className="px-4 py-3">Training</th><th className="px-4 py-3">Analytics</th></tr></thead><tbody className="divide-y divide-slate-100">{metadata?.subjects.map((item) => <tr key={item.id}><td className="px-4 py-3 text-[12px] font-medium text-slate-800">{item.name}</td><td className="px-4 py-3"><Badge>{item.exam_status}</Badge></td><td className="px-4 py-3 text-[12px] text-slate-600">{item._count.rules}</td><td className="px-4 py-3 text-[12px] text-slate-600">{item._count.topics}</td><td className="px-4 py-3 text-[12px] text-slate-600">{item.show_in_rule_training ? "Enabled" : "Hidden"}</td><td className="px-4 py-3 text-[12px] text-slate-600">{item.show_in_analytics ? "Enabled" : "Hidden"}</td></tr>)}</tbody></table>
              </div>
            </section>
          </div>
        )}
      </div>

      {editorOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/35 backdrop-blur-[2px]">
          <div className="h-full w-full max-w-[760px] overflow-y-auto bg-[#f8f9fc] shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-6 py-4 backdrop-blur">
              <div>
                <h2 className="text-[18px] font-semibold text-slate-950">{form.id ? "Review and update rule" : "Create a new rule"}</h2>
                <p className="mt-1 text-[12px] text-slate-500">{form.id ? "Saving creates a new version while preserving the rule UUID." : "New rules may remain drafts until they are reviewed and published."}</p>
              </div>
              <button onClick={() => setEditorOpen(false)} className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"><X size={18} /></button>
            </div>

            {detailLoading ? (
              <div className="flex h-[70vh] items-center justify-center text-[13px] text-slate-500"><LoaderCircle size={22} className="mr-2 animate-spin" />Loading rule details…</div>
            ) : (
              <div className="space-y-5 p-6">
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <SectionTitle title="Core rule content" description="Use complete rule statements. Buzzwords remain supporting fields and are never counted as separate rules." />
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <Field label="External key" value={form.externalKey} onChange={(value) => setForm((current) => ({ ...current, externalKey: value }))} placeholder="ca_prof_resp_conflicts_001" disabled={!!form.id} />
                    <SelectField label="Publication status" value={form.publicationStatus} onChange={(value) => setForm((current) => ({ ...current, publicationStatus: value }))} options={["DRAFT", "PUBLISHED", "ARCHIVED"]} />
                    <div className="sm:col-span-2"><Field label="Rule title" value={form.title} onChange={(value) => setForm((current) => ({ ...current, title: value }))} placeholder="Concurrent Conflicts of Interest" /></div>
                    <div className="sm:col-span-2"><TextArea label="Full rule statement" value={form.ruleText} onChange={(value) => setForm((current) => ({ ...current, ruleText: value }))} rows={6} placeholder="State the complete governing rule in clear language." /></div>
                    <div className="sm:col-span-2"><TextArea label="Prompt question" value={form.promptQuestion} onChange={(value) => setForm((current) => ({ ...current, promptQuestion: value }))} rows={2} placeholder="What must the learner recall?" /></div>
                    <div className="sm:col-span-2"><TextArea label="Explanation" value={form.explanation} onChange={(value) => setForm((current) => ({ ...current, explanation: value }))} rows={3} placeholder="Optional clarification or doctrinal context." /></div>
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <SectionTitle title="Curriculum placement" description="The subject, jurisdiction, and exam regime determine who receives this rule in training and analytics." />
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <DatalistField label="Subject" value={form.subjectName} onChange={(value) => setForm((current) => ({ ...current, subjectName: value }))} options={filteredSubjectNames} placeholder="Professional Responsibility" />
                    <Field label="Topic" value={form.topicName} onChange={(value) => setForm((current) => ({ ...current, topicName: value }))} placeholder="Conflicts of Interest" />
                    <Field label="Subtopic" value={form.subtopicName} onChange={(value) => setForm((current) => ({ ...current, subtopicName: value }))} placeholder="Current Clients" />
                    <SelectField label="Jurisdiction" value={form.jurisdictionCode} onChange={(value) => setForm((current) => ({ ...current, jurisdictionCode: value }))} options={["", ...(metadata?.jurisdictions.map((item) => item.code) ?? [])]} optionLabels={{ "": "Global / all mapped jurisdictions", ...(Object.fromEntries(metadata?.jurisdictions.map((item) => [item.code, `${item.code} · ${item.name}`]) ?? [])) }} />
                    <SelectField label="Exam regime" value={form.examRegimeCode} onChange={(value) => setForm((current) => ({ ...current, examRegimeCode: value }))} options={metadata?.examRegimes.map((item) => item.code) ?? []} optionLabels={Object.fromEntries(metadata?.examRegimes.map((item) => [item.code, `${item.name} (${item.code})`]) ?? [])} />
                    <Field label="Source package" value={form.sourcePackage} onChange={(value) => setForm((current) => ({ ...current, sourcePackage: value }))} placeholder="core or california" />
                    <Field label="Priority weight" value={form.priorityWeight} onChange={(value) => setForm((current) => ({ ...current, priorityWeight: value }))} type="number" placeholder="1" />
                    <Field label="Effective from" value={form.effectiveFrom} onChange={(value) => setForm((current) => ({ ...current, effectiveFrom: value }))} type="date" />
                    <Field label="Effective until" value={form.effectiveUntil} onChange={(value) => setForm((current) => ({ ...current, effectiveUntil: value }))} type="date" />
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <SectionTitle title="Learning support" description="Separate multiple entries with a vertical bar. These fields guide training but do not increase the rule count." />
                  <div className="mt-4 grid gap-4">
                    <TextArea label="Buzzwords" value={form.buzzwords} onChange={(value) => setForm((current) => ({ ...current, buzzwords: value }))} rows={2} placeholder="minimum contacts | purposeful availment | fairness" />
                    <TextArea label="How to apply" value={form.howToApply} onChange={(value) => setForm((current) => ({ ...current, howToApply: value }))} rows={3} placeholder="identify the issue | state the rule | apply each element" />
                    <TextArea label="Common traps" value={form.commonTraps} onChange={(value) => setForm((current) => ({ ...current, commonTraps: value }))} rows={3} placeholder="starting with fairness | confusing general and specific jurisdiction" />
                    <TextArea label="Application example" value={form.applicationExample} onChange={(value) => setForm((current) => ({ ...current, applicationExample: value }))} rows={3} placeholder="Provide a concise fact pattern showing the rule in use." />
                    <TextArea label="Exam tip" value={form.examTip} onChange={(value) => setForm((current) => ({ ...current, examTip: value }))} rows={2} placeholder="Explain the most useful exam approach." />
                    <SelectField label="Priority" value={form.priority} onChange={(value) => setForm((current) => ({ ...current, priority: value }))} options={["low", "medium", "high"]} />
                    <TextArea label="Version note" value={form.changeNote} onChange={(value) => setForm((current) => ({ ...current, changeNote: value }))} rows={2} placeholder="Describe what changed and why." />
                  </div>
                </section>

                {detail?.registry_versions?.length ? (
                  <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-2"><History size={17} className="text-violet-700" /><h3 className="text-[14px] font-semibold text-slate-900">Version history</h3></div>
                    <div className="mt-4 space-y-2">{detail.registry_versions.map((version) => <div key={version.id} className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 p-3"><div><p className="text-[12px] font-medium text-slate-800">Version {version.version_number} · {version.publication_status}</p><p className="mt-1 text-[11px] text-slate-500">{version.change_note || "No change note provided."}</p></div><span className="text-[10px] text-slate-400">{formatDate(version.created_at)}</span></div>)}</div>
                  </section>
                ) : null}

                <div className="sticky bottom-0 flex items-center justify-end gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur">
                  <button onClick={() => setEditorOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-[13px] font-medium text-slate-700">Cancel</button>
                  <button onClick={saveRule} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-violet-700 px-4 py-2.5 text-[13px] font-medium text-white disabled:opacity-50">{saving ? <LoaderCircle size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}{form.id ? "Save new version" : "Create rule"}</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, value, onChange, placeholder = "", type = "text", disabled = false }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string; disabled?: boolean }) {
  return <label className="block"><span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">{label}</span><input type={type} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[13px] text-slate-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 disabled:bg-slate-100 disabled:text-slate-500" /></label>
}

function TextArea({ label, value, onChange, placeholder = "", rows = 3 }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; rows?: number }) {
  return <label className="block"><span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">{label}</span><textarea value={value} rows={rows} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[13px] leading-5 text-slate-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" /></label>
}

function SelectField({ label, value, onChange, options, optionLabels = {} }: { label: string; value: string; onChange: (value: string) => void; options: string[]; optionLabels?: Record<string, string> }) {
  return <label className="block"><span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[13px] text-slate-800 outline-none focus:border-violet-400">{options.map((option) => <option key={option || "global"} value={option}>{optionLabels[option] ?? option}</option>)}</select></label>
}

function DatalistField({ label, value, onChange, options, placeholder }: { label: string; value: string; onChange: (value: string) => void; options: string[]; placeholder: string }) {
  const id = "rule-subject-options"
  return <label className="block"><span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">{label}</span><input list={id} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[13px] text-slate-800 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" /><datalist id={id}>{options.map((option) => <option key={option} value={option} />)}</datalist></label>
}
