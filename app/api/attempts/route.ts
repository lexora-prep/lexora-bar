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
      return NextResponse.json({ success:false })
    }

    /* -----------------------------
       1. GET QUESTION
    ----------------------------- */

    const question = await prisma.mBEQuestion.findUnique({
      where:{ id:questionId },
      include:{ subject:true }
    })

    if (!question) {
      return NextResponse.json({ success:false })
    }

    const isCorrect = question.correctAnswer === selectedAnswer
    const subjectId = question.subjectId

    /* -----------------------------
       2. SAVE ATTEMPT
    ----------------------------- */

    await prisma.userMBEAttempt.create({
      data:{
        userId,
        questionId,
        selectedAnswer,
        isCorrect,
        timeSpentSec
      }
    })


    /* -----------------------------
       3. UPDATE USER SUBJECT STATS
    ----------------------------- */

    const subjectStat = await prisma.userSubjectStat.findUnique({
      where:{
        userId_subjectId:{
          userId,
          subjectId
        }
      }
    })

    if(subjectStat){

      const done = subjectStat.questionsDone + 1
      const correct = subjectStat.questionsCorrect + (isCorrect ? 1 : 0)

      await prisma.userSubjectStat.update({
        where:{
          userId_subjectId:{
            userId,
            subjectId
          }
        },
        data:{
          questionsDone: done,
          questionsCorrect: correct,
          accuracy: (correct / done) * 100
        }
      })

    }else{

      await prisma.userSubjectStat.create({
        data:{
          userId,
          subjectId,
          questionsDone:1,
          questionsCorrect: isCorrect ? 1 : 0,
          accuracy: isCorrect ? 100 : 0
        }
      })

    }


    /* -----------------------------
       4. UPDATE USER OVERALL MBE
    ----------------------------- */

    const overall = await prisma.userOverallStat.findUnique({
      where:{ userId }
    })

    if(overall){

      const done = overall.mbeQuestionsDone + 1
      const correct = overall.mbeQuestionsCorrect + (isCorrect ? 1 : 0)

      await prisma.userOverallStat.update({
        where:{ userId },
        data:{
          mbeQuestionsDone: done,
          mbeQuestionsCorrect: correct,
          mbeAccuracy: (correct / done) * 100
        }
      })

    }else{

      await prisma.userOverallStat.create({
        data:{
          userId,
          mbeQuestionsDone:1,
          mbeQuestionsCorrect: isCorrect ? 1 : 0,
          mbeAccuracy: isCorrect ? 100 : 0
        }
      })

    }


    /* -----------------------------
       5. UPDATE STATE SUBJECT STATS
    ----------------------------- */

    const user = await prisma.user.findUnique({
      where:{ id:userId }
    })

    if(user?.jurisdiction){

      const state = user.jurisdiction

      const stateStat = await prisma.stateSubjectStat.findUnique({
        where:{
          state_subjectId:{
            state,
            subjectId
          }
        }
      })

      if(stateStat){

        const done = stateStat.questionsDone + 1
        const correct = stateStat.questionsCorrect + (isCorrect ? 1 : 0)

        await prisma.stateSubjectStat.update({
          where:{
            state_subjectId:{
              state,
              subjectId
            }
          },
          data:{
            questionsDone: done,
            questionsCorrect: correct,
            accuracy:(correct / done) * 100
          }
        })

      }else{

        await prisma.stateSubjectStat.create({
          data:{
            state,
            subjectId,
            questionsDone:1,
            questionsCorrect: isCorrect ? 1 : 0,
            accuracy: isCorrect ? 100 : 0
          }
        })

      }

    }

    return NextResponse.json({
      success:true,
      correct:isCorrect
    })

  } catch (err) {

    return NextResponse.json({
      success:false
    })

  }

}