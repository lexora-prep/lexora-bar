import fs from "fs"
import path from "path"
import { createClient } from "@supabase/supabase-js"
import dotenv from "dotenv"

dotenv.config({ path: ".env.local" })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const DATA_DIR = "./data"

async function run() {

  const files = fs.readdirSync(DATA_DIR)

  for (const file of files) {

    if (!file.endsWith(".json")) continue

    const fullPath = path.join(DATA_DIR, file)
    const json = JSON.parse(fs.readFileSync(fullPath, "utf8"))

    const subjectName = file.replace(".json","")

    console.log("Processing:", subjectName)

    const { data: subject, error: subjectError } = await supabase
      .from("subjects")
      .select("id")
      .eq("name", subjectName)
      .single()

    if (subjectError || !subject) {
      console.log("Subject not found in DB:", subjectName)
      continue
    }

    const subjectId = subject.id

    const ruleEntries = Object.entries(json)

    const rules = ruleEntries.map(([title, data]) => ({
      title: title,
      rule_text: data.rule || "",
      buzzwords: data.buzzwords || [],
      subject_id: subjectId
    }))

    if (rules.length === 0) {
      console.log("No rules found in:", file)
      continue
    }

    const { error } = await supabase
      .from("rules")
      .insert(rules)

    if (error) {
      console.log("Insert error:", error)
    } else {
      console.log(`Inserted ${rules.length} rules for ${subjectName}`)
    }

  }

  console.log("Import finished")
}

run()