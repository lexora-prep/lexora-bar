import Link from "next/link"
import { prisma } from "@/lib/prisma"

type QuestionsPageProps = {
  searchParams?: Promise<{
    q?: string
    status?: string
    track?: string
    difficulty?: string
  }>
}

function getDifficultyLabel(value: number | null) {
  if (!value) return "—"
  if (value <= 1) return "Easy"
  if (value === 2) return "Medium"
  return "Hard"
}

function getStatusTone(status: string) {
  if (status === "ACTIVE") return "bg-[#EDF7EE] text-[#2A6041]"
  if (status === "DRAFT") return "bg-[#FFF4D6] text-[#9A6A00]"
  if (status === "DISABLED") return "bg-[#F1F1F1] text-[#666666]"
  if (status === "FLAGGED") return "bg-[#FDECEC] text-[#B44C4C]"
  return "bg-[#F1F1F1] text-[#666666]"
}

function shortId(id: string) {
  return id.slice(0, 8)
}

export default async function AdminQuestionsPage({
  searchParams,
}: QuestionsPageProps) {
  const params = searchParams ? await searchParams : {}
  const q = (params?.q || "").trim()
  const status = (params?.status || "all").trim()
  const track = (params?.track || "all").trim()
  const difficulty = (params?.difficulty || "all").trim()

  const andConditions: any[] = []

  if (q) {
    andConditions.push({
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { question_text: { contains: q, mode: "insensitive" } },
        { source: { contains: q, mode: "insensitive" } },
        { id: { equals: q } },
      ],
    })
  }

  if (status !== "all") {
    andConditions.push({ question_status: status })
  }

  if (track !== "all") {
    andConditions.push({ track })
  }

  if (difficulty !== "all") {
    andConditions.push({ difficulty: Number(difficulty) })
  }

  const questions = await prisma.mBEQuestion.findMany({
    where: andConditions.length > 0 ? { AND: andConditions } : undefined,
    orderBy: { created_at: "desc" },
    include: {
      subjects: {
        select: {
          name: true,
        },
      },
      topics: {
        select: {
          name: true,
        },
      },
      subtopics: {
        select: {
          name: true,
        },
      },
      question_flags: {
        where: {
          resolved: false,
        },
        select: {
          id: true,
        },
      },
    },
    take: 200,
  })

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-[#E4E0D8] bg-white p-4">
        <form className="grid gap-3 md:grid-cols-[1.4fr_180px_180px_180px_auto]">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search ID, title, text, or source"
            className="rounded-md border border-[#E4E0D8] bg-white px-3 py-2 text-[13px] outline-none focus:border-[#0F0F0F]"
          />

          <select
            name="status"
            defaultValue={status}
            className="rounded-md border border-[#E4E0D8] bg-white px-3 py-2 text-[13px] outline-none"
          >
            <option value="all">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="DRAFT">Draft</option>
            <option value="DISABLED">Disabled</option>
            <option value="FLAGGED">Flagged</option>
          </select>

          <select
            name="track"
            defaultValue={track}
            className="rounded-md border border-[#E4E0D8] bg-white px-3 py-2 text-[13px] outline-none"
          >
            <option value="all">All tracks</option>
            <option value="CLASSIC">Classic</option>
            <option value="NEXTGEN">NextGen</option>
          </select>

          <select
            name="difficulty"
            defaultValue={difficulty}
            className="rounded-md border border-[#E4E0D8] bg-white px-3 py-2 text-[13px] outline-none"
          >
            <option value="all">All difficulty</option>
            <option value="1">1 · Easy</option>
            <option value="2">2 · Medium</option>
            <option value="3">3 · Hard</option>
          </select>

          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-md border border-[#E4E0D8] bg-[#F7F3EC] px-4 py-2 text-[13px] text-[#3A3A3A] hover:bg-[#F1EBDD]"
            >
              Filter
            </button>

            <Link
              href="/admin/questions"
              className="rounded-md border border-[#E4E0D8] bg-white px-4 py-2 text-[13px] text-[#3A3A3A] hover:bg-[#F7F3EC]"
            >
              Reset
            </Link>
          </div>
        </form>
      </section>

      <section className="overflow-hidden rounded-lg border border-[#E4E0D8] bg-white">
        <div className="flex items-center justify-between border-b border-[#EDE9E1] px-5 py-4">
          <div className="text-[12px] font-medium text-[#0F0F0F]">
            Question Bank
          </div>

          <div className="flex items-center gap-2">
            <div className="font-mono text-[11px] text-[#9B9B9B]">
              {questions.length} shown
            </div>

            <Link
              href="/admin/questions/upload"
              className="rounded-md border border-[#E4E0D8] bg-white px-3 py-2 text-[12px] text-[#3A3A3A] hover:bg-[#F7F3EC]"
            >
              Upload
            </Link>

            <Link
              href="/admin/questions/new"
              className="rounded-md border border-[#0F0F0F] bg-[#0F0F0F] px-3 py-2 text-[12px] text-white hover:bg-[#2A2A2A]"
            >
              Add Question
            </Link>
          </div>
        </div>

        {questions.length === 0 ? (
          <div className="p-8">
            <div className="rounded-xl border border-dashed border-[#E4E0D8] bg-[#FBF8F2] p-8 text-center">
              <div className="text-[15px] font-medium text-[#0F0F0F]">
                No questions found
              </div>
              <div className="mt-2 text-[13px] text-[#6B6B6B]">
                You do not have any MBE questions yet, or your current filters returned no results.
              </div>
              <div className="mt-4 flex items-center justify-center gap-2">
                <Link
                  href="/admin/questions/new"
                  className="rounded-md border border-[#0F0F0F] bg-[#0F0F0F] px-4 py-2 text-[12px] text-white hover:bg-[#2A2A2A]"
                >
                  Create First Question
                </Link>
                <Link
                  href="/admin/questions/upload"
                  className="rounded-md border border-[#E4E0D8] bg-white px-4 py-2 text-[12px] text-[#3A3A3A] hover:bg-[#F7F3EC]"
                >
                  Upload Questions
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="border-b border-[#EDE9E1] bg-[#FBF8F2]">
                <tr className="font-mono text-[10px] uppercase tracking-[0.08em] text-[#9B9B9B]">
                  <th className="px-5 py-3 font-medium">Question</th>
                  <th className="px-5 py-3 font-medium">Subject</th>
                  <th className="px-5 py-3 font-medium">Track</th>
                  <th className="px-5 py-3 font-medium">Difficulty</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Created</th>
                  <th className="px-5 py-3 font-medium">Actions</th>
                </tr>
              </thead>

              <tbody>
                {questions.map((question) => {
                  const unresolvedFlags = question.question_flags?.length || 0

                  return (
                    <tr
                      key={question.id}
                      className="border-b border-[#EDE9E1] align-top text-[13px] text-[#3A3A3A]"
                    >
                      <td className="px-5 py-4">
                        <div className="max-w-[560px]">
                          <div className="font-medium text-[#0F0F0F]">
                            {question.title?.trim() || "Untitled question"}
                          </div>

                          <div className="mt-1 line-clamp-2 text-[12px] text-[#6B6B6B]">
                            {question.question_text}
                          </div>

                          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-[#9B9B9B]">
                            <span>ID: {shortId(question.id)}</span>
                            <span>•</span>
                            <span>
                              {question.source?.trim() || "No source"}
                              {question.source_reference
                                ? ` · ${question.source_reference}`
                                : ""}
                            </span>
                            {unresolvedFlags > 0 && (
                              <>
                                <span>•</span>
                                <span className="rounded bg-[#FDECEC] px-2 py-0.5 text-[#B44C4C]">
                                  {unresolvedFlags} report{unresolvedFlags > 1 ? "s" : ""}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-1">
                          <span className="font-medium text-[#0F0F0F]">
                            {question.subjects?.name || "No subject"}
                          </span>
                          <span className="text-[12px] text-[#9B9B9B]">
                            {question.topics?.name || "No topic"}
                          </span>
                          <span className="text-[12px] text-[#9B9B9B]">
                            {question.subtopics?.name || "No subtopic"}
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span className="rounded bg-[#EEF2F7] px-2 py-1 text-[12px] text-[#4B5D7A]">
                          {question.track}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span className="text-[13px] text-[#0F0F0F]">
                          {getDifficultyLabel(question.difficulty ?? null)}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-2">
                          <span
                            className={`w-fit rounded px-2 py-1 text-[12px] ${getStatusTone(
                              question.question_status
                            )}`}
                          >
                            {question.question_status}
                          </span>

                          <span className="text-[12px] text-[#9B9B9B]">
                            {question.is_active ? "Visible" : "Hidden"}
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-[12px] text-[#9B9B9B]">
                        {new Date(question.created_at).toLocaleString()}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-2">
                          <Link
                            href={`/admin/questions/${question.id}`}
                            className="rounded-md border border-[#E4E0D8] bg-white px-3 py-2 text-center text-[12px] text-[#3A3A3A] hover:bg-[#F7F3EC]"
                          >
                            Edit
                          </Link>

                          {unresolvedFlags > 0 && (
                            <span className="rounded-md bg-[#FFF4D6] px-3 py-2 text-center text-[12px] text-[#9A6A00]">
                              Review Reports
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}