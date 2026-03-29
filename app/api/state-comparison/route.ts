import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET(req: Request){

  const { searchParams } = new URL(req.url)

  const state = searchParams.get("state")
  const userId = searchParams.get("userId")

  if(!userId){
    return NextResponse.json({error:"Missing userId"})
  }

  // 🔥 NO users table → derive users from activity
  const users = await prisma.user_rule_progress.findMany({
    select:{ user_id:true },
    distinct:["user_id"]
  })

  const userIds = users.map(u=>u.user_id)

  // ❗ MBE table DOES NOT EXIST → set placeholder (until you add it later)
  const userMBE = 0

  // ✅ FIXED → use user_rule_progress
  const userRules = await prisma.user_rule_progress.findMany({
    where:{ user_id:userId },
    select:{
      correct_count:true,
      attempts:true
    }
  })

  const userRuleCorrect =
    userRules.reduce((sum,r)=>sum+r.correct_count,0)

  const userRuleTotal =
    userRules.reduce((sum,r)=>sum+r.attempts,0)

  const userBLL =
    userRuleTotal === 0 ? 0 :
    Math.round((userRuleCorrect/userRuleTotal)*100)

  // ❗ MBE STATE DATA → placeholder
  const stateMBEAvg = 0

  // ✅ FIXED → state BLL using user_rule_progress
  const stateRules = await prisma.user_rule_progress.findMany({
    where:{
      user_id:{ in:userIds }
    },
    select:{
      correct_count:true,
      attempts:true,
      user_id:true
    }
  })

  const stateRuleCorrect =
    stateRules.reduce((sum,r)=>sum+r.correct_count,0)

  const stateRuleTotal =
    stateRules.reduce((sum,r)=>sum+r.attempts,0)

  const stateBLLAvg =
    stateRuleTotal === 0 ? 0 :
    Math.round((stateRuleCorrect/stateRuleTotal)*100)

  // 🔥 TOP SCORE CALCULATION (REUSED LOGIC)
  const scoreMap:Record<string,{correct:number,total:number}> = {}

  stateRules.forEach(a=>{

    if(!scoreMap[a.user_id]){
      scoreMap[a.user_id] = {correct:0,total:0}
    }

    scoreMap[a.user_id].total += a.attempts
    scoreMap[a.user_id].correct += a.correct_count

  })

  let topMBE = 0

  Object.values(scoreMap).forEach(score=>{

    const pct =
      score.total === 0 ? 0 :
      Math.round((score.correct/score.total)*100)

    if(pct > topMBE){
      topMBE = pct
    }

  })

  // ❗ MBE attempts removed → only use rule attempts for streak
  const ruleDates = await prisma.user_rule_attempts.findMany({
    where:{ user_id:userId },
    select:{ created_at:true }
  })

  const allDates = ruleDates
    .map(d=>{
      const date = new Date(d.created_at!)
      date.setHours(0,0,0,0)
      return date.getTime()
    })

  const uniqueDates = Array.from(new Set(allDates)).sort((a,b)=>b-a)

  let streak = 0

  if(uniqueDates.length > 0){

    let current = new Date()
    current.setHours(0,0,0,0)

    let index = 0
    let allowedMiss = 2

    while(index < uniqueDates.length){

      const diff =
        (current.getTime() - uniqueDates[index]) / (1000*60*60*24)

      if(diff === 0){
        streak++
        current.setDate(current.getDate()-1)
        index++
      }
      else if(diff === 1 && allowedMiss > 0){
        allowedMiss--
        current.setDate(current.getDate()-1)
      }
      else if(diff === 1){
        streak++
        current.setDate(current.getDate()-1)
        index++
      }
      else{
        break
      }

    }

  }

  return NextResponse.json({
    userMBE,        // ⚠️ placeholder (no table yet)
    userBLL,
    stateMBEAvg,    // ⚠️ placeholder
    stateBLLAvg,
    topMBE,
    passRate:66,
    streak
  })
}