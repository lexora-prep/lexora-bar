import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const {
      userId,
      questionId,
      selectedAnswer,
      timeSpentSec
    } = body

    if (!userId || !questionId || !selectedAnswer) {
      return NextResponse.json({ success: false }, { status: 400 })
    }

    /* -----------------------------
       1. GET QUESTION
    ----------------------------- */

    const question = await prisma.mBEQuestion.findUnique({
      where: { id: questionId },
      include: { subjects: true }
    })

    if (!question) {
      return NextResponse.json({ success: false }, { status: 404 })
    }

    const isCorrect = question.correct_answer === selectedAnswer
    const subjectId = question.subject_id

    /* -----------------------------
       2. SAVE ATTEMPT
    ----------------------------- */

    await prisma.user_mbe_attempts.create({
      data: {
        user_id: userId,
        question_id: questionId,
        selected_answer: selectedAnswer,
        is_correct: isCorrect,
        time_spent_sec: typeof timeSpentSec === "number" ? timeSpentSec : null
      }
    })

    /* -----------------------------
       3. UPDATE USER SUBJECT STATS
    ----------------------------- */

    const subjectStat = await prisma.userSubjectStat.findUnique({
      where: {
        user_id_subject_id: {
          user_id: userId,
          subject_id: subjectId
        }
      }
    })

    if (subjectStat) {
      const done = subjectStat.questions_done + 1
      const correct = subjectStat.questions_correct + (isCorrect ? 1 : 0)

      const previousTotalTime = (subjectStat.avg_time_spent ?? 0) * subjectStat.questions_done
      const newTime = typeof timeSpentSec === "number" ? timeSpentSec : 0
      const avgTimeSpent = done > 0 ? (previousTotalTime + newTime) / done : 0

      await prisma.userSubjectStat.update({
        where: {
          user_id_subject_id: {
            user_id: userId,
            subject_id: subjectId
          }
        },
        data: {
          questions_done: done,
          questions_correct: correct,
          accuracy: (correct / done) * 100,
          avg_time_spent: avgTimeSpent,
          last_attempted: new Date()
        }
      })
    } else {
      await prisma.userSubjectStat.create({
        data: {
          user_id: userId,
          subject_id: subjectId,
          questions_done: 1,
          questions_correct: isCorrect ? 1 : 0,
          accuracy: isCorrect ? 100 : 0,
          avg_time_spent: typeof timeSpentSec === "number" ? timeSpentSec : 0,
          last_attempted: new Date()
        }
      })
    }

    /* -----------------------------
       4. UPDATE USER OVERALL MBE
    ----------------------------- */

    const overall = await prisma.userOverallStat.findUnique({
      where: { user_id: userId }
    })

    if (overall) {
      const done = overall.mbe_questions_done + 1
      const correct = overall.mbe_questions_correct + (isCorrect ? 1 : 0)

      const previousTotalTime = (overall.avg_time_spent ?? 0) * overall.mbe_questions_done
      const newTime = typeof timeSpentSec === "number" ? timeSpentSec : 0
      const avgTimeSpent = done > 0 ? (previousTotalTime + newTime) / done : 0

      await prisma.userOverallStat.update({
        where: { user_id: userId },
        data: {
          mbe_questions_done: done,
          mbe_questions_correct: correct,
          mbe_accuracy: (correct / done) * 100,
          avg_time_spent: avgTimeSpent,
          last_attempted: new Date()
        }
      })
    } else {
      await prisma.userOverallStat.create({
        data: {
          user_id: userId,
          mbe_questions_done: 1,
          mbe_questions_correct: isCorrect ? 1 : 0,
          mbe_accuracy: isCorrect ? 100 : 0,
          avg_time_spent: typeof timeSpentSec === "number" ? timeSpentSec : 0,
          total_sessions: 0,
          last_attempted: new Date()
        }
      })
    }

    /* -----------------------------
       5. UPDATE STATE SUBJECT STATS
    ----------------------------- */

    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (user?.jurisdiction) {
      const state = user.jurisdiction

      const stateStat = await prisma.stateSubjectStat.findUnique({
        where: {
          state_subject_id: {
            state,
            subject_id: subjectId
          }
        }
      })

      if (stateStat) {
        const done = stateStat.questions_done + 1
        const correct = stateStat.questions_correct + (isCorrect ? 1 : 0)

        const previousTotalTime = (stateStat.avg_time_spent ?? 0) * stateStat.questions_done
        const newTime = typeof timeSpentSec === "number" ? timeSpentSec : 0
        const avgTimeSpent = done > 0 ? (previousTotalTime + newTime) / done : 0

        await prisma.stateSubjectStat.update({
          where: {
            state_subject_id: {
              state,
              subject_id: subjectId
            }
          },
          data: {
            questions_done: done,
            questions_correct: correct,
            accuracy: (correct / done) * 100,
            avg_time_spent: avgTimeSpent
          }
        })
      } else {
        await prisma.stateSubjectStat.create({
          data: {
            state,
            subject_id: subjectId,
            questions_done: 1,
            questions_correct: isCorrect ? 1 : 0,
            accuracy: isCorrect ? 100 : 0,
            avg_time_spent: typeof timeSpentSec === "number" ? timeSpentSec : 0
          }
        })
      }
    }

    return NextResponse.json({
      success: true,
      correct: isCorrect
    })
  } catch (err) {
    console.error("attempts route error:", err)

    return NextResponse.json({
      success: false
    }, { status: 500 })
  }
}