"use client"

import { FormEvent } from "react"
import {
  ChevronLeft,
  HelpCircle,
  Loader2,
  RefreshCcw,
  Send,
  X,
} from "lucide-react"

type SupportMessage = {
  id: string
  sender: string
  message: string
  created_at: string
}

type SupportTicket = {
  id: string
  subject: string
  category: string
  status: string
  priority: string
  created_at: string
  updated_at: string
  messages: SupportMessage[]
}

export const supportTopics = [
  { value: "billing", label: "Billing or payment issue" },
  { value: "subscription", label: "Subscription change" },
  { value: "invoice", label: "Invoice or receipt request" },
  { value: "technical", label: "Technical issue" },
  { value: "account", label: "Account access issue" },
  { value: "other", label: "Other question" },
]

export function topicLabel(value: string) {
  return supportTopics.find((topic) => topic.value === value)?.label || "Support request"
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Not available"

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Not available"

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date)
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Not available"

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Not available"

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date)
}

function readableStatus(value: string) {
  if (!value) return "Open"
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
}

export function InvoiceHistoryModal({
  isPaid,
  paidAt,
  total,
  onClose,
  onView,
}: {
  isPaid: boolean
  paidAt: string | null | undefined
  total: string
  onClose: () => void
  onView: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6 backdrop-blur-sm">
      <div className="max-h-[86vh] w-full max-w-3xl overflow-hidden rounded-[24px] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <div>
              <div className="text-[12px] font-bold uppercase tracking-[0.16em] text-slate-400">
                Billing records
              </div>
              <h2 className="font-serif text-[30px] font-normal tracking-[-0.04em]">
                Invoices
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[calc(86vh-92px)] overflow-y-auto p-6">
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <div className="grid grid-cols-[1fr_120px_110px_80px] items-center gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-[12px] font-bold uppercase tracking-[0.14em] text-slate-400">
              <span>Date</span>
              <span>Amount</span>
              <span>Status</span>
              <span className="text-right">Receipt</span>
            </div>

            {isPaid ? (
              <div className="grid grid-cols-[1fr_120px_110px_80px] items-center gap-4 px-5 py-4 text-[15px]">
                <span className="font-medium text-slate-900">
                  {paidAt ? formatDate(paidAt) : "Latest payment"}
                </span>
                <span className="font-medium text-slate-700">{total}</span>
                <span className="font-semibold text-emerald-700">Paid</span>
                <button
                  type="button"
                  onClick={onView}
                  className="justify-self-end font-semibold text-blue-600 underline underline-offset-2"
                >
                  View
                </button>
              </div>
            ) : (
              <div className="py-8 text-center text-[15px] font-medium text-slate-500">
                No invoices yet.
              </div>
            )}
          </div>

          <p className="mt-4 text-[13px] font-medium leading-5 text-slate-400">
            Older invoice records will appear here after each successful Paddle billing event is stored.
          </p>
        </div>
      </div>
    </div>
  )
}

