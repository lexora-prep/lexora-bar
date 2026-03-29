import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET(req: Request){

  try {

    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("userId")

    if(!userId){
      return NextResponse.json({ error:"missing userId" })
    }

    /* -------------------------
       GET ALL SUBJECTS (FIXED)
    ------------------------- */

    const subjects = await prisma.subjects.findMany({
      select:{
        id:true,
        name:true
      }
    })

    const results:any[] = []

    /* -------------------------
       BUILD ANALYTICS (FIXED)
    ------------------------- */

    for(const subject of subjects){

      // ✅ FIX → rules table + subject_id
      const rulesTotal = await prisma.rules.count({
        where:{ subject_id:subject.id }
      })

      // ✅ FIX → user_rule_progress + relation
      const stats = await prisma.user_rule_progress.findMany({
        where:{
          user_id:userId,
          rules:{
            subject_id:subject.id
          }
        },
        select:{
          correct_count:true,
          attempts:true
        }
      })

      const attemptsTotal =
        stats.length === 0
        ? 0
        : stats.reduce((sum,s)=>sum+s.attempts,0)

      const attemptsCorrect =
        stats.length === 0
        ? 0
        : stats.reduce((sum,s)=>sum+s.correct_count,0)

      const accuracy =
        attemptsTotal === 0
        ? 0
        : Math.round((attemptsCorrect/attemptsTotal)*100)

      results.push({
        name:subject.name,
        accuracy,
        completed:stats.length,
        total:rulesTotal
      })

    }

    return NextResponse.json({
      subjects:results
    })

  } catch(err){

    console.error("BLL analytics error:",err)

    return NextResponse.json({
      subjects:[]
    })

  }

}