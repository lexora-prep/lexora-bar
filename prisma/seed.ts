import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import fs from "node:fs";
import path from "node:path";

type RuleSeed = {
  subject: string;
  topic: string;
  subtopic?: string;
  title: string;
  ruleText: string;
  keywords: string[];
};

const dbPath = path.join(process.cwd(), "prisma", "dev.db");
const adapter = new PrismaBetterSqlite3({
  url: `file:${dbPath}`,
});

const prisma = new PrismaClient({ adapter });

const rulesPath = path.join(process.cwd(), "data", "rules.json");
const rules = JSON.parse(
  fs.readFileSync(rulesPath, "utf-8")
) as RuleSeed[];

async function main() {
  for (const r of rules) {
    let subject = await prisma.subject.findFirst({
      where: { name: r.subject },
    });

    if (!subject) {
      subject = await prisma.subject.create({
        data: { name: r.subject },
      });
    }

    let topic = await prisma.topic.findFirst({
      where: {
        name: r.topic,
        subjectId: subject.id,
      },
    });

    if (!topic) {
      topic = await prisma.topic.create({
        data: {
          name: r.topic,
          subjectId: subject.id,
        },
      });
    }

    const rule = await prisma.rule.create({
      data: {
        title: r.title,
        ruleText: r.ruleText,
        subtopic: r.subtopic ?? null,
        subjectId: subject.id,
        topicId: topic.id,
      },
    });

    for (let i = 0; i < r.keywords.length; i++) {
      await prisma.ruleKeyword.create({
        data: {
          keyword: r.keywords[i],
          position: i,
          ruleId: rule.id,
        },
      });
    }
  }

  console.log("Seed complete");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });