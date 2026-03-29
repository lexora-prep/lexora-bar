import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { parse } from "csv-parse/sync"

const prisma = new PrismaClient()

export async function POST(req: Request) {

  try {

    const formData = await req.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ success:false, error:"No file uploaded" })
    }

    const text = await file.text()

    const records = parse(text, {
      columns:true,
      skip_empty_lines:true
    })

    let created = 0

    for(const row of records){

      const subjectName = row.subject
      const topicName = row.topic

      const subject = await prisma.subject.findFirst({
        where:{name:subjectName}
      })

      if(!subject){
        continue
      }

      let topic = await prisma.topic.findFirst({
        where:{
          name:topicName,
          subjectId:subject.id
        }
      })

      if(!topic){
        topic = await prisma.topic.create({
          data:{
            name:topicName,
            subjectId:subject.id
          }
        })
      }

      await prisma.mBEQuestion.create({
        data:{
          subjectId:subject.id,
          topicId:topic.id,
          questionText:row.questionText,
          answerA:row.answerA,
          answerB:row.answerB,
          answerC:row.answerC,
          answerD:row.answerD,
          correctAnswer:row.correctAnswer,
          explanation:row.explanation,
          difficulty: row.difficulty ? Number(row.difficulty) : null
        }
      })

      created++

    }

    return NextResponse.json({
      success:true,
      inserted:created
    })

  } catch(err){

    console.error(err)

    return NextResponse.json({
      success:false,
      error:"Upload failed"
    })

  }

}