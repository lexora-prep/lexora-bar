"use client"

import { ReactNode, useEffect, useRef, useState } from "react"
import { Check, ChevronDown, CreditCard, FileText, X } from "lucide-react"

export type PaymentHistoryRecord = {
  id: string
  number: number
  planLabel: string
  paidAt: string
  billingPeriodEnds: string
  amount: string
  tax: string
  status: string
  receiptUrl: string | null
}

const planAccessFeatures = [
  "Full BLL rule access",
  "Spaced repetition",
  "Weak rule targeting",
  "Study progress tracking",
  "120 Golden Rules",
  "120 Golden Flashcards",
]

function Card({ children }: { children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {children}
    </section>
  )
}

function SectionHeader({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <div className="flex h-[46px] items-center justify-between border-b border-slate-200 px-5">
      <h3 className="text-[12px] font-bold uppercase tracking-[0.14em] text-slate-500">
        {title}
      </h3>
      {right}
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid min-h-[44px] grid-cols-[1fr_auto] items-center gap-4 border-b border-slate-200 px-5 last:border-b-0">
      <div className="text-[13px] font-medium text-slate-500">{label}</div>
      <div className="text-right text-[13px] font-medium text-slate-700">
        {value}
      </div>
    </div>
  )
}

function BillingActionRow({
  icon,
  title,
  subtitle,
  danger = false,
  onClick,
}: {
  icon: ReactNode
  title: string
  subtitle: string
  danger?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`grid w-full grid-cols-[36px_1fr_auto] items-center gap-3 border-b border-slate-200 px-5 py-3 text-left last:border-b-0 ${
        danger ? "hover:bg-red-50" : "hover:bg-slate-50"
      }`}
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-50 text-slate-400">
        {icon}
      </span>

      <span>
        <span
          className={`block text-[13px] font-semibold ${
            danger ? "text-red-700" : "text-slate-950"
          }`}
        >
          {title}
        </span>
        <span
          className={`mt-1 block text-[12px] font-medium ${
            danger ? "text-red-400" : "text-slate-400"
          }`}
        >
          {subtitle}
        </span>
      </span>

      <span
        className={`text-[14px] font-medium ${
          danger ? "text-red-300" : "text-slate-300"
        }`}
      >
        →
      </span>
    </button>
  )
}

export function SubscriptionHero({
  email,
  isPaid,
  label,
  note,
  price,
  nextRenewal,
  lastPaymentDate,
}: {
  email: string
  isPaid: boolean
  label: string
  note: string
  price: string
  nextRenewal: string
  lastPaymentDate: string
}) {
  return (
    <section className="overflow-hidden rounded-2xl bg-[#111420] text-white shadow-sm">
      <div className="relative px-6 py-6">
        <div className="pointer-events-none absolute right-0 top-0 h-48 w-48 rounded-full bg-indigo-500/10 blur-3xl" />

        <div className="flex items-start justify-between gap-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[12px] font-medium text-emerald-300">
              <span className="flex h-3 w-3 items-center justify-center rounded-full bg-emerald-500/20">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </span>
              {isPaid ? "Active subscription" : "No active subscription"}
            </div>

            <h2 className="mt-3 font-serif text-[30px] font-normal leading-none tracking-[-0.04em]">
              {label}
            </h2>

            <p className="mt-3 text-[12px] font-medium text-slate-400">
              {note}
            </p>
          </div>

          <div className="text-right">
            <div className="font-serif text-[26px] font-normal leading-none tracking-[-0.05em]">
              {price}
            </div>
            <div className="mt-3 text-[12px] font-medium text-slate-500">
              plus applicable taxes / VAT
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-[1.6fr_1fr_1fr_0.75fr] overflow-hidden rounded-xl bg-white/10">
          <HeroStat label="Email" value={email} wrap />
          <HeroStat label="Next renewal" value={isPaid ? nextRenewal : "Not active"} />
          <HeroStat label="Last payment" value={isPaid ? lastPaymentDate : "No payment yet"} />
          <HeroStat label="Status" value={isPaid ? "Active" : "Inactive"} green />
        </div>
      </div>
    </section>
  )
}

