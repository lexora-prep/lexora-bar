import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json(
        {
          error: "Missing userId",
          subjects: [],
          topWeakRules: [],
          weakAreas: [],
        },
        { status: 400 }
      )
    }

    const progress = await prisma.userRuleStat.findMany({
      where: {
        userId,
      },
    })

    const ruleIds = progress.map((p) => p.ruleId)

    const rules = ruleIds.length
      ? await prisma.rules.findMany({
          where: {
            id: { in: ruleIds },
          },
          include: {
            subjects: true,
            topics: true,
          },
        })
      : []

    const ruleMap = new Map(rules.map((r) => [r.id, r]))
    const subjectMap: Record<string, any> = {}

    for (const p of progress) {
      const rule = ruleMap.get(p.ruleId)
      const subjectName = rule?.subjects?.name || "Unknown"

      if (!subjectMap[subjectName]) {
        subjectMap[subjectName] = {
          subject: subjectName,
          masteryTotal: 0,
          masteryCount: 0,
          critical: 0,
          needsWork: 0,
          improving: 0,
          mastered: 0,
          rules: [],
        }
      }

      const mastery = Math.round(Number(p.accuracy || 0))
      let level = "CRITICAL"

      if (mastery >= 80) level = "MASTERED"
      else if (mastery >= 60) level = "IMPROVING"
      else if (mastery >= 30) level = "NEEDS_WORK"

      if (level === "CRITICAL") subjectMap[subjectName].critical++
      if (level === "NEEDS_WORK") subjectMap[subjectName].needsWork++
      if (level === "IMPROVING") subjectMap[subjectName].improving++
      if (level === "MASTERED") subjectMap[subjectName].mastered++

      subjectMap[subjectName].masteryTotal += mastery
      subjectMap[subjectName].masteryCount++

      const priority = 100 - mastery + (level === "CRITICAL" ? 30 : 0)

      subjectMap[subjectName].rules.push({
        ruleId: p.ruleId,
        title: rule?.title || "Rule",
        subject: subjectName,
        mastery,
        accuracy: mastery,
        attempts: Number(p.attemptsTotal || 0),
        level,
        priority,
        trend: mastery >= 60 ? "up" : "down",
      })
    }

    for (const s of Object.values(subjectMap)) {
      s.rules.sort((a: any, b: any) => b.priority - a.priority)
    }

    const subjects = Object.values(subjectMap).map((s: any) => {
      const avg =
        s.masteryCount === 0
          ? 0
          : Math.round(s.masteryTotal / s.masteryCount)

      return {
        subject: s.subject,
        mastery: avg,
        critical: s.critical,
        needsWork: s.needsWork,
        improving: s.improving,
        mastered: s.mastered,
        rules: s.rules,
      }
    })

    const topWeakRules = Object.values(subjectMap)
      .flatMap((s: any) => s.rules)
      .filter((r: any) => r.mastery < 70)
      .sort((a: any, b: any) => b.priority - a.priority)
      .slice(0, 5)

    const weakAreas = topWeakRules.map((r: any) => ({
      id: r.ruleId,
      ruleId: r.ruleId,
      rule: r.title,
      title: r.title,
      subject: r.subject,
      attempts: r.attempts,
      accuracy: r.accuracy,
      mastery: r.mastery,
      trend: r.trend,
      level: r.level,
      priority: r.priority,
    }))

    return NextResponse.json({
      subjects,
      topWeakRules,
      weakAreas,
    })
  } catch (err) {
    console.error("RULE WEAK AREAS ERROR:", err)

    return NextResponse.json(
      {
        subjects: [],
        topWeakRules: [],
        weakAreas: [],
      },
      { status: 500 }
    )
  }
}