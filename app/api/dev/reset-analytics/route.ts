import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function POST(){

  const userId = "demo-user"

  await prisma.userMBEAttempt.deleteMany({
    where: { userId }
  })

  await prisma.ruleAttempt.deleteMany({
    where: { userId }
  })

  await prisma.userRuleStat.deleteMany({
    where: { userId }
  })

  await prisma.userSubjectStat.deleteMany({
    where: { userId }
  })

  return NextResponse.json({
    reset: true
  })

}