function HeroStat({
  label,
  value,
  green = false,
  wrap = false,
}: {
  label: string
  value: string
  green?: boolean
  wrap?: boolean
}) {
  return (
    <div className="border-r border-slate-950/25 px-4 py-3 last:border-r-0">
      <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">
        {label}
      </div>
      <div
        className={`mt-2 text-[12px] font-semibold ${
          green ? "text-emerald-300" : "text-slate-200"
        } ${wrap ? "break-all leading-4" : ""}`}
      >
        {value}
      </div>
    </div>
  )
}

export function BillingSummaryCard({
  subtotal,
  tax,
  total,
  discount,
  onBillingHelp,
}: {
  subtotal: string
  tax: string
  total: string
  discount: string
  onBillingHelp: () => void
}) {
  return (
    <Card>
      <SectionHeader title="Billing summary" />
      <SummaryRow label="Subtotal" value={subtotal} />
      <SummaryRow label="Tax / VAT" value={tax} />
      <SummaryRow label="Amount paid" value={total} />
      <SummaryRow
        label="Discount"
        value={
          discount === "None" ? (
            "None"
          ) : (
            <span className="rounded-full bg-orange-50 px-3 py-1 text-[12px] font-semibold text-orange-700">
              {discount}
            </span>
          )
        }
      />

      <div className="grid grid-cols-[1fr_auto] items-center gap-4 bg-blue-50/80 px-5 py-3">
        <button
          type="button"
          onClick={onBillingHelp}
          className="text-left text-[13px] font-medium text-blue-600 hover:underline"
        >
          ⓘ Payment issue?
        </button>

        <button
          type="button"
          onClick={onBillingHelp}
          className="text-[13px] font-semibold text-blue-600 underline underline-offset-2"
        >
          Contact billing help →
        </button>
      </div>
    </Card>
  )
}

export function AccountActivityCard({
  accountCreated,
  billingActivated,
  planLabel,
}: {
  accountCreated: string
  billingActivated: string
  planLabel: string
}) {
  return (
    <Card>
      <SectionHeader title="Account activity" />
      <SummaryRow label="Account created" value={accountCreated} />
      <SummaryRow label="Billing activated" value={billingActivated} />
      <SummaryRow
        label="Current plan"
        value={
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-[12px] font-semibold text-emerald-700">
            {planLabel}
          </span>
        }
      />
      <SummaryRow label="Payment processor" value="Paddle" />
    </Card>
  )
}

