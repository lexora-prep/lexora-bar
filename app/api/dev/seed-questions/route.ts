import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

const SUBJECTS = [
  "Contracts",
  "Torts",
  "Evidence",
  "Civil Procedure",
  "Criminal Law",
  "Property",
  "Constitutional Law"
]

export async function GET(){

  for (const subjectName of SUBJECTS){

    const subject = await prisma.subject.upsert({
      where:{ name:subjectName },
      update:{},
      create:{ name:subjectName }
    })

    for(let i=0;i<30;i++){

      await prisma.mBEQuestion.create({
        data:{
          subjectId: subject.id,
          questionText: `Test question ${i+1} for ${subjectName}`,

          answerA:"Answer A",
          answerB:"Answer B",
          answerC:"Answer C",
          answerD:"Answer D",

          correctAnswer:"A",
          explanation:"Test explanation",

          difficulty:1
        }
      })

    }

  }

  return NextResponse.json({
    success:true
  })

}