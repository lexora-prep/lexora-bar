import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  console.log("Checking Build 8A registry status...")

  const regime = await prisma.exam_regimes.findFirst({
    where: { code: "UBE_CURRENT" },
    select: {
      id: true,
      code: true,
      name: true,
    },
  })

  const [
    jurisdictions,
    examRegimes,
    jurisdictionRegimes,
    curriculumSubjects,
    applicabilityTotal,
    versions,
    rulesWithExternalKey,
  ] = await Promise.all([
    prisma.jurisdictions.count(),
    prisma.exam_regimes.count(),
    prisma.jurisdiction_exam_regimes.count(),
    prisma.curriculum_subjects.count(),
    prisma.rule_applicability.count(),
    prisma.rule_versions.count(),
    prisma.rules.count({
      where: {
        external_key: {
          not: null,
        },
      },
    }),
  ])

  const ubeApplicability = regime
    ? await prisma.rule_applicability.count({
        where: {
          exam_regime_id: regime.id,
          is_active: true,
          is_tested: true,
        },
      })
    : 0

  console.log("")
  console.log("BUILD 8A REGISTRY STATUS")
  console.log("=".repeat(58))
  console.log(`Jurisdictions:                   ${jurisdictions}`)
  console.log(`Exam regimes:                   ${examRegimes}`)
  console.log(`Jurisdiction-regime mappings:   ${jurisdictionRegimes}`)
  console.log(`Curriculum subjects:            ${curriculumSubjects}`)
  console.log(`Rule applicability rows:        ${applicabilityTotal}`)
  console.log(`UBE applicable full rules:      ${ubeApplicability}`)
  console.log(`Rule versions:                  ${versions}`)
  console.log(`Rules with external keys:       ${rulesWithExternalKey}`)
  console.log(`Expected UBE full-rule total:    1162`)
  console.log("")

  if (ubeApplicability === 1162) {
    console.log("RESULT: The baseline registry backfill completed.")
  } else if (ubeApplicability > 0) {
    console.log(
      `RESULT: The backfill is partial. ${
        1162 - ubeApplicability
      } UBE rules still need to be registered.`
    )
  } else {
    console.log("RESULT: No baseline UBE rule applicability was registered.")
  }
}

main()
  .catch((error) => {
    console.error("Registry inspection failed:")
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