export function SupportModal({
  tickets,
  supportTopic,
  supportSubject,
  supportMessage,
  supportLoading,
  supportError,
  onClose,
  onRefresh,
  onSubmit,
  onTopicChange,
  onSubjectChange,
  onMessageChange,
}: {
  tickets: SupportTicket[]
  supportTopic: string
  supportSubject: string
  supportMessage: string
  supportLoading: boolean
  supportError: string
  onClose: () => void
  onRefresh: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onTopicChange: (value: string) => void
  onSubjectChange: (value: string) => void
  onMessageChange: (value: string) => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-6 py-6 backdrop-blur-sm">
      <div className="max-h-[82vh] w-full max-w-[980px] overflow-hidden rounded-[24px] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <HelpCircle className="h-6 w-6" />
            </div>

            <div>
              <div className="text-[12px] font-bold uppercase tracking-[0.16em] text-slate-400">
                Support request
              </div>
              <h2 className="font-serif text-[26px] font-normal leading-none tracking-[-0.04em] text-slate-950">
                Contact support
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"
          >
            <X className="h-7 w-7" />
          </button>
        </div>

        <div className="grid max-h-[calc(82vh-86px)] overflow-hidden md:grid-cols-[0.9fr_1.1fr]">
          <form
            onSubmit={onSubmit}
            className="overflow-y-auto border-r border-slate-200 px-6 py-6"
          >
            <label className="block text-[12px] font-bold uppercase tracking-[0.14em] text-slate-500">
              Topic
            </label>
            <select
              value={supportTopic}
              onChange={(event) => onTopicChange(event.target.value)}
              className="mt-3 h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-[15px] font-medium text-slate-950 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
            >
              {supportTopics.map((topic) => (
                <option key={topic.value} value={topic.value}>
                  {topic.label}
                </option>
              ))}
            </select>

            <label className="mt-5 block text-[12px] font-bold uppercase tracking-[0.14em] text-slate-500">
              Subject
            </label>
            <input
              value={supportSubject}
              onChange={(event) => onSubjectChange(event.target.value)}
              className="mt-3 h-12 w-full rounded-xl border border-slate-300 px-4 text-[15px] font-medium text-slate-950 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
            />

            <label className="mt-5 block text-[12px] font-bold uppercase tracking-[0.14em] text-slate-500">
              Message
            </label>
            <textarea
              value={supportMessage}
              onChange={(event) => onMessageChange(event.target.value)}
              rows={5}
              placeholder="Explain the issue in detail. The more context, the faster we can help."
              className="mt-3 w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-[15px] font-medium leading-6 text-slate-950 outline-none placeholder:text-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
            />

            {supportError && (
              <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-[14px] font-semibold text-red-600">
                {supportError}
              </div>
            )}

            <button
              type="submit"
              disabled={supportLoading}
              className="mt-5 inline-flex h-12 w-full items-center justify-center gap-3 rounded-xl bg-[#101218] px-5 text-[15px] font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {supportLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <Send className="h-6 w-6" />
              )}
              Submit ticket
            </button>
          </form>

          <div className="overflow-y-auto bg-[#FAFAF8]">
            <div className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-slate-200 bg-[#FAFAF8] px-6">
              <h3 className="text-[12px] font-bold uppercase tracking-[0.14em] text-slate-500">
                Ticket history
              </h3>

              <button
                type="button"
                onClick={onRefresh}
                className="inline-flex items-center gap-2 text-[13px] font-semibold text-slate-500 hover:text-slate-900"
              >
                <RefreshCcw className="h-5 w-5" />
                Refresh
              </button>
            </div>

            <div className="space-y-3 p-4">
              {tickets.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-white px-5 py-6 text-[14px] font-medium text-slate-500">
                  No tickets yet.
                </div>
              ) : (
                tickets.map((ticket) => <TicketCard key={ticket.id} ticket={ticket} />)
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function TicketCard({ ticket }: { ticket: SupportTicket }) {
  const normalizedStatus = readableStatus(ticket.status)
  const isResolved = normalizedStatus.toLowerCase() === "resolved"

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
        <div>
          <div className="text-[15px] font-semibold text-slate-950">
            {ticket.subject}
          </div>
          <div className="mt-1 text-[12px] font-medium text-slate-400">
            {topicLabel(ticket.category)} · {formatDateTime(ticket.created_at)}
          </div>
        </div>

        <span
          className={`rounded-full px-3 py-1.5 text-[13px] font-bold ${
            isResolved
              ? "bg-emerald-50 text-emerald-700"
              : "bg-orange-50 text-orange-700"
          }`}
        >
          <span className="mr-2">●</span>
          {normalizedStatus}
        </span>
      </div>

      {ticket.messages.map((message) => {
        const isSupport = message.sender.toLowerCase() === "support"

        return (
          <div
            key={message.id}
            className={`border-b border-slate-200 px-5 py-4 last:border-b-0 ${
              isSupport ? "bg-blue-50/70" : "bg-white"
            }`}
          >
            <div className="flex items-center justify-between gap-4">
              <div
                className={`text-[12px] font-bold uppercase tracking-[0.14em] ${
                  isSupport ? "text-blue-600" : "text-slate-400"
                }`}
              >
                {message.sender}
              </div>
              <div className="text-[12px] font-medium text-slate-400">
                {formatDateTime(message.created_at)}
              </div>
            </div>

            <div className="mt-2 text-[15px] font-medium leading-6 text-slate-600">
              {message.message}
            </div>
          </div>
        )
      })}
    </div>
  )
}