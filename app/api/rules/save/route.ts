import { NextResponse } from "next/server"

function generateFillBlank(ruleText:string){

  const words = ruleText.split(" ")

  if(words.length < 6){
    return ruleText
  }

  const index = Math.floor(words.length * 0.6)

  const answer = words[index]

  words[index] = "______"

  return {
    drill: words.join(" "),
    answer
  }

}

export async function POST(req:Request){

  const body = await req.json()

  const { userId, subject, topic, ruleText, sourceQuestionId } = body

  const drillData = generateFillBlank(ruleText)

  console.log("Saving rule",{
    userId,
    subject,
    topic,
    ruleText,
    sourceQuestionId,
    drill: drillData.drill,
    answer: drillData.answer
  })

  return NextResponse.json({
    success:true
  })

}