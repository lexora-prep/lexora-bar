"use client"

import Link from "next/link"

export default function AdminPage() {
  return (
    <div className="p-10 max-w-3xl mx-auto">

      <h1 className="text-3xl font-semibold mb-8">
        Admin Panel
      </h1>

      <div className="space-y-4">

        <Link
          href="/admin/questions"
          className="block p-5 border rounded-lg hover:bg-gray-50 transition"
        >
          <div className="text-lg font-medium">
            Manage Questions
          </div>

          <div className="text-sm text-gray-500 mt-1">
            View, edit, and delete questions from the database.
          </div>
        </Link>

        <Link
          href="/admin/questions/new"
          className="block p-5 border rounded-lg hover:bg-gray-50 transition"
        >
          <div className="text-lg font-medium">
            Add Question
          </div>

          <div className="text-sm text-gray-500 mt-1">
            Create a new MBE question manually.
          </div>
        </Link>

        <Link
          href="/admin/questions/upload"
          className="block p-5 border rounded-lg hover:bg-gray-50 transition"
        >
          <div className="text-lg font-medium">
            Upload Questions (CSV)
          </div>

          <div className="text-sm text-gray-500 mt-1">
            Bulk import questions from a CSV file.
          </div>
        </Link>

      </div>

    </div>
  )
}