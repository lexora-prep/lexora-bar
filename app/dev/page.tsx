import { notFound } from "next/navigation"

export default function DevPanel() {
  if (process.env.NODE_ENV !== "development") {
    notFound()
  }

  return (
    <div className="space-y-6 p-10">
      <h1 className="text-2xl font-bold">Developer Panel</h1>

      <div className="space-y-4">
        <form action="/api/dev/generate-test-data" method="post">
          <button className="rounded bg-blue-600 px-4 py-2 text-white" type="submit">
            Create Test Attempts
          </button>
        </form>

        <form action="/api/dev/reset-analytics" method="post">
          <button className="rounded bg-red-600 px-4 py-2 text-white" type="submit">
            Reset Analytics
          </button>
        </form>

        <form action="/api/dev/seed-questions" method="post">
          <button className="rounded bg-green-600 px-4 py-2 text-white" type="submit">
            Seed MBE Questions
          </button>
        </form>
      </div>
    </div>
  )
}