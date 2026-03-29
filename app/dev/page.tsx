"use client"

export default function DevPanel() {

  async function generateData() {
    await fetch("/api/dev/generate-test-data", {
      method: "POST"
    })
    alert("Test data generated")
  }

  async function resetData() {
    await fetch("/api/dev/reset-analytics", {
      method: "POST"
    })
    alert("Analytics reset")
  }

  async function seedQuestions() {
    await fetch("/api/dev/seed-questions", {
      method: "POST"
    })
    alert("Questions seeded")
  }

  if (process.env.NODE_ENV !== "development") {
    return null
  }

  return (

    <div className="p-10 space-y-6">

      <h1 className="text-2xl font-bold">
        Developer Panel
      </h1>

      <div className="space-y-4">

        <button
          onClick={generateData}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Generate Test Attempts
        </button>

        <button
          onClick={resetData}
          className="bg-red-600 text-white px-4 py-2 rounded"
        >
          Reset Analytics
        </button>

        <button
          onClick={seedQuestions}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          Seed MBE Questions
        </button>

      </div>

    </div>

  )

}