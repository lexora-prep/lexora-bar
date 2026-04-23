import { Suspense } from "react"
import DeleteAccountConfirmClient from "./confirm/DeleteAccountConfirmClient"

function DeleteAccountConfirmFallback() {
  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Confirm account deletion</h1>
        <p className="mt-2 text-sm text-slate-500">Loading confirmation page...</p>
      </div>
    </div>
  )
}

export default function DeleteAccountConfirmPage() {
  return (
    <Suspense fallback={<DeleteAccountConfirmFallback />}>
      <DeleteAccountConfirmClient />
    </Suspense>
  )
}