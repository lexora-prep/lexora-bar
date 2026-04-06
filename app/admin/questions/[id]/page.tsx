import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"

type EditQuestionPageProps = {
  params: Promise<{
    id: string
  }>
}

export default async function EditQuestionPage({
  params,
}: EditQuestionPageProps) {
  const { id } = await params

  const question = await prisma.mBEQuestion.findUnique({
    where: { id },
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
    },
  })

  if (!question) {
    notFound()
  }

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-[#E4E0D8] bg-white px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="font-serif text-[28px] leading-none text-[#0F0F0F]">
              Edit MBE Question
            </div>
            <div className="mt-2 text-[13px] text-[#6B6B6B]">
              Question ID: {question.id}
            </div>
          </div>

          <div className="rounded-md border border-[#E4E0D8] bg-[#F7F3EC] px-3 py-2 font-mono text-[11px] uppercase tracking-[0.06em] text-[#6B6B6B]">
            Admin · Question Editor
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-[#E4E0D8] bg-white px-6 py-6">
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.08em] text-[#8A8A8A]">
              Subject
            </div>
            <div className="rounded-md border border-[#E4E0D8] bg-[#FBF8F2] px-3 py-3 text-[14px] text-[#0F0F0F]">
              {question.subjects?.name || "No subject"}
            </div>
          </div>

          <div>
            <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.08em] text-[#8A8A8A]">
              Topic
            </div>
            <div className="rounded-md border border-[#E4E0D8] bg-[#FBF8F2] px-3 py-3 text-[14px] text-[#0F0F0F]">
              {question.topics?.name || "No topic"}
            </div>
          </div>

          <div className="md:col-span-2">
            <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.08em] text-[#8A8A8A]">
              Question Text
            </div>
            <textarea
              defaultValue={question.question_text}
              className="min-h-[140px] w-full rounded-md border border-[#E4E0D8] bg-white px-3 py-3 text-[14px] outline-none"
            />
          </div>

          <div>
            <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.08em] text-[#8A8A8A]">
              Answer A
            </div>
            <input
              defaultValue={question.answer_a}
              className="w-full rounded-md border border-[#E4E0D8] bg-white px-3 py-3 text-[14px] outline-none"
            />
          </div>

          <div>
            <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.08em] text-[#8A8A8A]">
              Answer B
            </div>
            <input
              defaultValue={question.answer_b}
              className="w-full rounded-md border border-[#E4E0D8] bg-white px-3 py-3 text-[14px] outline-none"
            />
          </div>

          <div>
            <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.08em] text-[#8A8A8A]">
              Answer C
            </div>
            <input
              defaultValue={question.answer_c}
              className="w-full rounded-md border border-[#E4E0D8] bg-white px-3 py-3 text-[14px] outline-none"
            />
          </div>

          <div>
            <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.08em] text-[#8A8A8A]">
              Answer D
            </div>
            <input
              defaultValue={question.answer_d}
              className="w-full rounded-md border border-[#E4E0D8] bg-white px-3 py-3 text-[14px] outline-none"
            />
          </div>

          <div>
            <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.08em] text-[#8A8A8A]">
              Correct Answer
            </div>
            <div className="rounded-md border border-[#E4E0D8] bg-[#FBF8F2] px-3 py-3 text-[14px] text-[#0F0F0F]">
              {question.correct_answer}
            </div>
          </div>

          <div>
            <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.08em] text-[#8A8A8A]">
              Status
            </div>
            <div className="rounded-md border border-[#E4E0D8] bg-[#FBF8F2] px-3 py-3 text-[14px] text-[#0F0F0F]">
              {question.question_status}
            </div>
          </div>

          <div className="md:col-span-2">
            <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.08em] text-[#8A8A8A]">
              Explanation
            </div>
            <textarea
              defaultValue={question.explanation || ""}
              className="min-h-[160px] w-full rounded-md border border-[#E4E0D8] bg-white px-3 py-3 text-[14px] outline-none"
            />
          </div>
        </div>

        <div className="mt-6 rounded-md border border-[#FFF1C7] bg-[#FFF9E8] px-4 py-3 text-[13px] text-[#8A6A00]">
          Edit UI is now connected to the correct question record. Save functionality is the next step.
        </div>
      </section>
    </div>
  )
}