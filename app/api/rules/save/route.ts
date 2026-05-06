import { NextResponse } from "next/server"

function createFillBlank(ruleText: string) {
  const words = ruleText.split(" ")

  if (words.length < 6) {
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

export async function POST(req: Request) {
  const body = await req.json()

  const { userId, subject, topic, ruleText, sourceQuestionId } = body

  const drillData = createFillBlank(ruleText)

  const drill =
    typeof drillData === "string" ? drillData : drillData.drill

  const answer =
    typeof drillData === "string" ? "" : drillData.answer

  console.log("Saving rule", {
    userId,
    subject,
    topic,
    ruleText,
    sourceQuestionId,
    drill,
    answer
  })

  return NextResponse.json({
    success: true
  })
}