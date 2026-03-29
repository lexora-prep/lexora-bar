"use client"

import Link from "next/link"

export default function AdminQuestionsPage() {
  return (
    <div className="p-10 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-semibold">Manage Questions</h1>

        <div className="flex gap-3">
          <Link
            href="/admin"
            className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition"
          >
            Back to Admin
          </Link>

          <Link
            href="/admin/questions/new"
            className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition"
          >
            Add Question
          </Link>
        </div>
      </div>

      <div className="border rounded-xl p-6 bg-white">
        <p className="text-gray-700">
          Questions management page is working.
        </p>

        <p className="text-sm text-gray-500 mt-2">
          You can connect the real question list here later.
        </p>
      </div>
    </div>
  )
}