export function PaymentHistoryCard({
  isPaid,
  records,
  onView,
  onViewAll,
}: {
  isPaid: boolean
  records: PaymentHistoryRecord[]
  onView: (record: PaymentHistoryRecord) => void
  onViewAll: () => void
}) {
  const [openRecordId, setOpenRecordId] = useState<string | null>(null)
  const initializedFirstRecord = useRef(false)

  useEffect(() => {
    if (!initializedFirstRecord.current && records[0]?.id) {
      setOpenRecordId(records[0].id)
      initializedFirstRecord.current = true
    }

    if (openRecordId && !records.some((record) => record.id === openRecordId)) {
      setOpenRecordId(records[0]?.id || null)
    }
  }, [records, openRecordId])

  return (
    <Card>
      <SectionHeader
        title="Payment history"
        right={
          isPaid && records.length > 0 ? (
            <button
              type="button"
              onClick={onViewAll}
              className="text-[13px] font-medium text-slate-400 hover:text-slate-700"
            >
              View all
            </button>
          ) : (
            <span className="text-[13px] font-medium text-slate-400">
              No records yet
            </span>
          )
        }
      />

      {isPaid && records.length > 0 ? (
        <div>
          {records.slice(0, 4).map((record) => {
            const isOpen = openRecordId === record.id

            return (
              <div key={record.id} className="border-b border-slate-200 last:border-b-0">
                <button
                  type="button"
                  onClick={() => setOpenRecordId(isOpen ? null : record.id)}
                  className="grid w-full grid-cols-[40px_32px_1fr_110px_90px_34px] items-center gap-3 px-5 py-4 text-left hover:bg-slate-50"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-500">
                    <CreditCard className="h-4 w-4" />
                  </div>

                  <div className="text-[13px] font-bold text-slate-400">
                    {record.number}
                  </div>

                  <div>
                    <div className="text-[13px] font-semibold text-slate-950">
                      {record.planLabel}
                    </div>
                    <div className="mt-1 text-[11px] font-medium text-slate-400">
                      Billing period ends {record.billingPeriodEnds}
                    </div>
                  </div>

                  <div className="text-[12px] font-medium text-slate-500">
                    {record.paidAt}
                  </div>

                  <div>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-[12px] font-semibold text-emerald-700">
                      {record.status}
                    </span>
                  </div>

                  <ChevronDown
                    className={`h-4 w-4 justify-self-end text-slate-400 transition-transform ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="border-t border-slate-200 bg-slate-50/60 px-5 py-4">
                    <div className="grid gap-3 md:grid-cols-5">
                      <PaymentDetail label="Billing period ends" value={record.billingPeriodEnds} />
                      <PaymentDetail label="Paid" value={record.amount} />
                      <PaymentDetail label="Tax / VAT" value={record.tax} />
                      <PaymentDetail label="Status" value={record.status} green />
                      <div>
                        <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                          Receipt
                        </div>
                        <button
                          type="button"
                          onClick={() => onView(record)}
                          className="mt-1 text-[12px] font-semibold text-blue-600 underline underline-offset-2"
                        >
                          View
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="px-6 py-8 text-center text-[13px] font-medium text-slate-500">
          No payment history yet.
        </div>
      )}
    </Card>
  )
}

function PaymentDetail({
  label,
  value,
  green = false,
}: {
  label: string
  value: string
  green?: boolean
}) {
  return (
    <div>
      <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
        {label}
      </div>
      <div
        className={`mt-1 text-[12px] ${
          green ? "font-semibold text-emerald-700" : "font-medium text-slate-950"
        }`}
      >
        {value}
      </div>
    </div>
  )
}

export function PlanAccessCard() {
  return (
    <Card>
      <SectionHeader
        title="Plan access"
        right={
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-[12px] font-semibold text-emerald-700">
            All unlocked
          </span>
        }
      />

      <div className="grid md:grid-cols-2">
        {planAccessFeatures.map((feature) => (
          <div
            key={feature}
            className="flex min-h-[42px] items-center gap-3 border-b border-slate-200 px-5 even:md:border-l"
          >
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-50">
              <Check className="h-3 w-3 text-emerald-500" />
            </span>
            <span className="text-[13px] font-medium text-slate-600">
              {feature}
            </span>
          </div>
        ))}
      </div>
    </Card>
  )
}

export function ManageBillingCard({
  isPaid,
  onManage,
  onUpdatePayment,
  onInvoices,
  onCancel,
}: {
  isPaid: boolean
  onManage: () => void
  onUpdatePayment: () => void
  onInvoices: () => void
  onCancel: () => void
}) {
  return (
    <Card>
      <SectionHeader
        title="Manage billing"
        right={
          <span className="text-[13px] font-medium text-slate-400">
            via Paddle customer portal
          </span>
        }
      />

      <BillingActionRow
        icon={<CreditCard className="h-4 w-4" />}
        title="Manage subscription"
        subtitle="Cancel, pause, or change your plan"
        onClick={onManage}
      />

      <BillingActionRow
        icon={<CreditCard className="h-4 w-4" />}
        title="Update payment method"
        subtitle="Change card or billing details"
        onClick={onUpdatePayment}
      />

      <BillingActionRow
        icon={<FileText className="h-4 w-4" />}
        title="Download invoices"
        subtitle="Export PDF receipts for your records"
        onClick={onInvoices}
      />

      {isPaid && (
        <BillingActionRow
          icon={<X className="h-4 w-4" />}
          title="Cancel subscription"
          subtitle="Cancel renewal through Paddle"
          danger
          onClick={onCancel}
        />
      )}
    </Card>
  )
}