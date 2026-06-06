type DateNormalizer = (value: string) => string

export function buildStudyPlanBooleanDateMap(
  dates: unknown,
  normalizeDateString: DateNormalizer
): Record<string, boolean> {
  const map: Record<string, boolean> = {}

  if (!Array.isArray(dates)) {
    return map
  }

  dates.forEach((date) => {
    if (typeof date !== "string") {
      return
    }

    const key = normalizeDateString(date)
    if (key) {
      map[key] = true
    }
  })

  return map
}

export function buildStudyPlanDateMaps(
  offDates: unknown,
  onDates: unknown,
  normalizeDateString: DateNormalizer
): {
  offMap: Record<string, boolean>
  onMap: Record<string, boolean>
} {
  return {
    offMap: buildStudyPlanBooleanDateMap(offDates, normalizeDateString),
    onMap: buildStudyPlanBooleanDateMap(onDates, normalizeDateString),
  }
}
