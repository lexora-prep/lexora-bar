import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"

export async function GET() {

  const dataDir = path.join(process.cwd(), "data")
  const files = fs.readdirSync(dataDir)

  const subjects:any[] = []

  let ruleId = 1

  for (const file of files) {

    if (!file.endsWith(".json")) continue

    const subjectName = file.replace(".json","")

    const raw = fs.readFileSync(path.join(dataDir,file),"utf-8")
    const json = JSON.parse(raw)

    const topics:any[] = []

    for (const topicName of Object.keys(json)) {

      const topicRules = json[topicName]

      const rulesArray:any[] = []

      const ruleData = topicRules

      rulesArray.push({
        id: ruleId++,
        title: topicName,
        ruleText: ruleData.rule,
        applicationExample: ruleData.application,
        keywords: (ruleData.buzzwords || []).map((word:string,index:number)=>({
          id:index,
          keyword:word
        }))
      })

      topics.push({
        name: topicName,
        rules: rulesArray
      })

    }

    subjects.push({
      name: subjectName,
      topics
    })

  }

  return NextResponse.json({
    subjects
  })

}